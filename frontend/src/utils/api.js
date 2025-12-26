// Use relative URL when in production (same domain), absolute URL for local dev
const API_URL = import.meta.env.VITE_API_URL || '';

const monthlyStatsCache = new Map();

export const api = {
  // Daily Data
  async getDailyData(date) {
    const res = await fetch(`${API_URL}/api/daily/${date}`);
    return res.json();
  },

  async saveDailyData(date, data) {
    const res = await fetch(`${API_URL}/api/daily/${date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Todos
  async addTodo(date, text, categoryId, todoCategoryId, scheduledTime, duration) {
    const res = await fetch(`${API_URL}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        text,
        category_id: categoryId,
        todo_category_id: todoCategoryId,
        scheduled_time: scheduledTime,
        duration
      })
    });
    return res.json();
  },

  async updateTodo(id, updates) {
    const res = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteTodo(id) {
    const res = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async reorderTodos(updates) {
    const res = await fetch(`${API_URL}/api/todos/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    return res.json();
  },

  async incrementPomodoro(id) {
    const res = await fetch(`${API_URL}/api/todos/${id}/pomodoro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  // Routines
  async getRoutines() {
    const res = await fetch(`${API_URL}/api/routines`);
    return res.json();
  },

  async addRoutine(text, order) {
    const res = await fetch(`${API_URL}/api/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, order })
    });
    return res.json();
  },

  async updateRoutine(id, updates) {
    const res = await fetch(`${API_URL}/api/routines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteRoutine(id) {
    const res = await fetch(`${API_URL}/api/routines/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async reorderRoutines(updates) {
    const res = await fetch(`${API_URL}/api/routines/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    return res.json();
  },

  async updateRoutineCheck(date, routine_id, checked) {
    const res = await fetch(`${API_URL}/api/routine-checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, routine_id, checked })
    });
    return res.json();
  },

  // Categories (User-defined categories)
  async getCategories() {
    const res = await fetch(`${API_URL}/api/categories`);
    return res.json();
  },

  async createCategory(name, color) {
    const res = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
    return res.json();
  },

  async updateCategory(id, updates) {
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Events (Supabase-based, replaces Google Calendar)

  async getEvents(date) {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    return res.json();
  },

  async createEvent(date, title, start_time, end_time, category_id, is_plan, description, end_date) {
    const res = await fetch(`${API_URL}/api/events/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title, start_time, end_time, category_id, is_plan, description, end_date })
    });
    return res.json();
  },

  async updateEvent(id, updates) {
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteEvent(id) {
    const res = await fetch(`${API_URL}/api/events/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getWakeSleepEvents(date) {
    const res = await fetch(`${API_URL}/api/events/wake-sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    return res.json();
  },

  // Monthly
  async getMonthlyStats(year, month) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const CACHE_TTL = 1000 * 60 * 1; // 1 minute
    const cached = monthlyStatsCache.get(key);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return cached.data;
    }

    const res = await fetch(`${API_URL}/api/monthly/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month })
    });
    const json = await res.json();
    if (json && json.success) {
      monthlyStatsCache.set(key, { data: json, ts: Date.now() });
    }
    return json;
  },

  async getMonthlyTimeStats(year, month) {
    const res = await fetch(`${API_URL}/api/monthly/time-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ year, month })
    });
    return res.json();
  },

  async getMonthlyRoutineMoodStats(year, month) {
    const res = await fetch(`${API_URL}/api/monthly/routine-mood-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month })
    });
    return res.json();
  },

  // Quick Actions
  async saveFeedback(date, feedback) {
    const res = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, feedback })
    });
    return res.json();
  },

  async create10AMWake(date) {
    const res = await fetch(`${API_URL}/api/events/create-wake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time: '10:00' })
    });
    return res.json();
  },

  // Todo Categories
  async getTodoCategories() {
    const res = await fetch(`${API_URL}/api/todo-categories`);
    return res.json();
  },

  async addTodoCategory(name, eventCategoryId, color) {
    const res = await fetch(`${API_URL}/api/todo-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, event_category_id: eventCategoryId, color })
    });
    return res.json();
  },

  async updateTodoCategory(id, name, eventCategoryId, color) {
    const res = await fetch(`${API_URL}/api/todo-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, event_category_id: eventCategoryId, color })
    });
    return res.json();
  },

  async deleteTodoCategory(id) {
    const res = await fetch(`${API_URL}/api/todo-categories/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async completeTodo(id) {
    const res = await fetch(`${API_URL}/api/todos/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  // Auth
  async register(email, password, username) {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }

      if (!res.ok) {
        return { 
          success: false, 
          message: `서버 오류가 발생했습니다. (${res.status})` 
        };
      }

      return { success: false, message: '서버 응답 형식이 올바르지 않습니다.' };
    } catch (error) {
      console.error('Register API Error:', error);
      return { 
        success: false, 
        message: '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.' 
      };
    }
  },

  async login(email, password) {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }

      // If response is not JSON (e.g. 404 HTML, 500 text)
      if (!res.ok) {
        return { 
          success: false, 
          message: `서버 오류가 발생했습니다. (${res.status})` 
        };
      }

      return { success: false, message: '서버 응답 형식이 올바르지 않습니다.' };
    } catch (error) {
      console.error('Login API Error:', error);
      return { 
        success: false, 
        message: '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.' 
      };
    }
  },

  async logout() {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return res.json();
  },

  async getCurrentUser() {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include'
    });
    return res.json();
  }
};
