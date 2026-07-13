"use client";

import { LeaveList } from "@/features/leave/LeaveList";

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">休暇申請</h1>
      <LeaveList />
    </div>
  );
}
