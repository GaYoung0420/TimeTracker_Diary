-- Migration: Create reflection_templates table for custom user templates
-- This table stores user-defined templates for daily reflections

CREATE TABLE IF NOT EXISTS reflection_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reflection_templates_user_id_unique UNIQUE (user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_reflection_templates_user_id ON reflection_templates(user_id);

-- Comment on table
COMMENT ON TABLE reflection_templates IS 'Stores custom reflection templates for each user';
COMMENT ON COLUMN reflection_templates.user_id IS 'Reference to the user who owns this template';
COMMENT ON COLUMN reflection_templates.template IS 'The custom template text';
