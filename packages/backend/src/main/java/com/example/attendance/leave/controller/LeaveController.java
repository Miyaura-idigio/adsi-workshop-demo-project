package com.example.attendance.leave.controller;

import com.example.attendance.leave.dto.LeaveCreateRequest;
import com.example.attendance.leave.dto.LeaveRejectRequest;
import com.example.attendance.leave.dto.LeaveResponse;
import com.example.attendance.leave.dto.PendingLeaveResponse;
import com.example.attendance.leave.entity.LeaveStatus;
import com.example.attendance.leave.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveResponse create(
            @RequestParam UUID requesterId,
            @Valid @RequestBody LeaveCreateRequest request) {
        return leaveService.create(requesterId, request);
    }

    @GetMapping
    public List<LeaveResponse> findByRequester(
            @RequestParam UUID requesterId,
            @RequestParam(required = false) LeaveStatus status) {
        return leaveService.findByRequester(requesterId, status);
    }

    @GetMapping("/pending")
    public List<PendingLeaveResponse> findPending(@RequestParam UUID managerId) {
        return leaveService.findPending(managerId);
    }

    @PatchMapping("/{id}/approve")
    public LeaveResponse approve(
            @PathVariable UUID id,
            @RequestParam UUID approverId,
            @RequestParam Long version) {
        return leaveService.approve(id, approverId, version);
    }

    @PatchMapping("/{id}/reject")
    public LeaveResponse reject(
            @PathVariable UUID id,
            @RequestParam UUID approverId,
            @Valid @RequestBody LeaveRejectRequest request) {
        return leaveService.reject(id, approverId, request.reason(), request.version());
    }
}
