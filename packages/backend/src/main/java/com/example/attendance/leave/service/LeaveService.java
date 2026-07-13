package com.example.attendance.leave.service;

import com.example.attendance.leave.dto.LeaveCreateRequest;
import com.example.attendance.leave.dto.LeaveResponse;
import com.example.attendance.leave.dto.PendingLeaveResponse;
import com.example.attendance.leave.entity.LeaveStatus;

import java.util.List;
import java.util.UUID;

public interface LeaveService {

    LeaveResponse create(UUID requesterId, LeaveCreateRequest request);

    List<LeaveResponse> findByRequester(UUID requesterId, LeaveStatus status);

    List<PendingLeaveResponse> findPending(UUID managerId);

    LeaveResponse approve(UUID leaveRequestId, UUID approverId, Long version);

    LeaveResponse reject(UUID leaveRequestId, UUID approverId, String reason, Long version);
}
