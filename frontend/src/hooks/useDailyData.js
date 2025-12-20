import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

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

  const dateKey = currentDate.toISOString().split('T')[0];

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

  const saveData = useCallback(async (updates) => {
    try {
      await api.saveDailyData(dateKey, updates);
    } catch (error) {
      console.error('Failed to save daily data:', error);
    }
  }, [dateKey]);

  const addTodo = useCallback(async (text) => {
    const result = await api.addTodo(dateKey, text);
    if (result.success) {
      await loadData();
    }
  }, [dateKey, loadData]);

  const updateTodo = useCallback(async (id, updates) => {
    const result = await api.updateTodo(id, updates);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const deleteTodo = useCallback(async (id) => {
    const result = await api.deleteTodo(id);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const updateRoutineCheck = useCallback(async (routineId, checked) => {
    const result = await api.updateRoutineCheck(dateKey, routineId, checked);
    if (result.success) {
      setDailyData(prev => ({
        ...prev,
        routineChecks: {
          ...prev.routineChecks,
          [routineId]: checked
        }
      }));
    }
  }, [dateKey]);

  const addRoutine = useCallback(async (text) => {
    const result = await api.addRoutine(text);
    if (result.success) {
      await loadData();
    }
  }, [loadData]);

  const updateRoutine = useCallback(async (id, text) => {
    const result = await api.updateRoutine(id, text);
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

  return {
    dailyData,
    loading,
    saveData,
    addTodo,
    updateTodo,
    deleteTodo,
    updateRoutineCheck,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    reload: loadData
  };
}
