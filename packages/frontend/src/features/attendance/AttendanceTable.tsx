"use client";

import { useEffect, useRef, useState } from "react";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import type { AttendanceRecordResponse, DailyAttendanceResponse } from "./attendance-api";
import { formatDate, formatMinutes, formatTime } from "./format";
import { useUpdateMemo } from "./useAttendance";

function firstClockIn(day: DailyAttendanceResponse): string {
  const record = day.records[0];
  return record ? formatTime(record.clockIn) : "--:--";
}

function lastClockOut(day: DailyAttendanceResponse): string {
  const last = day.records[day.records.length - 1];
  return last?.clockOut ? formatTime(last.clockOut) : "--:--";
}

function hasCorrected(day: DailyAttendanceResponse): boolean {
  return day.records.some((r) => r.corrected);
}

function formatEditedAt(isoString: string | null): string | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `(編集済み ${mm}/${dd} ${hh}:${min})`;
}

function isCurrentMonth(dateStr: string): boolean {
  const now = new Date();
  const target = new Date(`${dateStr}T00:00:00`);
  return now.getFullYear() === target.getFullYear() && now.getMonth() === target.getMonth();
}

interface InlineMemoProps {
  record: AttendanceRecordResponse;
  type: "CLOCK_IN" | "CLOCK_OUT";
  editable: boolean;
}

function InlineMemo({ record, type, editable }: InlineMemoProps) {
  const memo = type === "CLOCK_IN" ? record.clockInMemo : record.clockOutMemo;
  const updatedAt =
    type === "CLOCK_IN" ? record.clockInMemoUpdatedAt : record.clockOutMemoUpdatedAt;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memo ?? "");
  const updateMutation = useUpdateMemo();

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 100))}
        maxLength={100}
        className="border rounded px-1 py-0.5 text-xs w-full"
        onBlur={() => {
          const trimmed = value.trim();
          if (trimmed !== (memo ?? "")) {
            updateMutation.mutate({ recordId: record.id, type, memo: trimmed });
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setValue(memo ?? "");
            setEditing(false);
          }
        }}
      />
    );
  }

  if (!memo && !editable) return null;

  const content = (
    <>
      {memo || <span className="text-muted-foreground italic">-</span>}
      {updatedAt && (
        <span className="text-muted-foreground ml-1 text-[10px]">{formatEditedAt(updatedAt)}</span>
      )}
    </>
  );

  if (!editable) {
    return <span>{content}</span>;
  }

  return (
    <button
      type="button"
      className="cursor-pointer hover:bg-muted/50 rounded px-1 text-left"
      onClick={() => {
        setValue(memo ?? "");
        setEditing(true);
      }}
    >
      {content}
    </button>
  );
}

function MemoCell({ day }: { day: DailyAttendanceResponse }) {
  const record = day.records[0];
  if (!record) return null;
  const editable = isCurrentMonth(day.date);

  return (
    <div className="space-y-0.5 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground w-6">出:</span>
        <InlineMemo record={record} type="CLOCK_IN" editable={editable} />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground w-6">退:</span>
        <InlineMemo record={record} type="CLOCK_OUT" editable={editable} />
      </div>
    </div>
  );
}

const columns: Column<DailyAttendanceResponse>[] = [
  {
    key: "date",
    header: "日付",
    render: (day) => formatDate(day.date),
  },
  {
    key: "clockIn",
    header: "出勤",
    render: (day) => firstClockIn(day),
  },
  {
    key: "clockOut",
    header: "退勤",
    render: (day) => lastClockOut(day),
  },
  {
    key: "workMinutes",
    header: "勤務時間",
    render: (day) => (day.workMinutes > 0 ? formatMinutes(day.workMinutes) : "-"),
  },
  {
    key: "breakMinutes",
    header: "休憩",
    render: (day) => (day.breakMinutes > 0 ? formatMinutes(day.breakMinutes) : "-"),
  },
  {
    key: "overtimeMinutes",
    header: "残業",
    render: (day) => (day.overtimeMinutes > 0 ? formatMinutes(day.overtimeMinutes) : "-"),
  },
  {
    key: "memo",
    header: "メモ",
    render: (day) => <MemoCell day={day} />,
  },
  {
    key: "corrected",
    header: "",
    render: (day) => (hasCorrected(day) ? <Badge variant="outline">修正</Badge> : null),
  },
];

interface AttendanceTableProps {
  days: DailyAttendanceResponse[];
}

export function AttendanceTable({ days }: AttendanceTableProps) {
  return (
    <DataTable<DailyAttendanceResponse & Record<string, unknown>>
      columns={columns as Column<DailyAttendanceResponse & Record<string, unknown>>[]}
      data={days as (DailyAttendanceResponse & Record<string, unknown>)[]}
      rowKey={(item) => item.date}
      emptyMessage="勤怠データがありません"
    />
  );
}
