// Events API - Supabase implementation (replaces Google Calendar)

export function setupEventsAPI(app, supabase) {

  /* ========================================
     Get Events for a Date
     ======================================== */
  app.post('/api/events', async (req, res) => {
    try {
      const { date } = req.body;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('date', date)
        .order('start_time');

      if (error) throw error;

      // Format events to match previous Google Calendar format
      const events = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.start_time}`,
        end: `${event.date}T${event.end_time}`,
        category: event.category,
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
      const { date, title, start_time, end_time, category, description } = req.body;

      const { data, error } = await supabase
        .from('events')
        .insert([{
          date,
          title,
          start_time,
          end_time,
          category,
          description
        }])
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, event: data });
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

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, event: data });
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
     Get Wake/Sleep Events
     ======================================== */
  app.post('/api/events/wake-sleep', async (req, res) => {
    try {
      const { date } = req.body;

      // Get events for +/- 2 days to find wake/sleep patterns
      const dateObj = new Date(date);
      const startDate = new Date(dateObj);
      startDate.setDate(startDate.getDate() - 2);
      const endDate = new Date(dateObj);
      endDate.setDate(endDate.getDate() + 2);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .or('title.ilike.%기상%,title.ilike.%wake%,title.ilike.%취침%,title.ilike.%sleep%')
        .order('date')
        .order('start_time');

      if (error) throw error;

      // Find wake and sleep times
      const events = data || [];
      let wakeTime = null;
      let sleepTime = null;

      // Find wake event (earliest "wake" event on the target date)
      const wakeEvent = events.find(e =>
        e.date === date && (
          e.title.includes('기상') ||
          e.title.toLowerCase().includes('wake')
        )
      );

      if (wakeEvent) {
        wakeTime = wakeEvent.start_time;
      }

      // Find sleep event (latest "sleep" event on the target date)
      const sleepEvents = events.filter(e =>
        e.date === date && (
          e.title.includes('취침') ||
          e.title.toLowerCase().includes('sleep')
        )
      );

      if (sleepEvents.length > 0) {
        sleepTime = sleepEvents[sleepEvents.length - 1].start_time;
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

      const { data, error} = await supabase
        .from('events')
        .insert([{
          date,
          title: '기상',
          start_time: time || '10:00:00',
          end_time: time ? `${time.split(':')[0]}:${parseInt(time.split(':')[1]) + 1}:00` : '10:01:00',
          category: 'wake',
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

  /* ========================================
     Get Categories (replaces getCalendars)
     ======================================== */
  app.get('/api/events/categories', async (req, res) => {
    try {
      // Return predefined categories matching Google Calendar
      const categories = [
        { id: 'plan', name: '계획', color: '#4285F4' },
        { id: 'waste', name: '① 낭비시간', color: '#D13F3F' },
        { id: 'social', name: '② 사회적', color: '#A78400' },
        { id: 'intellectual', name: '③ 지적', color: '#1E7B34' },
        { id: 'spiritual', name: '④ 영적', color: '#C46C00' },
        { id: 'sleep', name: '⑤ 잠', color: '#4A4AC4' },
        { id: 'exercise', name: '⑥ 운동', color: '#008C99' },
        { id: 'other', name: '⑦ 기타', color: '#654321' }
      ];

      res.json({ success: true, categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
