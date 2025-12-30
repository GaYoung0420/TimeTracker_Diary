-- Migration: Add user_id to all tables for multi-user support
-- This migration adds user_id column to all tables that currently lack user isolation

-- 1. Add user_id to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add user_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 3. Add user_id to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Add user_id to reflections table
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 5. Add user_id to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 6. Add user_id to routine_checks table
ALTER TABLE routine_checks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 7. Add user_id to todo_categories table
ALTER TABLE todo_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 8. Add user_id to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add indexes for performance (user_id + frequently queried columns)
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id_date ON events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_images_user_id_date ON images(user_id, date);
CREATE INDEX IF NOT EXISTS idx_reflections_user_id_date ON reflections(user_id, date);
CREATE INDEX IF NOT EXISTS idx_routines_user_id_active ON routines(user_id, active);
CREATE INDEX IF NOT EXISTS idx_routine_checks_user_id_date ON routine_checks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todo_categories_user_id ON todo_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_id_date ON todos(user_id, date);
CREATE INDEX IF NOT EXISTS idx_todos_user_id_completed ON todos(user_id, completed);

-- Update unique constraints to include user_id where needed
-- Drop old unique constraint on reflections.date and add new one with user_id
ALTER TABLE reflections DROP CONSTRAINT IF EXISTS reflections_date_key;
ALTER TABLE reflections ADD CONSTRAINT reflections_user_id_date_unique UNIQUE (user_id, date);

-- Add composite unique constraint for routine_checks (user can only have one check per routine per date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_checks_user_routine_date
ON routine_checks(user_id, routine_id, date);

-- Note: Existing data will have NULL user_id values
-- You need to manually assign these to appropriate users or delete test data
-- Example: UPDATE categories SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;
