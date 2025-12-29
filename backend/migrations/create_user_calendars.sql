-- Create user_calendars table
-- This table stores calendar subscriptions for each user
CREATE TABLE IF NOT EXISTS user_calendars (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'icloud',
  type_icon VARCHAR(10),
  url TEXT NOT NULL,
  color VARCHAR(20) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key to users table
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_calendars_user_id ON user_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendars_enabled ON user_calendars(user_id, enabled);

-- Add comment
COMMENT ON TABLE user_calendars IS 'Stores calendar subscriptions (iCloud, Google Calendar, Outlook, etc.) for each user';
