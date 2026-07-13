package com.example.attendance.attendance.controller;

import com.example.attendance.attendance.domain.AttendanceStatus;
import com.example.attendance.attendance.dto.AttendanceHistoryResponse;
import com.example.attendance.attendance.dto.AttendanceRecordResponse;
import com.example.attendance.attendance.dto.DailyAttendanceResponse;
import com.example.attendance.attendance.dto.MonthlySummaryResponse;
import com.example.attendance.attendance.dto.TodayStatusResponse;
import com.example.attendance.attendance.service.AttendanceService;
import com.example.attendance.common.config.CorsConfig;
import com.example.attendance.common.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = AttendanceController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {SecurityConfig.class, CorsConfig.class}
    )
)
@Import(AttendanceControllerTest.TestSecurityConfig.class)
@ActiveProfiles("test")
class AttendanceControllerTest {

    @org.springframework.boot.test.context.TestConfiguration
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceService attendanceService;

    private static final UUID EMPLOYEE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID RECORD_ID = UUID.fromString("00000000-0000-0000-0000-000000000099");

    @Nested
    @DisplayName("POST /api/attendance/clock-in")
    class ClockIn {

        @Test
        @DisplayName("メモ付きリクエストで201を返す")
        void withMemo_returns201() throws Exception {
            var response = new AttendanceRecordResponse(
                    UUID.randomUUID(), LocalDate.of(2025, 1, 15),
                    Instant.parse("2025-01-15T00:00:00Z"), null, false,
                    "出張", null, null, null);
            when(attendanceService.clockIn(EMPLOYEE_ID, "出張")).thenReturn(response);

            mockMvc.perform(post("/api/attendance/clock-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s","memo":"出張"}
                                """.formatted(EMPLOYEE_ID)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.clockInMemo").value("出張"));
        }

        @Test
        @DisplayName("メモnullで201を返す")
        void withoutMemo_returns201() throws Exception {
            var response = new AttendanceRecordResponse(
                    UUID.randomUUID(), LocalDate.of(2025, 1, 15),
                    Instant.parse("2025-01-15T00:00:00Z"), null, false,
                    null, null, null, null);
            when(attendanceService.clockIn(EMPLOYEE_ID, null)).thenReturn(response);

            mockMvc.perform(post("/api/attendance/clock-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s"}
                                """.formatted(EMPLOYEE_ID)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.clockInMemo").doesNotExist());
        }

        @Test
        @DisplayName("メモ101文字で400を返す")
        void tooLongMemo_returns400() throws Exception {
            var longMemo = "あ".repeat(101);

            mockMvc.perform(post("/api/attendance/clock-in")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s","memo":"%s"}
                                """.formatted(EMPLOYEE_ID, longMemo)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/attendance/clock-out")
    class ClockOut {

        @Test
        @DisplayName("メモ付きリクエストで200を返す")
        void withMemo_returns200() throws Exception {
            var response = new AttendanceRecordResponse(
                    UUID.randomUUID(), LocalDate.of(2025, 1, 15),
                    Instant.parse("2025-01-14T23:00:00Z"),
                    Instant.parse("2025-01-15T08:00:00Z"), false,
                    null, "早退", null, null);
            when(attendanceService.clockOut(EMPLOYEE_ID, "早退")).thenReturn(response);

            mockMvc.perform(post("/api/attendance/clock-out")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s","memo":"早退"}
                                """.formatted(EMPLOYEE_ID)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.clockOutMemo").value("早退"));
        }
    }

    @Nested
    @DisplayName("PATCH /api/attendance/{id}/memo")
    class UpdateMemo {

        @Test
        @DisplayName("有効なリクエストで200を返す")
        void validRequest_returns200() throws Exception {
            var response = new AttendanceRecordResponse(
                    RECORD_ID, LocalDate.of(2025, 1, 15),
                    Instant.parse("2025-01-15T00:00:00Z"), null, false,
                    "更新メモ", null, Instant.parse("2025-01-15T01:00:00Z"), null);
            when(attendanceService.updateMemo(RECORD_ID, EMPLOYEE_ID, "CLOCK_IN", "更新メモ"))
                    .thenReturn(response);

            mockMvc.perform(patch("/api/attendance/{id}/memo", RECORD_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s","type":"CLOCK_IN","memo":"更新メモ"}
                                """.formatted(EMPLOYEE_ID)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.clockInMemo").value("更新メモ"));
        }

        @Test
        @DisplayName("不正なtypeで400を返す")
        void invalidType_returns400() throws Exception {
            mockMvc.perform(patch("/api/attendance/{id}/memo", RECORD_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"employeeId":"%s","type":"INVALID","memo":"メモ"}
                                """.formatted(EMPLOYEE_ID)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("employeeId未指定で400を返す")
        void missingEmployeeId_returns400() throws Exception {
            mockMvc.perform(patch("/api/attendance/{id}/memo", RECORD_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"type":"CLOCK_IN","memo":"メモ"}
                                """))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET エンドポイント（既存）")
    class GetEndpoints {

        @Test
        @DisplayName("GET /api/attendance/today は200を返す")
        void getTodayStatus_returns200() throws Exception {
            var response = new TodayStatusResponse(AttendanceStatus.NOT_CLOCKED_IN, List.of());
            when(attendanceService.getTodayStatus(EMPLOYEE_ID)).thenReturn(response);

            mockMvc.perform(get("/api/attendance/today")
                            .param("employeeId", EMPLOYEE_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("NOT_CLOCKED_IN"));
        }

        @Test
        @DisplayName("GET /api/attendance/history は200を返す")
        void getHistory_returns200() throws Exception {
            var dailyResponse = new DailyAttendanceResponse(
                    LocalDate.of(2025, 1, 15), List.of(), 540, 60, 480, 0);
            var summary = new MonthlySummaryResponse(1, 480, 0, 22);
            var response = new AttendanceHistoryResponse("2025-01", List.of(dailyResponse), summary);
            when(attendanceService.getHistory(EMPLOYEE_ID, "2025-01")).thenReturn(response);

            mockMvc.perform(get("/api/attendance/history")
                            .param("employeeId", EMPLOYEE_ID.toString())
                            .param("month", "2025-01"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.month").value("2025-01"));
        }
    }
}
