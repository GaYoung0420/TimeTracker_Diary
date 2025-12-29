-- Add scheduled_time column to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

-- Add duration column to routines table (in minutes)
ALTER TABLE routines ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;
