package com.example.attendance.leave.service;

import com.example.attendance.attendance.entity.AttendanceRecord;
import com.example.attendance.attendance.repository.AttendanceRecordRepository;
import com.example.attendance.employee.entity.Employee;
import com.example.attendance.employee.repository.EmployeeRepository;
import com.example.attendance.leave.dto.LeaveCreateRequest;
import com.example.attendance.leave.dto.LeaveResponse;
import com.example.attendance.leave.dto.PendingLeaveResponse;
import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveRequest;
import com.example.attendance.leave.entity.LeaveStatus;
import com.example.attendance.leave.repository.LeaveRequestRepository;
import com.github.f4b6a3.uuid.UuidCreator;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@Transactional(readOnly = true)
public class LeaveServiceImpl implements LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;

    public LeaveServiceImpl(
            LeaveRequestRepository leaveRequestRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            EmployeeRepository employeeRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.employeeRepository = employeeRepository;
    }

    @Override
    @Transactional
    public LeaveResponse create(UUID requesterId, LeaveCreateRequest request) {
        var requester = findEmployeeOrThrow(requesterId);

        validateCreateRequest(request);

        var leaveRequest = LeaveRequest.builder()
                .id(UuidCreator.getTimeOrderedEpoch())
                .requester(requester)
                .leaveType(request.leaveType())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .dayType(request.dayType())
                .reason(request.reason())
                .status(LeaveStatus.PENDING)
                .build();

        var saved = leaveRequestRepository.save(leaveRequest);
        log.info("Leave request created: id={}, requester={}", saved.getId(), requesterId);
        return LeaveResponse.from(saved);
    }

    @Override
    public List<LeaveResponse> findByRequester(UUID requesterId, LeaveStatus status) {
        List<LeaveRequest> requests;
        if (status != null) {
            requests = leaveRequestRepository
                    .findByRequesterIdAndStatusOrderByCreatedAtDesc(requesterId, status);
        } else {
            requests = leaveRequestRepository
                    .findByRequesterIdOrderByCreatedAtDesc(requesterId);
        }
        return requests.stream()
                .map(LeaveResponse::from)
                .toList();
    }

    @Override
    public List<PendingLeaveResponse> findPending(UUID managerId) {
        var manager = findEmployeeOrThrow(managerId);
        var departmentId = manager.getDepartment().getId();
        var requests = leaveRequestRepository
                .findByRequesterDepartmentIdAndStatusOrderByCreatedAtDesc(
                        departmentId, LeaveStatus.PENDING);
        return requests.stream()
                .map(PendingLeaveResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public LeaveResponse approve(UUID leaveRequestId, UUID approverId, Long version) {
        var leaveRequest = findLeaveRequestOrThrow(leaveRequestId);
        var approver = findEmployeeOrThrow(approverId);

        validateApprover(leaveRequest, approver);
        validateVersion(leaveRequest, version);

        leaveRequest.setStatus(LeaveStatus.APPROVED);
        leaveRequest.setApprover(approver);

        applyPaidLeaveToAttendance(leaveRequest);

        var saved = leaveRequestRepository.save(leaveRequest);
        log.info("Leave request approved: id={}, approver={}", leaveRequestId, approverId);
        return LeaveResponse.from(saved);
    }

    @Override
    @Transactional
    public LeaveResponse reject(
            UUID leaveRequestId, UUID approverId, String reason, Long version) {
        var leaveRequest = findLeaveRequestOrThrow(leaveRequestId);
        var approver = findEmployeeOrThrow(approverId);

        validateApprover(leaveRequest, approver);
        validateVersion(leaveRequest, version);

        leaveRequest.setStatus(LeaveStatus.REJECTED);
        leaveRequest.setApprover(approver);
        leaveRequest.setRejectReason(reason);

        var saved = leaveRequestRepository.save(leaveRequest);
        log.info("Leave request rejected: id={}, approver={}", leaveRequestId, approverId);
        return LeaveResponse.from(saved);
    }

    private void validateCreateRequest(LeaveCreateRequest request) {
        if (request.startDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "開始日は本日以降を指定してください");
        }
        if (request.startDate().isAfter(request.endDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "開始日は終了日以前を指定してください");
        }
        if (request.dayType() != DayType.FULL
                && !request.startDate().equals(request.endDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "半日休暇は単日のみ指定できます");
        }
    }

    private void applyPaidLeaveToAttendance(LeaveRequest leaveRequest) {
        var employee = leaveRequest.getRequester();
        var current = leaveRequest.getStartDate();
        var end = leaveRequest.getEndDate();

        while (!current.isAfter(end)) {
            var records = attendanceRecordRepository
                    .findByEmployeeIdAndWorkDate(employee.getId(), current);

            if (records.isEmpty()) {
                var newRecord = AttendanceRecord.builder()
                        .id(UuidCreator.getTimeOrderedEpoch())
                        .employee(employee)
                        .workDate(current)
                        .clockIn(current.atStartOfDay().toInstant(java.time.ZoneOffset.ofHours(9)))
                        .clockOut(current.atStartOfDay().toInstant(java.time.ZoneOffset.ofHours(9)))
                        .paidLeave(true)
                        .leaveType(leaveRequest.getLeaveType())
                        .dayType(leaveRequest.getDayType())
                        .build();
                attendanceRecordRepository.save(newRecord);
            } else {
                for (var record : records) {
                    record.setPaidLeave(true);
                    record.setLeaveType(leaveRequest.getLeaveType());
                    record.setDayType(leaveRequest.getDayType());
                    attendanceRecordRepository.save(record);
                }
            }
            current = current.plusDays(1);
        }
    }

    private void validateApprover(LeaveRequest leaveRequest, Employee approver) {
        var requesterDeptId = leaveRequest.getRequester().getDepartment().getId();
        var approverDeptId = approver.getDepartment().getId();

        if (!approverDeptId.equals(requesterDeptId) || !approver.isManager()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the department manager can approve/reject leave requests");
        }
    }

    private void validateVersion(LeaveRequest leaveRequest, Long version) {
        if (!leaveRequest.getVersion().equals(version)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The leave request was modified by another user. Please refresh and try again.");
        }
    }

    private LeaveRequest findLeaveRequestOrThrow(UUID id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "LeaveRequest with id '%s' was not found".formatted(id)));
    }

    private Employee findEmployeeOrThrow(UUID employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Employee with id '%s' was not found".formatted(employeeId)));
    }
}
