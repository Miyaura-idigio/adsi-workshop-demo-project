# 有給休暇申請機能 — 基本設計

要件: `docs/requirements/02-paid-leave-user-stories.md`

---

## 1. ドメイン分析

### 新規 Entity

#### LeaveRequest（休暇申請）

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| id | UUID (v7) | PK | |
| requester | Employee | FK, NOT NULL | 申請者 |
| approver | Employee | FK, nullable | 承認/却下した上長。処理前は null |
| leaveType | LeaveType (enum) | NOT NULL | 休暇種別 |
| startDate | LocalDate | NOT NULL | 開始日 |
| endDate | LocalDate | NOT NULL | 終了日（単日なら startDate と同じ） |
| dayType | DayType (enum) | NOT NULL | FULL / AM_HALF / PM_HALF |
| reason | String | nullable, max 500 | 理由（任意） |
| status | LeaveStatus (enum) | NOT NULL | PENDING / APPROVED / REJECTED |
| rejectReason | String | nullable, max 500 | 却下理由 |
| version | Long | @Version | 楽観ロック |
| createdAt | Instant | NOT NULL | |
| updatedAt | Instant | NOT NULL | |

ビジネスルール:
- `startDate` は申請日より未来であること（過去日不可: LEAVE-04）
- `startDate <= endDate`（開始日 ≤ 終了日）
- 承認者は申請者の所属部署の上長（correction と同一ルール）
- 上長が自分の休暇を申請した場合は自己承認
- 承認時に対象日の勤怠レコードに有給フラグを反映（LEAVE-08）

### AttendanceRecord への変更

| フィールド | 型 | 制約 | 備考 |
|-----------|-----|------|------|
| paidLeave | boolean | NOT NULL, default false | **追加** 有給フラグ |
| leaveType | LeaveType (enum) | nullable | **追加** 適用された休暇種別 |
| dayType | DayType (enum) | nullable | **追加** FULL / AM_HALF / PM_HALF |

- 有給フラグが立った日は打刻なしでも欠勤日にカウントしない
- 半日休の場合、打刻があればその時間を勤務時間として計上

### 新規 Enum

#### LeaveType（休暇種別）

```
ANNUAL        — 年次有給休暇
SPECIAL       — 特別休暇（慶弔・夏季等）
```

#### DayType（取得区分）

```
FULL          — 全日休
AM_HALF       — 午前休
PM_HALF       — 午後休
```

#### LeaveStatus（申請ステータス）

```
PENDING       — 申請中（上長の承認待ち）
APPROVED      — 承認済み（勤怠データに反映済み）
REJECTED      — 却下
```

---

## 2. ドメイン関連図

```
┌──────────────┐       ┌──────────────────┐
│  Department  │1    N │    Employee       │
│              │───────│                   │
└──────────────┘       └──────┬──────┬─────┘
                              │1     │1
                           N  │      │  N
               ┌──────────────┘      └───────────────┐
               │                                      │
    ┌──────────▼─────────┐          ┌─────────────────▼────────────┐
    │ AttendanceRecord   │          │  LeaveRequest                │
    │                    │          │                              │
    │  workDate          │          │  startDate                   │
    │  clockIn           │          │  endDate                     │
    │  clockOut          │          │  leaveType (enum)            │
    │  corrected         │          │  dayType (enum)              │
    │  paidLeave  ← NEW  │          │  reason                      │
    │  leaveType  ← NEW  │          │  status (enum)               │
    │  dayType    ← NEW  │          │  approver → Employee         │
    └────────────────────┘          └──────────────────────────────┘
```

関連:
- Employee `1 : N` LeaveRequest（requester）
- Employee → LeaveRequest（approver）
- LeaveRequest と AttendanceRecord は直接 FK を持たない（承認時に日付ベースで反映）

---

## 3. DB 設計

### V6: leave_requests テーブル

```sql
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES employees(id),
    approver_id UUID REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SPECIAL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('FULL', 'AM_HALF', 'PM_HALF')),
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reject_reason VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_date_range CHECK (start_date <= end_date)
);

CREATE INDEX idx_leave_requests_requester ON leave_requests(requester_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
```

### V7: attendance_records に有給カラム追加

```sql
ALTER TABLE attendance_records
    ADD COLUMN paid_leave BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN leave_type VARCHAR(20),
    ADD COLUMN day_type VARCHAR(20);
```

---

## 4. API 設計

### エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/api/leaves` | 休暇申請 | 全ロール |
| GET | `/api/leaves` | 自分の申請一覧 | 全ロール |
| GET | `/api/leaves/pending` | 承認待ち一覧 | 上長 |
| PATCH | `/api/leaves/{id}/approve` | 承認 | 上長 |
| PATCH | `/api/leaves/{id}/reject` | 却下 | 上長 |

### POST /api/leaves

休暇を申請する。

Request:
```json
{
  "leaveType": "ANNUAL",
  "startDate": "2026-07-21",
  "endDate": "2026-07-25",
  "dayType": "FULL",
  "reason": "夏季旅行のため"
}
```

- `reason` は任意（null 可）
- `dayType` が `AM_HALF` / `PM_HALF` の場合、`startDate == endDate` であること（半日休は単日のみ）

Response (201):
```json
{
  "id": "019059d1-...",
  "leaveType": "ANNUAL",
  "startDate": "2026-07-21",
  "endDate": "2026-07-25",
  "dayType": "FULL",
  "reason": "夏季旅行のため",
  "status": "PENDING",
  "approverName": null,
  "rejectReason": null,
  "createdAt": "2026-07-13T02:00:00Z"
}
```

Error:
- 400: バリデーションエラー（過去日、startDate > endDate、半日休で複数日等）
- 401: 未認証

### GET /api/leaves

自分の休暇申請一覧。

Query Parameters:
- `status` (任意): `PENDING` / `APPROVED` / `REJECTED` で絞り込み

Response (200):
```json
[
  {
    "id": "019059d1-...",
    "leaveType": "ANNUAL",
    "startDate": "2026-07-21",
    "endDate": "2026-07-25",
    "dayType": "FULL",
    "reason": "夏季旅行のため",
    "status": "PENDING",
    "approverName": null,
    "rejectReason": null,
    "createdAt": "2026-07-13T02:00:00Z"
  }
]
```

### GET /api/leaves/pending

自部署メンバーの承認待ち休暇申請一覧。上長向け。

Response (200):
```json
[
  {
    "id": "019059d1-...",
    "requesterId": "019059a1-...",
    "requesterName": "田中太郎",
    "leaveType": "ANNUAL",
    "startDate": "2026-07-21",
    "endDate": "2026-07-25",
    "dayType": "FULL",
    "reason": "夏季旅行のため",
    "createdAt": "2026-07-13T02:00:00Z"
  }
]
```

### PATCH /api/leaves/{id}/approve

休暇申請を承認する。承認時に対象日の AttendanceRecord に有給フラグを反映する。

Query Parameters:
- `approverId` (必須): 承認者の社員 ID
- `version` (必須): 楽観ロック用バージョン

Request: ボディなし

Response (200):
```json
{
  "id": "019059d1-...",
  "leaveType": "ANNUAL",
  "startDate": "2026-07-21",
  "endDate": "2026-07-25",
  "dayType": "FULL",
  "status": "APPROVED",
  "approverName": "鈴木部長"
}
```

Error:
- 403: 承認権限なし（自部署の上長でない）
- 404: 申請が見つからない
- 409: 楽観ロックエラー

### PATCH /api/leaves/{id}/reject

休暇申請を却下する。

Query Parameters:
- `approverId` (必須): 承認者の社員 ID

Request:
```json
{
  "reason": "繁忙期のため日程を変更してください",
  "version": 0
}
```

Response (200):
```json
{
  "id": "019059d1-...",
  "status": "REJECTED",
  "rejectReason": "繁忙期のため日程を変更してください"
}
```

Error: 403 / 404 / 409（approve と同じ）

---

## 5. 承認時の反映ロジック

承認時、`startDate` ～ `endDate` の各日について:

1. **全日休 (FULL)**:
   - 対象日に AttendanceRecord が存在しない → 新規作成（`paidLeave=true`, `leaveType`, `dayType` を設定。`clockIn`/`clockOut` は null 相当として扱うが、NOT NULL 制約があるためダミー値 00:00 を設定し `paidLeave=true` で区別する）
   - 対象日に AttendanceRecord が存在する → `paidLeave=true`, `leaveType`, `dayType` を設定

2. **午前休 (AM_HALF) / 午後休 (PM_HALF)**:
   - 対象日に AttendanceRecord が存在しない → 新規作成（同上）
   - 対象日に AttendanceRecord が存在する → `paidLeave=true`, `leaveType`, `dayType` を設定（打刻はそのまま維持）

### 月次集計への影響

- `paidLeave = true` かつ `dayType = FULL` の日 → 欠勤日数に含めない、有給取得 1.0 日
- `paidLeave = true` かつ `dayType = AM_HALF or PM_HALF` → 欠勤日数に含めない、有給取得 0.5 日
- 月次集計レスポンスに `paidLeaveDays` フィールドを追加

---

## 6. 画面設計

### 新規画面

| 画面 | パス | ロール | 説明 |
|------|------|--------|------|
| 休暇申請一覧 | `/leaves` | 全ロール | 自分の休暇申請一覧（ステータスフィルタ付き） |
| 休暇申請フォーム | `/leaves/new` | 全ロール | 新規休暇申請 |
| 休暇承認一覧 | `/approvals` に追加 | 上長 | 既存の承認ページにタブ追加 |

### 休暇申請フォーム（`/leaves/new`）

| 項目 | UI | バリデーション |
|------|-----|-------------|
| 休暇種別 | セレクトボックス（年次有給/特別休暇） | 必須 |
| 開始日 | 日付ピッカー | 必須、未来日のみ |
| 終了日 | 日付ピッカー | 必須、開始日以降 |
| 取得区分 | ラジオボタン（全日/午前休/午後休） | 必須。半日休は単日のみ |
| 理由 | テキストエリア（500文字以内） | 任意 |

### 休暇申請一覧（`/leaves`）

- ステータスフィルタ: 全て / 申請中 / 承認済み / 却下
- テーブル列: 休暇種別、期間、取得区分、ステータス、申請日
- ステータスバッジ（correction と同じ StatusBadge コンポーネントを再利用）

### 承認画面（`/approvals`）

既存の勤怠修正承認タブに「休暇申請」タブを追加:
- タブ: 勤怠修正 | 休暇申請
- 休暇申請タブ: 申請者名、休暇種別、期間、取得区分、理由、承認/却下ボタン

---

## 7. パッケージ構成

```
com.example.attendance
├── leave/                 — 有給休暇申請（NEW）
│   ├── controller/
│   │   └── LeaveController.java
│   ├── service/
│   │   ├── LeaveService.java (interface)
│   │   └── LeaveServiceImpl.java
│   ├── repository/
│   │   └── LeaveRequestRepository.java
│   ├── entity/
│   │   ├── LeaveRequest.java
│   │   ├── LeaveType.java (enum)
│   │   ├── LeaveStatus.java (enum)
│   │   └── DayType.java (enum)
│   └── dto/
│       ├── LeaveCreateRequest.java (record)
│       ├── LeaveResponse.java (record)
│       ├── LeaveRejectRequest.java (record)
│       └── PendingLeaveResponse.java (record)
```

Frontend:
```
packages/frontend/src/
├── features/leave/        — 有給休暇（NEW）
│   ├── LeaveForm.tsx
│   ├── LeaveList.tsx
│   ├── PendingLeaveList.tsx
│   ├── LeaveApprovalActions.tsx
│   ├── leave-api.ts
│   └── useLeaves.ts
├── app/(authenticated)/
│   ├── leaves/
│   │   ├── page.tsx       — 休暇申請一覧
│   │   └── new/
│   │       └── page.tsx   — 新規申請
│   └── approvals/
│       └── page.tsx       — タブ追加（既存修正）
```

---

## 8. 権限マトリクス（追加分）

| エンドポイント | 未認証 | 一般社員 | 上長 | 管理者 |
|--------------|--------|---------|------|--------|
| POST /api/leaves | - | o | o | o |
| GET /api/leaves | - | o | o | o |
| GET /api/leaves/pending | - | - | o | - |
| PATCH /api/leaves/{id}/approve | - | - | o | - |
| PATCH /api/leaves/{id}/reject | - | - | o | - |

---

## 9. 設計判断まとめ

| 項目 | 決定 | 根拠 |
|------|------|------|
| LeaveRequest と AttendanceRecord の関連 | FK なし。承認時に日付ベースで反映 | 連続日数申請を1レコードで管理するため。FK で紐づけると日数分のレコードが必要 |
| 有給フラグの場所 | AttendanceRecord に追加 | 月次集計で打刻と有給を同じテーブルから取れる。シンプル |
| 半日休の制約 | 単日のみ | 連続日数で半日休は実務上不要。バリデーションが複雑になるのを避ける |
| 全日休で打刻なし時の扱い | AttendanceRecord を新規作成（paidLeave=true） | 欠勤判定ロジックを統一（レコードなし=欠勤、レコードあり paidLeave=true=有給） |
| 承認画面 | 既存の /approvals にタブ追加 | 承認者（上長）の動線を集約。別画面にすると見落とすリスク |
| correction との共通化 | 個別パッケージ（leave/） | ドメインが異なる（修正 vs 休暇）。無理な共通化は複雑化を招く |
