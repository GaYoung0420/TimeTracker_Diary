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

- Backend runs on port 5000
- Frontend runs on port 3000
- Frontend proxies `/api` requests to backend
- Google Calendar events are fetched on-demand (not stored in database)
- Images metadata stored in Supabase, files stored in cloud storage (implement upload endpoint)

## Next Steps

To complete the frontend implementation, you need to create:

1. **Daily View Components** (`frontend/src/components/Daily/`):
   - `DailyView.jsx` - Main daily container
   - `Timeline.jsx` - Event timeline from Google Calendar
   - `TodoList.jsx` - Todo list with drag & drop
   - `RoutineGrid.jsx` - Routine checklist
   - `MoodSelector.jsx` - Mood picker
   - `ImageUpload.jsx` - Image upload component
   - `Reflection.jsx` - Reflection textarea

2. **Monthly View Components** (`frontend/src/components/Monthly/`):
   - `MonthlyView.jsx` - Main monthly container
   - `CalendarGrid.jsx` - Calendar grid with thumbnails
   - `TimeTrackerGrid.jsx` - Monthly time tracker

3. **Hooks** (`frontend/src/hooks/`):
   - `useDailyData.js` - Manage daily data state
   - `useCalendarEvents.js` - Fetch and cache calendar events

4. **Styling**: Copy the CSS from the original project

## License

ISC