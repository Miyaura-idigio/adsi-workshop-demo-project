"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/Toast";
import { useAuth } from "@/features/auth/useAuth";
import {
  clockIn,
  clockOut,
  fetchHistory,
  fetchMemberHistory,
  fetchTeamAttendance,
  fetchTodayStatus,
  updateMemo,
} from "./attendance-api";

const TODAY_STATUS_KEY = ["attendance", "today"] as const;
const HISTORY_KEY = ["attendance", "history"] as const;
const TEAM_KEY = ["attendance", "team"] as const;
const MEMBER_HISTORY_KEY = ["attendance", "member-history"] as const;

export function useTodayStatus() {
  const { user } = useAuth();
  const employeeId = user?.id;

  return useQuery({
    queryKey: [...TODAY_STATUS_KEY, employeeId],
    queryFn: () => fetchTodayStatus(employeeId!),
    enabled: !!employeeId,
    refetchInterval: 60 * 1000,
  });
}

export function useClockIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memo?: string) => clockIn(user!.id, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_STATUS_KEY });
      toast.success("出勤を記録しました");
    },
  });
}

export function useClockOut() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memo?: string) => clockOut(user!.id, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_STATUS_KEY });
      toast.success("退勤を記録しました");
    },
  });
}

export function useAttendanceHistory(month: string) {
  const { user } = useAuth();
  const employeeId = user?.id;

  return useQuery({
    queryKey: [...HISTORY_KEY, employeeId, month],
    queryFn: () => fetchHistory(employeeId!, month),
    enabled: !!employeeId && !!month,
  });
}

export function useTeamAttendance(month: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...TEAM_KEY, user?.id, month],
    queryFn: () => fetchTeamAttendance(user!.id, month),
    enabled: !!user?.isManager && !!month,
  });
}

export function useUpdateMemo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { recordId: string; type: "CLOCK_IN" | "CLOCK_OUT"; memo: string }) =>
      updateMemo(params.recordId, user!.id, params.type, params.memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODAY_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
      toast.success("メモを更新しました");
    },
  });
}

export function useMemberHistory(employeeId: string, month: string) {
  return useQuery({
    queryKey: [...MEMBER_HISTORY_KEY, employeeId, month],
    queryFn: () => fetchMemberHistory(employeeId, month),
    enabled: !!employeeId && !!month,
  });
}
