# Attendance Demo Project

勤怠管理デモアプリ。モノレポ構成。

## Claude Code ハーネス

`.claude/` に rules / skills / agents を同梱（外部プラグイン不要）。詳細は [.claude/README.md](.claude/README.md)。

| やりたいこと | 参照先 |
|-------------|--------|
| 起動（ローカル / SageMaker） | `.claude/skills/dev-environment/SKILL.md` |
| SageMaker プレビュー設定 | `.claude/skills/sagemaker-code-editor/SKILL.md` |
| SageMaker から AWS デプロイ | `.claude/skills/sagemaker-aws-deploy/SKILL.md` |
| コーディング規約 | `.claude/rules/` |
| 開発の全体像（SDD / 仕様駆動開発） | `.claude/rules/common/development-process.md` |
| Issue 運用（要求/設計の永続化） | `.claude/rules/common/issue-workflow.md` |
| 要求仕様 | `.claude/skills/requirements/SKILL.md` |
| 設計 | `.claude/skills/design/SKILL.md` |
| 作業分割（UoW） | `.claude/skills/work-decomposition/SKILL.md` |
| TDD 実装 | `.claude/skills/tdd-implementation/SKILL.md` |
| コードレビュー | `.claude/skills/multi-agent-review/SKILL.md` |

> **スキルの起動方針（ワークショップ）**: SDD 工程スキル（`requirements` / `design` / `work-decomposition` / `tdd-implementation`）は **明示的に指定されたときのみ** 使用し、**自動では起動しない**。前半は参加者が自分でプロンプトを入力して各工程を体験し、後半で必要に応じてスキル名を指定して呼び出す。

### SageMaker クイックリファレンス

```bash
npm run dev:sagemaker        # 起動
npm run dev:sagemaker:stop   # 停止
```

アクセス: PORTS タブの地球儀 → URL の `ports` を `absports` に置換（例: `.../absports/3000/`）

## パッケージ構成

- `packages/backend/` — Spring Boot 3.x (Java 21)
- `packages/frontend/` — Next.js (TypeScript)
- `packages/infra/` — AWS CDK (TypeScript)。dev/prod
- `docs/path/` — デモの過程ドキュメント
- `docs/working/` — 要件・設計の Q&A 作業ドキュメント

## セットアップ

```bash
npm run setup
```

## docs/path ルール

デモの過程を `docs/path/` に番号付きファイル（`00-xxx.md`）で記録する。
新ステップに進んだら新ファイルを作成。プロンプト・やったこと・つまずき・最終構成を含める。
