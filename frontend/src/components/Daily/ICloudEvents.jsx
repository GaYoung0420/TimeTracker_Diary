import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { fetchMultipleCalendars, getEventsForDate, formatEventTime } from '../../services/iCloudCalendar';
import './ICloudEvents.css';

function ICloudEvents({ currentDate, onOpenSettings }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [isHidden, setIsHidden] = useState(() => {
    return localStorage.getItem('hideICloudBanner') === 'true';
  });

  useEffect(() => {
    loadEvents();

    const handleCalendarUpdate = () => {
      loadEvents();
      // 캘린더가 업데이트되면(추가되면) 배너 숨김 해제 여부는 기획에 따라 다르지만,
      // 일단 캘린더가 생기면 배너가 아니라 이벤트 리스트가 뜨므로 상관없음.
      // 만약 캘린더를 다 삭제해서 다시 0개가 되면 배너가 떠야 하는데,
      // 사용자가 '숨김'을 눌렀다면 안 뜨는 게 맞음.
    };

    window.addEventListener('icloud-calendar-updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('icloud-calendar-updated', handleCalendarUpdate);
    };
  }, [currentDate]);

  const handleCloseBanner = (e) => {
    e.stopPropagation();
    setIsHidden(true);
    localStorage.setItem('hideICloudBanner', 'true');
  };

  const loadEvents = async () => {
    try {
      const response = await api.getCalendars();
      if (!response.success || !response.data) {
        setCalendars([]);
        setEvents([]);
        return;
      }

      setCalendars(response.data);

      // Filter only enabled calendars
      const enabledCalendars = response.data.filter(cal => cal.enabled);

      if (enabledCalendars.length === 0) {
        setEvents([]);
        return;
      }

      setLoading(true);
      setError(null);

      const allEvents = await fetchMultipleCalendars(enabledCalendars);
      console.log('📅 All events from calendars:', allEvents);
      const todayEvents = getEventsForDate(allEvents, currentDate);
      console.log('📅 Today\'s events:', todayEvents);
      setEvents(todayEvents);
    } catch (err) {
      console.error('Failed to load iCloud events:', err);
      setError('iCloud 캘린더를 불러오는 중 오류가 발생했습니다.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (calendars.length === 0) {
    if (isHidden) return null;

    return (
      <div className="icloud-events-container empty-state">
        <button className="btn-close-banner" onClick={handleCloseBanner} title="닫기">×</button>
        <div className="icloud-empty-content">
          <div className="icloud-icon-wrapper">
            <span className="icloud-icon">📅</span>
          </div>
          <p className="icloud-empty-text">iCloud 캘린더를 연동하여<br/>오늘의 일정을 확인하세요</p>
          <button className="btn-connect-calendar" onClick={onOpenSettings}>
            캘린더 구독하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="icloud-events-container">
        <h3 className="icloud-events-title">오늘의 일정</h3>
        <div className="icloud-loading">일정을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="icloud-events-container">
        <h3 className="icloud-events-title">오늘의 일정</h3>
        <div className="icloud-error">{error}</div>
        <div className="icloud-error-hint">
          캘린더 URL이 올바른지, 공개 캘린더로 설정되어 있는지 확인해주세요.
        </div>
        <button className="btn-retry-calendar" onClick={onOpenSettings}>
          설정 확인하기
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="icloud-events-container">
        <h3 className="icloud-events-title">오늘의 일정</h3>
        <div className="icloud-no-events">오늘 일정이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="icloud-events-container">
      <h3 className="icloud-events-title">오늘의 일정</h3>
      <div className="icloud-events-list">
        {events.map((event, index) => (
          <div
            key={event.uid || index}
            className="icloud-event-item"
            style={{ borderLeftColor: event.calendarColor || '#007bff' }}
          >
            <div className="icloud-event-time" style={{ color: event.calendarColor || '#007bff' }}>
              {formatEventTime(event)}
            </div>
            <div className="icloud-event-details">
              <div className="icloud-event-header">
                <div className="icloud-event-title">{event.title || '(제목 없음)'}</div>
                {event.calendarName && (
                  <span
                    className="icloud-event-calendar-badge"
                    style={{ backgroundColor: event.calendarColor || '#007bff' }}
                  >
                    {event.calendarName}
                  </span>
                )}
              </div>
              {event.location && (
                <div className="icloud-event-location">📍 {event.location}</div>
              )}
              {event.description && (
                <div className="icloud-event-description">{event.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ICloudEvents;
