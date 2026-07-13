"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DayType, LeaveType } from "./leave-api";
import { useCreateLeave } from "./useLeaves";

export function LeaveForm() {
  const router = useRouter();
  const createMutation = useCreateLeave();

  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayType, setDayType] = useState<DayType>("FULL");
  const [reason, setReason] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const isHalfDay = dayType === "AM_HALF" || dayType === "PM_HALF";
  const isValid = startDate && endDate && (!isHalfDay || startDate === endDate);

  function handleDayTypeChange(value: DayType) {
    setDayType(value);
    if (value !== "FULL" && startDate) {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (isHalfDay) {
      setEndDate(value);
    } else if (!endDate || value > endDate) {
      setEndDate(value);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    createMutation.mutate(
      {
        leaveType,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        dayType,
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          router.push("/leaves");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-6">
      <div className="space-y-2">
        <Label htmlFor="leaveType">休暇種別</Label>
        <select
          id="leaveType"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value as LeaveType)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        >
          <option value="ANNUAL">年次有給休暇</option>
          <option value="SPECIAL">特別休暇</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>取得区分</Label>
        <div className="flex gap-4">
          {(
            [
              ["FULL", "全日"],
              ["AM_HALF", "午前休"],
              ["PM_HALF", "午後休"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="dayType"
                value={value}
                checked={dayType === value}
                onChange={() => handleDayTypeChange(value)}
                className="accent-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">開始日</Label>
        <Input
          id="startDate"
          type="date"
          min={today}
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          required
        />
      </div>

      {!isHalfDay && (
        <div className="space-y-2">
          <Label htmlFor="endDate">終了日</Label>
          <Input
            id="endDate"
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">理由（任意）</Label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
          placeholder="理由があれば入力してください"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid || createMutation.isPending}>
          {createMutation.isPending ? "送信中..." : "申請する"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/leaves")}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
