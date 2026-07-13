import { apiClient } from "@/lib/api-client";

export interface AttendanceRecordResponse {
  id: string;
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  corrected: boolean;
  clockInMemo: string | null;
  clockOutMemo: string | null;
  clockInMemoUpdatedAt: string | null;
  clockOutMemoUpdatedAt: string | null;
}

export interface TodayStatusResponse {
  status: "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";
  records: AttendanceRecordResponse[];
}

export interface DailyAttendanceResponse {
  date: string;
  records: AttendanceRecordResponse[];
  totalWorkMinutes: number;
  breakMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
}

export interface MonthlySummaryResponse {
  workDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  absentDays: number;
}

export interface AttendanceHistoryResponse {
  month: string;
  days: DailyAttendanceResponse[];
  summary: MonthlySummaryResponse;
}

export interface TeamMemberSummaryResponse {
  employeeId: string;
  employeeName: string;
  workDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  absentDays: number;
}

export function clockIn(employeeId: string, memo?: string): Promise<AttendanceRecordResponse> {
  return apiClient.post<AttendanceRecordResponse>("/api/attendance/clock-in", {
    employeeId,
    memo: memo || null,
  });
}

export function clockOut(employeeId: string, memo?: string): Promise<AttendanceRecordResponse> {
  return apiClient.post<AttendanceRecordResponse>("/api/attendance/clock-out", {
    employeeId,
    memo: memo || null,
  });
}

export function updateMemo(
  recordId: string,
  employeeId: string,
  type: "CLOCK_IN" | "CLOCK_OUT",
  memo: string,
): Promise<AttendanceRecordResponse> {
  return apiClient.patch<AttendanceRecordResponse>(`/api/attendance/${recordId}/memo`, {
    employeeId,
    type,
    memo,
  });
}

export function fetchTodayStatus(employeeId: string): Promise<TodayStatusResponse> {
  return apiClient.get<TodayStatusResponse>(`/api/attendance/today?employeeId=${employeeId}`);
}

export function fetchHistory(
  employeeId: string,
  month: string,
): Promise<AttendanceHistoryResponse> {
  return apiClient.get<AttendanceHistoryResponse>(
    `/api/attendance/history?employeeId=${employeeId}&month=${month}`,
  );
}

export function fetchTeamAttendance(
  managerId: string,
  month: string,
): Promise<TeamMemberSummaryResponse[]> {
  return apiClient.get<TeamMemberSummaryResponse[]>(
    `/api/attendance/team?managerId=${managerId}&month=${month}`,
  );
}

export function fetchAllAttendance(
  month: string,
  departmentId?: string,
): Promise<TeamMemberSummaryResponse[]> {
  const params = new URLSearchParams({ month });
  if (departmentId) {
    params.set("departmentId", departmentId);
  }
  return apiClient.get<TeamMemberSummaryResponse[]>(`/api/attendance/all?${params.toString()}`);
}
