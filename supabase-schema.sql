-- ========================================
-- TimeTracker Diary - Supabase Schema
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Todos Table
-- ========================================
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_date ON todos(date);

-- ========================================
-- Reflections Table
-- ========================================
CREATE TABLE IF NOT EXISTS reflections (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  mood VARCHAR(20),
  reflection_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reflections_date ON reflections(date);

-- ========================================
-- Images Table
-- ========================================
CREATE TABLE IF NOT EXISTS images (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  file_id VARCHAR(255),
  file_name VARCHAR(255),
  thumbnail_url TEXT,
  view_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_date ON images(date);

-- ========================================
-- Routines Table
-- ========================================
CREATE TABLE IF NOT EXISTS routines (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 9999,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routines_active ON routines(active);

-- ========================================
-- Routine Checks Table
-- ========================================
CREATE TABLE IF NOT EXISTS routine_checks (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, routine_id)
);

CREATE INDEX idx_routine_checks_date ON routine_checks(date);
CREATE INDEX idx_routine_checks_routine_id ON routine_checks(routine_id);

-- ========================================
-- Auto-update updated_at trigger
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON reflections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_checks_updated_at BEFORE UPDATE ON routine_checks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
