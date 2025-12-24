-- ========================================
-- Schema Optimization for Better Performance
-- ========================================

-- 1. Events 테이블 최적화: timestamp를 date + time으로 분리
-- 현재: start_time, end_time이 timestamptz
-- 변경: date (날짜), start_time (시간), end_time (시간)로 분리

-- Step 1: 새로운 컬럼 추가
ALTER TABLE events ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time_new TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time_new TIME;

-- Step 2: 기존 데이터 마이그레이션
UPDATE events
SET
  date = start_time::date,
  start_time_new = start_time::time,
  end_time_new = end_time::time
WHERE start_time IS NOT NULL;

-- Step 3: 기존 컬럼 이름 변경 (백업)
ALTER TABLE events RENAME COLUMN start_time TO start_time_old;
ALTER TABLE events RENAME COLUMN end_time TO end_time_old;

-- Step 4: 새 컬럼을 원래 이름으로 변경
ALTER TABLE events RENAME COLUMN start_time_new TO start_time;
ALTER TABLE events RENAME COLUMN end_time_new TO end_time;

-- Step 5: date를 NOT NULL로 변경
ALTER TABLE events ALTER COLUMN date SET NOT NULL;

-- Step 6: 인덱스 추가 (날짜별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_date_category ON events(date, category_id);
CREATE INDEX IF NOT EXISTS idx_events_date_is_plan ON events(date, is_plan);

-- Step 7: 기존 timestamp 컬럼 삭제 (확인 후)
-- ALTER TABLE events DROP COLUMN start_time_old;
-- ALTER TABLE events DROP COLUMN end_time_old;

-- ========================================
-- 2. Todos 테이블 정리
-- ========================================

-- 불필요한 category (text) 컬럼 제거 (todo_category_id로 대체됨)
ALTER TABLE todos DROP COLUMN IF EXISTS category;

-- 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_todos_date_completed ON todos(date, completed);
CREATE INDEX IF NOT EXISTS idx_todos_todo_category ON todos(todo_category_id) WHERE todo_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_event_id ON todos(event_id) WHERE event_id IS NOT NULL;

-- ========================================
-- 3. 복합 인덱스 추가 (자주 사용되는 쿼리 패턴)
-- ========================================

-- 날짜 + 완료 상태로 할일 조회
CREATE INDEX IF NOT EXISTS idx_todos_date_order ON todos(date, "order");

-- 이벤트의 날짜 + 계획/실제 구분
CREATE INDEX IF NOT EXISTS idx_events_date_plan_category ON events(date, is_plan, category_id);

-- ========================================
-- 4. 통계 정보 업데이트
-- ========================================
ANALYZE events;
ANALYZE todos;
ANALYZE categories;
ANALYZE todo_categories;

-- ========================================
-- 5. 테이블 설명 (선택사항)
-- ========================================
COMMENT ON TABLE events IS '일정 이벤트 (계획/실제 구분). date + time으로 분리하여 날짜별 조회 최적화';
COMMENT ON TABLE todos IS '할일 목록. todo_category_id를 통해 이벤트 카테고리와 연결';
COMMENT ON TABLE todo_categories IS '할일 카테고리. event_category_id를 통해 완료 시 이벤트 카테고리 매핑';

COMMENT ON COLUMN events.date IS '이벤트 날짜 (인덱스)';
COMMENT ON COLUMN events.start_time IS '시작 시간 (TIME 타입)';
COMMENT ON COLUMN events.end_time IS '종료 시간 (TIME 타입)';
COMMENT ON COLUMN todos.todo_category_id IS '할일 카테고리 FK (완료 시 event_category_id로 이벤트 생성)';
COMMENT ON COLUMN todos.event_id IS '완료 후 생성된 이벤트 FK';
