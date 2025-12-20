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

        // DOM 렌더링 완료 후 이벤트 렌더링
        requestAnimationFrame(() => {
          renderAllEvents(result.data.days);
        });
      } else {
        setError(result.error || '데이터 로드 실패');
      }
    } catch (error) {
      console.error('Failed to load monthly time data:', error);
      setError(error.message || '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const renderAllEvents = (days) => {
    if (!trackerRef.current) return;

    const dayColumns = trackerRef.current.querySelectorAll('.tt-day-column');

    console.log(`총 ${days.length}일 데이터, ${dayColumns.length}개 컬럼`);

    days.forEach((dayData) => {
      if (dayData.events && dayData.events.length > 0) {
        // dayColumns[0]부터 1일, 2일, 3일... 순서
        const dayColumn = dayColumns[dayData.date - 1];
        if (dayColumn) {
          console.log(`${dayData.date}일: ${dayData.events.length}개 이벤트 렌더링`);
          renderDayEventsAbsolute(dayColumn, dayData.events);
        }
      }
    });

    console.log(`✅ 타임트래커 렌더링 완료: ${days.length}일`);
  };

  const renderDayEventsAbsolute = (dayColumn, events) => {
    const headerElement = dayColumn.querySelector('.tt-date-header');
    const firstHourCell = dayColumn.querySelector('.tt-hour-cell');

    if (!headerElement || !firstHourCell) return;

    const headerHeight = headerElement.offsetHeight;
    const hourHeight = firstHourCell.offsetHeight;

    events.forEach(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      const startHour = start.getHours();
      const startMinute = start.getMinutes();
      const endHour = end.getHours();
      const endMinute = end.getMinutes();

      const startMinutesFromMidnight = startHour * 60 + startMinute;
      const endMinutesFromMidnight = endHour * 60 + endMinute;
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

      const title = document.createElement('div');
      title.className = 'tt-event-title';
      title.textContent = event.title;

      eventBlock.appendChild(title);

      const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      eventBlock.title = `${event.title}\n${startTime} - ${endTime}`;

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
        <div className="loading">데이터 로딩 중...</div>
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
