---
name: tdd-implementation
description: Plan → 承認 → TDD(Red-Green-Refactor) で1つの Unit / 機能を実装する。設計が確定してコードを書くときに使う。
---

# TDD 実装（SDD）

SDD（仕様駆動開発）の実装工程（参照モデル AI-DLC の「コードとテストを生成」）。
**承認ゲート付き TDD** で実装する。人間が Plan を承認してから実装に入る。

## いつ使う

- 設計が確定した後の実装
- `docs/units/unit_*.md` に沿った実装
- 「Plan を出してから実装して」と依頼されたとき

## 前提確認

1. 対象の `docs/units/unit_*.md`（または設計）を読む
2. 依存 Unit が完了しているか確認する
3. 未回答の `[Answer]` がないか確認する（あれば `requirements` スキルへ戻る）

## Phase 1: Plan（人間の承認必須）

AI が以下を提示する。

- 作成・変更するファイル一覧（パス + 役割）
- テストケース一覧
- 実装順序（Backend / Frontend）
- 依存関係・リスク

**人間が承認するまで Phase 2 に進まない。**

## Phase 2: Implement（TDD）

```
Red      → テストを書く（失敗を確認）
Green    → 最小限の実装でテストを通す
Refactor → テストを維持したまま整理
```

### Backend 実装順序

1. Flyway マイグレーション
2. Entity
3. Value Object（必要なら）
4. Repository テスト → Repository (interface)
5. Service テスト → Service interface → Service impl
6. Controller テスト → Controller
7. 統合テスト

### Frontend 実装順序

1. API クライアント型定義
2. コンポーネントテスト → コンポーネント
3. API 連携テスト → API 呼び出し
4. E2E テスト（重要フロー）

## 完了条件

- [ ] Plan が承認されている
- [ ] テストが通る（`verify` スキル）
- [ ] 新規コードが `.claude/rules/` に準拠している
- [ ] Unit / 設計のスコープを満たしている

## 次のステップ

→ `verify` スキル（検証）→ `multi-agent-review` スキル（レビュー）

## 参照

- `.claude/rules/testing.md`
- `.claude/rules/java-spring-boot.md`
- `.claude/rules/typescript-frontend.md`
- `.claude/rules/common/development-process.md`
