import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { getLocalDateString } from '../utils/helpers';

// Simple in-memory cache
const eventCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCalendarEvents(currentDate) {
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [wakeSleepEvents, setWakeSleepEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarsLoadedRef = useRef(false);

  const dateKey = getLocalDateString(currentDate);

  // Load calendars once on mount
  useEffect(() => {
    if (calendarsLoadedRef.current) return;

    const loadCalendars = async () => {
      try {
        const calendarsResult = await api.getCalendars();
        if (calendarsResult.success) {
          setCalendars(calendarsResult.calendars);
          calendarsLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load calendars:', error);
      }
    };

    loadCalendars();
  }, []);

  // Load events when date changes
  useEffect(() => {
    const calendarIds = calendars.map(cal => cal.id);
    if (calendarIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadEvents = async () => {
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
    };

    loadEvents();
  }, [dateKey, calendars]);

  // Reload function for manual refresh
  const reload = useCallback(async () => {
    const calendarIds = calendars.map(cal => cal.id);
    if (calendarIds.length === 0) return;

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

      // Update cache
      const cacheKey = `${dateKey}_${calendarIds.join(',')}`;
      eventCache.set(cacheKey, {
        events: eventsResult.success ? eventsResult.events : [],
        wakeSleepEvents: wakeSleepResult.success ? wakeSleepResult.events : [],
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to reload events:', error);
    } finally {
      setLoading(false);
    }
  }, [dateKey, calendars]);

  return {
    calendars,
    events,
    wakeSleepEvents,
    loading,
    reload
  };
}
