-- ========================================
-- Migration Script: Convert to Category System
-- ========================================

-- Step 1: Add new columns to events table (if not already added)
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_plan BOOLEAN DEFAULT FALSE;

-- Step 2: Insert default categories
INSERT INTO categories (name, color) VALUES
  ('① 낭비시간', '#16a765'),
  ('② 사회적', '#7bd148'),
  ('③ 지적', '#b3dc6c'),
  ('④ 영적', '#fbe983'),
  ('⑤ 잠', '#fad165'),
  ('⑥ 운동', '#92e1c0'),
  ('⑦ 기타', '#9fe1e7')
ON CONFLICT DO NOTHING;

-- Step 3: Migrate existing event data
-- Map old category strings to new category IDs and set is_plan flag

-- Plan categories
UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '① 낭비시간' LIMIT 1),
  is_plan = true
WHERE category = 'plan-waste';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '② 사회적' LIMIT 1),
  is_plan = true
WHERE category = 'plan-social';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '③ 지적' LIMIT 1),
  is_plan = true
WHERE category = 'plan-intellectual';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '④ 영적' LIMIT 1),
  is_plan = true
WHERE category = 'plan-spiritual';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑤ 잠' LIMIT 1),
  is_plan = true
WHERE category = 'plan-sleep';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑥ 운동' LIMIT 1),
  is_plan = true
WHERE category = 'plan-exercise';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑦ 기타' LIMIT 1),
  is_plan = true
WHERE category = 'plan-other';

-- Actual categories
UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '① 낭비시간' LIMIT 1),
  is_plan = false
WHERE category = 'waste';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '② 사회적' LIMIT 1),
  is_plan = false
WHERE category = 'social';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '③ 지적' LIMIT 1),
  is_plan = false
WHERE category = 'intellectual';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '④ 영적' LIMIT 1),
  is_plan = false
WHERE category = 'spiritual';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑤ 잠' LIMIT 1),
  is_plan = false
WHERE category = 'sleep';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑥ 운동' LIMIT 1),
  is_plan = false
WHERE category = 'exercise';

UPDATE events SET
  category_id = (SELECT id FROM categories WHERE name = '⑦ 기타' LIMIT 1),
  is_plan = false
WHERE category = 'other';

-- Step 4: After migration is successful, drop the old category column
-- (Do this manually after verifying the migration worked correctly)
-- ALTER TABLE events DROP COLUMN IF EXISTS category;
