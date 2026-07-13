package com.example.attendance.attendance.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateMemoRequest(
    @NotNull UUID employeeId,
    @NotNull @Pattern(regexp = "CLOCK_IN|CLOCK_OUT") String type,
    @Size(max = 100) String memo
) {}
