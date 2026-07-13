package com.example.attendance.attendance.dto;

import com.example.attendance.attendance.entity.AttendanceRecord;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AttendanceRecordResponse(
    UUID id,
    LocalDate workDate,
    Instant clockIn,
    Instant clockOut,
    boolean corrected,
    String clockInMemo,
    String clockOutMemo,
    Instant clockInMemoUpdatedAt,
    Instant clockOutMemoUpdatedAt
) {
    public static AttendanceRecordResponse from(AttendanceRecord record) {
        return new AttendanceRecordResponse(
            record.getId(),
            record.getWorkDate(),
            record.getClockIn(),
            record.getClockOut(),
            record.isCorrected(),
            record.getClockInMemo(),
            record.getClockOutMemo(),
            record.getClockInMemoUpdatedAt(),
            record.getClockOutMemoUpdatedAt()
        );
    }
}
