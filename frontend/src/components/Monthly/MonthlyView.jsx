import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import MonthlyTimeGrid from './MonthlyTimeGrid';
import MonthlyStats from './MonthlyStats';
import { getLocalDateString, hexToRgba } from '../../utils/helpers';
import { fetchMultipleCalendars, getEventsForDate } from '../../services/iCloudCalendar';

function MonthlyView({ goToDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'time', or 'stats'

  useEffect(() => {
    if (viewMode === 'calendar' || viewMode === 'time') {
      if (viewMode === 'calendar') {
        loadMonthlyData();
      }
      loadCalendarEvents();
    }
  }, [currentMonth, viewMode]);

  const loadCalendarEvents = async () => {
    try {
      let calendars = [];
      
      // 1. Try to fetch from API (user_calendars table)
      try {
        const result = await api.getCalendars();
        if (result.success && Array.isArray(result.data)) {
          calendars = result.data.filter(cal => cal.enabled);
        }
      } catch (err) {
        console.error("Failed to fetch calendars from API:", err);
      }

      // 2. Fallback to localStorage if API returned nothing
      if (calendars.length === 0) {
        const savedCalendars = localStorage.getItem('iCloudCalendars');
        if (savedCalendars) {
          calendars = JSON.parse(savedCalendars).filter(cal => cal.enabled);
        } else {
          const legacyUrl = localStorage.getItem('iCloudCalendarUrl');
          if (legacyUrl) {
            calendars = [{ url: legacyUrl, color: '#007bff', name: 'Calendar', enabled: true }];
          }
        }
      }

      if (calendars.length > 0) {
         const events = await fetchMultipleCalendars(calendars);
         setCalendarEvents(events);
      } else {
         setCalendarEvents([]);
      }
    } catch (e) {
        console.error("Failed to load calendar events", e);
    }
  };

  const loadMonthlyData = async () => {
    setCalendarLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const result = await api.getMonthlyStats(year, month);
      if (result.success) {
        setMonthlyData(result.data);
      }
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const formatMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}년 ${month}월`;
  };

  const renderCalendarGrid = () => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = getLocalDateString(new Date());

    // 1. Prepare days array
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // 2. Calculate layout
    const isEventOnDate = (event, date) => {
        const targetStart = new Date(date);
        targetStart.setHours(0,0,0,0);
        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetEnd.getDate() + 1);
        
        const eventStart = new Date(event.startDate);
        if (event.isAllDay) eventStart.setHours(0,0,0,0);
        
        let eventEnd;
        if (event.endDate) {
            eventEnd = new Date(event.endDate);
            if (event.isAllDay) eventEnd.setHours(0,0,0,0);
        } else {
            eventEnd = new Date(eventStart);
            if (event.isAllDay) eventEnd.setDate(eventEnd.getDate() + 1);
            else eventEnd.setHours(23,59,59,999);
        }
        
        return eventStart < targetEnd && eventEnd > targetStart;
    };

    const sortedEvents = [...calendarEvents].sort((a, b) => {
        const startDiff = new Date(a.startDate) - new Date(b.startDate);
        if (startDiff !== 0) return startDiff;
        const durA = (a.endDate ? new Date(a.endDate) : new Date(a.startDate)) - new Date(a.startDate);
        const durB = (b.endDate ? new Date(b.endDate) : new Date(b.startDate)) - new Date(b.startDate);
        return durB - durA;
    });

    const daySlots = {};
    days.forEach(d => daySlots[getLocalDateString(d)] = []);

    sortedEvents.forEach(event => {
        const coveredDays = days.filter(d => isEventOnDate(event, d));
        if (coveredDays.length === 0) return;

        let slotIndex = 0;
        while (true) {
            const isAvailable = coveredDays.every(d => {
                const key = getLocalDateString(d);
                return !daySlots[key][slotIndex];
            });
            if (isAvailable) break;
            slotIndex++;
        }

        coveredDays.forEach(d => {
            const key = getLocalDateString(d);
            daySlots[key][slotIndex] = event;
        });
    });

    return (
      <div className="monthly-grid">
        {weekdays.map(day => (
          <div key={day} className="monthly-day-header">{day}</div>
        ))}

        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="monthly-day-cell empty"></div>
        ))}

        {days.map((date, idx) => {
            const day = date.getDate();
            const dateKey = getLocalDateString(date);
            const slots = daySlots[dateKey] || [];
            const img = (monthlyData || []).find(d => d.date === day)?.firstImage;
            
            // Determine how many slots to render to maintain alignment but minimize height
            let lastVisibleIndex = -1;
            for (let i = 2; i >= 0; i--) {
                if (slots[i]) {
                    lastVisibleIndex = i;
                    break;
                }
            }
            
            const renderSlots = [];
            for (let i = 0; i <= lastVisibleIndex; i++) {
                renderSlots.push(i);
            }

            const hiddenCount = slots.slice(3).filter(e => e !== null).length;
            const hasMore = hiddenCount > 0;
            
            return (
              <div
                key={dateKey}
                className={`monthly-day-cell ${dateKey === today ? 'today' : ''}`}
                onClick={() => goToDate(dateKey)}
              >
                <div className="monthly-date-num">{day}</div>
                
                <div className="monthly-events-list">
                  {renderSlots.map(i => {
                      const event = slots[i];
                      if (!event) return <div key={i} className="monthly-event-spacer"></div>;
                      
                      const eventStart = new Date(event.startDate);
                      if (event.isAllDay) eventStart.setHours(0,0,0,0);
                      const isStart = eventStart.getTime() >= date.getTime();
                      
                      let eventEnd;
                      if (event.endDate) {
                          eventEnd = new Date(event.endDate);
                          if (event.isAllDay) eventEnd.setHours(0,0,0,0);
                      } else {
                          eventEnd = new Date(eventStart);
                          if (event.isAllDay) eventEnd.setDate(eventEnd.getDate() + 1);
                          else eventEnd.setHours(23,59,59,999);
                      }
                      
                      const nextDay = new Date(date);
                      nextDay.setDate(nextDay.getDate() + 1);
                      const isEnd = eventEnd.getTime() <= nextDay.getTime();

                      return (
                        <div 
                          key={i} 
                          className={`monthly-event-item ${!isStart ? 'continuation-left' : ''} ${!isEnd ? 'continuation-right' : ''}`}
                          style={{ 
                            backgroundColor: hexToRgba(event.calendarColor || '#007bff', 0.12),
                            color: '#000000',
                            borderLeftColor: isStart ? (event.calendarColor || '#007bff') : 'transparent',
                          }}
                          title={event.title}
                        >
                          {isStart || day === 1 ? event.title : '\u00A0'}
                        </div>
                      );
                  })}
                  {hasMore && (
                    <div className="monthly-event-more">+{hiddenCount}</div>
                  )}
                </div>

                {img && (
                  <img
                    src={img.thumbnailUrl}
                    className="monthly-thumbnail"
                    alt="Daily thumbnail"
                  />
                )}
              </div>
            );
        })}
      </div>
    );
  };

  return (
    <div className="monthly-container">
      <div className="monthly-header">
        <button className="month-nav-btn" onClick={() => changeMonth(-1)}>◀</button>
        <div className="current-month">{formatMonth()}</div>
        <button className="month-nav-btn" onClick={() => changeMonth(1)}>▶</button>
        <div className="header-actions">
          <div className="view-mode-selector header-inline">
            <button
              className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 캘린더 뷰
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'time' ? 'active' : ''}`}
              onClick={() => setViewMode('time')}
            >
              ⏰ 시간 추적 뷰
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              📊 통계 뷰
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' && (
        calendarLoading ? (
          <div className="monthly-loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">캘린더 데이터를 불러오는 중...</div>
          </div>
        ) : (
          renderCalendarGrid()
        )
      )}
      {viewMode === 'time' && <MonthlyTimeGrid currentMonth={currentMonth} goToDate={goToDate} calendarEvents={calendarEvents} />}
      {viewMode === 'stats' && <MonthlyStats currentMonth={currentMonth} goToDate={goToDate} calendarEvents={calendarEvents} />}
    </div>
  );
}

export default MonthlyView;
