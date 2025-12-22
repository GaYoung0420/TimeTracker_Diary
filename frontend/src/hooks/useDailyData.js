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

  const addTodo = useCallback(async (text, category) => {
    const result = await api.addTodo(dateKey, text, category);
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

  const reorderTodos = useCallback(async (updates) => {
    const result = await api.reorderTodos(updates);
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
    reload: loadData
  };
}
