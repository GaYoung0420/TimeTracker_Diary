-- Add weekdays column to routines table (JSON array of weekday numbers: 0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE routines ADD COLUMN IF NOT EXISTS weekdays TEXT;

-- Add start_date and end_date columns to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS end_date TEXT;
