ALTER TABLE attendance_records
    ADD COLUMN paid_leave BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN leave_type VARCHAR(20),
    ADD COLUMN day_type VARCHAR(20);
