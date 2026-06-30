import * as cdk from "aws-cdk-lib/core";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface AttendanceStackProps extends cdk.StackProps {
  envName: string;
}

export class AttendanceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AttendanceStackProps) {
    super(scope, id, props);

    const { envName } = props;

    cdk.Tags.of(this).add("Project", "attendance");
    cdk.Tags.of(this).add("Environment", envName);

    // ========== VPC ==========
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // ========== Aurora Serverless v2 ==========
    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      secretName: `attendance/${envName}/db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "attendance" }),
        generateStringKey: "password",
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Aurora Serverless v2 security group",
    });

    const dbCluster = new rds.DatabaseCluster(this, "Database", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_4,
      }),
      credentials: rds.Credentials.fromSecret(dbSecret),
      defaultDatabaseName: "attendance",
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 2,
      writer: rds.ClusterInstance.serverlessV2("writer"),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      removalPolicy:
        envName === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      storageEncrypted: true,
    });

    // ========== ECR ==========
    const repository = new ecr.Repository(this, "BackendRepo", {
      repositoryName: `attendance-backend-${envName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [{ maxImageCount: 5 }],
    });

    // ========== ECS Cluster ==========
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsights: envName === "prod",
    });

    // ========== ECS Task Definition ==========
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    const logGroup = new logs.LogGroup(this, "BackendLogs", {
      logGroupName: `/attendance/${envName}/backend`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const container = taskDefinition.addContainer("backend", {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: "ecs" }),
      environment: {
        SPRING_PROFILES_ACTIVE: "prod",
        DB_HOST: dbCluster.clusterEndpoint.hostname,
        DB_PORT: dbCluster.clusterEndpoint.port.toString(),
        DB_NAME: "attendance",
        // TODO: 初回デプロイ後に CloudFront ドメインに差し替える（循環参照で CDK 内では解決不可）
        CORS_ALLOWED_ORIGINS: "*",
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, "password"),
      },
      // コンテナヘルスチェックは ALB ターゲットグループに委譲（JRE イメージに curl がないため）
    });

    container.addPortMappings({ containerPort: 8080 });

    // ========== ALB ==========
    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "ALB security group",
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    // ========== ECS Service ==========
    const serviceSecurityGroup = new ec2.SecurityGroup(
      this,
      "ServiceSecurityGroup",
      {
        vpc,
        description: "ECS Service security group",
      },
    );

    serviceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      "Allow ALB traffic",
    );

    dbSecurityGroup.addIngressRule(
      serviceSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ECS traffic",
    );

    const service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [serviceSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc,
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: "/actuator/health",
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      // TODO: Spring Session + DynamoDB でセッション外出しに移行する。
      // Sticky Session はデプロイ・タスク再起動でセッションが消える暫定対応。
      stickinessCookieDuration: cdk.Duration.hours(1),
    });

    alb.addListener("HttpListener", {
      port: 80,
      defaultTargetGroups: [targetGroup],
    });

    // ========== S3 (Frontend) ==========
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `attendance-frontend-${envName}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ========== CloudFront ==========
    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

    const spaRoutingFunction = new cloudfront.Function(
      this,
      "SpaRoutingFunction",
      {
        code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '.html';
  }
  return request;
}
`),
        runtime: cloudfront.FunctionRuntime.JS_2_0,
      },
    );

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(
      frontendBucket,
      { originAccessControl: oac },
    );

    const albOrigin = new origins.HttpOrigin(alb.loadBalancerDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: spaRoutingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "/api/*": {
          origin: albOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        "/actuator/*": {
          origin: albOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: "/404.html",
          responseHttpStatus: 404,
        },
        {
          httpStatus: 403,
          responsePagePath: "/index.html",
          responseHttpStatus: 200,
        },
      ],
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "AlbUrl", {
      value: `http://${alb.loadBalancerDnsName}`,
      description: "ALB URL (backend API)",
    });

    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: repository.repositoryUri,
      description: "ECR repository URI for backend image",
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
      description: "S3 bucket for frontend static files",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID",
    });
  }
}
