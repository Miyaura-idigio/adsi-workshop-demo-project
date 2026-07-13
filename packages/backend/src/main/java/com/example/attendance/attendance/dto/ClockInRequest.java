package com.example.attendance.attendance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ClockInRequest(
    @NotNull UUID employeeId,
    @Size(max = 100) String memo
) {}
