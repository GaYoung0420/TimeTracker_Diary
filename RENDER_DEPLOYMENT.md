# Render 배포 가이드

TimeTracker Diary를 Render에 배포하는 방법을 설명합니다.

## 1. 사전 준비

### 필요한 계정
- [Render](https://render.com) 계정 (GitHub 연동)
- Supabase 계정
- Google Cloud 프로젝트

### 환경 변수 준비
다음 값들을 준비하세요:
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿

## 2. Render 배포 방법

### 방법 A: render.yaml을 사용한 배포 (권장)

1. **GitHub에 push**
   ```bash
   git add render.yaml
   git commit -m "Add Render configuration"
   git push
   ```

2. **Render Dashboard에서**
   - [Render Dashboard](https://dashboard.render.com)에 접속
   - "New" > "Blueprint" 클릭
   - GitHub 저장소 선택
   - `render.yaml` 자동 감지됨
   - "Create New Resources" 클릭

3. **환경 변수 설정**
   - Dashboard에서 각 서비스의 Environment 탭
   - 다음 변수들을 추가:
     ```
     SUPABASE_URL=<your_supabase_url>
     SUPABASE_ANON_KEY=<your_supabase_key>
     GOOGLE_CLIENT_ID=<your_google_client_id>
     GOOGLE_CLIENT_SECRET=<your_google_client_secret>
     ```

### 방법 B: 수동 배포

#### 1. 백엔드 배포 (Node.js 웹 서비스)

1. Render Dashboard > "New Web Service"
2. GitHub 저장소 선택
3. 다음 설정:
   - **Name**: `timetracker-backend`
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free 또는 Paid

4. Environment Variables 추가:
   ```
   PORT=5001
   NODE_ENV=production
   SUPABASE_URL=<your_url>
   SUPABASE_ANON_KEY=<your_key>
   GOOGLE_CLIENT_ID=<your_id>
   GOOGLE_CLIENT_SECRET=<your_secret>
   GOOGLE_CALLBACK_URL=https://<backend-url>.onrender.com/auth/google/callback
   SESSION_SECRET=<generate_random_string>
   ```

5. Deploy 클릭

#### 2. 프론트엔드 배포 (Static Site)

1. Render Dashboard > "New Static Site"
2. GitHub 저장소 선택
3. 다음 설정:
   - **Name**: `timetracker-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Deploy 클릭

## 3. 프론트엔드 API URL 업데이트

**Render에서 빌드할 때 자동으로 프로덕션 URL이 사용됩니다.**

로컬 개발 시에는 `frontend/.env` 파일 사용:
```
VITE_API_URL=http://localhost:5001
```

**프로덕션 배포 시 Render에서 자동으로 다음 값이 사용됩니다:**
- `VITE_API_URL=https://<backend-url>.onrender.com`
- `VITE_SUPABASE_URL=<your_supabase_url>`
- `VITE_SUPABASE_ANON_KEY=<your_supabase_key>`

## 4. Google OAuth 설정 업데이트

Google Cloud Console에서:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택
3. **OAuth 2.0 Client IDs** 설정
4. **Authorized redirect URIs**에 추가:
   ```
   https://<backend-url>.onrender.com/auth/google/callback
   ```

## 5. CORS 설정 확인

backend/src/index.js의 CORS 설정 확인:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://<frontend-url>.onrender.com'],
  credentials: true
}));
```

프론트엔드 URL을 추가하세요.

## 6. Supabase 설정

### 데이터베이스 초기화
1. Supabase Dashboard > SQL Editor
2. `supabase-schema.sql` 내용을 복사해서 실행

### RLS (Row Level Security) 정책 검토
필요시 공개 접근 설정 확인

## 7. 배포 후 확인

1. 백엔드 URL 접속: `https://<backend-url>.onrender.com/api/health`
   - 응답: `{"status":"ok","message":"TimeTracker API is running"}`

2. 프론트엔드 URL 접속
3. Google 로그인 테스트
4. 캘린더 동기화 테스트

## 8. 주의사항 - 보안

**GitHub에 절대 커밋하지 마세요:**
- `.env` 파일
- `.env.production` 파일
- `.env.local` 파일
- Google OAuth 시크릿
- Supabase 키

이 파일들은 `.gitignore`에 자동으로 추가되어 있습니다.

**환경 변수는 Render Dashboard에서만 설정하세요:**
- Render Dashboard > 각 서비스 선택 > Environment 탭
- 모든 민감한 정보를 여기에 입력

### Free Plan 제한
- **Inactivity 중지**: 15분 동안 요청 없으면 서비스 중지
- **CPU/RAM 제한**: 제한된 리소스
- **Build 시간**: 월 750시간 제한

### 해결 방법
- Paid 플랜으로 업그레이드
- Keep-alive 스크립트 사용 (무료 플랜 사용 시)
- 대시보드에서 수동으로 "Wake Up" 클릭

## 9. 로그 확인

문제가 발생하면:
1. Render Dashboard > 서비스 선택
2. "Logs" 탭에서 에러 확인
3. "Events" 탭에서 배포 상태 확인

## 참고 자료

- [Render 공식 문서](https://render.com/docs)
- [Node.js 배포 가이드](https://render.com/docs/deploy-node-express-app)
- [Static Site 배포 가이드](https://render.com/docs/static-sites)
