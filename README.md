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

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000
```

5. Start the development server:
```bash
npm run dev
```

Frontend will run on http://localhost:3000

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

## License

ISC