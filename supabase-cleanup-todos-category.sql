-- Remove deprecated 'category' text column from todos table
-- (Replaced by todo_category_id foreign key)

ALTER TABLE todos DROP COLUMN IF EXISTS category;
