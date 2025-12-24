import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { getLocalDateString } from '../utils/helpers';

// Simple in-memory cache
const eventCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEvents(currentDate) {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = getLocalDateString(currentDate);

  // Load categories once on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await api.getCategories();
        if (result.success) {
          setCategories(result.categories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);

  // Load events when date changes
  useEffect(() => {
    loadEvents();
  }, [dateKey]);

  const loadEvents = async () => {
    const cached = eventCache.get(dateKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setEvents(cached.events);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [eventsResult, wakeSleepResult] = await Promise.all([
        api.getEvents(dateKey),
        api.getWakeSleepEvents(dateKey)
      ]);

      let allEvents = [];
      if (eventsResult.success) {
        allEvents = eventsResult.events;
      }

      // Cache the results
      eventCache.set(dateKey, {
        events: allEvents,
        wakeSleepInfo: wakeSleepResult.success ? wakeSleepResult : {},
        timestamp: Date.now()
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new event
  const createEvent = useCallback(async (title, start_time, end_time, category, description = '') => {
    try {
      const result = await api.createEvent(dateKey, title, start_time, end_time, category, description);
      if (result.success) {
        // Optimistically update UI - backend now returns formatted event
        setEvents(prev => [...prev, result.event]);

        // Invalidate cache
        eventCache.delete(dateKey);

        return result.event;
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }, [dateKey]);

  // Update event
  const updateEvent = useCallback(async (id, updates) => {
    try {
      const result = await api.updateEvent(id, updates);
      if (result.success) {
        // Optimistically update UI - backend now returns formatted event
        setEvents(prev => prev.map(evt =>
          evt.id === id ? result.event : evt
        ));

        // Invalidate cache
        eventCache.delete(dateKey);

        return result.event;
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }, [dateKey]);

  // Delete event
  const deleteEvent = useCallback(async (id) => {
    try {
      const result = await api.deleteEvent(id);
      if (result.success) {
        // Optimistically update UI
        setEvents(prev => prev.filter(evt => evt.id !== id));

        // Invalidate cache
        eventCache.delete(dateKey);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }, [dateKey]);

  // Reload function for manual refresh
  const reload = useCallback(async () => {
    eventCache.delete(dateKey);
    await loadEvents();
  }, [dateKey]);

  // Get wake/sleep times
  const getWakeSleepTimes = useCallback(() => {
    const cached = eventCache.get(dateKey);
    if (cached && cached.wakeSleepInfo) {
      return {
        wakeTime: cached.wakeSleepInfo.wakeTime || '-',
        sleepTime: cached.wakeSleepInfo.sleepTime || '-'
      };
    }
    return { wakeTime: '-', sleepTime: '-' };
  }, [dateKey]);

  return {
    categories,
    events,
    loading,
    reload,
    createEvent,
    updateEvent,
    deleteEvent,
    getWakeSleepTimes
  };
}
