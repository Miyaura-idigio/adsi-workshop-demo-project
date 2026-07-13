# 打刻メモ機能 — アーキテクチャ調査と変更計画

> 確定仕様: [spec.md](./spec.md) / Q&A: [qa.md](./qa.md)

## 1. リポジトリアーキテクチャ要約

### 全体構成

モノレポ（npm workspaces）で 3 パッケージ構成:

| パッケージ | 技術スタック | 役割 |
|-----------|------------|------|
| `packages/backend/` | Spring Boot 3.x / Java 21 / Gradle | REST API サーバー |
| `packages/frontend/` | Next.js (App Router) / TypeScript / Tailwind CSS | SPA フロントエンド |
| `packages/infra/` | AWS CDK (TypeScript) | インフラ定義 |

### Backend アーキテクチャ

**ドメイン分割レイヤード + ライト DDD**

```
com.example.attendance/
├── attendance/   ← 打刻（出勤・退勤）
├── auth/         ← 認証
├── correction/   ← 勤怠修正申請
├── department/   ← 部署
├── employee/     ← 社員
├── report/       ← 月次レポート・CSV/PDF 出力
└── common/       ← 共通設定・例外ハンドリング
```

各ドメインの内部構造:
```
{domain}/
├── controller/   ← REST API エンドポイント
├── dto/          ← record で定義（リクエスト/レスポンス）
├── entity/       ← JPA Entity（@Data, @Builder）
├── domain/       ← Value Object（任意）
├── repository/   ← Spring Data JPA interface
└── service/      ← interface + impl
```

依存方向: `Controller → Service(interface) → Repository(interface) → Entity`

### Frontend アーキテクチャ

**Feature ベースディレクトリ + App Router**

```
src/
├── app/                   ← Next.js App Router（ルーティング）
│   ├── (authenticated)/   ← 認証済みレイアウト
│   └── login/
├── features/              ← 機能単位のコンポーネント群
│   ├── attendance/        ← 打刻・勤怠関連
│   ├── auth/
│   ├── correction/
│   ├── department/
│   ├── employee/
│   └── report/
├── components/            ← 共通コンポーネント（UI / layout）
├── lib/                   ← ユーティリティ（api-client 等）
├── hooks/                 ← 共通 hooks
└── types/                 ← 共通型定義
```

各 feature の構成:
- `*-api.ts` — API クライアント関数 + レスポンス型
- `use*.ts` — TanStack Query ベースの hooks
- `*.tsx` — コンポーネント
- `*.test.tsx` — テスト

### コーディング規約（要点）

| 項目 | Backend | Frontend |
|------|---------|----------|
| イミュータビリティ | `final` デフォルト、防御コピー | スプレッド構文、`const` デフォルト |
| DI | コンストラクタインジェクションのみ | — |
| DTO | `record` 必須（Lombok `@Data` 禁止） | `interface` で Props、Zod でバリデーション |
| DB管理 | Flyway（`ddl-auto` 禁止） | — |
| 楽観ロック | `@Version` 標準 | — |
| テスト | JUnit 5 + AAA パターン | Vitest + Testing Library |
| 状態管理 | — | TanStack Query（SWR パターン） |
| `any` | — | 禁止 |

---

## 2. 現状の打刻（Attendance）ドメイン

### DB テーブル: `attendance_records`

```sql
id UUID PRIMARY KEY,
employee_id UUID NOT NULL REFERENCES employees(id),
work_date DATE NOT NULL,
clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
clock_out TIMESTAMP WITH TIME ZONE,
corrected BOOLEAN NOT NULL DEFAULT false,
version BIGINT NOT NULL DEFAULT 0,
created_at TIMESTAMP WITH TIME ZONE NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE NOT NULL
```

### Entity: `AttendanceRecord`

フィールド: `id`, `employee`, `workDate`, `clockIn`, `clockOut`, `corrected`, `version`, `createdAt`, `updatedAt`

### API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/attendance/clock-in?employeeId=` | 出勤打刻 |
| POST | `/api/attendance/clock-out?employeeId=` | 退勤打刻 |
| GET | `/api/attendance/today?employeeId=` | 本日の状態 |
| GET | `/api/attendance/history?employeeId=&month=` | 月次履歴 |
| GET | `/api/attendance/team?managerId=&month=` | チーム勤怠 |
| GET | `/api/attendance/all?month=&departmentId=` | 全員勤怠 |

### DTO: `AttendanceRecordResponse`

```java
public record AttendanceRecordResponse(
    UUID id, LocalDate workDate, Instant clockIn, Instant clockOut, boolean corrected
)
```

### Frontend API Client: `attendance-api.ts`

- `clockIn(employeeId)` / `clockOut(employeeId)` — POST
- `fetchTodayStatus(employeeId)` / `fetchHistory(employeeId, month)` — GET

### Frontend UI: `ClockButtons.tsx`

出勤/退勤ボタン + 現在時刻表示 + ステータス表示。現時点でメモ入力欄なし。

---

## 3. 打刻メモ追加の変更箇所

### 3.1 Backend

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `db/migration/V5__add_attendance_memo.sql` (新規) | `clock_in_memo`, `clock_out_memo`, `clock_in_memo_updated_at`, `clock_out_memo_updated_at` カラム追加 |
| 2 | `attendance/entity/AttendanceRecord.java` | 4フィールド追加 |
| 3 | `attendance/dto/AttendanceRecordResponse.java` | `clockInMemo`, `clockOutMemo`, `clockInMemoUpdatedAt`, `clockOutMemoUpdatedAt` 追加 |
| 4 | `attendance/dto/ClockInRequest.java` (新規) | `record ClockInRequest(@Size(max=100) String memo)` |
| 5 | `attendance/dto/ClockOutRequest.java` (新規) | 同上 |
| 6 | `attendance/dto/MemoUpdateRequest.java` (新規) | `record MemoUpdateRequest(@NotNull String type, @Size(max=100) String memo)` |
| 7 | `attendance/controller/AttendanceController.java` | clock-in/out に `@RequestBody` 追加、PATCH `/api/attendance/{id}/memo` 追加、GET team/{employeeId}/history 追加 |
| 8 | `attendance/service/AttendanceService.java` | メソッドシグネチャ変更 + `updateMemo`, `getMemberHistory` 追加 |
| 9 | `attendance/service/AttendanceServiceImpl.java` | 実装変更 |

### 3.2 Frontend

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `features/attendance/attendance-api.ts` | レスポンス型にメモフィールド追加、`clockIn`/`clockOut` に memo 引数追加、`updateMemo` / `fetchMemberHistory` 関数追加 |
| 2 | `features/attendance/useAttendance.ts` | mutation に memo パラメータ追加、`useUpdateMemo` / `useMemberHistory` hooks 追加 |
| 3 | `features/attendance/ClockButtons.tsx` | 出勤/退勤ボタンの近くにテキスト入力欄追加 |
| 4 | `features/attendance/TodayRecords.tsx` | メモ表示追加 |
| 5 | `features/attendance/AttendanceTable.tsx` | メモ列追加 + インライン編集（当月のみ） |
| 6 | `app/(authenticated)/team/[employeeId]/page.tsx` (新規) | チーム勤怠詳細画面 |
| 7 | `features/attendance/MemberHistory.tsx` (新規) | メンバー日次一覧＋メモ閲覧コンポーネント |
| 8 | `app/(authenticated)/team/page.tsx` | メンバー行クリックで詳細へ遷移するリンク追加 |

### 3.3 テスト

| # | ファイル | 内容 |
|---|---------|------|
| 1 | `AttendanceServiceTest.java` | メモ付き打刻、メモ更新、当月チェックのテスト追加 |
| 2 | `AttendanceControllerTest.java` | 新エンドポイントのテスト追加 |
| 3 | `AttendanceIntegrationTest.java` | メモ付きフロー統合テスト |
| 4 | `ClockButtons.test.tsx` | メモ入力＋送信のテスト追加 |
| 5 | `AttendanceTable` のテスト (新規) | インライン編集テスト |

---

## 4. 推奨する実装順序（TDD）

```
1. Flyway マイグレーション（V5）
2. Entity にフィールド追加
3. DTO 追加・変更
4. Service テスト → Service 実装（メモ付き打刻、メモ編集、期間チェック）
5. Controller テスト → Controller 実装
6. 統合テスト
7. Frontend API 型・クライアント更新
8. ClockButtons にメモ入力欄追加
9. TodayRecords にメモ表示追加
10. AttendanceTable にメモ列＋インライン編集追加
11. チーム勤怠詳細画面（新規ページ + API + コンポーネント）
```

---

## 5. 設計上の注意点

- **clock-in/out API の変更**: 現在はクエリパラメータ (`?employeeId=`) のみだが、メモ追加で `@RequestBody` が必要。既存クライアントとの互換性に注意（memo は optional なので空ボディ `{}` でも動くようにする）
- **当月判定ロジック**: `workDate` の年月と現在の年月を比較。タイムゾーンは `Asia/Tokyo` 基準
- **楽観ロック**: メモ編集時に `@Version` が競合を検出する。フロントでリトライ or エラー表示
- **権限チェック**: PATCH `/api/attendance/{id}/memo` は本人のみ。上長は GET のみ
