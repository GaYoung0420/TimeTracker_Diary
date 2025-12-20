# TimeTracker Diary - 설치 가이드

## 1. Supabase 설정

### 1.1 프로젝트 생성
1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호 설정
4. Region 선택 (가까운 지역 권장)

### 1.2 데이터베이스 스키마 생성
1. Supabase 대시보드에서 "SQL Editor" 메뉴 클릭
2. `supabase-schema.sql` 파일의 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 실행
4. 5개의 테이블이 생성됨을 확인

### 1.3 Storage 버킷 생성
1. Supabase 대시보드에서 "Storage" 메뉴 클릭
2. "Create a new bucket" 클릭
3. 버킷 이름: `diary-images` 입력
4. Public bucket: **체크** (이미지를 공개적으로 접근 가능하게)
5. "Create bucket" 클릭
6. 생성된 `diary-images` 버킷 클릭
7. "Policies" 탭으로 이동
8. 다음 정책들을 추가:

**INSERT 정책 (이미지 업로드 허용):**
- Policy name: `Allow authenticated uploads`
- Target roles: `authenticated`
- Policy definition: `true`
- Operations: `INSERT` 체크

**SELECT 정책 (이미지 읽기 허용):**
- Policy name: `Allow public read`
- Target roles: `public`
- Policy definition: `true`
- Operations: `SELECT` 체크

**DELETE 정책 (이미지 삭제 허용):**
- Policy name: `Allow authenticated delete`
- Target roles: `authenticated`
- Policy definition: `true`
- Operations: `DELETE` 체크

### 1.4 API 키 복사
1. Settings > API 메뉴로 이동
2. Project URL 복사
3. anon public 키 복사

## 2. Google Calendar API 설정

### 2.1 Google Cloud Console 설정
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Library" 메뉴
4. "Google Calendar API" 검색 후 "Enable" 클릭

### 2.2 Service Account 생성
1. "APIs & Services" > "Credentials" 메뉴
2. "Create Credentials" > "Service Account" 선택
3. Service Account 이름 입력 (예: timetracker-calendar)
4. 생성 후 해당 Service Account 클릭
5. "Keys" 탭으로 이동
6. "Add Key" > "Create new key" > "JSON" 선택
7. JSON 파일 다운로드 (이 파일은 안전하게 보관!)

### 2.3 Google Calendar 공유
1. Google Calendar (calendar.google.com) 접속
2. 사용할 캘린더 설정(⚙️) 클릭
3. "Share with specific people" 섹션
4. Service Account 이메일 추가 (JSON 파일의 `client_email` 값)
5. 권한: "See all event details" 선택
6. 전송 클릭

## 3. Backend 설정

### 3.1 의존성 설치
```bash
cd backend
npm install
```

### 3.2 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
PORT=5000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=여기에_supabase_anon_키_입력

# Google Credentials - JSON 파일 내용을 한 줄로 변환
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...전체JSON내용..."}
```

**중요**: `GOOGLE_CREDENTIALS`는 다운로드한 JSON 파일의 **전체 내용**을 한 줄로 붙여넣어야 합니다.

### 3.3 서버 실행
```bash
npm run dev
```

서버가 http://localhost:5000 에서 실행됩니다.

## 4. Frontend 설정

### 4.1 의존성 설치
```bash
cd frontend
npm install
```

### 4.2 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_supabase_anon_키_입력
VITE_API_URL=http://localhost:5000
```

### 4.3 CSS 파일 복사
원본 Google Apps Script의 CSS를 복사:

1. `stylesheet-daily.css` 내용을 `frontend/src/App.css`에 추가
2. `stylesheet-monthly.css` 내용을 `frontend/src/App.css`에 추가

### 4.4 프론트엔드 실행
```bash
npm run dev
```

프론트엔드가 http://localhost:3000 에서 실행됩니다.

## 5. 테스트

### 5.1 API 테스트
브라우저에서 http://localhost:5000/api/health 접속
- 정상: `{"status":"ok","message":"TimeTracker API is running"}`

### 5.2 Supabase 연결 테스트
http://localhost:5000/api/test 접속
- 정상: `{"message":"API and Supabase connected successfully"}`

### 5.3 Google Calendar 테스트
http://localhost:5000/api/calendars 접속
- 정상: 캘린더 목록이 JSON으로 반환됨

### 5.4 앱 실행
http://localhost:3000 접속
- Daily View가 보이고 Timeline이 로드되면 성공!

## 6. 트러블슈팅

### Backend 오류: "GOOGLE_CREDENTIALS is not valid JSON"
- `.env` 파일의 GOOGLE_CREDENTIALS가 올바른 JSON 형식인지 확인
- 따옴표("), 쉼표(,), 중괄호({}) 누락 여부 체크

### Calendar API 오류: "Error fetching calendars"
- Service Account 이메일이 Google Calendar에 공유되었는지 확인
- Google Cloud Console에서 Calendar API가 활성화되었는지 확인

### Supabase 연결 오류
- SUPABASE_URL과 SUPABASE_ANON_KEY가 정확한지 확인
- Supabase 프로젝트가 일시 중지되지 않았는지 확인

### CORS 오류
- Backend가 실행 중인지 확인
- Frontend의 VITE_API_URL이 올바른지 확인

## 7. 다음 단계

- 이미지 업로드 기능 구현 (Supabase Storage 사용)
- 드래그 앤 드롭 Todo 순서 변경
- Monthly Time Tracker Grid 구현
- 다크모드 지원

## 참고 자료

- Supabase 문서: https://supabase.com/docs
- Google Calendar API: https://developers.google.com/calendar/api
- React 문서: https://react.dev
