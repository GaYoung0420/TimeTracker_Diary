-- Add color column to todo_categories table
ALTER TABLE todo_categories ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#4a9eff';
