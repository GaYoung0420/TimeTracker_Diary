import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { getLocalDateString } from '../utils/helpers';

export function useDailyData(currentDate) {
  const [dailyData, setDailyData] = useState({
    todos: [],
    reflection: '',
    mood: null,
    images: [],
    routines: [],
    routineChecks: {}
  });
  const [loading, setLoading] = useState(true);

  const dateKey = getLocalDateString(currentDate);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getDailyData(dateKey);
      if (result.success) {
        setDailyData(result.data);
      }
    } catch (error) {
      console.error('Failed to load daily data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistically update local state, then save to server
  const saveData = useCallback(async (updates) => {
    setDailyData(prev => ({ ...prev, ...updates }));
    try {
      await api.saveDailyData(dateKey, updates);
    } catch (error) {
      console.error('Failed to save daily data:', error);
      // On failure, reload to get authoritative state
      await loadData();
    }
  }, [dateKey, loadData]);

  const addImageToState = useCallback((image) => {
    setDailyData(prev => ({
      ...prev,
      images: [...(prev.images || []), image]
    }));
  }, []);

  const removeImageFromState = useCallback((imageId) => {
    setDailyData(prev => ({
      ...prev,
      images: (prev.images || []).filter(img => img.id !== imageId)
    }));
  }, []);

  const addTodo = useCallback(async (text, categoryId, todoCategoryId, scheduledTime, duration) => {
    const result = await api.addTodo(dateKey, text, categoryId, todoCategoryId, scheduledTime, duration);
    if (result.success) {
      await loadData();
    }
  }, [dateKey, loadData]);

  const updateTodo = useCallback(async (id, updates, options = {}) => {
    // Optimistic update
    setDailyData(prev => ({
      ...prev,
      todos: prev.todos.map(todo => 
        todo.id === id ? { ...todo, ...updates } : todo
      )
    }));

    if (options.skipApi) return;

    try {
      const result = await api.updateTodo(id, updates);
      if (!result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      await loadData();
    }
  }, [loadData]);

  const deleteTodo = useCallback(async (id) => {
    // Optimistic update
    setDailyData(prev => ({
      ...prev,
      todos: prev.todos.filter(todo => todo.id !== id)
    }));

    try {
      const result = await api.deleteTodo(id);
      if (!result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
      await loadData();
    }
  }, [loadData]);

  const reorderTodos = useCallback(async (updates) => {
    // Optimistic update
    setDailyData(prev => {
      const newTodos = [...prev.todos];
      updates.forEach(({ id, order }) => {
        const todo = newTodos.find(t => t.id === id);
        if (todo) todo.order = order;
      });
      return {
        ...prev,
        todos: newTodos.sort((a, b) => a.order - b.order)
      };
    });

    try {
      const result = await api.reorderTodos(updates);
      if (!result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to reorder todos:', error);
      await loadData();
    }
  }, [loadData]);

  const updateRoutineCheck = useCallback(async (routineId, checked) => {
    // Optimistic update
    setDailyData(prev => ({
      ...prev,
      routineChecks: {
        ...prev.routineChecks,
        [routineId]: checked
      }
    }));

    try {
      const result = await api.updateRoutineCheck(dateKey, routineId, checked);
      if (!result.success) {
        // Revert on failure
        setDailyData(prev => ({
          ...prev,
          routineChecks: {
            ...prev.routineChecks,
            [routineId]: !checked
          }
        }));
      }
    } catch (error) {
      console.error('Failed to update routine check:', error);
      // Revert on error
      setDailyData(prev => ({
        ...prev,
        routineChecks: {
          ...prev.routineChecks,
          [routineId]: !checked
        }
      }));
    }
  }, [dateKey]);

  const addRoutine = useCallback(async (text, emoji = '✓', order, scheduled_time, duration, weekdays, start_date, end_date) => {
    const result = await api.addRoutine(text, emoji, order, scheduled_time, duration, weekdays, start_date, end_date);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const updateRoutine = useCallback(async (id, updates) => {
    const result = await api.updateRoutine(id, updates);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const deleteRoutine = useCallback(async (id) => {
    const result = await api.deleteRoutine(id);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const reorderRoutines = useCallback(async (updates) => {
    const result = await api.reorderRoutines(updates);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  return {
    dailyData,
    loading,
    saveData,
    addImageToState,
    removeImageFromState,
    addTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    updateRoutineCheck,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    reorderRoutines,
    reload: loadData
  };
}
