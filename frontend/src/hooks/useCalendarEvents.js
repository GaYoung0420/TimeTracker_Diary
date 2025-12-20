import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export function useCalendarEvents(currentDate) {
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [wakeSleepEvents, setWakeSleepEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = currentDate.toISOString().split('T')[0];
  const calendarIds = calendars.map(cal => cal.id);

  // Load calendars
  useEffect(() => {
    const loadCalendars = async () => {
      try {
        const result = await api.getCalendars();
        if (result.success) {
          setCalendars(result.calendars);
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
