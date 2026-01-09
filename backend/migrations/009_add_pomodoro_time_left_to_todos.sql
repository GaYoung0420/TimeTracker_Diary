-- Add pomodoro_time_left column to todos table
-- This stores the remaining time in seconds for the pomodoro timer

ALTER TABLE todos ADD COLUMN IF NOT EXISTS pomodoro_time_left INTEGER DEFAULT NULL;

-- Add comment to column
COMMENT ON COLUMN todos.pomodoro_time_left IS 'Remaining pomodoro time in seconds (NULL if timer not started)';
