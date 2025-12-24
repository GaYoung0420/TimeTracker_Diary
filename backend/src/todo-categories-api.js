import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, '..');
const envPath = path.join(backendDir, '.env');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export function setupTodoCategoriesAPI(app) {
  /* ========================================
     Todo Categories
     ======================================== */
  
  // Get all todo categories
  app.get('/api/todo-categories', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('todo_categories')
        .select('*, event_category:categories!event_category_id(id, name, color)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create a new todo category
  app.post('/api/todo-categories', async (req, res) => {
    try {
      const { name, event_category_id, color } = req.body;

      const { data, error } = await supabase
        .from('todo_categories')
        .insert({ name, event_category_id, color })
        .select('*, event_category:categories!event_category_id(id, name, color)')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update a todo category
  app.patch('/api/todo-categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, event_category_id, color } = req.body;

      const { data, error } = await supabase
        .from('todo_categories')
        .update({ name, event_category_id, color })
        .eq('id', id)
        .select('*, event_category:categories!event_category_id(id, name, color)')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a todo category
  app.delete('/api/todo-categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('todo_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Complete a todo and create an event
  app.post('/api/todos/:id/complete', async (req, res) => {
    try {
      const { id } = req.params;

      // Get the todo with its category
      const { data: todo, error: todoError } = await supabase
        .from('todos')
        .select('*, todo_category:todo_categories!todo_category_id(id, name, event_category_id)')
        .eq('id', id)
        .single();

      if (todoError) throw todoError;

      // Update todo as completed
      const { error: updateError } = await supabase
        .from('todos')
        .update({ completed: true })
        .eq('id', id);

      if (updateError) throw updateError;

      // If todo has a category with event_category_id, create an event
      if (todo.todo_category && todo.todo_category.event_category_id) {
        const dateStr = todo.date;
        const timeStr = todo.scheduled_time || '00:00:00';
        
        // Start Time (Local ISO-like string)
        const startAt = `${dateStr}T${timeStr}`;
        const safeStartAt = startAt.length === 16 ? `${startAt}:00` : startAt;
        
        // End Time Calculation
        const durationMins = todo.duration || 30;
        const startD = new Date(safeStartAt);
        const endD = new Date(startD.getTime() + durationMins * 60000);
        
        // Helper to format Date to local ISO string YYYY-MM-DDTHH:mm:ss
        const toLocalISO = (d) => {
            const pad = n => n < 10 ? '0' + n : n;
            return d.getFullYear() + '-' + 
                pad(d.getMonth() + 1) + '-' + 
                pad(d.getDate()) + 'T' + 
                pad(d.getHours()) + ':' + 
                pad(d.getMinutes()) + ':' + 
                pad(d.getSeconds());
        };
        
        const endTimestamp = toLocalISO(endD);
        
        const eventData = {
          title: todo.text,
          start_time: safeStartAt,
          end_time: endTimestamp,
          category_id: todo.todo_category.event_category_id,
          is_plan: false,
          description: `할일 완료: ${todo.text}`
        };

        const { data: event, error: eventError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();

        if (eventError) throw eventError;

        res.json({ success: true, event });
      } else {
        res.json({ success: true, event: null });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
