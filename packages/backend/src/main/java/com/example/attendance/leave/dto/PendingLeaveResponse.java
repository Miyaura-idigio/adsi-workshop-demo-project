package com.example.attendance.leave.dto;

import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveRequest;
import com.example.attendance.leave.entity.LeaveType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PendingLeaveResponse(
        UUID id,
        UUID requesterId,
        String requesterName,
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        DayType dayType,
        String reason,
        Long version,
        Instant createdAt
) {
    public static PendingLeaveResponse from(LeaveRequest entity) {
        return new PendingLeaveResponse(
                entity.getId(),
                entity.getRequester().getId(),
                entity.getRequester().getName(),
                entity.getLeaveType(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getDayType(),
                entity.getReason(),
                entity.getVersion(),
                entity.getCreatedAt()
        );
    }
}
