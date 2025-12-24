# 스키마 최적화 가이드

## 현재 문제점

### 1. **Events 테이블 - Timestamp 사용의 비효율성**
```sql
-- 현재 방식
start_time TIMESTAMPTZ  -- 2024-12-25T09:00:00+09:00
end_time TIMESTAMPTZ    -- 2024-12-25T10:00:00+09:00
```

**문제점:**
- 날짜별 조회 시 매번 timestamp에서 날짜 추출 필요
- 타임존 처리로 인한 복잡성
- 인덱스 효율성 저하
- 하루에 10개씩 이벤트 생성 시 조회 성능 문제

**해결책:**
```sql
-- 개선 방식 (todos와 동일)
date DATE               -- 2024-12-25
start_time TIME         -- 09:00:00
end_time TIME           -- 10:00:00
```

**장점:**
- `WHERE date = '2024-12-25'` 인덱스 스캔 가능
- 타임존 문제 없음
- 월별/일별 집계 쿼리 성능 향상
- 스토리지 효율성 (timestamp 8바이트 → date 4바이트 + time 8바이트)

### 2. **불필요한 중복 컬럼**
```sql
-- todos 테이블
category TEXT           -- 구버전 (사용 안 함)
todo_category_id BIGINT -- 신버전 (사용 중)
```

### 3. **인덱스 부족**
- 날짜별 조회가 많은데 적절한 복합 인덱스 없음
- 매일 데이터를 조회하는데 인덱스 최적화 필요

## 최적화 전략

### 1. Events 테이블 구조 변경

**Before:**
```sql
SELECT * FROM events
WHERE start_time::date = '2024-12-25'
AND is_plan = false;
```
- 전체 테이블 스캔 또는 비효율적 인덱스 스캔
- 함수 기반 인덱스 필요

**After:**
```sql
SELECT * FROM events
WHERE date = '2024-12-25'
AND is_plan = false;
```
- `idx_events_date_is_plan` 인덱스 직접 사용
- 빠른 조회

### 2. 인덱스 전략

#### 단일 컬럼 인덱스:
```sql
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_todos_date ON todos(date);
```

#### 복합 인덱스 (자주 사용되는 쿼리 패턴):
```sql
-- 날짜별 계획/실제 이벤트 조회
CREATE INDEX idx_events_date_is_plan ON events(date, is_plan);

-- 날짜별 카테고리 통계
CREATE INDEX idx_events_date_category ON events(date, category_id);

-- 날짜별 할일 정렬
CREATE INDEX idx_todos_date_order ON todos(date, "order");
```

### 3. 쿼리 최적화 예시

#### 일별 이벤트 조회 (DailyView):
```sql
-- Before (비효율)
SELECT * FROM events
WHERE start_time >= '2024-12-25 00:00:00+09:00'
  AND start_time < '2024-12-26 00:00:00+09:00'
ORDER BY start_time;

-- After (최적화)
SELECT * FROM events
WHERE date = '2024-12-25'
ORDER BY start_time;
-- idx_events_date 사용, 빠른 조회
```

#### 월별 카테고리 통계 (MonthlyView):
```sql
-- Before
SELECT
  category_id,
  SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as hours
FROM events
WHERE start_time >= '2024-12-01 00:00:00+09:00'
  AND start_time < '2025-01-01 00:00:00+09:00'
  AND is_plan = false
GROUP BY category_id;

-- After (최적화)
SELECT
  category_id,
  SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
  ) as hours
FROM events
WHERE date >= '2024-12-01'
  AND date < '2025-01-01'
  AND is_plan = false
GROUP BY category_id;
-- idx_events_date_is_plan 사용, 매우 빠름
```

### 4. 데이터 크기 예상

**1년 사용 시:**
- 이벤트: 10개/일 × 365일 = 3,650개
- 할일: 5개/일 × 365일 = 1,825개
- 총: ~5,500 rows

**10년 사용 시:**
- 이벤트: ~36,500개
- 할일: ~18,250개
- 총: ~55,000 rows

→ PostgreSQL은 수백만 행도 문제없이 처리하므로, 적절한 인덱스만 있으면 성능 문제 없음

## 마이그레이션 순서

### 1단계: 백업
```sql
-- 기존 테이블 백업
CREATE TABLE events_backup AS SELECT * FROM events;
CREATE TABLE todos_backup AS SELECT * FROM todos;
```

### 2단계: Events 테이블 마이그레이션
```bash
# Supabase SQL Editor에서 실행
psql -f supabase-schema-optimization.sql
```

### 3단계: 백엔드 코드 수정
```javascript
// Before
const { data } = await supabase
  .from('events')
  .select('*')
  .gte('start_time', `${date}T00:00:00`)
  .lt('start_time', `${nextDate}T00:00:00`);

// After
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('date', date);
```

### 4단계: 검증
```sql
-- 데이터 개수 확인
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM events_backup;

-- 샘플 데이터 확인
SELECT date, start_time, end_time FROM events LIMIT 10;
```

### 5단계: 구 컬럼 삭제
```sql
-- 확인 후 실행
ALTER TABLE events DROP COLUMN start_time_old;
ALTER TABLE events DROP COLUMN end_time_old;
```

## 성능 비교 (예상)

### 일별 조회:
- **Before**: ~50ms (timestamp 파싱)
- **After**: ~5ms (인덱스 직접 사용)
- **개선**: **10배 빠름**

### 월별 집계:
- **Before**: ~200ms (30일 × timestamp 파싱)
- **After**: ~20ms (인덱스 범위 스캔)
- **개선**: **10배 빠름**

### 카테고리 통계:
- **Before**: ~100ms
- **After**: ~10ms (복합 인덱스)
- **개선**: **10배 빠름**

## 추가 최적화 제안

### 1. Partial Index (조건부 인덱스)
```sql
-- 완료되지 않은 할일만 인덱싱 (90% 조회가 미완료 할일)
CREATE INDEX idx_todos_incomplete
ON todos(date, "order")
WHERE completed = false;
```

### 2. 파티셔닝 (장기적으로 고려)
```sql
-- 연도별 파티션 (데이터가 많아지면)
CREATE TABLE events_2024 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE events_2025 PARTITION OF events
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### 3. Materialized View (월별 통계)
```sql
-- 월별 카테고리 통계를 미리 계산
CREATE MATERIALIZED VIEW monthly_category_stats AS
SELECT
  DATE_TRUNC('month', date) as month,
  category_id,
  SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as hours
FROM events
WHERE is_plan = false
GROUP BY month, category_id;

-- 인덱스 추가
CREATE INDEX ON monthly_category_stats(month, category_id);

-- 매일 자정 갱신 (함수 + cron)
REFRESH MATERIALIZED VIEW monthly_category_stats;
```

## 결론

1. **즉시 적용 추천**: Events 테이블 date 컬럼 추가 + 인덱스
2. **중장기**: timestamp 컬럼 완전 제거
3. **장기**: 데이터가 10만 건 이상 되면 파티셔닝 고려

현재 구조로는 1-2년 사용에 전혀 문제없지만, 최적화하면 더 빠른 사용자 경험을 제공할 수 있습니다!
