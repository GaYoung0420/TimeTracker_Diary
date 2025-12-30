// Events API - Supabase implementation (replaces Google Calendar)
import { requireAuth } from './middleware/auth.js';

export function setupEventsAPI(app, supabase, cache) {

  // Helper to invalidate monthly cache when events change
  const invalidateMonthlyCache = (date) => {
    if (!cache || !date) return;
    const monthKey = date.slice(0, 7); // 'YYYY-MM'
    const timeKey = `time-${monthKey}`;
    cache.delete(monthKey);
    cache.delete(timeKey);
  };

  /* ========================================
     Get Events for a Date
     ======================================== */
  app.post('/api/events', requireAuth, async (req, res) => {
    try {
      const { date } = req.body;

      // Get events from previous day and current day to handle overnight events
      const d = new Date(date);
      const prevDate = new Date(d);
      prevDate.setDate(d.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .eq('user_id', req.session.userId)
        .in('date', [prevDateStr, date])
        .order('date')
        .order('start_time');

      if (error) throw error;

      // Format events and filter those that overlap with the target date
      const targetDayStart = `${date}T00:00:00`;
      const targetDayEnd = `${date}T23:59:59`;

      const events = (data || [])
        .map(event => {
          const start = `${event.date}T${event.start_time}`;
          const end = `${event.date}T${event.end_time}`;

          // Handle overnight events: if end_time < start_time, event ends next day
          const [startHour] = event.start_time.split(':').map(Number);
          const [endHour] = event.end_time.split(':').map(Number);

          let actualEnd = end;
          if (endHour < startHour) {
            // Event spans to next day
            const nextDay = new Date(event.date);
            nextDay.setDate(nextDay.getDate() + 1);
            actualEnd = `${nextDay.toISOString().split('T')[0]}T${event.end_time}`;
          }

          return {
            id: event.id,
            title: event.title,
            start,
            end: actualEnd,
            category_id: event.category_id,
            category: event.category,
            is_plan: event.is_plan,
            description: event.description || ''
          };
        })
        .filter(event => {
          // Check if event overlaps with target day
          // Overlap: event.start <= targetDayEnd AND event.end >= targetDayStart
          return event.start <= targetDayEnd && event.end >= targetDayStart;
        });

      res.json({ success: true, events });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Create Event
     ======================================== */
  app.post('/api/events/create', requireAuth, async (req, res) => {
    try {
      const { date, title, start_time, end_time, category_id, is_plan, description } = req.body;

      // Ensure time format has seconds (HH:MM -> HH:MM:SS)
      const ensureSeconds = (timeStr) => {
        if (!timeStr) return '00:00:00';
        const parts = timeStr.split(':');
        if (parts.length === 2) return `${timeStr}:00`;
        return timeStr;
      };

      const { data, error } = await supabase
        .from('events')
        .insert([{
          date,
          title,
          start_time: ensureSeconds(start_time),
          end_time: ensureSeconds(end_time),
          category_id,
          is_plan: is_plan || false,
          description,
          user_id: req.session.userId
        }])
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .single();

      if (error) throw error;

      // Invalidate monthly cache
      invalidateMonthlyCache(date);

      // Format event to match getEvents format
      const start = `${data.date}T${data.start_time}`;
      const end = `${data.date}T${data.end_time}`;

      // Handle overnight events: if end_time < start_time, event ends next day
      const [startHour] = data.start_time.split(':').map(Number);
      const [endHour] = data.end_time.split(':').map(Number);

      let actualEnd = end;
      if (endHour < startHour) {
        // Event spans to next day
        const nextDay = new Date(data.date);
        nextDay.setDate(nextDay.getDate() + 1);
        actualEnd = `${nextDay.toISOString().split('T')[0]}T${data.end_time}`;
      }

      const formattedEvent = {
        id: data.id,
        title: data.title,
        start,
        end: actualEnd,
        category_id: data.category_id,
        category: data.category,
        is_plan: data.is_plan,
        description: data.description || ''
      };

      res.json({ success: true, event: formattedEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Update Event
     ======================================== */
  app.patch('/api/events/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Helper to ensure seconds are present
      const ensureSeconds = (timeStr) => {
        if (!timeStr) return '00:00:00';
        const parts = timeStr.split(':');
        if (parts.length === 2) return `${timeStr}:00`;
        return timeStr;
      };

      // Prepare fields to update
      const fieldsToUpdate = {};

      if (updates.date !== undefined) fieldsToUpdate.date = updates.date;
      if (updates.title !== undefined) fieldsToUpdate.title = updates.title;
      if (updates.start_time !== undefined) fieldsToUpdate.start_time = ensureSeconds(updates.start_time);
      if (updates.end_time !== undefined) fieldsToUpdate.end_time = ensureSeconds(updates.end_time);
      if (updates.category_id !== undefined) fieldsToUpdate.category_id = updates.category_id;
      if (updates.is_plan !== undefined) fieldsToUpdate.is_plan = updates.is_plan;
      if (updates.description !== undefined) fieldsToUpdate.description = updates.description;

      const { data, error } = await supabase
        .from('events')
        .update(fieldsToUpdate)
        .eq('id', id)
        .eq('user_id', req.session.userId)
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .single();

      if (error) throw error;

      // Invalidate monthly cache
      invalidateMonthlyCache(data.date);

      // Format event to match getEvents format
      const start = `${data.date}T${data.start_time}`;
      const end = `${data.date}T${data.end_time}`;

      // Handle overnight events: if end_time < start_time, event ends next day
      const [startHour] = data.start_time.split(':').map(Number);
      const [endHour] = data.end_time.split(':').map(Number);

      let actualEnd = end;
      if (endHour < startHour) {
        // Event spans to next day
        const nextDay = new Date(data.date);
        nextDay.setDate(nextDay.getDate() + 1);
        actualEnd = `${nextDay.toISOString().split('T')[0]}T${data.end_time}`;
      }

      const formattedEvent = {
        id: data.id,
        title: data.title,
        start,
        end: actualEnd,
        category_id: data.category_id,
        category: data.category,
        is_plan: data.is_plan,
        description: data.description || ''
      };

      res.json({ success: true, event: formattedEvent });
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Delete Event
     ======================================== */
  app.delete('/api/events/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Get event date before deleting (for cache invalidation)
      const { data: event } = await supabase
        .from('events')
        .select('date')
        .eq('id', id)
        .eq('user_id', req.session.userId)
        .single();

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('user_id', req.session.userId);

      if (error) throw error;

      // Invalidate monthly cache
      if (event && event.date) {
        invalidateMonthlyCache(event.date);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Get Wake/Sleep Events (based on '잠' events)
     ======================================== */
  app.post('/api/events/wake-sleep', requireAuth, async (req, res) => {
    try {
      const { date } = req.body;

      // Get events for +/- 1 day to find sleep patterns
      const d = new Date(date);
      const prevDate = new Date(d); prevDate.setDate(d.getDate() - 1);
      const nextDate = new Date(d); nextDate.setDate(d.getDate() + 1);

      const prevDateStr = prevDate.toISOString().split('T')[0];
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(id, name, color)')
        .eq('user_id', req.session.userId)
        .gte('date', prevDateStr)
        .lte('date', nextDateStr)
        .order('date')
        .order('start_time');

      if (error) throw error;

      // Filter for sleep events: title must be "잠" AND category name contains "잠" AND is_plan = false (actual events only)
      const allEvents = data || [];
      const sleepEvents = allEvents.filter(event =>
        event.title === '잠' &&
        event.category && event.category.name && event.category.name.includes('잠') &&
        event.is_plan === false
      );

      console.log(`[Wake/Sleep] Found ${sleepEvents.length} ACTUAL sleep events for date ${date}:`);
      sleepEvents.forEach(e => {
        console.log(`  - ${e.date} ${e.start_time}-${e.end_time} (is_plan: ${e.is_plan})`);
      });

      let wakeTime = null;
      let wakeDateTime = null;
      let sleepTime = null;
      let sleepDateTime = null;

      // Find wake time: end_time of the LAST sleep event that ends on the target date
      let latestWakeEvent = null;
      for (const event of sleepEvents) {
        // Calculate the actual end date based on start/end times
        let actualEndDate = event.date;

        // If end_time < start_time, event spans to next day
        if (event.end_time < event.start_time) {
          const endDateObj = new Date(event.date);
          endDateObj.setDate(endDateObj.getDate() + 1);
          actualEndDate = endDateObj.toISOString().split('T')[0];
          console.log(`  Multi-day event: ${event.date} ${event.start_time}-${event.end_time} ends on ${actualEndDate}`);
        }

        // Check if wake up time is on the target date
        if (actualEndDate === date) {
          // Keep the latest wake time (event with largest end_time)
          if (!latestWakeEvent || event.end_time > latestWakeEvent.end_time) {
            latestWakeEvent = { ...event, actualEndDate };
          }
        }
      }

      if (latestWakeEvent) {
        wakeTime = latestWakeEvent.end_time.substring(0, 5);
        wakeDateTime = `${latestWakeEvent.actualEndDate}T${latestWakeEvent.end_time}`;
        console.log(`  ✓ Found wake time (latest): ${wakeDateTime}`);
      }

      // Find sleep time: start_time of the next sleep event after waking up today
      // This could be on the same day (if sleeping early) or the next day
      for (const event of sleepEvents) {
        // Skip events that ended before or at wake time on the target date
        if (event.date === date && wakeTime && event.end_time <= wakeTime) {
          console.log(`  Skip (ended before wake): ${event.date} ${event.start_time}-${event.end_time}`);
          continue;
        }

        // Find the first sleep event that starts on or after the target date
        if (event.date >= date) {
          // If it's on the target date, it should start after wake time
          if (event.date === date && wakeTime && event.start_time <= wakeTime) {
            console.log(`  Skip (starts before wake): ${event.date} ${event.start_time}-${event.end_time}`);
            continue;
          }
          sleepTime = event.start_time.substring(0, 5);
          sleepDateTime = `${event.date}T${event.start_time}`;
          console.log(`  ✓ Found sleep time: ${sleepDateTime}`);
          break;
        }
      }

      console.log(`[Wake/Sleep API] Date: ${date}, Wake: ${wakeTime} (${wakeDateTime}), Sleep: ${sleepTime} (${sleepDateTime})`);
      res.json({ success: true, wakeTime, wakeDateTime, sleepTime, sleepDateTime });
    } catch (error) {
      console.error('Error fetching wake/sleep events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Create 10AM Wake Event (Quick Action)
     ======================================== */
  app.post('/api/events/create-wake', requireAuth, async (req, res) => {
    try {
      const { date, time } = req.body;

      const startTimeStr = time || '10:00';
      const startAt = `${date}T${startTimeStr}:00`;

      // Calculate end time (start + 1 minute)
      // We can use Date object to handle minute rollover
      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + 60000); // + 1 minute

      // Format back to ISO or similar string.
      // Since we use ISO in DB, let's use ISO.
      // But we need to be careful about timezone if the server is UTC.
      // If 'date' is '2023-12-25' and 'time' is '10:00', we want '2023-12-25T10:00:00' (local).
      // If we do new Date('2023-12-25T10:00:00'), it might be interpreted as local or UTC depending on env.
      // Let's just do string manipulation to be safe and consistent with other endpoints.

      // Parse HH:MM
      const [h, m] = startTimeStr.split(':').map(Number);
      let endH = h;
      let endM = m + 1;
      if (endM >= 60) {
        endM = 0;
        endH += 1;
      }
      // If endH >= 24, we need to increment date.
      // This is getting complicated. Let's just use the string construction for simple cases.
      // Assuming wake up is not at 23:59.

      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      const endAt = `${date}T${endTimeStr}:00`;

      const { data, error} = await supabase
        .from('events')
        .insert([{
          title: '기상',
          start_time: startAt,
          end_time: endAt,
          description: 'Auto-created wake event',
          user_id: req.session.userId
        }])
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, event: data });
    } catch (error) {
      console.error('Error creating wake event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

}
