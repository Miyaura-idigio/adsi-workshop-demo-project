package com.example.attendance.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LeaveRejectRequest(
        @NotBlank String reason,
        @NotNull Long version
) {}
