import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Google Calendar API setup
const calendar = google.calendar('v3');
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : undefined,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly']
});

// Middleware
app.use(cors());
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
    const { date, text } = req.body;
    const { data, error } = await supabase.from('todos').insert({ date, text, completed: false }).select().single();
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
    const authClient = await auth.getClient();
    const response = await calendar.calendarList.list({ auth: authClient });

    console.log('Calendar API Response:', JSON.stringify(response.data, null, 2));

    const calendars = (response.data.items || []).map(cal => ({
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
    const { date, calendarIds } = req.body;
    const targetDate = new Date(date);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);

    const authClient = await auth.getClient();
    const allEvents = [];

    for (const calId of calendarIds) {
      try {
        const response = await calendar.events.list({
          auth: authClient,
          calendarId: calId,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });

        const calendarInfo = await calendar.calendarList.get({
          auth: authClient,
          calendarId: calId
        });

        response.data.items.forEach(event => {
          if (!event.start.dateTime) return; // Skip all-day events

          allEvents.push({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          });
        });
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
      }
    }

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
    const { date, calendarIds } = req.body;
    const targetDate = new Date(date);

    const startRange = new Date(targetDate);
    startRange.setDate(startRange.getDate() - 1);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date(targetDate);
    endRange.setDate(endRange.getDate() + 2);
    endRange.setHours(0, 0, 0, 0);

    const authClient = await auth.getClient();
    const allEvents = [];

    for (const calId of calendarIds) {
      try {
        const calendarInfo = await calendar.calendarList.get({
          auth: authClient,
          calendarId: calId
        });

        if (!calendarInfo.data.summary.includes('⑤')) continue;

        const response = await calendar.events.list({
          auth: authClient,
          calendarId: calId,
          timeMin: startRange.toISOString(),
          timeMax: endRange.toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        });

        response.data.items.forEach(event => {
          if (!event.start.dateTime) return;

          allEvents.push({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          });
        });
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
      }
    }

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

    const monthlyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const { data } = await supabase
        .from('images')
        .select('*')
        .eq('date', dateKey)
        .order('id')
        .limit(1);

      monthlyData.push({
        date: day,
        dateKey,
        firstImage: data && data.length > 0 ? {
          thumbnailUrl: data[0].thumbnail_url,
          viewUrl: data[0].view_url
        } : null
      });
    }

    res.json({ success: true, year, month, data: monthlyData });
  } catch (error) {
    console.error('Error loading monthly stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
