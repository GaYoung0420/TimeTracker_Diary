# Database Migration Guide - Category System Update

이 가이드는 카테고리 시스템을 업데이트하는 방법을 설명합니다.

## 변경 사항 요약

### 이전 시스템
- 카테고리가 하드코딩되어 있었습니다 (`plan-waste`, `waste` 등의 문자열 ID)
- 계획/실제 구분이 카테고리 이름 prefix로 되어있었습니다
- 카테고리 색상이 코드에 고정되어 있었습니다

### 새로운 시스템
- 사용자가 카테고리를 직접 추가/수정/삭제할 수 있습니다
- 각 카테고리에 색상을 지정할 수 있습니다 (컬러피커)
- 이벤트에 `is_plan` 필드로 계획/실제를 구분합니다
- 카테고리별 시간 통계는 **실제 이벤트만** 계산합니다

## 마이그레이션 단계

### 1. 데이터베이스 백업
먼저 Supabase에서 현재 데이터를 백업하세요.

### 2. 새 스키마 적용
Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하세요.

이것은 다음을 수행합니다:
- `categories` 테이블 생성
- `events` 테이블에 `category_id`와 `is_plan` 컬럼 추가
- 필요한 인덱스와 트리거 추가

### 3. 데이터 마이그레이션
Supabase SQL Editor에서 `supabase-migration.sql` 파일의 내용을 실행하세요.

이것은 다음을 수행합니다:
- 기본 카테고리 7개 생성 (낭비시간, 사회적, 지적, 영적, 잠, 운동, 기타)
- 기존 이벤트 데이터를 새 스키마로 변환
  - `plan-waste` → category_id=1, is_plan=true
  - `waste` → category_id=1, is_plan=false
  - 나머지 카테고리도 동일하게 변환

### 4. 마이그레이션 확인
다음 SQL로 마이그레이션이 성공했는지 확인하세요:

```sql
-- 카테고리가 생성되었는지 확인
SELECT * FROM categories;

-- 이벤트가 올바르게 변환되었는지 확인
SELECT id, title, category_id, is_plan FROM events LIMIT 10;
```

### 5. 구 컬럼 삭제 (선택사항)
마이그레이션이 성공적으로 완료되고 모든 것이 정상 작동하는 것을 확인한 후,
구 `category` 컬럼을 삭제할 수 있습니다:

```sql
ALTER TABLE events DROP COLUMN IF EXISTS category;
```

## 새로운 기능

### 카테고리 관리 API

**카테고리 목록 조회**
```
GET /api/categories
```

**카테고리 생성**
```
POST /api/categories
{
  "name": "새 카테고리",
  "color": "#FF5733"
}
```

**카테고리 수정**
```
PATCH /api/categories/:id
{
  "name": "수정된 이름",
  "color": "#33FF57"
}
```

**카테고리 삭제**
```
DELETE /api/categories/:id
```

### 이벤트 API 변경사항

**이벤트 생성** - 이제 `category_id`와 `is_plan` 사용:
```
POST /api/events/create
{
  "date": "2025-01-15",
  "title": "운동",
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "category_id": 6,
  "is_plan": false,
  "description": "아침 조깅"
}
```

**이벤트 조회** - 카테고리 정보가 중첩 객체로 포함됨:
```json
{
  "id": 123,
  "title": "운동",
  "start": "2025-01-15T09:00:00",
  "end": "2025-01-15T10:00:00",
  "category_id": 6,
  "category": {
    "id": 6,
    "name": "⑥ 운동",
    "color": "#92e1c0"
  },
  "is_plan": false,
  "description": "아침 조깅"
}
```

## 프론트엔드 변경사항

### Timeline 컴포넌트
- 이제 `is_plan` 필드로 계획/실제 컬럼을 구분합니다
- 카테고리 정보는 중첩 객체(`event.category`)에서 가져옵니다

### EventEditModal 컴포넌트
- 모든 카테고리를 선택할 수 있습니다 (계획/실제 구분 없음)
- `category_id` 필드를 사용합니다

### CategoryStats 컴포넌트
- **실제 이벤트만** 통계에 포함됩니다 (`is_plan = false`)
- 동적 카테고리 목록을 표시합니다
- 제목이 "카테고리별 시간 (실제)"로 변경되었습니다

## 롤백 방법

문제가 발생하면 다음과 같이 롤백할 수 있습니다:

1. 백업에서 데이터베이스 복원
2. 이전 버전의 코드로 되돌리기
3. 또는 새 컬럼만 제거:
```sql
ALTER TABLE events DROP COLUMN IF EXISTS category_id;
ALTER TABLE events DROP COLUMN IF EXISTS is_plan;
DROP TABLE IF EXISTS categories;
```

## 테스트 체크리스트

- [ ] 카테고리 목록 조회가 정상적으로 작동하는가?
- [ ] 새 카테고리를 생성할 수 있는가?
- [ ] 카테고리 색상을 변경할 수 있는가?
- [ ] 계획 컬럼에서 이벤트를 생성할 수 있는가?
- [ ] 실제 컬럼에서 이벤트를 생성할 수 있는가?
- [ ] 이벤트 수정 시 카테고리를 변경할 수 있는가?
- [ ] 카테고리별 시간 통계가 실제 이벤트만 표시하는가?
- [ ] 사용 중인 카테고리 삭제 시 오류 메시지가 표시되는가?
