import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

// Simple in-memory cache
const eventCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCalendarEvents(currentDate) {
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [wakeSleepEvents, setWakeSleepEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarsLoadedRef = useRef(false);

  const dateKey = currentDate.toISOString().split('T')[0];
  const calendarIds = calendars.map(cal => cal.id);

  // Load calendars (only once)
  useEffect(() => {
    if (calendarsLoadedRef.current) return;

    const loadCalendars = async () => {
      try {
        const result = await api.getCalendars();
        if (result.success) {
          setCalendars(result.calendars);
          calendarsLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load calendars:', error);
      }
    };
    loadCalendars();
  }, []);

  // Load events when date or calendars change
  const loadEvents = useCallback(async () => {
    if (calendarIds.length === 0) {
      setLoading(false);
      return;
    }

    const cacheKey = `${dateKey}_${calendarIds.join(',')}`;
    const cached = eventCache.get(cacheKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setEvents(cached.events);
      setWakeSleepEvents(cached.wakeSleepEvents);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [eventsResult, wakeSleepResult] = await Promise.all([
        api.getEvents(dateKey, calendarIds),
        api.getWakeSleepEvents(dateKey, calendarIds)
      ]);

      if (eventsResult.success) {
        setEvents(eventsResult.events);
      }
      if (wakeSleepResult.success) {
        setWakeSleepEvents(wakeSleepResult.events);
      }

      // Cache the results
      eventCache.set(cacheKey, {
        events: eventsResult.success ? eventsResult.events : [],
        wakeSleepEvents: wakeSleepResult.success ? wakeSleepResult.events : [],
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [dateKey, calendarIds.join(',')]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    calendars,
    events,
    wakeSleepEvents,
    loading,
    reload: loadEvents
  };
}
