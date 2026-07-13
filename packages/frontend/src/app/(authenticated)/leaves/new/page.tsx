"use client";

import { LeaveForm } from "@/features/leave/LeaveForm";

export default function NewLeavePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">休暇申請 — 新規作成</h1>
      <LeaveForm />
    </div>
  );
}
