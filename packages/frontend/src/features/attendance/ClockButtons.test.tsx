import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { ClockButtons } from "./ClockButtons";
import { useClockIn, useClockOut, useTodayStatus } from "./useAttendance";

vi.mock("./useAttendance", () => ({
  useTodayStatus: vi.fn(),
  useClockIn: vi.fn(),
  useClockOut: vi.fn(),
}));

const mockClockIn = vi.fn();
const mockClockOut = vi.fn();

function setupMocks(
  overrides: {
    status?: "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";
    isLoading?: boolean;
    isPending?: boolean;
  } = {},
) {
  const { status = "NOT_CLOCKED_IN", isLoading = false, isPending = false } = overrides;

  (useTodayStatus as Mock).mockReturnValue({
    data: { status, records: [] },
    isLoading,
  });
  (useClockIn as Mock).mockReturnValue({
    mutate: mockClockIn,
    isPending,
  });
  (useClockOut as Mock).mockReturnValue({
    mutate: mockClockOut,
    isPending,
  });
}

describe("ClockButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ボタンの有効/無効状態", () => {
    it("未出勤: 出勤ボタンが有効、退勤ボタンが無効", () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      expect(view.getByRole("button", { name: /出勤/ })).toBeEnabled();
      expect(view.getByRole("button", { name: /退勤/ })).toBeDisabled();
    });

    it("勤務中: 出勤ボタンが無効、退勤ボタンが有効", () => {
      setupMocks({ status: "CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      expect(view.getByRole("button", { name: /出勤/ })).toBeDisabled();
      expect(view.getByRole("button", { name: /退勤/ })).toBeEnabled();
    });

    it("退勤済み: 両方のボタンが無効", () => {
      setupMocks({ status: "CLOCKED_OUT" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      expect(view.getByRole("button", { name: /出勤/ })).toBeDisabled();
      expect(view.getByRole("button", { name: /退勤/ })).toBeDisabled();
    });

    it("処理中(isPending): 両方のボタンが無効", () => {
      setupMocks({ status: "NOT_CLOCKED_IN", isPending: true });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      expect(view.getByRole("button", { name: /出勤/ })).toBeDisabled();
      expect(view.getByRole("button", { name: /退勤/ })).toBeDisabled();
    });
  });

  describe("ボタンクリック時の動作", () => {
    it("未出勤で出勤ボタンを押すとclockIn mutateが呼ばれる", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      await userEvent.click(view.getByRole("button", { name: /出勤/ }));

      expect(mockClockIn).toHaveBeenCalledTimes(1);
      expect(mockClockOut).not.toHaveBeenCalled();
    });

    it("勤務中で退勤ボタンを押すとclockOut mutateが呼ばれる", async () => {
      setupMocks({ status: "CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      await userEvent.click(view.getByRole("button", { name: /退勤/ }));

      expect(mockClockOut).toHaveBeenCalledTimes(1);
      expect(mockClockIn).not.toHaveBeenCalled();
    });

    it("無効状態のボタンをクリックしてもmutateが呼ばれない", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      await userEvent.click(view.getByRole("button", { name: /退勤/ }));

      expect(mockClockIn).not.toHaveBeenCalled();
      expect(mockClockOut).not.toHaveBeenCalled();
    });
  });

  describe("メモ入力欄", () => {
    it("打刻ボタンの近くにメモ入力欄が表示される", () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      expect(view.getByPlaceholderText("メモ（任意・100文字以内）")).toBeInTheDocument();
    });

    it("メモを入力して出勤ボタンを押すとメモ付きでclockInが呼ばれる", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      const memoInput = view.getByPlaceholderText("メモ（任意・100文字以内）");
      await userEvent.type(memoInput, "電車遅延");
      await userEvent.click(view.getByRole("button", { name: /出勤/ }));

      expect(mockClockIn).toHaveBeenCalledWith("電車遅延");
    });

    it("メモ未入力で出勤ボタンを押すと空文字なしでclockInが呼ばれる", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      await userEvent.click(view.getByRole("button", { name: /出勤/ }));

      expect(mockClockIn).toHaveBeenCalledWith(undefined);
    });

    it("メモを入力して退勤ボタンを押すとメモ付きでclockOutが呼ばれる", async () => {
      setupMocks({ status: "CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      const memoInput = view.getByPlaceholderText("メモ（任意・100文字以内）");
      await userEvent.type(memoInput, "早退：体調不良");
      await userEvent.click(view.getByRole("button", { name: /退勤/ }));

      expect(mockClockOut).toHaveBeenCalledWith("早退：体調不良");
    });

    it("メモが100文字を超えて入力できない", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      const memoInput = view.getByPlaceholderText("メモ（任意・100文字以内）") as HTMLInputElement;
      const longText = "あ".repeat(150);
      await userEvent.type(memoInput, longText);

      expect(memoInput.value.length).toBeLessThanOrEqual(100);
    });

    it("打刻成功後にメモ入力欄がクリアされる", async () => {
      setupMocks({ status: "NOT_CLOCKED_IN" });
      const { container } = render(<ClockButtons />);
      const view = within(container);

      const memoInput = view.getByPlaceholderText("メモ（任意・100文字以内）") as HTMLInputElement;
      await userEvent.type(memoInput, "テストメモ");
      await userEvent.click(view.getByRole("button", { name: /出勤/ }));

      expect(memoInput.value).toBe("");
    });
  });
});
