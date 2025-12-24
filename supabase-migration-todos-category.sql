-- Add category_id to todos table to link with events categories
ALTER TABLE todos ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_todos_category_id ON todos(category_id);

-- Add event_id to link todo with an event (optional, for bidirectional link)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE SET NULL;

-- Add index for event_id
CREATE INDEX IF NOT EXISTS idx_todos_event_id ON todos(event_id);
