package com.example.attendance.leave.dto;

import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record LeaveCreateRequest(
        @NotNull LeaveType leaveType,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull DayType dayType,
        String reason
) {}
