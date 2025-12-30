-- ========================================
-- Migration 006: Assign user_id to existing data
-- ========================================
-- This script assigns the first user's ID to all existing records with NULL user_id
-- Run this after migration 005 to populate user_id for existing data

-- Start transaction
BEGIN;

-- Step 1: Get the first user's ID (or specify your email)
-- Replace 'your-email@example.com' with your actual email if needed
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the first user's ID (or uncomment the next line to specify by email)
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;
  -- SELECT id INTO v_user_id FROM users WHERE email = 'your-email@example.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found. Please create a user first.';
  END IF;

  RAISE NOTICE 'Using user_id: %', v_user_id;

  -- Step 2: Update all tables with NULL user_id

  -- Categories
  UPDATE categories
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % categories', (SELECT COUNT(*) FROM categories WHERE user_id = v_user_id);

  -- Events
  UPDATE events
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % events', (SELECT COUNT(*) FROM events WHERE user_id = v_user_id);

  -- Todos
  UPDATE todos
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % todos', (SELECT COUNT(*) FROM todos WHERE user_id = v_user_id);

  -- Todo Categories
  UPDATE todo_categories
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % todo_categories', (SELECT COUNT(*) FROM todo_categories WHERE user_id = v_user_id);

  -- Reflections
  UPDATE reflections
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % reflections', (SELECT COUNT(*) FROM reflections WHERE user_id = v_user_id);

  -- Images
  UPDATE images
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % images', (SELECT COUNT(*) FROM images WHERE user_id = v_user_id);

  -- Routines
  UPDATE routines
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % routines', (SELECT COUNT(*) FROM routines WHERE user_id = v_user_id);

  -- Routine Checks
  UPDATE routine_checks
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % routine_checks', (SELECT COUNT(*) FROM routine_checks WHERE user_id = v_user_id);

  -- Routine Mood
  UPDATE routine_mood
  SET user_id = v_user_id
  WHERE user_id IS NULL;
  RAISE NOTICE 'Updated % routine_mood records', (SELECT COUNT(*) FROM routine_mood WHERE user_id = v_user_id);

END $$;

-- Step 3: Verify no NULL user_id records remain (excluding users table)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM categories WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM events WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM todos WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM todo_categories WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM reflections WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM images WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM routines WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM routine_checks WHERE user_id IS NULL) +
    (SELECT COUNT(*) FROM routine_mood WHERE user_id IS NULL)
  INTO null_count;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Still have % records with NULL user_id', null_count;
  END IF;

  RAISE NOTICE '✓ All records successfully assigned to user';
END $$;

-- Commit transaction
COMMIT;

-- ========================================
-- Optional: Add NOT NULL constraints (run separately after verification)
-- ========================================
-- Uncomment and run these after verifying your data looks correct:

-- ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE events ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE todo_categories ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE reflections ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE images ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE routines ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE routine_checks ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE routine_mood ALTER COLUMN user_id SET NOT NULL;
