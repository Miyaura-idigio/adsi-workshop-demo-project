---
name: work-decomposition
description: 設計を独立実装可能な Unit of Work / ドメインに分割する。大機能・プロダクト全体を複数タスクに分解するとき、docs/units/ を作るときに使う。
---

# 作業分割（SDD）

SDD（仕様駆動開発）の作業分割工程（参照モデル AI-DLC の「作業単位に計画」）。
設計を **Bounded Context 相当の凝集した Unit** に分ける。Unit 間の依存を明示し、並列実装できる形にする。

## いつ使う

- プロダクト全体・大機能を実装単位に分割するとき
- 上位レイヤーの工程（**末端の単一 Unit では通常この工程は不要**。設計 → 実装へ直行）

## ズームレベル（再帰）

分割は主に上位レベルの工程。Unit がまだ大きければ、その Unit 内でさらに小 Unit に分割することもある（もう1段ネスト）。

## 分割方針

- 凝集度の高い単位で切る（DDD の Bounded Context 相当）
- 各 Unit 内のユーザーストーリー・API・テーブルを明示する
- Unit 間の依存関係を明示する（依存がない Unit は並列実装可能）
- `docs/units/unit_*.md` と `docs/units/README.md`（依存図・Phase）に記録する

## 実装戦略: インターフェース先行 → 並列化

Unit 間の依存はインターフェース（Entity 形状・Service interface・API 契約）に集中する。これを先に定義すると本体を並列化できる。

| Phase | 内容 |
|-------|------|
| Phase A | インターフェース定義（Flyway 順・Entity・Service interface・DTO・Enum） |
| Phase B | 依存のない Unit 群を並列実装 |
| Phase C | Phase B に依存する Unit 群を並列実装 |
| 最後 | 統合テスト（全 Unit が揃った状態で） |

## 手順

1. `docs/design/` を読む
2. ドメイン境界で Unit に分割する
3. Unit 間の依存図を描き、Phase（A/B/C）に割り当てる
4. `docs/units/unit_*.md`（各 Unit のストーリー・テーブル・API）と `README.md` を作成する

## 完了条件

- [ ] `docs/units/` に Unit 定義と依存図がある
- [ ] 並列実装可能な Phase 分けができている

## 次のステップ

→ 各 Unit で `design`（軽量）→ `tdd-implementation` スキル

## 参照

- `docs/units/README.md`
- `.claude/rules/common/development-process.md`
