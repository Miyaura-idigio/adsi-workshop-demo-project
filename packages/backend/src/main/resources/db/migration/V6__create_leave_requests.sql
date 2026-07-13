CREATE TABLE leave_requests (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES employees(id),
    approver_id UUID REFERENCES employees(id),
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL', 'SPECIAL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('FULL', 'AM_HALF', 'PM_HALF')),
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reject_reason VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_date_range CHECK (start_date <= end_date)
);

CREATE INDEX idx_leave_requests_requester ON leave_requests(requester_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
