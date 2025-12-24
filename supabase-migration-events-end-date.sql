-- Add end_date column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;

-- Initialize end_date with date for existing records
UPDATE events SET end_date = date WHERE end_date IS NULL;

-- Make end_date NOT NULL after population
ALTER TABLE events ALTER COLUMN end_date SET NOT NULL;
