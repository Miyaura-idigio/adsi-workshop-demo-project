"use client";

import Link from "next/link";
import { useState } from "react";
import { type Column, DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/features/attendance/format";
import type { LeaveResponse, LeaveStatus } from "./leave-api";
import { useLeaves } from "./useLeaves";

const STATUS_CONFIG_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "申請中", variant: "secondary" },
  APPROVED: { label: "承認済", variant: "default" },
  REJECTED: { label: "却下", variant: "destructive" },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "年次有給",
  SPECIAL: "特別休暇",
};

const DAY_TYPE_LABELS: Record<string, string> = {
  FULL: "全日",
  AM_HALF: "午前休",
  PM_HALF: "午後休",
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "PENDING", label: "申請中" },
  { value: "APPROVED", label: "承認済" },
  { value: "REJECTED", label: "却下" },
];

const columns: Column<LeaveResponse>[] = [
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
    key: "status",
    header: "ステータス",
    render: (item) => <StatusBadge status={item.status} configMap={STATUS_CONFIG_MAP} />,
  },
  {
    key: "rejectReason",
    header: "却下理由",
    render: (item) =>
      item.rejectReason ? (
        <span className="max-w-[200px] truncate block text-destructive">{item.rejectReason}</span>
      ) : (
        "-"
      ),
  },
];

export function LeaveList() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const status = statusFilter === "ALL" ? undefined : (statusFilter as LeaveStatus);
  const { data, isLoading } = useLeaves(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button render={<Link href="/leaves/new" />}>新規申請</Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {["r1", "r2", "r3", "r4", "r5"].map((id) => (
            <Skeleton key={id} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable<LeaveResponse & Record<string, unknown>>
          columns={columns as Column<LeaveResponse & Record<string, unknown>>[]}
          data={(data ?? []) as (LeaveResponse & Record<string, unknown>)[]}
          rowKey={(item) => item.id}
          emptyMessage="休暇申請はありません"
        />
      )}
    </div>
  );
}
