"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { MonthSelector } from "@/components/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberHistory } from "@/features/attendance/MemberHistory";
import { useMemberHistory } from "@/features/attendance/useAttendance";
import { useAuth } from "@/features/auth/useAuth";

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function TeamMemberDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { user } = useAuth();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const monthStr = toMonthString(year, month);

  const { data, isLoading } = useMemberHistory(employeeId, monthStr);

  if (!user?.isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">このページを閲覧する権限がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メンバー勤怠詳細</h1>
        <MonthSelector
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <MemberHistory days={data?.days ?? []} />
      )}
    </div>
  );
}
