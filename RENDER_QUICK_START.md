# Render 배포 빠른 시작 가이드

## ✅ GitHub Push 완료

render.yaml, RENDER_DEPLOYMENT.md, .gitignore가 안전하게 커밋되었습니다.

## 🚀 Render 배포 순서 (5단계)

### 1단계: Render 회원가입 & GitHub 연동
- https://render.com 접속
- GitHub 계정으로 로그인
- GitHub 계정 연동 허가

### 2단계: Blueprint 배포 시작
1. Render Dashboard 접속
2. "New" > "Blueprint" 클릭
3. GitHub 저장소 선택: `TimeTracker_Diary`
4. 자동으로 `render.yaml` 감지됨
5. "Create New Resources" 클릭

### 3단계: 환경 변수 설정 (필수)

**백엔드 서비스 (timetracker-backend):**
```
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
SESSION_SECRET=(자동 생성됨)
```

**프론트엔드 서비스 (timetracker-frontend):**
- 환경 변수 추가 필요 없음 (자동 설정됨)

### 4단계: Google OAuth 콜백 URL 업데이트

배포 후 얻은 백엔드 URL을 Google Cloud Console에 등록:

1. https://console.cloud.google.com 접속
2. OAuth 2.0 Client IDs 선택
3. 승인된 리다이렉트 URI에 추가:
   ```
   https://timetracker-backend.onrender.com/auth/google/callback
   ```
   (timetracker-backend.onrender.com을 실제 URL로 변경)

### 5단계: 배포 확인

배포 후 확인 사항:
- ✅ 백엔드 헬스 체크: `https://<backend-url>/api/health`
- ✅ 프론트엔드 접속: `https://<frontend-url>`
- ✅ Google 로그인 테스트
- ✅ 캘린더 데이터 동기화 테스트

## 📌 중요 사항

### Free Plan 제한 사항
- **15분 무활동 후 자동 중지**: 처음 접속 시 몇 초 더 걸릴 수 있음
- **월 750시간 빌드 시간 제한**
- **CPU/RAM 제한**: 작은 프로젝트에는 충분

### 보안 주의
- ⚠️ Google OAuth 시크릿은 절대 GitHub에 커밋하지 마세요
- ⚠️ `.env`, `.env.production`, `.env.local`은 .gitignore에 추가됨
- ✅ 모든 환경 변수는 Render Dashboard에서만 설정

### 문제 해결
- **배포 실패**: Dashboard > Logs 탭 확인
- **API 연결 안 됨**: VITE_API_URL 확인
- **Google 로그인 실패**: Google Console의 리다이렉트 URI 확인

## 📚 자세한 가이드
[RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) 참고

## 💡 팁
- Render에서 "Wake Up" 버튼을 누르면 Free Plan에서 중지된 서비스를 재시작할 수 있습니다
- 프로덕션에서 안정성이 필요하면 Paid 플랜으로 업그레이드하세요
