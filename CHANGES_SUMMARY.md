# 카테고리 시스템 업데이트 - 변경사항 요약

## 개요
이벤트를 '실제'와 '계획'으로 구분하고, 사용자가 카테고리를 직접 추가/수정/삭제할 수 있도록 개선했습니다.
카테고리 색상도 컬러피커로 자유롭게 설정할 수 있으며, 카테고리별 시간 통계는 실제 이벤트만 계산합니다.

## 주요 변경사항

### 1. 데이터베이스 스키마 변경

**새로운 테이블**
- `categories`: 사용자 정의 카테고리 관리
  - `id`: 카테고리 ID
  - `name`: 카테고리 이름
  - `color`: 카테고리 색상 (HEX 코드)

**events 테이블 변경**
- `category_id`: 카테고리 외래 키 (categories.id 참조)
- `is_plan`: 계획/실제 구분 (boolean)
- 기존 `category` 컬럼은 마이그레이션 후 삭제 가능

### 2. 백엔드 API 추가

**카테고리 관리 API** (`/backend/src/categories-api.js`)
- `GET /api/categories`: 모든 카테고리 조회
- `POST /api/categories`: 새 카테고리 생성
- `PATCH /api/categories/:id`: 카테고리 수정
- `DELETE /api/categories/:id`: 카테고리 삭제 (사용 중인 카테고리는 삭제 불가)

**이벤트 API 수정** (`/backend/src/events-api.js`)
- 이벤트 조회 시 카테고리 정보를 중첩 객체로 포함
- 이벤트 생성/수정 시 `category_id`와 `is_plan` 사용
- 하드코딩된 카테고리 목록 제거

### 3. 프론트엔드 변경

**새로운 컴포넌트**
- `CategoryManager.jsx`: 카테고리 CRUD UI
  - 카테고리 추가/수정/삭제 기능
  - HTML5 color picker를 사용한 색상 선택
  - 실시간 카테고리 목록 표시

**수정된 컴포넌트**

`Timeline.jsx`:
- `is_plan` 필드로 계획/실제 이벤트 분리
- 카테고리 정보를 `event.category` 객체에서 가져옴
- 새 이벤트 생성 시 `category_id`와 `is_plan` 사용

`EventEditModal.jsx`:
- `category_id` 필드로 카테고리 선택
- 모든 카테고리 선택 가능 (계획/실제 구분 없음)

`CategoryStats.jsx`:
- **실제 이벤트만** 통계 계산 (`is_plan = false`)
- 동적 카테고리 목록 표시
- 카테고리가 `categories` prop으로 전달됨

`DailyView.jsx`:
- CategoryManager 컴포넌트 통합
- 카테고리 설정 버튼 (⚙️) 추가
- `reloadCategories` 함수로 카테고리 새로고침

**훅 수정**

`useEvents.js`:
- `loadCategories` 함수를 외부에서 호출 가능하도록 export
- `reloadCategories` 함수 추가

**API 유틸리티**

`api.js`:
- 카테고리 CRUD 함수 추가
- `createEvent` 함수가 `category_id`와 `is_plan` 파라미터 사용

### 4. 스타일링

**CSS 추가**
- `CategoryManager.css`: 카테고리 관리 UI 스타일
- `App.css`: 카테고리 설정 버튼 스타일 추가

## 마이그레이션 단계

### 필수 단계

1. **데이터베이스 스키마 업데이트**
   ```sql
   -- supabase-schema.sql 실행
   ```

2. **기존 데이터 마이그레이션**
   ```sql
   -- supabase-migration.sql 실행
   ```

3. **백엔드 및 프론트엔드 배포**
   - 로컬에서 테스트
   - 프로덕션 배포

### 선택 단계

4. **구 컬럼 삭제** (모든 것이 정상 작동하는 것을 확인한 후)
   ```sql
   ALTER TABLE events DROP COLUMN IF EXISTS category;
   ```

## 새로운 기능 사용법

### 카테고리 관리

1. Daily 뷰에서 날짜 헤더의 ⚙️ 버튼 클릭
2. "카테고리 관리" 패널이 표시됨
3. "+ 추가" 버튼으로 새 카테고리 생성
4. 각 카테고리의 "수정" 버튼으로 이름과 색상 변경
5. 각 카테고리의 "삭제" 버튼으로 삭제 (사용 중이면 오류 발생)

### 이벤트 생성

1. 계획 컬럼 또는 실제 컬럼에서 드래그하여 이벤트 생성
2. 이벤트 클릭하여 편집
3. 카테고리 드롭다운에서 모든 카테고리 선택 가능
4. 저장 시 자동으로 계획/실제 구분 유지

### 통계 확인

- 카테고리별 시간 통계는 **실제 이벤트만** 표시
- 각 카테고리의 색상으로 시각적으로 구분

## 파일 변경 목록

### 새로 생성된 파일
- `/backend/src/categories-api.js`
- `/frontend/src/components/Settings/CategoryManager.jsx`
- `/frontend/src/components/Settings/CategoryManager.css`
- `/supabase-migration.sql`
- `/MIGRATION_GUIDE.md`
- `/CHANGES_SUMMARY.md`

### 수정된 파일

**백엔드**
- `/backend/src/index.js`
- `/backend/src/events-api.js`
- `/supabase-schema.sql`

**프론트엔드**
- `/frontend/src/components/Daily/Timeline.jsx`
- `/frontend/src/components/Daily/EventEditModal.jsx`
- `/frontend/src/components/Daily/CategoryStats.jsx`
- `/frontend/src/components/Daily/DailyView.jsx`
- `/frontend/src/hooks/useEvents.js`
- `/frontend/src/utils/api.js`
- `/frontend/src/App.css`

## 테스트 체크리스트

배포 전 다음 항목들을 확인하세요:

- [ ] 데이터베이스 마이그레이션 성공
- [ ] 로컬에서 npm install 실행
- [ ] 백엔드 서버 시작 (npm run dev)
- [ ] 프론트엔드 서버 시작 (npm run dev)
- [ ] 카테고리 생성 가능
- [ ] 카테고리 색상 변경 가능
- [ ] 카테고리 삭제 가능
- [ ] 계획 컬럼에서 이벤트 생성 가능
- [ ] 실제 컬럼에서 이벤트 생성 가능
- [ ] 이벤트 편집 가능
- [ ] 카테고리별 시간 통계 정상 표시 (실제만)
- [ ] 사용 중인 카테고리 삭제 시 오류 메시지 표시

## 롤백 방법

문제 발생 시:

1. Git에서 이전 커밋으로 되돌리기
2. 데이터베이스 백업에서 복원
3. 또는 새 컬럼만 제거:
   ```sql
   ALTER TABLE events DROP COLUMN IF EXISTS category_id;
   ALTER TABLE events DROP COLUMN IF EXISTS is_plan;
   DROP TABLE IF EXISTS categories;
   ```

## 향후 개선 사항

- [ ] 카테고리 순서 변경 기능
- [ ] 카테고리 아이콘 선택 기능
- [ ] 카테고리 그룹화 기능
- [ ] 카테고리별 목표 시간 설정
- [ ] 월간/주간 카테고리 통계 대시보드
