"use client";

import { type Column, DataTable } from "@/components/DataTable";
import type { DailyAttendanceResponse } from "./attendance-api";
import { formatDate, formatMinutes, formatTime } from "./format";

function firstClockIn(day: DailyAttendanceResponse): string {
  const record = day.records[0];
  return record ? formatTime(record.clockIn) : "--:--";
}

function lastClockOut(day: DailyAttendanceResponse): string {
  const last = day.records[day.records.length - 1];
  return last?.clockOut ? formatTime(last.clockOut) : "--:--";
}

function memoDisplay(day: DailyAttendanceResponse): React.ReactNode {
  const record = day.records[0];
  if (!record) return null;
  const parts: string[] = [];
  if (record.clockInMemo) parts.push(`出: ${record.clockInMemo}`);
  if (record.clockOutMemo) parts.push(`退: ${record.clockOutMemo}`);
  if (parts.length === 0) return null;
  return <span className="text-xs">{parts.join(" / ")}</span>;
}

const columns: Column<DailyAttendanceResponse>[] = [
  { key: "date", header: "日付", render: (day) => formatDate(day.date) },
  { key: "clockIn", header: "出勤", render: (day) => firstClockIn(day) },
  { key: "clockOut", header: "退勤", render: (day) => lastClockOut(day) },
  {
    key: "workMinutes",
    header: "勤務時間",
    render: (day) => (day.workMinutes > 0 ? formatMinutes(day.workMinutes) : "-"),
  },
  { key: "memo", header: "メモ", render: (day) => memoDisplay(day) },
];

interface MemberHistoryProps {
  days: DailyAttendanceResponse[];
}

export function MemberHistory({ days }: MemberHistoryProps) {
  return (
    <DataTable<DailyAttendanceResponse & Record<string, unknown>>
      columns={columns as Column<DailyAttendanceResponse & Record<string, unknown>>[]}
      data={days as (DailyAttendanceResponse & Record<string, unknown>)[]}
      rowKey={(item) => item.date}
      emptyMessage="勤怠データがありません"
    />
  );
}
