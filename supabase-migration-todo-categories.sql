-- ========================================
-- Todo Categories Migration
-- ========================================

-- Todo Categories Table (투두 카테고리 관리)
CREATE TABLE IF NOT EXISTS todo_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  event_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS todo_category_id BIGINT REFERENCES todo_categories(id) ON DELETE SET NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS duration INTEGER; -- duration in minutes

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_todo_categories_event_category_id ON todo_categories(event_category_id);
CREATE INDEX IF NOT EXISTS idx_todos_todo_category_id ON todos(todo_category_id);
CREATE INDEX IF NOT EXISTS idx_todos_scheduled_time ON todos(scheduled_time);

-- Add trigger for updated_at
CREATE TRIGGER update_todo_categories_updated_at BEFORE UPDATE ON todo_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE todo_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON todo_categories FOR ALL USING (true);

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE todo_categories IS '투두 카테고리. 이벤트 카테고리와 연결할 수 있음';
COMMENT ON COLUMN todo_categories.name IS '투두 카테고리 이름 (예: 개인, 업무, 학습)';
COMMENT ON COLUMN todo_categories.event_category_id IS '연결된 이벤트 카테고리 ID';
COMMENT ON COLUMN todos.todo_category_id IS '투두 카테고리 ID';
COMMENT ON COLUMN todos.scheduled_time IS '계획된 시작 시간';
COMMENT ON COLUMN todos.duration IS '예상 소요 시간(분)';
