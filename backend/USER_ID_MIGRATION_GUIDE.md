# User ID Migration Guide

이 가이드는 DB를 멀티 유저 지원 구조로 변경하기 위한 마이그레이션 가이드입니다.

## 1. DB 마이그레이션 실행

```bash
cd backend
node run-migration.js migrations/005_add_user_id_to_all_tables.sql
```

## 2. 기존 데이터에 user_id 할당

마이그레이션 후, 기존 데이터에 user_id를 할당해야 합니다:

```sql
-- 첫 번째 사용자의 ID 확인
SELECT id, email FROM users LIMIT 1;

-- 기존 데이터에 user_id 할당 (첫 번째 사용자에게)
UPDATE categories SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE events SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE images SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE reflections SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE routines SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE routine_checks SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE todo_categories SET user_id = '사용자_UUID' WHERE user_id IS NULL;
UPDATE todos SET user_id = '사용자_UUID' WHERE user_id IS NULL;
```

또는 테스트 데이터라면 삭제:

```sql
DELETE FROM routine_checks;
DELETE FROM todos;
DELETE FROM todo_categories;
DELETE FROM events;
DELETE FROM images;
DELETE FROM reflections;
DELETE FROM routines;
DELETE FROM categories;
```

## 3. NOT NULL 제약조건 추가 (선택사항)

데이터 할당 후, user_id를 필수로 만들려면:

```sql
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE images ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE reflections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE routines ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE routine_checks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE todo_categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL;
```

## 4. 백엔드 API 수정 필요 사항

모든 API 엔드포인트에서 다음을 추가해야 합니다:

### 필요한 변경사항

1. **인증 미들웨어 적용**: 모든 API 라우트에 `requireAuth` 미들웨어 추가
2. **user_id 필터링**: 모든 SELECT 쿼리에 `.eq('user_id', req.session.userId)` 추가
3. **user_id 삽입**: 모든 INSERT 쿼리에 `user_id: req.session.userId` 추가

### 수정해야 할 파일 목록

- `backend/src/index.js` - 모든 inline API 라우트들
- `backend/src/categories-api.js`
- `backend/src/events-api.js`
- `backend/src/todo-categories-api.js`
- `backend/src/calendars-api.js`

### 예시: categories-api.js 수정

**수정 전:**
```javascript
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');
  // ...
});
```

**수정 후:**
```javascript
import { requireAuth } from './middleware/auth.js';

app.get('/api/categories', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', req.session.userId)  // 추가
    .order('id');
  // ...
});

app.post('/api/categories', requireAuth, async (req, res) => {
  const { name, color } = req.body;
  const { data, error } = await supabase
    .from('categories')
    .insert([{
      name,
      color,
      user_id: req.session.userId  // 추가
    }])
    .select()
    .single();
  // ...
});
```

## 5. 주요 변경 지점

### index.js 주요 수정 라인

- Line 357: `/api/daily/:date` GET - 모든 supabase 쿼리에 user_id 필터 추가
- Line 391: `/api/daily/:date` POST - INSERT 시 user_id 추가
- Line 446: `/api/todos` POST - user_id 추가
- Line 482: `/api/todos/:id` PATCH - user_id 검증 추가
- Line 494: `/api/todos/:id` DELETE - user_id 검증 추가
- Line 577: `/api/images/upload` POST - user_id 추가
- Line 705: `/api/images/:id` DELETE - user_id 검증 추가
- Line 750: `/api/routines` GET - user_id 필터 추가
- Line 778: `/api/routines` POST - user_id 추가
- Line 859: `/api/routine-checks` POST - user_id 추가
- Line 1103: `/api/monthly/stats` POST - user_id 필터 추가
- Line 1171: `/api/monthly/time-stats` POST - user_id 필터 추가
- Line 1352: `/api/monthly/routine-mood-stats` POST - user_id 필터 추가

## 6. 테스트 체크리스트

마이그레이션 후 다음을 테스트하세요:

- [ ] 로그인 후 카테고리 생성/조회/수정/삭제
- [ ] 다른 유저로 로그인 시 이전 유저 데이터 보이지 않는지 확인
- [ ] 할일 생성/완료/삭제
- [ ] 루틴 생성/체크/삭제
- [ ] 이벤트 생성/수정/삭제
- [ ] 이미지 업로드/삭제
- [ ] 월별 통계 조회
- [ ] 리플렉션 저장/조회

## 7. 롤백 방법

문제 발생 시:

```sql
-- 인덱스 삭제
DROP INDEX IF EXISTS idx_categories_user_id;
DROP INDEX IF EXISTS idx_events_user_id_date;
DROP INDEX IF EXISTS idx_images_user_id_date;
DROP INDEX IF EXISTS idx_reflections_user_id_date;
DROP INDEX IF EXISTS idx_routines_user_id_active;
DROP INDEX IF EXISTS idx_routine_checks_user_id_date;
DROP INDEX IF EXISTS idx_todo_categories_user_id;
DROP INDEX IF EXISTS idx_todos_user_id_date;
DROP INDEX IF EXISTS idx_todos_user_id_completed;

-- user_id 컬럼 삭제
ALTER TABLE categories DROP COLUMN IF EXISTS user_id;
ALTER TABLE events DROP COLUMN IF EXISTS user_id;
ALTER TABLE images DROP COLUMN IF EXISTS user_id;
ALTER TABLE reflections DROP COLUMN IF EXISTS user_id;
ALTER TABLE routines DROP COLUMN IF EXISTS user_id;
ALTER TABLE routine_checks DROP COLUMN IF EXISTS user_id;
ALTER TABLE todo_categories DROP COLUMN IF EXISTS user_id;
ALTER TABLE todos DROP COLUMN IF EXISTS user_id;

-- unique constraint 복구
ALTER TABLE reflections ADD CONSTRAINT reflections_date_key UNIQUE (date);
```
