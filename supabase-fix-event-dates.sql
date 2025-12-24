-- Fix events where end_time is before start_time on the same day (implies next day)
UPDATE events
SET end_date = date + 1
WHERE start_time > end_time AND end_date = date;
