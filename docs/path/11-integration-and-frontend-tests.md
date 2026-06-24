# 11: 統合テスト + フロントエンドテスト基盤構築

## プロンプト

> 現在どこまで終わってる？コミットしてる？

> コミットして、Frontend テストまで入れよう。

## やったこと

### 1. Backend 統合テスト（コミット済み・未 push だった5ファイルを検証 → コミット）

Phase B の各ドメインに対する `@SpringBootTest` + `@AutoConfigureMockMvc` の統合テスト。API エンドポイントを通しで確認する。

| テストクラス | 対象 | 内容 |
| ---- | ---- | ---- |
| `DepartmentIntegrationTest` | 部署管理 API | CRUD + バリデーション + 権限制御 |
| `EmployeeIntegrationTest` | 社員管理 API | CRUD + フィルタ + 退職処理 |
| `AuthIntegrationTest` | 認証 API | ログイン・ログアウト・`/me` |
| `SecurityAccessControlIntegrationTest` | アクセス制御 | 未認証拒否・ADMIN 専用エンドポイント |
| `AttendanceIntegrationTest` | 勤怠 API | 出勤・退勤・履歴・月次サマリー |

### 2. Frontend テスト基盤構築

テスト環境がゼロの状態から構築。

#### インストールしたパッケージ

| パッケージ | 用途 |
| ---- | ---- |
| `vitest` | テストランナー |
| `@testing-library/react` | React コンポーネントテスト |
| `@testing-library/dom` | DOM クエリ |
| `@testing-library/jest-dom` | カスタムマッチャー (`toBeInTheDocument` 等) |
| `@testing-library/user-event` | ユーザー操作シミュレーション |
| `jsdom` | ブラウザ環境エミュレーション |
| `@vitejs/plugin-react` | Vitest での JSX 変換 |

#### 設定ファイル

| ファイル | 内容 |
| ---- | ---- |
| `vitest.config.ts` | Vitest 設定（jsdom 環境、`@/` エイリアス、セットアップファイル指定） |
| `src/test/setup.ts` | `@testing-library/jest-dom/vitest` のインポート |
| `src/test/test-utils.tsx` | `QueryClientProvider` 付きの `renderWithProviders` ヘルパー |

#### テストファイル（53 件全パス）

**純粋関数テスト（38件）**

| テストファイル | テスト対象 | テスト数 |
| ---- | ---- | ---- |
| `src/lib/validators.test.ts` | `isNonEmpty`, `isValidEmail`, `isWithinLength` | 13 |
| `src/features/attendance/format.test.ts` | `formatMinutes`, `formatTime`, `formatDate` | 9 |
| `src/lib/api-client.test.ts` | `ApiClientError`, `apiClient.get/post/put/delete`, 204/401 ハンドリング | 16 |

**コンポーネントテスト（15件）**

| テストファイル | テスト対象 | テスト数 |
| ---- | ---- | ---- |
| `src/components/StatusBadge.test.tsx` | configMap によるラベル・variant 切替、未定義ステータスのフォールバック | 2 |
| `src/components/MonthSelector.test.tsx` | 年月表示、前月/次月ナビゲーション、年跨ぎ（1月→12月、12月→1月） | 5 |
| `src/features/attendance/MonthlySummary.test.tsx` | サマリーデータ表示、ローディング状態、null サマリー | 3 |
| `src/features/auth/LoginForm.test.tsx` | フォーム要素の存在、送信時の mutate 呼び出し、ローディング、エラー表示（ApiClientError / 汎用） | 5 |

### 3. lefthook 修正

Next.js 16 で `--no-lint` オプションが廃止されていたため、`lefthook.yml` の `frontend-build` コマンドから除去。

## つまずき

### base-ui (shadcn/ui v4) と jsdom の互換性問題

shadcn/ui v4 は `@base-ui/react` をプリミティブとして使用しており、jsdom 環境で 2 つの問題が発生した。

**二重レンダリング**: `@base-ui/react/input` の `Input` コンポーネントが jsdom で 2 つの `<div>` コンテナにフォームを二重レンダリングしてしまい、`getByRole("button")` が重複エラーになる。

**クリックイベント不発火**: `@base-ui/react/button` の `Button` コンポーネントが `userEvent.click` に反応しない。`fireEvent.click` でも不発火。

**対処**: テストファイルごとに `vi.mock("@/components/ui/button")` と `vi.mock("@/components/ui/input")` でネイティブ HTML 要素に差し替え。Button のクリックテストは `fireEvent.click` + `container.querySelectorAll("button")` で動作確認。

### `--legacy-peer-deps` が必要

`@vitejs/plugin-react` v6 と `@babel/core` v8 の peer dependency 競合で `npm install` が失敗。`--legacy-peer-deps` で解決。

## コミット履歴

```text
aee80c7 test(backend): Phase B 統合テストを追加（部署・社員・認証・勤怠・アクセス制御）
bf2a0da test(frontend): Vitest + Testing Library によるフロントエンドテスト基盤を構築（53件全パス）
```
