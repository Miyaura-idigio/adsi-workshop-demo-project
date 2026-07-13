import { apiClient } from "@/lib/api-client";

export type LeaveType = "ANNUAL" | "SPECIAL";
export type DayType = "FULL" | "AM_HALF" | "PM_HALF";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveResponse {
  id: string;
  requesterId: string;
  requesterName: string;
  approverId: string | null;
  approverName: string | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayType: DayType;
  reason: string | null;
  status: LeaveStatus;
  rejectReason: string | null;
  version: number;
  createdAt: string;
}

export interface PendingLeaveResponse {
  id: string;
  requesterId: string;
  requesterName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayType: DayType;
  reason: string | null;
  version: number;
  createdAt: string;
}

export interface LeaveCreateRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayType: DayType;
  reason?: string | null;
}

export function createLeave(
  requesterId: string,
  request: LeaveCreateRequest,
): Promise<LeaveResponse> {
  return apiClient.post<LeaveResponse>(`/api/leaves?requesterId=${requesterId}`, request);
}

export function fetchLeaves(requesterId: string, status?: LeaveStatus): Promise<LeaveResponse[]> {
  const params = new URLSearchParams({ requesterId });
  if (status) {
    params.set("status", status);
  }
  return apiClient.get<LeaveResponse[]>(`/api/leaves?${params.toString()}`);
}

export function fetchPendingLeaves(managerId: string): Promise<PendingLeaveResponse[]> {
  return apiClient.get<PendingLeaveResponse[]>(`/api/leaves/pending?managerId=${managerId}`);
}

export function approveLeave(
  id: string,
  approverId: string,
  version: number,
): Promise<LeaveResponse> {
  return apiClient.patch<LeaveResponse>(
    `/api/leaves/${id}/approve?approverId=${approverId}&version=${version}`,
  );
}

export function rejectLeave(
  id: string,
  approverId: string,
  reason: string,
  version: number,
): Promise<LeaveResponse> {
  return apiClient.patch<LeaveResponse>(`/api/leaves/${id}/reject?approverId=${approverId}`, {
    reason,
    version,
  });
}
