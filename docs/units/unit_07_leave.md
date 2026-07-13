# Unit 07: 有給休暇申請

有給休暇の申請・承認・却下。連続日数申請、半日休暇（午前休/午後休）に対応。
承認時に勤怠レコードに有給フラグを反映する。

## 依存関係

- 依存先: Unit 00（共通基盤）, Unit 02（社員 — 申請者・承認者）, Unit 03（認証）, Unit 04（打刻 — AttendanceRecord 更新）
- 依存元: Unit 06（月次集計 — 有給取得日数の追加）
- **Unit 05（勤怠修正）とは並列実装可能**

## ユーザーストーリー

- **LEAVE-01**: 社員として、休暇種別・期間・取得区分を指定して休暇を申請したい
- **LEAVE-02**: 社員として、連続日数を1回の申請で出したい
- **LEAVE-03**: 社員として、理由を任意で入力したい
- **LEAVE-04**: 過去日の申請はエラーにする
- **LEAVE-05**: 社員として、自分の休暇申請の状態を確認したい
- **LEAVE-06**: 上長として、部署メンバーの休暇申請を一覧で確認したい
- **LEAVE-07**: 上長として、部署メンバーの休暇申請を承認・却下したい
- **LEAVE-08**: 承認時に対象日の勤怠レコードに有給フラグを反映する
- **LEAVE-09**: 有給取得日に打刻があっても受け付ける
- **LEAVE-10**: 月次集計に有給取得日数を含める

## テーブル

### leave_requests

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

Flyway: `V6__create_leave_requests.sql`

### attendance_records（カラム追加）

```sql
ALTER TABLE attendance_records
    ADD COLUMN paid_leave BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN leave_type VARCHAR(20),
    ADD COLUMN day_type VARCHAR(20);
```

Flyway: `V7__add_attendance_paid_leave_columns.sql`

## API

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/api/leaves` | 休暇申請 | 全ロール |
| GET | `/api/leaves` | 自分の申請一覧 | 全ロール |
| GET | `/api/leaves/pending` | 承認待ち一覧 | 上長 |
| PATCH | `/api/leaves/{id}/approve` | 承認 | 上長 |
| PATCH | `/api/leaves/{id}/reject` | 却下 | 上長 |

## 画面

| パス | ページ | コンポーネント |
|------|--------|--------------|
| `/leaves` | 休暇申請一覧 | `LeaveList`, `StatusBadge`（再利用） |
| `/leaves/new` | 休暇申請作成 | `LeaveForm` |
| `/approvals` | 承認待ち一覧（タブ追加） | `PendingLeaveList`, `LeaveApprovalActions` |

## Backend 実装順序（TDD）

1. Flyway マイグレーション `V6__create_leave_requests.sql`
2. Flyway マイグレーション `V7__add_attendance_paid_leave_columns.sql`
3. `LeaveType`, `DayType`, `LeaveStatus` Enum
4. `LeaveRequest` Entity
5. `AttendanceRecord` Entity 更新（`paidLeave`, `leaveType`, `dayType` フィールド追加）
6. `LeaveRequestRepository` テスト → 実装
7. `LeaveService` テスト → interface → 実装
8. `LeaveController` テスト → 実装
9. 統合テスト（承認フロー全体 + 勤怠レコード反映確認）

## Backend ファイル

```
packages/backend/src/
├── main/java/com/example/attendance/leave/
│   ├── controller/LeaveController.java
│   ├── dto/
│   │   ├── LeaveCreateRequest.java          (record)
│   │   ├── LeaveRejectRequest.java          (record)
│   │   ├── LeaveResponse.java               (record)
│   │   └── PendingLeaveResponse.java        (record)
│   ├── entity/
│   │   ├── LeaveRequest.java
│   │   ├── LeaveType.java                   (enum)
│   │   ├── LeaveStatus.java                 (enum)
│   │   └── DayType.java                     (enum)
│   ├── repository/LeaveRequestRepository.java
│   └── service/
│       ├── LeaveService.java                (interface)
│       └── LeaveServiceImpl.java
├── main/resources/db/migration/
│   ├── V6__create_leave_requests.sql
│   └── V7__add_attendance_paid_leave_columns.sql
└── test/java/com/example/attendance/leave/
    ├── controller/LeaveControllerTest.java
    ├── repository/LeaveRequestRepositoryTest.java
    └── service/LeaveServiceTest.java
```

## Frontend ファイル

```
packages/frontend/src/features/leave/
├── LeaveForm.tsx
├── LeaveList.tsx
├── PendingLeaveList.tsx
├── LeaveApprovalActions.tsx
├── leave-api.ts
└── useLeaves.ts

packages/frontend/src/app/(authenticated)/
├── leaves/
│   ├── page.tsx
│   └── new/page.tsx
└── approvals/
    └── page.tsx              (既存 — タブ追加)
```

## テストケース

### Backend

| テスト | 種類 | 内容 |
|--------|------|------|
| Repository: 申請者で検索 | DataJpaTest | requester_id で一覧取得 |
| Repository: ステータスで検索 | DataJpaTest | PENDING で絞り込み |
| Repository: 部署＋ステータスで検索 | DataJpaTest | 上長の承認待ち一覧 |
| Service: 休暇申請（全日・単日） | Unit | 正常に PENDING で作成される |
| Service: 休暇申請（全日・連続日数） | Unit | startDate〜endDate の範囲で作成 |
| Service: 休暇申請（午前休） | Unit | dayType=AM_HALF、単日のみ |
| Service: 休暇申請（午後休） | Unit | dayType=PM_HALF、単日のみ |
| Service: 休暇申請（過去日エラー） | Unit | startDate < today → 400 |
| Service: 休暇申請（startDate > endDate エラー） | Unit | バリデーションエラー |
| Service: 休暇申請（半日休で複数日エラー） | Unit | AM_HALF/PM_HALF + startDate != endDate → 400 |
| Service: 自分の申請一覧 | Unit | ログインユーザーの申請のみ |
| Service: 自分の申請一覧（ステータスフィルタ） | Unit | PENDING のみ返す |
| Service: 承認待ち一覧 | Unit | 自部署メンバーの PENDING のみ |
| Service: 承認（全日・単日） | Unit | AttendanceRecord に paidLeave=true が設定される |
| Service: 承認（全日・連続日数） | Unit | 各日の AttendanceRecord に反映 |
| Service: 承認（半日休） | Unit | 既存打刻は維持、paidLeave=true |
| Service: 承認（勤怠レコードなし） | Unit | 新規 AttendanceRecord 作成（paidLeave=true） |
| Service: 承認（承認者が部署の上長） | Unit | 正常完了 |
| Service: 承認（承認者が上長でない） | Unit | 403 相当の例外 |
| Service: 上長の自己承認 | Unit | 正常完了 |
| Service: 却下 | Unit | status=REJECTED、理由が保存される |
| Service: 承認（楽観ロックエラー） | Unit | 409 |
| Controller: POST /api/leaves | WebMvcTest | 201 |
| Controller: POST /api/leaves（バリデーションエラー） | WebMvcTest | 400 |
| Controller: GET /api/leaves | WebMvcTest | 200 |
| Controller: GET /api/leaves/pending（上長） | WebMvcTest | 200 |
| Controller: GET /api/leaves/pending（一般） | WebMvcTest | 403 |
| Controller: PATCH approve | WebMvcTest | 200 |
| Controller: PATCH reject | WebMvcTest | 200 |
| Controller: PATCH approve（409） | WebMvcTest | 409 |

### Frontend

| テスト | 種類 | 内容 |
|--------|------|------|
| LeaveForm: 休暇種別選択 | Component | セレクトボックスで ANNUAL/SPECIAL 選択可能 |
| LeaveForm: 日付選択 | Component | 開始日・終了日ピッカー |
| LeaveForm: 取得区分ラジオ | Component | FULL/AM_HALF/PM_HALF 選択 |
| LeaveForm: 半日休で複数日不可 | Component | AM_HALF/PM_HALF 選択時に終了日を開始日に固定 |
| LeaveForm: 過去日選択不可 | Component | 過去日が disabled |
| LeaveForm: 申請送信 | Component | API 呼び出し → 一覧へ遷移 |
| LeaveList: ステータスフィルタ | Component | PENDING/APPROVED/REJECTED 切り替え |
| LeaveList: 表示項目 | Component | 種別、期間、区分、ステータス、申請日 |
| PendingLeaveList: 承認ボタン | Component | 承認 → ステータス変化 |
| PendingLeaveList: 却下（理由入力） | Component | 却下ダイアログ → 理由入力 → 送信 |
| LeaveApprovalActions: 楽観ロックエラー | Component | トースト通知表示 |

## ビジネスルール

- 過去日の申請は不可（startDate >= today）
- startDate <= endDate
- 半日休（AM_HALF / PM_HALF）は単日のみ（startDate == endDate）
- 承認者は申請者の所属部署の上長（`isManager = true`）
- 上長自身の休暇申請は自己承認
- 承認時の反映:
  - 対象日に AttendanceRecord がない → 新規作成（`paidLeave=true`, `leaveType`, `dayType` 設定）
  - 対象日に AttendanceRecord がある → `paidLeave=true`, `leaveType`, `dayType` を設定（打刻はそのまま）
- 楽観ロック: 承認/却下操作時に version チェック
- 有給取得日に打刻があっても正常に受け付ける

## 月次集計への影響（Unit 06 で対応）

- `paidLeave = true` かつ `dayType = FULL` → 有給取得 1.0 日、欠勤にカウントしない
- `paidLeave = true` かつ `dayType = AM_HALF / PM_HALF` → 有給取得 0.5 日、欠勤にカウントしない
- 月次集計レスポンスに `paidLeaveDays` (BigDecimal) フィールドを追加

## 完了条件

- [ ] 全日休の休暇申請ができる（単日・連続日数）
- [ ] 半日休（午前休・午後休）の申請ができる
- [ ] 過去日の申請がエラーになる
- [ ] 上長が承認待ち一覧を確認できる
- [ ] 承認すると対象日の AttendanceRecord に有給フラグが立つ
- [ ] 却下すると理由が保存される
- [ ] 他部署の申請は承認できない
- [ ] 上長の自己承認が動作する
- [ ] 楽観ロックエラーが適切に処理される
- [ ] 有給取得日に打刻があっても正常に動作する
- [ ] フロントエンドの申請・承認フローが一通り動作する
- [ ] Backend テストカバレッジ 80% 以上（leave パッケージ）
