import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { getLocalDateString } from '../utils/helpers';

// Simple in-memory cache
const eventCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEvents(currentDate) {
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [wakeSleepInfo, setWakeSleepInfo] = useState({
    wakeTime: '-',
    wakeDateTime: null,
    sleepTime: '-',
    sleepDateTime: null
  });
  const [loading, setLoading] = useState(true);

  const dateKey = getLocalDateString(currentDate);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const result = await api.getCategories();
      if (result.success) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  // Load categories once on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadEvents = useCallback(async () => {
    const cached = eventCache.get(dateKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setEvents(cached.events);
      if (cached.wakeSleepInfo) {
        setWakeSleepInfo({
          wakeTime: cached.wakeSleepInfo.wakeTime || '-',
          wakeDateTime: cached.wakeSleepInfo.wakeDateTime || null,
          sleepTime: cached.wakeSleepInfo.sleepTime || '-',
          sleepDateTime: cached.wakeSleepInfo.sleepDateTime || null
        });
      }
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

      // Update wake/sleep info state
      if (wakeSleepResult.success) {
        const newWakeSleepInfo = {
          wakeTime: wakeSleepResult.wakeTime || '-',
          wakeDateTime: wakeSleepResult.wakeDateTime || null,
          sleepTime: wakeSleepResult.sleepTime || '-',
          sleepDateTime: wakeSleepResult.sleepDateTime || null
        };
        console.log('[useEvents] Setting wakeSleepInfo:', dateKey, newWakeSleepInfo);
        setWakeSleepInfo(newWakeSleepInfo);
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
  }, [dateKey]);

  // Load events when date changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Create new event
  const createEvent = useCallback(async (title, start_time, end_time, category_id, is_plan = false, description = '', end_date = null) => {
    try {
      const result = await api.createEvent(dateKey, title, start_time, end_time, category_id, is_plan, description, end_date);
      if (result.success) {
        console.log('Event created:', result.event);
        // Optimistically update UI - backend now returns formatted event
        setEvents(prev => {
          const updated = [...prev, result.event];
          console.log('Updated events after create:', updated.length);
          return updated;
        });

        // If event spans multiple days or has end_date, clear all caches
        if (end_date && end_date !== dateKey) {
          console.log('Clearing all caches (multi-day event)');
          eventCache.clear();
        } else {
          // Otherwise just invalidate current date cache
          console.log('Deleting cache for', dateKey);
          eventCache.delete(dateKey);
        }

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
        console.log('Event updated:', result.event);
        console.log('Updates:', updates);

        // Check if the event's date changed by comparing the date portion of start times
        const oldEvent = events.find(evt => evt.id === id);
        let eventDateChanged = false;

        if (oldEvent && updates.date) {
          // Extract date from oldEvent.start (format: "YYYY-MM-DDTHH:mm:ss")
          const oldDate = oldEvent.start ? oldEvent.start.split('T')[0] : null;
          const newDate = updates.date;
          eventDateChanged = oldDate && oldDate !== newDate;

          console.log('Old event start date:', oldDate, 'New date:', newDate, 'Date changed:', eventDateChanged);
        }

        if (eventDateChanged) {
          console.log('Event date changed, removing from current view');
          // If event moved to a different date, remove it from current view
          setEvents(prev => prev.filter(evt => evt.id !== id));

          // Invalidate all caches since we don't know which dates are affected
          eventCache.clear();
        } else {
          // Optimistically update UI - backend now returns formatted event
          console.log('Updating event in place');
          setEvents(prev => {
            const updated = prev.map(evt =>
              evt.id === id ? result.event : evt
            );
            console.log('Updated events after update:', updated.length);
            console.log('Updated event:', updated.find(e => e.id === id));
            return updated;
          });

          // Invalidate current date cache
          eventCache.delete(dateKey);
        }

        return result.event;
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }, [dateKey, events]);

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

  return {
    categories,
    events,
    loading,
    reload,
    reloadCategories: loadCategories,
    createEvent,
    updateEvent,
    deleteEvent,
    wakeSleepInfo
  };
}
