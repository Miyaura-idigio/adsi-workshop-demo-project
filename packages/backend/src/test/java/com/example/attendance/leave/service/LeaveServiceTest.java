package com.example.attendance.leave.service;

import com.example.attendance.attendance.entity.AttendanceRecord;
import com.example.attendance.attendance.repository.AttendanceRecordRepository;
import com.example.attendance.department.entity.Department;
import com.example.attendance.employee.entity.Employee;
import com.example.attendance.employee.entity.Role;
import com.example.attendance.employee.repository.EmployeeRepository;
import com.example.attendance.leave.dto.LeaveCreateRequest;
import com.example.attendance.leave.entity.DayType;
import com.example.attendance.leave.entity.LeaveRequest;
import com.example.attendance.leave.entity.LeaveStatus;
import com.example.attendance.leave.entity.LeaveType;
import com.example.attendance.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaveServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    private LeaveServiceImpl service;

    private Department department;
    private Employee employee;
    private Employee manager;

    @BeforeEach
    void setUp() {
        service = new LeaveServiceImpl(
                leaveRequestRepository, attendanceRecordRepository, employeeRepository);

        department = Department.builder()
                .id(UUID.randomUUID())
                .name("Engineering")
                .build();

        employee = Employee.builder()
                .id(UUID.randomUUID())
                .name("田中太郎")
                .email("tanaka@example.com")
                .department(department)
                .role(Role.EMPLOYEE)
                .isManager(false)
                .hireDate(LocalDate.of(2024, 4, 1))
                .build();

        manager = Employee.builder()
                .id(UUID.randomUUID())
                .name("鈴木部長")
                .email("suzuki@example.com")
                .department(department)
                .role(Role.EMPLOYEE)
                .isManager(true)
                .hireDate(LocalDate.of(2020, 4, 1))
                .build();
    }

    @Nested
    @DisplayName("create: 休暇申請")
    class Create {

        @Test
        @DisplayName("全日・単日の休暇申請が正常に作成される")
        void create_fullDaySingle_success() {
            var tomorrow = LocalDate.now().plusDays(1);
            var request = new LeaveCreateRequest(
                    LeaveType.ANNUAL, tomorrow, tomorrow, DayType.FULL, "私用のため");

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> {
                        var lr = inv.getArgument(0, LeaveRequest.class);
                        lr.setCreatedAt(Instant.now());
                        lr.setVersion(0L);
                        return lr;
                    });

            var result = service.create(employee.getId(), request);

            assertThat(result.status()).isEqualTo(LeaveStatus.PENDING);
            assertThat(result.leaveType()).isEqualTo(LeaveType.ANNUAL);
            assertThat(result.startDate()).isEqualTo(tomorrow);
            assertThat(result.endDate()).isEqualTo(tomorrow);
            assertThat(result.dayType()).isEqualTo(DayType.FULL);
        }

        @Test
        @DisplayName("全日・連続日数の休暇申請が正常に作成される")
        void create_fullDayMultiple_success() {
            var start = LocalDate.now().plusDays(1);
            var end = LocalDate.now().plusDays(5);
            var request = new LeaveCreateRequest(
                    LeaveType.ANNUAL, start, end, DayType.FULL, null);

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> {
                        var lr = inv.getArgument(0, LeaveRequest.class);
                        lr.setCreatedAt(Instant.now());
                        lr.setVersion(0L);
                        return lr;
                    });

            var result = service.create(employee.getId(), request);

            assertThat(result.startDate()).isEqualTo(start);
            assertThat(result.endDate()).isEqualTo(end);
            assertThat(result.reason()).isNull();
        }

        @Test
        @DisplayName("午前休の休暇申請が正常に作成される")
        void create_amHalf_success() {
            var tomorrow = LocalDate.now().plusDays(1);
            var request = new LeaveCreateRequest(
                    LeaveType.SPECIAL, tomorrow, tomorrow, DayType.AM_HALF, "通院のため");

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> {
                        var lr = inv.getArgument(0, LeaveRequest.class);
                        lr.setCreatedAt(Instant.now());
                        lr.setVersion(0L);
                        return lr;
                    });

            var result = service.create(employee.getId(), request);

            assertThat(result.dayType()).isEqualTo(DayType.AM_HALF);
            assertThat(result.leaveType()).isEqualTo(LeaveType.SPECIAL);
        }

        @Test
        @DisplayName("過去日の申請はエラーになる")
        void create_pastDate_throwsBadRequest() {
            var yesterday = LocalDate.now().minusDays(1);
            var request = new LeaveCreateRequest(
                    LeaveType.ANNUAL, yesterday, yesterday, DayType.FULL, null);

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> service.create(employee.getId(), request))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("開始日は本日以降");
        }

        @Test
        @DisplayName("startDate > endDate はエラーになる")
        void create_startAfterEnd_throwsBadRequest() {
            var start = LocalDate.now().plusDays(5);
            var end = LocalDate.now().plusDays(1);
            var request = new LeaveCreateRequest(
                    LeaveType.ANNUAL, start, end, DayType.FULL, null);

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> service.create(employee.getId(), request))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("開始日は終了日以前");
        }

        @Test
        @DisplayName("半日休で複数日指定はエラーになる")
        void create_halfDayMultipleDays_throwsBadRequest() {
            var start = LocalDate.now().plusDays(1);
            var end = LocalDate.now().plusDays(3);
            var request = new LeaveCreateRequest(
                    LeaveType.ANNUAL, start, end, DayType.AM_HALF, null);

            when(employeeRepository.findById(employee.getId()))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> service.create(employee.getId(), request))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("半日休暇は単日のみ");
        }
    }

    @Nested
    @DisplayName("findByRequester: 自分の申請一覧")
    class FindByRequester {

        @Test
        @DisplayName("自分の申請のみ返す")
        void findByRequester_returnsOwnOnly() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            when(leaveRequestRepository.findByRequesterIdOrderByCreatedAtDesc(employee.getId()))
                    .thenReturn(List.of(lr));

            var result = service.findByRequester(employee.getId(), null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).requesterId()).isEqualTo(employee.getId());
        }

        @Test
        @DisplayName("ステータスフィルタが適用される")
        void findByRequester_withStatusFilter() {
            var lr = buildLeaveRequest(LeaveStatus.APPROVED);
            when(leaveRequestRepository.findByRequesterIdAndStatusOrderByCreatedAtDesc(
                    employee.getId(), LeaveStatus.APPROVED))
                    .thenReturn(List.of(lr));

            var result = service.findByRequester(employee.getId(), LeaveStatus.APPROVED);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).status()).isEqualTo(LeaveStatus.APPROVED);
        }
    }

    @Nested
    @DisplayName("findPending: 承認待ち一覧")
    class FindPending {

        @Test
        @DisplayName("自部署のPENDINGのみ返す")
        void findPending_returnsDepartmentPending() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            when(employeeRepository.findById(manager.getId()))
                    .thenReturn(Optional.of(manager));
            when(leaveRequestRepository
                    .findByRequesterDepartmentIdAndStatusOrderByCreatedAtDesc(
                            department.getId(), LeaveStatus.PENDING))
                    .thenReturn(List.of(lr));

            var result = service.findPending(manager.getId());

            assertThat(result).hasSize(1);
            assertThat(result.get(0).requesterId()).isEqualTo(employee.getId());
        }
    }

    @Nested
    @DisplayName("approve: 承認")
    class Approve {

        @Test
        @DisplayName("全日・単日の承認でAttendanceRecordに有給フラグが反映される")
        void approve_fullDaySingle_appliesPaidLeave() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            when(leaveRequestRepository.findById(lr.getId()))
                    .thenReturn(Optional.of(lr));
            when(employeeRepository.findById(manager.getId()))
                    .thenReturn(Optional.of(manager));
            when(attendanceRecordRepository.findByEmployeeIdAndWorkDate(
                    employee.getId(), lr.getStartDate()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            var result = service.approve(lr.getId(), manager.getId(), 0L);

            assertThat(result.status()).isEqualTo(LeaveStatus.APPROVED);
            var captor = ArgumentCaptor.forClass(AttendanceRecord.class);
            verify(attendanceRecordRepository).save(captor.capture());
            assertThat(captor.getValue().isPaidLeave()).isTrue();
            assertThat(captor.getValue().getLeaveType()).isEqualTo(LeaveType.ANNUAL);
            assertThat(captor.getValue().getDayType()).isEqualTo(DayType.FULL);
        }

        @Test
        @DisplayName("連続日数の承認で各日にAttendanceRecordが作成される")
        void approve_multipleDays_createsRecordsForEachDay() {
            var start = LocalDate.now().plusDays(1);
            var end = LocalDate.now().plusDays(3);
            var lr = LeaveRequest.builder()
                    .id(UUID.randomUUID())
                    .requester(employee)
                    .leaveType(LeaveType.ANNUAL)
                    .startDate(start)
                    .endDate(end)
                    .dayType(DayType.FULL)
                    .status(LeaveStatus.PENDING)
                    .version(0L)
                    .createdAt(Instant.now())
                    .build();

            when(leaveRequestRepository.findById(lr.getId()))
                    .thenReturn(Optional.of(lr));
            when(employeeRepository.findById(manager.getId()))
                    .thenReturn(Optional.of(manager));
            when(attendanceRecordRepository.findByEmployeeIdAndWorkDate(any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(attendanceRecordRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.approve(lr.getId(), manager.getId(), 0L);

            verify(attendanceRecordRepository, times(3)).save(any(AttendanceRecord.class));
        }

        @Test
        @DisplayName("承認者が上長でない場合は403エラー")
        void approve_notManager_throwsForbidden() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            var nonManager = Employee.builder()
                    .id(UUID.randomUUID())
                    .name("一般社員")
                    .department(department)
                    .role(Role.EMPLOYEE)
                    .isManager(false)
                    .build();

            when(leaveRequestRepository.findById(lr.getId()))
                    .thenReturn(Optional.of(lr));
            when(employeeRepository.findById(nonManager.getId()))
                    .thenReturn(Optional.of(nonManager));

            assertThatThrownBy(() -> service.approve(lr.getId(), nonManager.getId(), 0L))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("manager");
        }

        @Test
        @DisplayName("楽観ロックエラーで409が返る")
        void approve_versionMismatch_throwsConflict() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            when(leaveRequestRepository.findById(lr.getId()))
                    .thenReturn(Optional.of(lr));
            when(employeeRepository.findById(manager.getId()))
                    .thenReturn(Optional.of(manager));

            assertThatThrownBy(() -> service.approve(lr.getId(), manager.getId(), 999L))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("modified by another user");
        }
    }

    @Nested
    @DisplayName("reject: 却下")
    class Reject {

        @Test
        @DisplayName("却下するとREJECTEDになりrejectReasonが保存される")
        void reject_success() {
            var lr = buildLeaveRequest(LeaveStatus.PENDING);
            when(leaveRequestRepository.findById(lr.getId()))
                    .thenReturn(Optional.of(lr));
            when(employeeRepository.findById(manager.getId()))
                    .thenReturn(Optional.of(manager));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            var result = service.reject(lr.getId(), manager.getId(), "繁忙期のため", 0L);

            assertThat(result.status()).isEqualTo(LeaveStatus.REJECTED);
            assertThat(result.rejectReason()).isEqualTo("繁忙期のため");

            verify(attendanceRecordRepository, never()).save(any());
        }
    }

    private LeaveRequest buildLeaveRequest(LeaveStatus status) {
        return LeaveRequest.builder()
                .id(UUID.randomUUID())
                .requester(employee)
                .leaveType(LeaveType.ANNUAL)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(1))
                .dayType(DayType.FULL)
                .reason("私用のため")
                .status(status)
                .version(0L)
                .createdAt(Instant.now())
                .build();
    }
}
