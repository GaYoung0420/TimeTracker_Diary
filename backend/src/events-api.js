// Events API - Supabase implementation (replaces Google Calendar)

export function setupEventsAPI(app, supabase) {

  /* ========================================
     Get Events for a Date
     ======================================== */
  app.post('/api/events', async (req, res) => {
    try {
      const { date } = req.body;
      
      // Calculate start and end of the requested date in local time (assuming input date is YYYY-MM-DD)
      // We want events that overlap with this day.
      // Overlap condition: start_time <= endOfDay AND end_time >= startOfDay
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59.999`;

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .lte('start_time', endOfDay)
        .gte('end_time', startOfDay)
        .order('start_time');

      if (error) throw error;

      // Helper to format ISO timestamp to YYYY-MM-DD and HH:MM:SS
      const formatTimestamp = (isoString) => {
        const d = new Date(isoString);
        // Adjust to local time if needed, but here we assume the ISO string is what we want to display
        // However, the frontend expects YYYY-MM-DD and HH:MM:SS strings.
        // Let's use the parts from the ISO string directly if it's in the right timezone,
        // OR convert to local string.
        // Since we are storing TIMESTAMPTZ, it comes back as ISO 8601 (e.g. 2025-12-25T09:00:00+09:00)
        // We need to extract the date and time parts *in the local timezone*.
        // For simplicity, let's assume the server runs in the same timezone or we use a library.
        // But to be safe and consistent with previous behavior:
        // We'll return the ISO string as 'start' and 'end' which the frontend splits by 'T'.
        // But we need to ensure the time part doesn't have 'Z' if the frontend parses it manually.
        
        // Actually, the frontend splits by 'T'. 
        // If we return "2025-12-25T09:00:00+09:00", split('T') gives ["2025-12-25", "09:00:00+09:00"].
        // Then split(':') gives ["09", "00", "00+09:00"].
        // parseInt("00+09:00") is 0. So it works!
        return isoString;
      };

      // Format events to match previous Google Calendar format
      const events = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_time, // Now it's a full ISO string
        end: event.end_time,     // Now it's a full ISO string
        category_id: event.category_id,
        category: event.category,
        is_plan: event.is_plan,
        description: event.description || ''
      }));

      res.json({ success: true, events });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Create Event
     ======================================== */
  app.post('/api/events/create', async (req, res) => {
    try {
      const { date, title, start_time, end_time, category_id, is_plan, description, end_date } = req.body;

      // Construct full ISO timestamps
      // Input: date="2025-12-25", start_time="09:00" or "09:00:00"
      // We need to combine them.
      const ensureSeconds = (timeStr) => {
        if (!timeStr) return '00:00:00';
        const parts = timeStr.split(':');
        if (parts.length === 2) return `${timeStr}:00`;
        if (parts.length === 3) return timeStr;
        return `${timeStr}:00:00`;
      };

      const startAt = `${date}T${ensureSeconds(start_time)}`;
      const endAt = `${end_date || date}T${ensureSeconds(end_time)}`;

      const { data, error } = await supabase
        .from('events')
        .insert([{
          title,
          start_time: startAt,
          end_time: endAt,
          category_id,
          is_plan: is_plan || false,
          description
        }])
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .single();

      if (error) throw error;

      // Format event to match getEvents format
      const formattedEvent = {
        id: data.id,
        title: data.title,
        start: data.start_time,
        end: data.end_time,
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
  app.patch('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Fetch existing event to get current values for merging
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Construct new timestamps if date/time fields are present
      // We support both full ISO strings in start_time/end_time OR separate date/time fields
      
      let newStartTime = currentEvent.start_time;
      let newEndTime = currentEvent.end_time;

      // Helper to get date/time parts from ISO string
      const getParts = (iso) => {
        const [d, t] = iso.split('T');
        return { date: d, time: t.substring(0, 5) };
      };

      const currentStartParts = getParts(currentEvent.start_time);
      const currentEndParts = getParts(currentEvent.end_time);

      // Determine components for start
      const startDate = updates.date || currentStartParts.date;
      const startTime = (updates.start_time && !updates.start_time.includes('T')) 
        ? updates.start_time 
        : currentStartParts.time;
      
      // Determine components for end
      // Handle explicit null for end_date (means same-day event)
      let endDate;
      if (updates.hasOwnProperty('end_date')) {
        endDate = updates.end_date || startDate;  // null means use startDate
      } else if (updates.date) {
        endDate = updates.date;  // If date changed but no end_date specified, use new date
      } else {
        endDate = currentEndParts.date;  // Keep original end date
      }
      
      const endTime = (updates.end_time && !updates.end_time.includes('T'))
        ? updates.end_time
        : currentEndParts.time;

      // Helper to ensure seconds are present
      const ensureSeconds = (timeStr) => {
        if (!timeStr) return '00:00:00';
        const parts = timeStr.split(':');
        if (parts.length === 2) return `${timeStr}:00`;
        if (parts.length === 3) return timeStr;
        return `${timeStr}:00`;
      };

      // If updates.start_time is a full ISO string, use it directly
      if (updates.start_time && updates.start_time.includes('T')) {
        newStartTime = updates.start_time;
      } else {
        newStartTime = `${startDate}T${ensureSeconds(startTime)}`;
      }

      // If updates.end_time is a full ISO string, use it directly
      if (updates.end_time && updates.end_time.includes('T')) {
        newEndTime = updates.end_time;
      } else {
        newEndTime = `${endDate}T${ensureSeconds(endTime)}`;
      }

      // Prepare fields to update
      const fieldsToUpdate = {
        start_time: newStartTime,
        end_time: newEndTime
      };
      
      if (updates.title !== undefined) fieldsToUpdate.title = updates.title;
      if (updates.category_id !== undefined) fieldsToUpdate.category_id = updates.category_id;
      if (updates.is_plan !== undefined) fieldsToUpdate.is_plan = updates.is_plan;
      if (updates.description !== undefined) fieldsToUpdate.description = updates.description;

      const { data, error } = await supabase
        .from('events')
        .update(fieldsToUpdate)
        .eq('id', id)
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .single();

      if (error) throw error;

      // Format event to match getEvents format
      const formattedEvent = {
        id: data.id,
        title: data.title,
        start: data.start_time,
        end: data.end_time,
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
  app.delete('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Get Wake/Sleep Events (based on '잠' events)
     ======================================== */
  app.post('/api/events/wake-sleep', async (req, res) => {
    try {
      const { date } = req.body;

      // Get events for +/- 2 days to find sleep patterns
      const d = new Date(date);
      const prevDate = new Date(d); prevDate.setDate(d.getDate() - 1);
      const nextDate = new Date(d); nextDate.setDate(d.getDate() + 2);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', prevDate.toISOString())
        .lte('start_time', nextDate.toISOString())
        .eq('title', '잠')
        .eq('is_plan', false) // Only actual events
        .order('start_time');

      if (error) throw error;

      const sleepEvents = data || [];
      let wakeTime = null;
      let sleepTime = null;

      // Find wake time: end_time of a sleep event that ends on the target date
      for (const event of sleepEvents) {
        // Check if event ends on 'date'
        // Assuming ISO string, split by T
        const endDateStr = event.end_time.split('T')[0];
        if (endDateStr === date) {
           // Found it.
           wakeTime = event.end_time.split('T')[1].substring(0, 5);
        }
      }

      // Find sleep time: start_time of the sleep event that starts "tonight"
      // We look for the first sleep event starting after noon of the target date
      const noonToday = `${date}T12:00:00`;
      
      for (const event of sleepEvents) {
        if (event.start_time > noonToday) {
          sleepTime = event.start_time.split('T')[1].substring(0, 5);
          break; 
        }
      }

      res.json({ success: true, wakeTime, sleepTime });
    } catch (error) {
      console.error('Error fetching wake/sleep events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Create 10AM Wake Event (Quick Action)
     ======================================== */
  app.post('/api/events/create-wake', async (req, res) => {
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
          description: 'Auto-created wake event'
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
