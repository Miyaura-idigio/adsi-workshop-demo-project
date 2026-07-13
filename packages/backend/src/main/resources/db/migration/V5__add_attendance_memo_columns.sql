ALTER TABLE attendance_records ADD COLUMN clock_in_memo VARCHAR(100);
ALTER TABLE attendance_records ADD COLUMN clock_out_memo VARCHAR(100);
ALTER TABLE attendance_records ADD COLUMN clock_in_memo_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance_records ADD COLUMN clock_out_memo_updated_at TIMESTAMP WITH TIME ZONE;
