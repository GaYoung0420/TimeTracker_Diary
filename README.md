# TimeTracker Diary

React + Node.js + Express + Supabase + Google Calendar API

## Features

- **Daily View**: Timeline tracker, Todo lists, Routines, Mood tracking, Image uploads, Daily reflections
- **Monthly View**: Calendar grid with thumbnail images, Time tracker grid
- **Google Calendar Integration**: Auto-import events from Google Calendar
- **Supabase Database**: Persistent storage for todos, reflections, images, and routines

## Project Structure

```
.
├── backend/              # Node.js + Express backend
│   ├── src/
│   │   └── index.js      # Main server file with all API endpoints
│   ├── .env.example
│   └── package.json
│
├── frontend/             # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Daily/    # Daily view components
│   │   │   └── Monthly/  # Monthly view components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/
│   │   │   └── api.js    # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── .env.example
│   └── package.json
│
└── supabase-schema.sql   # Database schema
```

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Cloud project with Calendar API enabled

### 1. Database Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. In the SQL Editor, run the `supabase-schema.sql` file to create tables
3. Copy your project URL and anon key

### 2. Google Calendar API Setup

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. Enable Google Calendar API
4. Create Service Account credentials
5. Download the JSON key file
6. Share your Google Calendar with the service account email

### 3. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```
PORT=5000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CREDENTIALS={"type":"service_account",...}
```

5. Start the server:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.development` file for local development:
```bash
cp .env.example .env.development
```

4. Update `.env.development` with your credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5001
```

5. **Important: Production Environment Variables**

For Render deployment, create `.env.production`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=
```

**⚠️ IMPORTANT**: `VITE_API_URL` must be **empty** in production!
- Frontend and backend are served from the same domain on Render
- Empty value makes API calls use relative URLs (same-origin)
- If you set a different backend URL, deployment will fail with infinite loading

6. Start the development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## API Endpoints

### Health & Test
- `GET /api/health` - Health check
- `GET /api/test` - Test Supabase connection

### Daily Data
- `GET /api/daily/:date` - Get all daily data (todos, reflection, images, routines)
- `POST /api/daily/:date` - Save daily data (batch)

### Todos
- `POST /api/todos` - Add todo
- `PATCH /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

### Routines
- `GET /api/routines` - Get all active routines
- `POST /api/routines` - Add routine
- `PATCH /api/routines/:id` - Update routine
- `DELETE /api/routines/:id` - Soft delete routine
- `POST /api/routine-checks` - Update routine check

### Google Calendar
- `GET /api/calendars` - Get user's calendars
- `POST /api/calendar/events` - Get events for date
- `POST /api/calendar/wake-sleep` - Get wake/sleep events

### Monthly
- `POST /api/monthly/stats` - Get monthly statistics

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Calendar**: Google Calendar API
- **Other**: googleapis, CORS, dotenv

## Development Notes

### Local Development
- Backend runs on port 5001
- Frontend runs on port 5173 (Vite default)
- Frontend makes API requests to backend
- Google Calendar events are fetched on-demand (not stored in database)
- Images stored in Supabase Storage

### Production Deployment (Render)

The app uses a **monorepo structure** where the backend serves the frontend build files:
- Backend serves static files from `frontend/dist/`
- Frontend and backend run on the same domain (fixes Safari cookie issues)
- No CORS issues since it's same-origin

#### Deployment Steps

1. **Build the frontend**:
```bash
npm --prefix frontend install
npm --prefix frontend run build
```

2. **Commit dist files**:
```bash
git add frontend/dist/
git commit -m "Build frontend for deployment"
git push
```

3. **Render Configuration**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment Variables:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_CALLBACK_URL` (e.g., `https://yourapp.onrender.com/auth/google/callback`)
     - `SESSION_SECRET`
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `NODE_ENV=production`

#### Important: Updating Frontend Code

When you modify frontend code, you MUST rebuild and commit the dist files:

```bash
# 1. Build frontend
npm --prefix frontend run build

# 2. Commit the changes
git add frontend/dist/
git commit -m "Update frontend build"
git push
```

**Note**: The root `.gitignore` has `dist/` commented out to allow committing frontend build files for deployment.

## Troubleshooting

### Infinite Loading Screen on Render Deployment

**Symptom**: Deployed app shows "Loading..." forever, but works fine locally.

**Cause**: Incorrect `VITE_API_URL` in `.env.production` file.

**Solution**:
1. Open `frontend/.env.production`
2. Ensure `VITE_API_URL` is **empty** (not set to a different backend URL):
   ```
   VITE_API_URL=
   ```
3. Rebuild and redeploy:
   ```bash
   npm run build
   git add frontend/dist/
   git commit -m "Fix production API URL"
   git push
   ```

**Why**: On Render, frontend and backend are served from the same domain. Empty `VITE_API_URL` makes the app use relative URLs for API calls, ensuring same-origin requests.

### White Screen on Render Deployment

If you see a white screen after deploying to Render:

1. **Check if dist files are committed**:
```bash
git ls-files frontend/dist/
```
You should see `index.html`, JS, and CSS files.

2. **Verify .gitignore**:
Make sure root `.gitignore` doesn't ignore `dist/` folder:
```
# Don't ignore frontend/dist - we need it for deployment
# dist/
```

3. **Check Render logs**:
Look for "SPA fallback for: /assets/..." messages. If assets are falling back, dist files weren't deployed properly.

### Safari Cookie Issues

Safari blocks third-party cookies. This app solves it by:
- Serving frontend and backend from the same domain
- Using `sameSite: 'lax'` for session cookies
- No cross-origin requests needed

### Image Upload Failing

If image upload shows "업로드 중 오류가 발생했습니다":

1. **Check Supabase Storage Bucket**:
   - Go to your Supabase project dashboard
   - Navigate to Storage section
   - Ensure `diary-images` bucket exists
   - If not, create it with these settings:
     - Name: `diary-images`
     - Public bucket: Yes (or configure RLS policies)

2. **Check Bucket Permissions**:
   - Go to Storage > diary-images > Policies
   - Add policy for INSERT:
     ```sql
     CREATE POLICY "Allow public uploads"
     ON storage.objects FOR INSERT
     TO public
     WITH CHECK (bucket_id = 'diary-images');
     ```
   - Add policy for SELECT (to view images):
     ```sql
     CREATE POLICY "Allow public access"
     ON storage.objects FOR SELECT
     TO public
     USING (bucket_id = 'diary-images');
     ```

3. **Check Render Logs**:
   - Look for "Image Upload Error" messages
   - Check for Supabase Storage errors
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly

4. **Verify Environment Variables**:
   - `SUPABASE_URL` should be your project URL
   - `SUPABASE_ANON_KEY` should be your anon/public key
   - Both must be set in Render environment variables

### Timeline/TimeTracker Not Showing Events

If the timeline is blank or events are not showing:

1. **Check authentication**: Make sure you're logged in with Google OAuth
   - Look for your email in the top right corner
   - If not logged in, click "Sign in with Google"

2. **Verify Google OAuth Callback URL**: In Render environment variables, ensure:
   ```
   GOOGLE_CALLBACK_URL=https://yourapp.onrender.com/auth/google/callback
   ```

3. **Check Google Cloud Console**:
   - Go to https://console.cloud.google.com
   - Navigate to APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - Add `https://yourapp.onrender.com/auth/google/callback` to Authorized redirect URIs

4. **Verify CORS and Session**:
   - Backend automatically detects Render deployment via `RENDER_EXTERNAL_URL`
   - Session cookies should work since frontend/backend are same-origin

5. **Check Render logs**:
   ```bash
   # Look for these log messages:
   === /api/calendars request ===
   Authenticated: true/false
   User: your-email@gmail.com
   ```

6. **Clear browser cache and cookies**: Sometimes stale sessions cause issues
   - Log out and log back in
   - Try in an incognito/private window

7. **Test authentication endpoint**: Open developer console and check:
   ```javascript
   fetch('/auth/user', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```
   Should return `{ success: true, user: {...} }`

## Oracle Cloud Server Deployment

현재 프로젝트는 Oracle Cloud 서버에 배포되어 있습니다.

### 배포 방법

#### 1. 코드 수정 후 커밋 & 푸시

```bash
# 1. 변경사항 확인
git status

# 2. 파일 추가 (수정된 파일들)
git add .

# 3. 커밋 메시지 작성
git commit -m "커밋 메시지"

# 4. GitHub에 푸시
git push
```

#### 2. 서버 배포 (자동화)

```bash
# 서버 접속 + 코드 업데이트 + 프론트엔드 빌드
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "cd TimeTracker_Diary && git pull && source ~/.nvm/nvm.sh && nvm use 20 && cd frontend && npm run build"
```

이 명령어가 하는 일:
- `git pull`: 최신 코드 가져오기
- `nvm use 20`: Node.js 20 버전 활성화
- `npm run build`: 프론트엔드 빌드 (frontend/dist/ 생성)

#### 3. 백엔드 재시작 (백엔드 코드 변경 시에만)

```bash
# 백엔드 코드가 변경된 경우에만 실행
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "source ~/.nvm/nvm.sh && nvm use 20 && cd TimeTracker_Diary/backend && pm2 restart timetracker-backend"
```

### 배포 시나리오별 가이드

#### 프론트엔드만 수정한 경우 (React 컴포넌트, CSS 등)

```bash
# 1. 커밋 & 푸시
git add .
git commit -m "Update frontend UI"
git push

# 2. 서버 배포 (빌드만)
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "cd TimeTracker_Diary && git pull && source ~/.nvm/nvm.sh && nvm use 20 && cd frontend && npm run build"
```

#### 백엔드만 수정한 경우 (API, DB 로직 등)

```bash
# 1. 커밋 & 푸시
git add .
git commit -m "Update backend API"
git push

# 2. 서버 배포 (백엔드 재시작)
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "cd TimeTracker_Diary && git pull && source ~/.nvm/nvm.sh && nvm use 20 && cd backend && pm2 restart timetracker-backend"
```

#### 둘 다 수정한 경우

```bash
# 1. 커밋 & 푸시
git add .
git commit -m "Update both frontend and backend"
git push

# 2. 서버 배포 (빌드 + 재시작)
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "cd TimeTracker_Diary && git pull && source ~/.nvm/nvm.sh && nvm use 20 && cd frontend && npm run build && cd ../backend && pm2 restart timetracker-backend"
```

### 서버 상태 확인

```bash
# PM2 프로세스 상태 확인
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "source ~/.nvm/nvm.sh && nvm use 20 && pm2 list"

# 로그 확인
ssh -i ~/.ssh/oracle_key ubuntu@140.238.17.14 "source ~/.nvm/nvm.sh && nvm use 20 && pm2 logs timetracker-backend --lines 50"
```

### 주의사항

1. **SSH 키 경로**: `~/.ssh/oracle_key` 파일이 있어야 합니다.
2. **Node 버전**: 서버는 nvm으로 Node.js를 관리하므로 `source ~/.nvm/nvm.sh && nvm use 20`이 필요합니다.
3. **PM2**: 백엔드는 PM2로 관리되며, 프로세스 이름은 `timetracker-backend`입니다.
4. **빌드 파일**: 프론트엔드 빌드 결과는 `frontend/dist/`에 생성되며, 백엔드가 이를 static 파일로 서빙합니다.

### 환경 변수 설정 (서버)

서버의 환경 변수는 다음 위치에 있습니다:

```bash
# 백엔드 환경 변수
~/TimeTracker_Diary/backend/.env

# PM2 ecosystem 파일 (환경 변수 포함)
~/TimeTracker_Diary/backend/ecosystem.config.js
```

환경 변수 수정 후에는 반드시 PM2 재시작:
```bash
pm2 restart timetracker-backend
```

## License

ISC