"use client";

import Link from "next/link";
import { useState } from "react";
import { type Column, DataTable } from "@/components/DataTable";
import { MonthSelector } from "@/components/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamMemberSummaryResponse } from "@/features/attendance/attendance-api";
import { formatMinutes } from "@/features/attendance/format";
import { useTeamAttendance } from "@/features/attendance/useAttendance";
import { useAuth } from "@/features/auth/useAuth";

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const columns: Column<TeamMemberSummaryResponse>[] = [
  {
    key: "employeeName",
    header: "社員名",
    render: (m) => (
      <Link href={`/team/${m.employeeId}`} className="text-blue-600 hover:underline">
        {m.employeeName}
      </Link>
    ),
  },
  {
    key: "workDays",
    header: "出勤日数",
    render: (m) => `${m.workDays}日`,
  },
  {
    key: "totalWorkMinutes",
    header: "総勤務時間",
    render: (m) => formatMinutes(m.totalWorkMinutes),
  },
  {
    key: "totalOvertimeMinutes",
    header: "総残業時間",
    render: (m) => formatMinutes(m.totalOvertimeMinutes),
  },
  {
    key: "absentDays",
    header: "欠勤日数",
    render: (m) => `${m.absentDays}日`,
  },
];

export default function TeamPage() {
  const { user } = useAuth();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const monthStr = toMonthString(year, month);

  const { data, isLoading } = useTeamAttendance(monthStr);

  if (!user?.isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">このページを閲覧する権限がありません</p>
      </div>
    );
  }

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">チーム勤怠</h1>
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {["r1", "r2", "r3", "r4", "r5"].map((id) => (
            <Skeleton key={id} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <DataTable<TeamMemberSummaryResponse & Record<string, unknown>>
          columns={columns as Column<TeamMemberSummaryResponse & Record<string, unknown>>[]}
          data={(data ?? []) as (TeamMemberSummaryResponse & Record<string, unknown>)[]}
          rowKey={(item) => item.employeeId}
          emptyMessage="チームメンバーのデータがありません"
        />
      )}
    </div>
  );
}
