const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  async addTodo(date, text, category) {
    const res = await fetch(`${API_URL}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, text, category })
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

  async updateRoutineCheck(date, routine_id, checked) {
    const res = await fetch(`${API_URL}/api/routine-checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, routine_id, checked })
    });
    return res.json();
  },

  // Google Calendar
  async getCalendars() {
    const res = await fetch(`${API_URL}/api/calendars`, {
      credentials: 'include'
    });
    return res.json();
  },

  async getEvents(date, calendarIds) {
    const res = await fetch(`${API_URL}/api/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date, calendarIds })
    });
    return res.json();
  },

  async getWakeSleepEvents(date, calendarIds) {
    const res = await fetch(`${API_URL}/api/calendar/wake-sleep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date, calendarIds })
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
    const res = await fetch(`${API_URL}/api/calendar/create-wake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date, time: '10:00' })
    });
    return res.json();
  }
};
