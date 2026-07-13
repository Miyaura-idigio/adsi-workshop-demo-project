"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "./format";
import { useTodayStatus } from "./useAttendance";

export function TodayRecords() {
  const { data: todayStatus, isLoading } = useTodayStatus();

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const records = todayStatus?.records ?? [];

  if (records.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="text-sm font-medium mb-2">本日の打刻記録</h3>
        <p className="text-sm text-muted-foreground">打刻記録はありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-sm font-medium mb-3">本日の打刻記録</h3>
      <div className="space-y-2">
        {records.map((record) => (
          <div key={record.id} className="text-sm py-1.5 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatTime(record.clockIn)}</span>
                <span className="text-muted-foreground">~</span>
                <span className="font-medium">
                  {record.clockOut ? formatTime(record.clockOut) : "--:--"}
                </span>
              </div>
              {record.corrected && <Badge variant="outline">修正済み</Badge>}
            </div>
            {(record.clockInMemo || record.clockOutMemo) && (
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                {record.clockInMemo && <p>出勤: {record.clockInMemo}</p>}
                {record.clockOutMemo && <p>退勤: {record.clockOutMemo}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
