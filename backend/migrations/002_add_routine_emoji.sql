-- Add emoji column to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '✓';
