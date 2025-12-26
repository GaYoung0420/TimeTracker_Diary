import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import { getCategoryColorByName, getCategoryTextColorByName, hexToRgba, getLocalDateString } from '../../utils/helpers';

function MonthlyTimeGrid({ currentMonth, goToDate }) {
  const [timeData, setTimeData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const trackerRef = useRef(null);

  useEffect(() => {
    loadTimeData();
  }, [currentMonth]);

  // timeData가 변경되면 이벤트 렌더링
  useEffect(() => {
    if (timeData.length > 0 && !loading) {
      // DOM이 완전히 렌더링된 후 이벤트 추가
      const timer = setTimeout(() => {
        renderAllEvents(timeData);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [timeData, loading]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const hoverLine = document.getElementById('tt-hover-line');
      const wrapper = document.querySelector('.monthly-timetracker-wrapper');
      const tracker = trackerRef.current;

      if (!hoverLine || !wrapper || !tracker) {
        return;
      }

      const wrapperRect = wrapper.getBoundingClientRect();
      const trackerRect = tracker.getBoundingClientRect();

      const mouseY = e.clientY;
      const relativeY = mouseY - wrapperRect.top + wrapper.scrollTop;

      // Always show the line when mouse is over the wrapper
      hoverLine.style.top = relativeY + 'px';
      hoverLine.style.display = 'block';
    };

    const handleMouseLeave = () => {
      const hoverLine = document.getElementById('tt-hover-line');
      if (hoverLine) {
        hoverLine.style.display = 'none';
      }
    };

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const wrapper = document.querySelector('.monthly-timetracker-wrapper');
      if (wrapper) {
        wrapper.addEventListener('mousemove', handleMouseMove);
        wrapper.addEventListener('mouseleave', handleMouseLeave);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const wrapper = document.querySelector('.monthly-timetracker-wrapper');
      if (wrapper) {
        wrapper.removeEventListener('mousemove', handleMouseMove);
        wrapper.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [timeData]);

  const loadTimeData = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const result = await api.getMonthlyTimeStats(year, month);

      if (result.success) {
        setTimeData(result.data.days);
        setCategories(result.data.categories || []);
        setLoading(false);
      } else {
        setError(result.error || '데이터 로드 실패');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load monthly time data:', error);
      setError(error.message || '데이터를 불러올 수 없습니다');
      setLoading(false);
    }
  };

  const renderAllEvents = (days) => {
    if (!trackerRef.current) {
      return;
    }

    const dayColumns = trackerRef.current.querySelectorAll('.tt-day-column');

    // 전체 월의 모든 이벤트 수집
    const allEvents = days.flatMap(dayData => dayData.events || []);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Parse ISO string as local time (ignoring timezone)
    const parseLocalTime = (isoString) => {
      if (!isoString) return new Date();
      const localIso = isoString.split(/[+Z]/)[0];
      return new Date(localIso);
    };

    days.forEach((dayData) => {
      const dayColumn = dayColumns[dayData.date - 1];
      if (!dayColumn) return;

      // Collect all events that overlap with this day
      const eventsForThisDay = [];

      allEvents.forEach(event => {
        const eventStart = parseLocalTime(event.start);
        const eventEnd = parseLocalTime(event.end);
        const dayStart = new Date(year, month, dayData.date, 0, 0, 0, 0);
        const dayEnd = new Date(year, month, dayData.date + 1, 0, 0, 0, 0);

        // Check if event overlaps with this day
        if (eventStart < dayEnd && eventEnd > dayStart) {
          eventsForThisDay.push(event);
        }
      });

      if (eventsForThisDay.length > 0) {
        renderDayEventsAbsolute(dayColumn, eventsForThisDay);
      }

      // 기상/취침 시간 마커 추가
      renderWakeSleepMarkers(dayColumn, dayData.date, allEvents);
    });
  };

  const renderWakeSleepMarkers = (dayColumn, dayNumber, allEvents) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = getLocalDateString(new Date(year, month, dayNumber));

    let wakeHour = null;
    let sleepHour = null;

    // Helper to parse ISO string as local time (ignoring timezone)
    const parseLocalTime = (isoString) => {
      if (!isoString) return new Date();
      // Remove timezone part to force local interpretation
      // e.g. "2025-12-24T05:00:00+00:00" -> "2025-12-24T05:00:00"
      const localIso = isoString.split(/[+Z]/)[0];
      return new Date(localIso);
    };

    allEvents.forEach(event => {
      if (event.title === '잠') {
        const start = parseLocalTime(event.start);
        const end = parseLocalTime(event.end);
        const startDateStr = getLocalDateString(start);
        const endDateStr = getLocalDateString(end);

        // 기상 시간: 당일에 종료되는 잠 이벤트의 종료 시간
        if (endDateStr === dateStr) {
          wakeHour = end.getHours();
        }

        // 취침 시간: 당일에 시작되는 잠 이벤트의 시작 시간 (가장 늦은 시간)
        if (startDateStr === dateStr) {
          const hour = start.getHours();
          if (sleepHour === null || hour > sleepHour) {
            sleepHour = hour;
          }
        }
      }
    });

    const hourCells = dayColumn.querySelectorAll('.tt-hour-cell');

    if (wakeHour !== null && hourCells[wakeHour]) {
      const marker = document.createElement('div');
      marker.className = 'tt-wake-marker';
      marker.textContent = String(wakeHour).padStart(2, '0');
      hourCells[wakeHour].appendChild(marker);
    }

    if (sleepHour !== null && hourCells[sleepHour]) {
      const marker = document.createElement('div');
      marker.className = 'tt-sleep-marker';
      marker.textContent = String(sleepHour).padStart(2, '0');
      hourCells[sleepHour].appendChild(marker);
    }
  };

  const renderDayEventsAbsolute = (dayColumn, events) => {
    const headerElement = dayColumn.querySelector('.tt-date-header');
    const firstHourCell = dayColumn.querySelector('.tt-hour-cell');

    if (!headerElement || !firstHourCell) {
      return;
    }

    const headerHeight = headerElement.offsetHeight;
    const hourHeight = firstHourCell.offsetHeight;

    // Get the day number from the column (1-31)
    const dayNumber = parseInt(dayColumn.querySelector('.tt-date-day')?.textContent || '0');
    if (!dayNumber) return;

    // Create day boundaries for this specific day
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dayStart = new Date(year, month, dayNumber, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, dayNumber + 1, 0, 0, 0, 0);

    // Helper to parse ISO string as local time (ignoring timezone)
    const parseLocalTime = (isoString) => {
      if (!isoString) return new Date();
      const localIso = isoString.split(/[+Z]/)[0];
      return new Date(localIso);
    };

    // Backend already filters out plan events, so no need to filter here
    events.forEach(event => {
      const start = parseLocalTime(event.start);
      const end = parseLocalTime(event.end);

      // Clamp event times to current day boundaries
      const effectiveStart = start < dayStart ? dayStart : start;
      const effectiveEnd = end > dayEnd ? dayEnd : end;

      const startHour = effectiveStart.getHours();
      const startMinute = effectiveStart.getMinutes();
      const endHour = effectiveEnd.getHours();
      const endMinute = effectiveEnd.getMinutes();

      let startMinutesFromMidnight = startHour * 60 + startMinute;
      let endMinutesFromMidnight = endHour * 60 + endMinute;

      // If effectiveEnd is exactly at dayEnd (00:00 of next day), treat as 24:00
      if (effectiveEnd.getTime() === dayEnd.getTime()) {
        endMinutesFromMidnight = 24 * 60; // 1440 minutes = 24:00
      }

      const durationMinutes = endMinutesFromMidnight - startMinutesFromMidnight;

      if (durationMinutes <= 0) return;

      const topPosition = headerHeight + (startMinutesFromMidnight / 60) * hourHeight;
      const height = (durationMinutes / 60) * hourHeight;

      const eventBlock = document.createElement('div');
      eventBlock.className = 'tt-event-block';

      const blockColor = getCategoryColorByName(event.calendarName, event.color);
      const textColor = getCategoryTextColorByName(event.calendarName);
      const bgColor = hexToRgba(blockColor, 0.35);

      Object.assign(eventBlock.style, {
        background: bgColor,
        color: textColor,
        borderLeftColor: blockColor,
        top: topPosition + 'px',
        height: Math.max(height, 8) + 'px',
        position: 'absolute',
        left: '2px',
        right: '2px'
      });

      // Create tooltip element that appears on hover
      const tooltip = document.createElement('div');
      tooltip.className = 'tt-event-tooltip';

      const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      tooltip.innerHTML = `
        <div class="tt-tooltip-title">${event.title}</div>
        <div class="tt-tooltip-time">${startTime} - ${endTime}</div>
      `;

      eventBlock.appendChild(tooltip);
      dayColumn.appendChild(eventBlock);
    });
  };

  const renderTimeTracker = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = getLocalDateString(new Date());
    const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return (
      <div className="monthly-timetracker-wrapper">
        <div className="tt-hover-line" id="tt-hover-line"></div>
        <div className="monthly-timetracker" ref={trackerRef}>
          {/* 시간 열 */}
          <div className="tt-time-column">
            <div className="tt-time-header">시간</div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="tt-hour-cell tt-time-cell">
                {String(hour).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* 날짜 열들 */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(year, month - 1, day);
            const dateKey = getLocalDateString(date);
            const weekday = date.getDay();
            const isToday = dateKey === today;
            const isWeekend = weekday === 0 || weekday === 6;

            return (
              <div
                key={day}
                className={`tt-day-column ${isWeekend ? 'weekend' : ''}`}
                style={{
                  gridColumn: day + 1,
                  gridRow: '1 / -1'
                }}
              >
                <div
                  className={`tt-date-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                  onClick={() => goToDate(dateKey)}
                >
                  <div className="tt-date-day">{day}</div>
                  <div className="tt-date-weekday">{weekdayNames[weekday]}</div>
                </div>

                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="tt-hour-cell"
                    data-hour={hour}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="monthly-timetracker-wrapper">
        <div className="monthly-loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">시간 추적 데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monthly-timetracker-wrapper">
        <div className="loading" style={{ color: '#eb5757' }}>
          오류: {error}
        </div>
      </div>
    );
  }

  return renderTimeTracker();
}

export default MonthlyTimeGrid;
