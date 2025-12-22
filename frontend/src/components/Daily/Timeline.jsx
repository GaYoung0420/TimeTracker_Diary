import { formatKoreanTime, getCategoryColorByName, getCategoryTextColorByName, hexToRgba, getLocalDateString } from '../../utils/helpers';

function Timeline({ events, wakeSleepEvents, calendars, loading, currentDate }) {
  const hourHeight = 40;

  // Debug: Log all events
  console.log('Timeline Debug:', {
    currentDate: currentDate.toISOString(),
    eventsCount: events.length,
    events: events.map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      calendarName: e.calendarName
    }))
  });

  if (loading) {
    return (
      <div className="timeline-wrapper">
        <div className="timeline-loading">
          <div className="loading-spinner"></div>
          <p>캘린더 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const renderWakeSleepTimes = () => {
    let wakeTime = '-';
    let sleepTime = '-';

    if (wakeSleepEvents && wakeSleepEvents.length > 0 && currentDate) {
      const currentDateStr = getLocalDateString(currentDate);

      wakeSleepEvents.forEach(event => {
        const start = new Date(event.start);
        const end = new Date(event.end);

        const startDateStr = getLocalDateString(start);
        const endDateStr = getLocalDateString(end);

        // 기상 시간: 당일에 종료되는 잠 이벤트의 종료 시간
        if (endDateStr === currentDateStr) {
          wakeTime = formatKoreanTime(end);
        }

        // 취침 시간: 당일에 시작되는 잠 이벤트의 시작 시간
        if (startDateStr === currentDateStr) {
          sleepTime = formatKoreanTime(start);
        }
      });
    }

    return (
      <div className="wake-sleep-container">
        <div className="wake-sleep-item">
          🌅 기상: <span className="time-value">{wakeTime}</span>
        </div>
        <div className="wake-sleep-item">
          🌙 취침: <span className="time-value">{sleepTime}</span>
        </div>
      </div>
    );
  };

  const renderEventBlock = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);

    // Get current day boundaries in local timezone
    // Create a new date using local year/month/day from currentDate
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    const dayStart = new Date(year, month, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, day + 1, 0, 0, 0, 0);

    // Debug multi-day events
    if (event.title === '잠') {
      console.log('Processing sleep event:', {
        title: event.title,
        start: start.toISOString(),
        end: end.toISOString(),
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
        startBeforeDayStart: start < dayStart,
        endAfterDayEnd: end > dayEnd
      });
    }

    // Clamp event times to current day boundaries
    const effectiveStart = start < dayStart ? dayStart : start;
    const effectiveEnd = end > dayEnd ? dayEnd : end;

    // Calculate position and height based on clamped times
    const startHour = effectiveStart.getHours();
    const startMinute = effectiveStart.getMinutes();
    const endHour = effectiveEnd.getHours();
    const endMinute = effectiveEnd.getMinutes();

    let startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // If effectiveEnd is exactly at dayEnd (00:00 of next day), treat as 24:00 (1440 minutes)
    if (effectiveEnd.getTime() === dayEnd.getTime()) {
      endMinutes = 24 * 60; // 1440 minutes = 24:00
    }

    const durationMinutes = endMinutes - startMinutes;

    if (event.title === '잠') {
      console.log('Sleep event calculation:', {
        effectiveStart: effectiveStart.toISOString(),
        effectiveEnd: effectiveEnd.toISOString(),
        startMinutes,
        endMinutes,
        durationMinutes,
        topPosition: (startMinutes / 60) * hourHeight,
        height: (durationMinutes / 60) * hourHeight
      });
    }

    // Skip if event doesn't overlap with current day
    if (durationMinutes <= 0) return null;

    const topPosition = (startMinutes / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;

    const blockColor = getCategoryColorByName(event.calendarName, event.color);
    const textColor = getCategoryTextColorByName(event.calendarName);
    const bgColor = hexToRgba(blockColor, 0.35);

    // Determine display time (use actual start if it's today, otherwise show 00:00)
    const displayTime = start < dayStart
      ? '00:00'
      : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
      <div
        key={`${event.calendarId}-${event.start}`}
        className="event-block-absolute"
        style={{
          background: bgColor,
          color: textColor,
          top: `${topPosition}px`,
          height: `${Math.max(height, 20)}px`
        }}
        title={event.title}
      >
        <div className="event-title">{event.title}</div>
        <div className="event-time">
          {displayTime}
        </div>
      </div>
    );
  };

  const planEvents = events.filter(e =>
    e.calendarName?.includes('계획') || e.calendarName?.includes('Plan') || e.calendarName?.includes('⑧')
  );
  const actualEvents = events.filter(e =>
    !e.calendarName?.includes('계획') && !e.calendarName?.includes('Plan') && !e.calendarName?.includes('⑧')
  );

  return (
    <>
      {renderWakeSleepTimes()}

      <div className="timeline-grid">
        <div className="timeline-header">
          <div>계획</div>
          <div>시간</div>
          <div>실제</div>
        </div>

        <div className="timeline-wrapper" style={{ minHeight: `${24 * hourHeight}px` }}>
          <div className="timeline-columns">
            <div className="timeline-column plan-column">
              {planEvents.map(renderEventBlock)}
            </div>
            <div className="timeline-column time-column"></div>
            <div className="timeline-column actual-column">
              {actualEvents.map(renderEventBlock)}
            </div>
          </div>

          <div className="time-markers">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="time-marker-row" style={{ height: `${hourHeight}px` }}>
                <div></div>
                <div className="time-marker-label">{String(hour).padStart(2, '0')}</div>
                <div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Timeline;
