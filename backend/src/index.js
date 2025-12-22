import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import multer from 'multer';

dotenv.config();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Simple in-memory cache for monthly stats (key: 'YYYY-MM')
const monthlyStatsCache = new Map();

// Google Calendar API setup
const calendar = google.calendar('v3');

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using https
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Store tokens in user object
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      accessToken,
      refreshToken
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

/* ========================================
   Health & Test
   ======================================== */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TimeTracker API is running' });
});

app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('todos').select('*').limit(1);
    if (error) throw error;
    res.json({ message: 'API and Supabase connected successfully', supabaseConfigured: true });
  } catch (error) {
    res.json({ message: 'Supabase connection needs configuration', error: error.message });
  }
});

/* ========================================
   OAuth Authentication Routes
   ======================================== */
app.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect('http://localhost:3000');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      }
    });
  } else {
    res.json({ success: false, user: null });
  }
});

/* ========================================
   Daily Data - Batch Load
   ======================================== */
app.get('/api/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const [todosResult, reflectionResult, imagesResult, routinesResult, checksResult] = await Promise.all([
      supabase.from('todos').select('*').eq('date', date).order('id'),
      supabase.from('reflections').select('*').eq('date', date).single(),
      supabase.from('images').select('*').eq('date', date).order('id'),
      supabase.from('routines').select('*').eq('active', true).order('order'),
      supabase.from('routine_checks').select('*').eq('date', date)
    ]);

    const routineChecks = {};
    if (checksResult.data) {
      checksResult.data.forEach(check => {
        routineChecks[check.routine_id] = check.checked;
      });
    }

    res.json({
      success: true,
      data: {
        todos: todosResult.data || [],
        reflection: reflectionResult.data?.reflection_text || '',
        mood: reflectionResult.data?.mood || null,
        images: imagesResult.data || [],
        routines: routinesResult.data || [],
        routineChecks
      }
    });
  } catch (error) {
    console.error('Error loading daily data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Daily Data - Batch Save
   ======================================== */
app.post('/api/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { todos, mood, reflection, images } = req.body;

    // Save Todos
    if (todos) {
      await supabase.from('todos').delete().eq('date', date);
      if (todos.length > 0) {
        const todosToInsert = todos.map(t => ({
          date,
          text: t.text,
          completed: t.completed
        }));
        await supabase.from('todos').insert(todosToInsert);
      }
    }

    // Save Reflection
    if (mood !== undefined || reflection !== undefined) {
      const { error } = await supabase.from('reflections').upsert({
        date,
        mood,
        reflection_text: reflection
      }, { onConflict: 'date' });
      if (error) throw error;
    }

    // Save Images
    if (images) {
      await supabase.from('images').delete().eq('date', date);
      if (images.length > 0) {
        const imagesToInsert = images.map(img => ({
          date,
          file_id: img.fileId,
          file_name: img.name,
          thumbnail_url: img.thumbnailUrl,
          view_url: img.viewUrl
        }));
        await supabase.from('images').insert(imagesToInsert);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving daily data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Todos
   ======================================== */
app.post('/api/todos', async (req, res) => {
  try {
    const { date, text, category } = req.body;

    // Get the highest order for this date
    const { data: existingTodos } = await supabase
      .from('todos')
      .select('order')
      .eq('date', date)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = existingTodos && existingTodos.length > 0 ? existingTodos[0].order + 1 : 0;

    const { data, error } = await supabase
      .from('todos')
      .insert({ date, text, category, completed: false, order: nextOrder })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('todos').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reorder Todos
app.post('/api/todos/reorder', async (req, res) => {
  try {
    const { updates } = req.body;

    // Update each todo's order
    for (const update of updates) {
      const { error } = await supabase
        .from('todos')
        .update({ order: update.order })
        .eq('id', update.id);

      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Increment Pomodoro Count
app.post('/api/todos/:id/pomodoro', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch current pomodoro count
    const { data: currentTodo, error: fetchError } = await supabase
      .from('todos')
      .select('pomodoro_count')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newCount = (currentTodo.pomodoro_count || 0) + 1;

    // Update pomodoro count
    const { data, error } = await supabase
      .from('todos')
      .update({ pomodoro_count: newCount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Images
   ======================================== */
app.post('/api/images/upload', upload.single('image'), async (req, res) => {
  try {
    const { date } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${date}_${timestamp}.${fileExt}`;
    const filePath = `${date}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('diary-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('diary-images')
      .getPublicUrl(filePath);

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('images')
      .insert({
        date,
        file_id: fileName,
        file_name: file.originalname,
        thumbnail_url: urlData.publicUrl,
        view_url: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Invalidate monthly cache for the affected month
    if (dbData && dbData.date) {
      const monthKey = dbData.date.slice(0,7); // 'YYYY-MM'
      monthlyStatsCache.delete(monthKey);
    }

    res.json({ success: true, data: dbData });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get image info from database
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const filePath = `${image.date}/${image.file_id}`;
    const { error: storageError } = await supabase.storage
      .from('diary-images')
      .remove([filePath]);

    if (storageError) console.error('Storage deletion error:', storageError);

    // Delete from database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // Invalidate monthly cache for the affected month
    if (image && image.date) {
      const monthKey = image.date.slice(0,7);
      monthlyStatsCache.delete(monthKey);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Routines
   ======================================== */
app.get('/api/routines', async (req, res) => {
  try {
    const { data, error } = await supabase.from('routines').select('*').eq('active', true).order('order');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/routines', async (req, res) => {
  try {
    const { text, order } = req.body;
    const { data, error } = await supabase.from('routines').insert({ text, active: true, order: order || 9999 }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/routines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('routines').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/routines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('routines').update({ active: false }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Routine Checks
   ======================================== */
app.post('/api/routine-checks', async (req, res) => {
  try {
    const { date, routine_id, checked } = req.body;
    const { data, error } = await supabase.from('routine_checks')
      .upsert({ date, routine_id, checked }, { onConflict: 'date,routine_id' })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Google Calendar - Get Calendars
   ======================================== */
app.get('/api/calendars', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    const response = await calendar.calendarList.list({ auth: oauth2Client });

    console.log('Calendar API Response:', JSON.stringify(response.data, null, 2));

    const calendars = (response.data.items || [])
      .map(cal => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
        isSelected: true
      }));

    res.json({ success: true, calendars, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Google Calendar - Get Events for Date
   ======================================== */
app.post('/api/calendar/events', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { date, calendarIds } = req.body;
    const targetDate = new Date(date);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    // Fetch all calendars in parallel
    const calendarPromises = calendarIds.map(async (calId) => {
      try {
        // Fetch events and calendar info in parallel
        const [eventsResponse, calendarInfo] = await Promise.all([
          calendar.events.list({
            auth: oauth2Client,
            calendarId: calId,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
          }),
          calendar.calendarList.get({
            auth: oauth2Client,
            calendarId: calId
          })
        ]);

        return eventsResponse.data.items
          .filter(event => event.start.dateTime) // Skip all-day events
          .map(event => ({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          }));
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
        return [];
      }
    });

    const eventArrays = await Promise.all(calendarPromises);
    const allEvents = eventArrays.flat();

    res.json({ success: true, events: allEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Google Calendar - Get Wake/Sleep Events
   ======================================== */
app.post('/api/calendar/wake-sleep', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { date, calendarIds } = req.body;
    const targetDate = new Date(date);

    const startRange = new Date(targetDate);
    startRange.setDate(startRange.getDate() - 1);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date(targetDate);
    endRange.setDate(endRange.getDate() + 2);
    endRange.setHours(0, 0, 0, 0);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    // Fetch all calendars in parallel
    const calendarPromises = calendarIds.map(async (calId) => {
      try {
        const calendarInfo = await calendar.calendarList.get({
          auth: oauth2Client,
          calendarId: calId
        });

        if (!calendarInfo.data.summary.includes('⑤')) return [];

        const response = await calendar.events.list({
          auth: oauth2Client,
          calendarId: calId,
          timeMin: startRange.toISOString(),
          timeMax: endRange.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });

        return response.data.items
          .filter(event => event.start.dateTime)
          .map(event => ({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          }));
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
        return [];
      }
    });

    const eventArrays = await Promise.all(calendarPromises);
    const allEvents = eventArrays.flat();

    res.json({ success: true, events: allEvents });
  } catch (error) {
    console.error('Error fetching wake/sleep events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Monthly Stats
   ======================================== */
app.post('/api/monthly/stats', async (req, res) => {
  try {
    const { year, month } = req.body;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Check cache first
    const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
    const cached = monthlyStatsCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return res.json({ success: true, year, month, data: cached.data });
    }

    // Fetch all images for the month in a single query to avoid N DB round-trips
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: images, error: imgError } = await supabase
      .from('images')
      .select('date, thumbnail_url, view_url')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (imgError) throw imgError;

    const firstImageByDate = {};
    if (images && images.length > 0) {
      images.forEach(img => {
        if (!firstImageByDate[img.date]) {
          firstImageByDate[img.date] = {
            thumbnailUrl: img.thumbnail_url,
            viewUrl: img.view_url
          };
        }
      });
    }

    const monthlyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      monthlyData.push({
        date: day,
        dateKey,
        firstImage: firstImageByDate[dateKey] || null
      });
    }

    // Cache the monthly data (short TTL)
    monthlyStatsCache.set(cacheKey, { data: monthlyData, ts: Date.now() });

    res.json({ success: true, year, month, data: monthlyData });
  } catch (error) {
    console.error('Error loading monthly stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monthly Time Stats (Time Tracker Grid)
app.post('/api/monthly/time-stats', async (req, res) => {
  try {
    const { year, month } = req.body;
    const user = req.user;

    if (!user || !user.accessToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get all calendars
    const calendarList = await calendar.calendarList.list();
    const allCalendars = calendarList.data.items || [];

    // Filter out "계획" calendar
    const calendars = allCalendars.filter(cal => !cal.summary.includes('계획'));

    // Calculate month range
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const daysInMonth = endOfMonth.getDate();

    // Fetch events for the entire month (병렬화)
    const eventPromises = calendars.map(cal =>
      calendar.events.list({
        calendarId: cal.id,
        timeMin: startOfMonth.toISOString(),
        timeMax: new Date(year, month, 1).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      })
      .then(eventsResponse => ({
        calendarId: cal.id,
        calendarName: cal.summary,
        color: cal.backgroundColor,
        events: eventsResponse.data.items || []
      }))
      .catch(err => {
        console.error(`Error fetching calendar ${cal.id}:`, err.message);
        return { calendarId: cal.id, calendarName: cal.summary, color: cal.backgroundColor, events: [] };
      })
    );

    const calendarResults = await Promise.all(eventPromises);

    const allEvents = calendarResults.flatMap(result =>
      result.events
        .filter(event => event.start.dateTime && event.end.dateTime)
        .map(event => ({
          summary: event.summary,
          start: event.start.dateTime,
          end: event.end.dateTime,
          calendarName: result.calendarName,
          color: result.color
        }))
    );

    // 이벤트를 날짜별로 그룹화 (다음날 넘어가는 이벤트 포함)
    const eventsByDate = {};
    const categorySet = new Set();

    allEvents.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // 이벤트의 시작일과 종료일 사이의 모든 날짜에 이벤트 추가
      const startDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const endDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
        categorySet.add(event.calendarName || 'Unknown');

        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // 각 날짜별 데이터 생성
    const days = [];
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayStart = new Date(year, month - 1, day);
      const weekday = weekdays[dayStart.getDay()];

      const dayEvents = eventsByDate[dateKey] || [];

      const categories = {};
      const events = [];

      dayEvents.forEach(event => {
        const calendarName = event.calendarName || 'Unknown';

        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // 해당 날짜 범위 계산
        const dayStartTime = new Date(year, month - 1, day, 0, 0, 0);
        const dayEndTime = new Date(year, month - 1, day, 23, 59, 59, 999);

        // 이벤트가 해당 날짜에서 실제로 차지하는 시간 계산
        const effectiveStart = eventStart > dayStartTime ? eventStart : dayStartTime;
        const effectiveEnd = eventEnd < dayEndTime ? eventEnd : dayEndTime;
        const duration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60); // hours

        if (!categories[calendarName]) {
          categories[calendarName] = 0;
        }
        categories[calendarName] += duration;

        // Add full event data for time tracker rendering
        events.push({
          title: event.summary,
          start: event.start,
          end: event.end,
          calendarName: event.calendarName,
          color: event.color
        });
      });

      days.push({
        date: day,
        dateKey,
        weekday,
        categories,
        events
      });
    }

    // Build category list with colors
    const categories = Array.from(categorySet).map(name => {
      const event = allEvents.find(e => e.calendarName === name);
      return {
        name,
        color: event ? event.color : '#9e9e9e'
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, data: { days, categories } });
  } catch (error) {
    console.error('Error loading monthly time stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// Quick Actions
// ========================================

// Save Feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { date, feedback } = req.body;

    const { data, error } = await supabase
      .from('feedbacks')
      .insert({ date, feedback_text: feedback })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create 10AM Wake Event in Google Calendar
app.post('/api/calendar/create-wake', async (req, res) => {
  try {
    const { date, time } = req.body;
    const user = req.user;

    if (!user || !user.accessToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse date and time
    const [hours, minutes] = time.split(':');
    const startDateTime = new Date(date);
    startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30); // 30 minute event

    const event = {
      summary: '기상',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      description: 'TimeTracker Diary - 기상 이벤트'
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    res.json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error creating wake event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
