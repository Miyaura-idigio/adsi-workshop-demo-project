package com.example.attendance.leave.dto;

import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveRequest;
import com.example.attendance.leave.entity.LeaveStatus;
import com.example.attendance.leave.entity.LeaveType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveResponse(
        UUID id,
        UUID requesterId,
        String requesterName,
        UUID approverId,
        String approverName,
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        DayType dayType,
        String reason,
        LeaveStatus status,
        String rejectReason,
        Long version,
        Instant createdAt
) {
    public static LeaveResponse from(LeaveRequest entity) {
        return new LeaveResponse(
                entity.getId(),
                entity.getRequester().getId(),
                entity.getRequester().getName(),
                entity.getApprover() != null ? entity.getApprover().getId() : null,
                entity.getApprover() != null ? entity.getApprover().getName() : null,
                entity.getLeaveType(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getDayType(),
                entity.getReason(),
                entity.getStatus(),
                entity.getRejectReason(),
                entity.getVersion(),
                entity.getCreatedAt()
        );
    }
}
