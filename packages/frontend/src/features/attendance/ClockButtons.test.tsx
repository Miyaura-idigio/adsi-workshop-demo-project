import { render, within } from "@testing-library/react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { ClockButtons } from "./ClockButtons";
import { useClockIn, useClockOut, useTodayStatus } from "./useAttendance";

vi.mock("./useAttendance", () => ({
  useTodayStatus: vi.fn(),
  useClockIn: vi.fn(),
  useClockOut: vi.fn(),
}));

const mockMutate = vi.fn();

function setupMocks(overrides: {
  status?: "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";
  isLoading?: boolean;
  isPending?: boolean;
} = {}) {
  const { status = "NOT_CLOCKED_IN", isLoading = false, isPending = false } = overrides;

  (useTodayStatus as Mock).mockReturnValue({
    data: { status, records: [] },
    isLoading,
  });
  (useClockIn as Mock).mockReturnValue({
    mutate: mockMutate,
    isPending,
  });
  (useClockOut as Mock).mockReturnValue({
    mutate: mockMutate,
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
});
