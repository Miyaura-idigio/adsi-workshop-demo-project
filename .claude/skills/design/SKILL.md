---
name: design
description: 基本設計フェーズ。ドメインモデル・DB・API・画面を設計ドキュメント化する。要求確定後、実装や作業分割の前に使う。
---

# 設計フェーズ（SDD）

SDD（仕様駆動開発）の設計工程（参照モデル AI-DLC の Construction 入口）。
確定した要求をもとに **「どう作るか」** を設計する。ライト DDD。

## いつ使う

- 要求が確定した後、実装・分割の前
- 各 Unit のドメイン / API 設計

## ズームレベル（再帰）

要求と同様、設計の重さもスコープに比例する。

| レベル | 設計の粒度 | 出力先 |
|--------|-----------|--------|
| プロダクト / 大機能 | 全ドメイン・全 API の設計一式 | `docs/design/` |
| 各 Unit | そのドメインの Entity / API のみ | `docs/units/unit_*.md` 内 |
| 小修正 | ほぼスキップ | — |

## 設計成果物（`docs/design/`）

| ドキュメント | 内容 |
|------------|------|
| ドメイン分析 | Entity, Value Object, 関連図（ライト DDD） |
| DB 設計 | テーブル定義 + ER 図（Flyway 前提） |
| API 設計 | OpenAPI (YAML)。Swagger UI で確認可能 |
| 画面設計 | ワイヤーフレーム / コンポーネント一覧（必要に応じて） |
| インフラ | 必要になったら |

## ライト DDD

| 使う | 使わない（必要になったら） |
|------|--------------------------|
| Entity（DB テーブル対応・ビジネスルール） | Aggregate Root（Entity が担う） |
| Value Object（勤務時間・時刻等） | Domain Event |
| Repository（interface 定義） | 仕様パターン |
| Service（ドメインロジックの調整役） | |

## 手順

1. `docs/requirements/` を読む
2. ドメインモデリング（Entity / VO / Repository / Service）
3. API を OpenAPI で定義する
4. DB を Flyway マイグレーション前提で設計する
5. `docs/working/design/` で検討し、確定版を `docs/design/` に整理する

## 完了条件

- [ ] ドメイン / DB / API の設計が `docs/design/` に確定している
- [ ] API 契約（DTO / エンドポイント）が明確

## 次のステップ

- 大機能 → `work-decomposition` スキル（Unit に分割）
- 単一機能 → `tdd-implementation` スキル（実装へ）

## 参照

- `.claude/rules/common/patterns.md`
- `.claude/rules/java-spring-boot.md`
- `.claude/rules/common/development-process.md`
