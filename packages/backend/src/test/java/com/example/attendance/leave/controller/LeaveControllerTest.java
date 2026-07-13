package com.example.attendance.leave.controller;

import com.example.attendance.common.config.CorsConfig;
import com.example.attendance.common.config.SecurityConfig;
import com.example.attendance.leave.dto.LeaveResponse;
import com.example.attendance.leave.dto.PendingLeaveResponse;
import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveStatus;
import com.example.attendance.leave.entity.LeaveType;
import com.example.attendance.leave.service.LeaveService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = LeaveController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {SecurityConfig.class, CorsConfig.class}
    )
)
@Import(LeaveControllerTest.TestSecurityConfig.class)
@ActiveProfiles("test")
class LeaveControllerTest {

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

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LeaveService leaveService;

    private static final UUID EMPLOYEE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID MANAGER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID LEAVE_ID = UUID.fromString("00000000-0000-0000-0000-000000000020");

    @Test
    @DisplayName("POST /api/leaves は201を返す")
    void create_validRequest_returns201() throws Exception {
        var response = new LeaveResponse(
                LEAVE_ID, EMPLOYEE_ID, "田中太郎", null, null,
                LeaveType.ANNUAL,
                LocalDate.of(2026, 7, 21), LocalDate.of(2026, 7, 25),
                DayType.FULL, "夏季旅行のため",
                LeaveStatus.PENDING, null, 0L, Instant.now());

        when(leaveService.create(eq(EMPLOYEE_ID), any())).thenReturn(response);

        var body = """
                {
                    "leaveType": "ANNUAL",
                    "startDate": "2026-07-21",
                    "endDate": "2026-07-25",
                    "dayType": "FULL",
                    "reason": "夏季旅行のため"
                }
                """;

        mockMvc.perform(post("/api/leaves")
                        .param("requesterId", EMPLOYEE_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(LEAVE_ID.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.leaveType").value("ANNUAL"));
    }

    @Test
    @DisplayName("POST /api/leaves バリデーションエラーで400を返す")
    void create_invalidRequest_returns400() throws Exception {
        var body = """
                {
                    "leaveType": "ANNUAL",
                    "startDate": null,
                    "endDate": "2026-07-25",
                    "dayType": "FULL"
                }
                """;

        mockMvc.perform(post("/api/leaves")
                        .param("requesterId", EMPLOYEE_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/leaves は200を返す")
    void findByRequester_returns200() throws Exception {
        var response = new LeaveResponse(
                LEAVE_ID, EMPLOYEE_ID, "田中太郎", null, null,
                LeaveType.ANNUAL,
                LocalDate.of(2026, 7, 21), LocalDate.of(2026, 7, 21),
                DayType.FULL, null,
                LeaveStatus.PENDING, null, 0L, Instant.now());

        when(leaveService.findByRequester(eq(EMPLOYEE_ID), any()))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/leaves")
                        .param("requesterId", EMPLOYEE_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(LEAVE_ID.toString()));
    }

    @Test
    @DisplayName("GET /api/leaves/pending は200を返す")
    void findPending_returns200() throws Exception {
        var response = new PendingLeaveResponse(
                LEAVE_ID, EMPLOYEE_ID, "田中太郎",
                LeaveType.ANNUAL,
                LocalDate.of(2026, 7, 21), LocalDate.of(2026, 7, 25),
                DayType.FULL, "旅行", 0L, Instant.now());

        when(leaveService.findPending(MANAGER_ID))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/leaves/pending")
                        .param("managerId", MANAGER_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requesterName").value("田中太郎"));
    }

    @Test
    @DisplayName("PATCH /api/leaves/{id}/approve は200を返す")
    void approve_returns200() throws Exception {
        var response = new LeaveResponse(
                LEAVE_ID, EMPLOYEE_ID, "田中太郎", MANAGER_ID, "鈴木部長",
                LeaveType.ANNUAL,
                LocalDate.of(2026, 7, 21), LocalDate.of(2026, 7, 25),
                DayType.FULL, null,
                LeaveStatus.APPROVED, null, 1L, Instant.now());

        when(leaveService.approve(LEAVE_ID, MANAGER_ID, 0L)).thenReturn(response);

        mockMvc.perform(patch("/api/leaves/{id}/approve", LEAVE_ID)
                        .param("approverId", MANAGER_ID.toString())
                        .param("version", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approverName").value("鈴木部長"));
    }

    @Test
    @DisplayName("PATCH /api/leaves/{id}/reject は200を返す")
    void reject_returns200() throws Exception {
        var response = new LeaveResponse(
                LEAVE_ID, EMPLOYEE_ID, "田中太郎", MANAGER_ID, "鈴木部長",
                LeaveType.ANNUAL,
                LocalDate.of(2026, 7, 21), LocalDate.of(2026, 7, 25),
                DayType.FULL, null,
                LeaveStatus.REJECTED, "繁忙期のため", 1L, Instant.now());

        when(leaveService.reject(eq(LEAVE_ID), eq(MANAGER_ID), eq("繁忙期のため"), eq(0L)))
                .thenReturn(response);

        var body = """
                {
                    "reason": "繁忙期のため",
                    "version": 0
                }
                """;

        mockMvc.perform(patch("/api/leaves/{id}/reject", LEAVE_ID)
                        .param("approverId", MANAGER_ID.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectReason").value("繁忙期のため"));
    }
}
