import { formatKoreanTime, getCategoryColorByName, getCategoryTextColorByName, hexToRgba } from '../../utils/helpers';

function Timeline({ events, wakeSleepEvents, calendars, loading }) {
  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  const hourHeight = 40;

  const renderWakeSleepTimes = () => {
    // Wake/Sleep 계산 로직 (원본 코드 참조)
    return (
      <div className="wake-sleep-container">
        <div className="wake-sleep-item">
          🌅 기상: <span className="time-value">-</span>
        </div>
        <div className="wake-sleep-item">
          🌙 취침: <span className="time-value">-</span>
        </div>
      </div>
    );
  };

  const renderEventBlock = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    const topPosition = (startMinutes / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;

    const blockColor = getCategoryColorByName(event.calendarName, event.color);
    const textColor = getCategoryTextColorByName(event.calendarName);
    const bgColor = hexToRgba(blockColor, 0.35);

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
          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
