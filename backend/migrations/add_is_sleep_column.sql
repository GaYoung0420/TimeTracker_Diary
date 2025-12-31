-- Add is_sleep column to events table
-- This column indicates if an event should be used for wake/sleep time calculation

ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_sleep BOOLEAN DEFAULT false;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_is_sleep ON events(is_sleep);

-- Optional: Update existing "잠" events to have is_sleep = true
-- You can run this if you want to automatically mark existing sleep events
-- UPDATE events
-- SET is_sleep = true
-- WHERE title = '잠' AND is_sleep = false;

COMMENT ON COLUMN events.is_sleep IS 'Indicates if this event should be used for wake/sleep time calculation';
