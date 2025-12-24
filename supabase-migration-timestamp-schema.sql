-- 1. Add new timestamp columns
ALTER TABLE events ADD COLUMN new_start_time TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN new_end_time TIMESTAMPTZ;

-- 2. Migrate data
-- Combine date and time into timestamp
-- We assume the existing times are in the local time zone (or whatever the server default is)
-- Handle case where end_date might be null (fallback to date)
UPDATE events 
SET new_start_time = (date || ' ' || start_time)::TIMESTAMPTZ,
    new_end_time = (COALESCE(end_date, date) || ' ' || end_time)::TIMESTAMPTZ;

-- 3. Drop old columns
ALTER TABLE events DROP COLUMN start_time;
ALTER TABLE events DROP COLUMN end_time;
ALTER TABLE events DROP COLUMN end_date;
ALTER TABLE events DROP COLUMN date;

-- 4. Rename new columns to replace old ones
ALTER TABLE events RENAME COLUMN new_start_time TO start_time;
ALTER TABLE events RENAME COLUMN new_end_time TO end_time;
