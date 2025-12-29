/**
 * Calendar Subscriptions API
 * Manages user calendar subscriptions (iCloud, Google Calendar, Outlook, etc.)
 */

export function setupCalendarsAPI(app, supabase) {

  // Get all calendars for the current user
  app.get('/api/calendars', async (req, res) => {
    try {
      console.log('=== GET /api/calendars ===');
      console.log('Session:', req.session);
      console.log('Session ID:', req.sessionID);
      console.log('Session userId:', req.session.userId);

      // Get user ID from session, or use first user as fallback (temporary)
      let userId = req.session.userId;
      if (!userId) {
        console.log('No session userId, fetching first user...');
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        if (users && users.length > 0) {
          userId = users[0].id;
          console.log('Using first user ID:', userId);
        } else {
          return res.status(401).json({ success: false, error: 'No users found' });
        }
      }

      const { data, error } = await supabase
        .from('user_calendars')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching calendars:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true, data: data || [] });
    } catch (error) {
      console.error('Error in GET /api/calendars:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Add a new calendar
  app.post('/api/calendars', async (req, res) => {
    try {
      // Get user ID from session, or use first user as fallback (temporary)
      let userId = req.session.userId;
      if (!userId) {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        if (users && users.length > 0) {
          userId = users[0].id;
        } else {
          return res.status(401).json({ success: false, error: 'No users found' });
        }
      }

      const { name, type, type_icon, url, color, enabled } = req.body;

      if (!name || !url || !color) {
        return res.status(400).json({
          success: false,
          error: 'Name, URL, and color are required'
        });
      }

      const { data, error } = await supabase
        .from('user_calendars')
        .insert([{
          user_id: userId,
          name,
          type: type || 'icloud',
          type_icon: type_icon || '📅',
          url,
          color,
          enabled: enabled !== undefined ? enabled : true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding calendar:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Error in POST /api/calendars:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update a calendar
  app.patch('/api/calendars/:id', async (req, res) => {
    try {
      // Get user ID from session, or use first user as fallback (temporary)
      let userId = req.session.userId;
      if (!userId) {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        if (users && users.length > 0) {
          userId = users[0].id;
        } else {
          return res.status(401).json({ success: false, error: 'No users found' });
        }
      }

      const { id } = req.params;
      const updates = {};

      // Only update provided fields
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.type !== undefined) updates.type = req.body.type;
      if (req.body.type_icon !== undefined) updates.type_icon = req.body.type_icon;
      if (req.body.url !== undefined) updates.url = req.body.url;
      if (req.body.color !== undefined) updates.color = req.body.color;
      if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('user_calendars')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns this calendar
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!data) {
        return res.status(404).json({ success: false, error: 'Calendar not found' });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Error in PATCH /api/calendars/:id:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a calendar
  app.delete('/api/calendars/:id', async (req, res) => {
    try {
      // Get user ID from session, or use first user as fallback (temporary)
      let userId = req.session.userId;
      if (!userId) {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        if (users && users.length > 0) {
          userId = users[0].id;
        } else {
          return res.status(401).json({ success: false, error: 'No users found' });
        }
      }

      const { id } = req.params;

      const { error } = await supabase
        .from('user_calendars')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user owns this calendar

      if (error) {
        console.error('Error deleting calendar:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/calendars/:id:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
