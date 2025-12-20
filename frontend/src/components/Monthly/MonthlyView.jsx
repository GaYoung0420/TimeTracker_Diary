import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import MonthlyTimeGrid from './MonthlyTimeGrid';

function MonthlyView({ goToDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'time'

  useEffect(() => {
    loadMonthlyData();
  }, [currentMonth]);

  const loadMonthlyData = async () => {
    setLoading(true);
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
      setLoading(false);
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
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date().toISOString().split('T')[0];

    return (
      <div className="monthly-grid">
        {weekdays.map(day => (
          <div key={day} className="monthly-day-header">{day}</div>
        ))}

        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="monthly-day-cell empty"></div>
        ))}

        {monthlyData.map(dayData => (
          <div
            key={dayData.dateKey}
            className={`monthly-day-cell ${dayData.dateKey === today ? 'today' : ''}`}
            onClick={() => goToDate(dayData.dateKey)}
          >
            <div className="monthly-date-num">{dayData.date}</div>
            {dayData.firstImage && (
              <img
                src={dayData.firstImage.thumbnailUrl}
                className="monthly-thumbnail"
                alt="Daily thumbnail"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="monthly-container">
      <div className="monthly-header">
        <button className="month-nav-btn" onClick={() => changeMonth(-1)}>◀</button>
        <div className="current-month">{formatMonth()}</div>
        <button className="month-nav-btn" onClick={() => changeMonth(1)}>▶</button>
      </div>

      <div className="view-mode-selector">
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
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <>
          {viewMode === 'calendar' && renderCalendarGrid()}
          {viewMode === 'time' && <MonthlyTimeGrid currentMonth={currentMonth} goToDate={goToDate} />}
        </>
      )}
    </div>
  );
}

export default MonthlyView;
