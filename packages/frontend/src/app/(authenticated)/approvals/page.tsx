"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { PendingCorrectionList } from "@/features/correction/PendingCorrectionList";
import { PendingLeaveList } from "@/features/leave/PendingLeaveList";

type Tab = "corrections" | "leaves";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("corrections");

  if (!user?.isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">このページを閲覧する権限がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">承認</h1>
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab("corrections")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "corrections"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          勤怠修正
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leaves")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "leaves"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          休暇申請
        </button>
      </div>
      {activeTab === "corrections" && <PendingCorrectionList />}
      {activeTab === "leaves" && <PendingLeaveList />}
    </div>
  );
}
