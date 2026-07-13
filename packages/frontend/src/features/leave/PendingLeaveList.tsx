"use client";

import { type Column, DataTable } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/features/attendance/format";
import { LeaveApprovalActions } from "./LeaveApprovalActions";
import type { PendingLeaveResponse } from "./leave-api";
import { usePendingLeaves } from "./useLeaves";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "年次有給",
  SPECIAL: "特別休暇",
};

const DAY_TYPE_LABELS: Record<string, string> = {
  FULL: "全日",
  AM_HALF: "午前休",
  PM_HALF: "午後休",
};

const columns: Column<PendingLeaveResponse>[] = [
  {
    key: "requesterName",
    header: "申請者",
  },
  {
    key: "leaveType",
    header: "種別",
    render: (item) => LEAVE_TYPE_LABELS[item.leaveType] ?? item.leaveType,
  },
  {
    key: "startDate",
    header: "期間",
    render: (item) =>
      item.startDate === item.endDate
        ? formatDate(item.startDate)
        : `${formatDate(item.startDate)} 〜 ${formatDate(item.endDate)}`,
  },
  {
    key: "dayType",
    header: "区分",
    render: (item) => DAY_TYPE_LABELS[item.dayType] ?? item.dayType,
  },
  {
    key: "reason",
    header: "理由",
    render: (item) => <span className="max-w-[200px] truncate block">{item.reason ?? "-"}</span>,
  },
  {
    key: "actions",
    header: "",
    render: (item) => <LeaveApprovalActions leaveId={item.id} version={item.version} />,
  },
];

export function PendingLeaveList() {
  const { data, isLoading } = usePendingLeaves();

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">
          {["r1", "r2", "r3", "r4", "r5"].map((id) => (
            <Skeleton key={id} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable<PendingLeaveResponse & Record<string, unknown>>
          columns={columns as Column<PendingLeaveResponse & Record<string, unknown>>[]}
          data={(data ?? []) as (PendingLeaveResponse & Record<string, unknown>)[]}
          rowKey={(item) => item.id}
          emptyMessage="承認待ちの休暇申請はありません"
        />
      )}
    </div>
  );
}
