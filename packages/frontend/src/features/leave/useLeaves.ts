"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/Toast";
import { useAuth } from "@/features/auth/useAuth";
import {
  approveLeave,
  createLeave,
  fetchLeaves,
  fetchPendingLeaves,
  type LeaveCreateRequest,
  type LeaveStatus,
  rejectLeave,
} from "./leave-api";

const LEAVES_KEY = ["leaves"] as const;
const PENDING_LEAVES_KEY = ["leaves", "pending"] as const;

export function useLeaves(status?: LeaveStatus) {
  const { user } = useAuth();
  const requesterId = user?.id;

  return useQuery({
    queryKey: [...LEAVES_KEY, requesterId, status],
    queryFn: () => fetchLeaves(requesterId!, status),
    enabled: !!requesterId,
  });
}

export function useCreateLeave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LeaveCreateRequest) => createLeave(user!.id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVES_KEY });
      toast.success("休暇申請を送信しました");
    },
    onError: () => {
      toast.error("休暇申請の送信に失敗しました");
    },
  });
}

export function usePendingLeaves() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...PENDING_LEAVES_KEY, user?.id],
    queryFn: () => fetchPendingLeaves(user!.id),
    enabled: !!user?.isManager,
  });
}

export function useApproveLeave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      approveLeave(id, user!.id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_LEAVES_KEY });
      queryClient.invalidateQueries({ queryKey: LEAVES_KEY });
      toast.success("休暇申請を承認しました");
    },
    onError: () => {
      toast.error("承認に失敗しました");
    },
  });
}

export function useRejectLeave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, version }: { id: string; reason: string; version: number }) =>
      rejectLeave(id, user!.id, reason, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_LEAVES_KEY });
      queryClient.invalidateQueries({ queryKey: LEAVES_KEY });
      toast.success("休暇申請を却下しました");
    },
    onError: () => {
      toast.error("却下に失敗しました");
    },
  });
}
