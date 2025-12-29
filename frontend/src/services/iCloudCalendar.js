/**
 * Universal Calendar Service
 * Fetches and parses calendar events from various sources (iCloud, Google Calendar, Outlook, etc.)
 * All calendars must provide ICS (iCalendar) format
 */

/**
 * Unescape ICS text values
 * ICS format escapes special characters like: \, \; \n \\ etc.
 */
function unescapeICSValue(value) {
  return value
    .replace(/\\n/g, '\n')      // Newline
    .replace(/\\,/g, ',')        // Comma
    .replace(/\\;/g, ';')        // Semicolon
    .replace(/\\\\/g, '\\');     // Backslash (must be last)
}

/**
 * Parse RRULE and expand recurring events
 */
function expandRecurringEvent(event, rrule) {
  const expandedEvents = [];

  // Parse RRULE
  const rruleParts = {};
  rrule.split(';').forEach(part => {
    const [key, value] = part.split('=');
    rruleParts[key] = value;
  });

  // Only handle YEARLY for now (most common for holidays)
  if (rruleParts.FREQ !== 'YEARLY') {
    const singleEvent = { ...event };
    delete singleEvent.rrule; // Remove rrule from non-yearly events
    return [singleEvent];
  }

  const count = parseInt(rruleParts.COUNT) || 10; // Default to 10 years
  const startDate = new Date(event.startDate);

  // Generate events for the next N years
  for (let i = 0; i < count; i++) {
    const newEvent = {
      title: event.title,
      description: event.description,
      location: event.location,
      uid: `${event.uid}-${i}`,
      isAllDay: event.isAllDay,
      calendarId: event.calendarId,
      calendarName: event.calendarName,
      calendarType: event.calendarType,
      calendarTypeIcon: event.calendarTypeIcon,
      calendarColor: event.calendarColor
    };

    const newStartDate = new Date(startDate);
    newStartDate.setFullYear(startDate.getFullYear() + i);
    newEvent.startDate = newStartDate;

    if (event.endDate) {
      const endDate = new Date(event.endDate);
      const newEndDate = new Date(endDate);
      newEndDate.setFullYear(endDate.getFullYear() + i);
      newEvent.endDate = newEndDate;
    }

    expandedEvents.push(newEvent);
  }

  return expandedEvents;
}

/**
 * Parse ICS (iCalendar) format to extract events
 */
function parseICS(icsText) {
  const events = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent = null;
  let currentProperty = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle line continuation (lines starting with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      i++;
      line += lines[i].trim();
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      // Debug: log the event before expansion
      if (currentEvent.rrule && !currentEvent.title) {
        console.warn('⚠️ Event has RRULE but no title:', currentEvent);
      }

      // Expand recurring events if RRULE exists
      if (currentEvent.rrule) {
        const expandedEvents = expandRecurringEvent(currentEvent, currentEvent.rrule);
        events.push(...expandedEvents);
      } else {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);

        // Parse different property types
        if (key.startsWith('DTSTART')) {
          currentEvent.startDate = parseICSDate(value);
          currentEvent.isAllDay = key.includes('VALUE=DATE') && !key.includes('TZID');
        } else if (key.startsWith('DTEND')) {
          currentEvent.endDate = parseICSDate(value);
        } else if (key.startsWith('SUMMARY')) {
          currentEvent.title = unescapeICSValue(value);
        } else if (key.startsWith('DESCRIPTION')) {
          currentEvent.description = unescapeICSValue(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = unescapeICSValue(value);
        } else if (key === 'UID') {
          currentEvent.uid = value;
        } else if (key === 'RRULE') {
          currentEvent.rrule = value;
        }
      }
    }
  }

  return events;
}

/**
 * Parse ICS date format (YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
 */
function parseICSDate(dateString) {
  // Remove TZID if present
  dateString = dateString.replace(/^TZID=[^:]+:/, '');

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(dateString.substring(6, 8));

  if (dateString.length === 8) {
    // DATE format (all-day event)
    return new Date(year, month, day);
  }

  // DATETIME format
  const hour = parseInt(dateString.substring(9, 11));
  const minute = parseInt(dateString.substring(11, 13));
  const second = parseInt(dateString.substring(13, 15));

  if (dateString.endsWith('Z')) {
    // UTC time
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    // Local time
    return new Date(year, month, day, hour, minute, second);
  }
}

/**
 * Normalize calendar URL for different calendar types
 */
function normalizeCalendarUrl(url, type) {
  // Convert webcal:// to https:// for iCloud and other webcal URLs
  if (url.startsWith('webcal://')) {
    return url.replace(/^webcal:\/\//i, 'https://');
  }

  // Google Calendar: Ensure it's using the public ICS URL
  if (type === 'google' && url.includes('calendar.google.com')) {
    // If it's an HTML URL, try to convert to ICS URL
    if (url.includes('/calendar/') && !url.includes('/ical/')) {
      console.warn('Google Calendar URL should be in ICS format. Use the "Secret address in iCal format" from calendar settings.');
    }
  }

  // Outlook: Handle various Outlook URL formats
  if (type === 'outlook' && url.includes('outlook')) {
    // Outlook URLs are typically already in the correct format
  }

  return url;
}

/**
 * Fetch and parse calendar events from any ICS source
 */
export async function fetchICloudEvents(calendarUrl, calendarType = 'icloud') {
  try {
    if (!calendarUrl) {
      return [];
    }

    // Normalize the URL based on calendar type
    const normalizedUrl = normalizeCalendarUrl(calendarUrl, calendarType);

    // Use backend proxy to avoid CORS issues
    const API_URL = import.meta.env.VITE_API_URL || '';
    const proxyUrl = `${API_URL}/api/icloud-calendar/proxy?url=${encodeURIComponent(normalizedUrl)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseICS(icsText);

    return events;
  } catch (error) {
    console.error(`Error fetching ${calendarType} calendar:`, error);
    throw error;
  }
}

/**
 * Fetch events from multiple calendars of different types
 */
export async function fetchMultipleCalendars(calendars) {
  try {
    if (!calendars || calendars.length === 0) {
      return [];
    }

    // Fetch all calendars in parallel
    const calendarPromises = calendars.map(async (calendar) => {
      try {
        const events = await fetchICloudEvents(calendar.url, calendar.type || 'icloud');
        // Add calendar metadata to each event
        return events.map(event => ({
          ...event,
          calendarId: calendar.id,
          calendarName: calendar.name,
          calendarType: calendar.type || 'icloud',
          calendarTypeIcon: calendar.type_icon || calendar.typeIcon || '📅',
          calendarColor: calendar.color
        }));
      } catch (error) {
        console.error(`Failed to fetch ${calendar.type || 'calendar'} ${calendar.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(calendarPromises);
    // Flatten the array of arrays into a single array
    return results.flat();
  } catch (error) {
    console.error('Error fetching multiple calendars:', error);
    throw error;
  }
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(events, targetDate) {
  const targetStart = new Date(targetDate);
  targetStart.setHours(0, 0, 0, 0);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetEnd.getDate() + 1);

  return events.filter(event => {
    if (!event.startDate) return false;

    const eventStart = new Date(event.startDate);
    if (event.isAllDay) {
      eventStart.setHours(0, 0, 0, 0);
    }

    let eventEnd;
    if (event.endDate) {
      eventEnd = new Date(event.endDate);
      if (event.isAllDay) {
        eventEnd.setHours(0, 0, 0, 0);
      }
    } else {
      eventEnd = new Date(eventStart);
      if (event.isAllDay) {
        eventEnd.setDate(eventEnd.getDate() + 1);
      } else {
        // For timed events without end date, assume it ends at the end of the day
        eventEnd.setHours(23, 59, 59, 999);
      }
    }

    // Check overlap: eventStart < targetEnd && eventEnd > targetStart
    return eventStart < targetEnd && eventEnd > targetStart;
  }).sort((a, b) => {
    // Sort by start time
    if (!a.startDate || !b.startDate) return 0;
    return a.startDate - b.startDate;
  });
}

/**
 * Format event time for display
 */
export function formatEventTime(event) {
  if (event.isAllDay) {
    return '종일';
  }

  const startTime = event.startDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (event.endDate) {
    const endTime = event.endDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${startTime} - ${endTime}`;
  }

  return startTime;
}
