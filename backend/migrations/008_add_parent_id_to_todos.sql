-- Migration: Add parent_id to todos table for hierarchical sub-todos
-- This migration adds the ability to create sub-todos (nested todos)

-- Add parent_id column to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES todos(id) ON DELETE CASCADE;

-- Add index for faster queries of sub-todos
CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);

-- Add index for querying root todos (where parent_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_todos_root_todos ON todos(parent_id) WHERE parent_id IS NULL;

-- Note: parent_id will be NULL for root-level todos (default)
-- Non-NULL parent_id indicates this todo is a sub-todo of another todo
