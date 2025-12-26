import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import MonthlyTimeGrid from './MonthlyTimeGrid';
import MonthlyStats from './MonthlyStats';
import { getLocalDateString } from '../../utils/helpers';

function MonthlyView({ goToDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'time', or 'stats'

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
    const today = getLocalDateString(new Date());

    return (
      <div className="monthly-grid">
        {weekdays.map(day => (
          <div key={day} className="monthly-day-header">{day}</div>
        ))}

        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="monthly-day-cell empty"></div>
        ))}

        {/* Render each day explicitly and look up image by numeric day to avoid formatting or timezone mismatches */}
        {(() => {
          const imagesMap = (monthlyData || []).reduce((acc, d) => {
            // use numeric day as key (d.date) which is guaranteed by backend
            acc[d.date] = d.firstImage;
            return acc;
          }, {});

          return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, idx) => {
            const day = idx + 1;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const img = imagesMap[day];

            return (
              <div
                key={dateKey}
                className={`monthly-day-cell ${dateKey === today ? 'today' : ''}`}
                onClick={() => goToDate(dateKey)}
              >
                <div className="monthly-date-num">{day}</div>
                {img && (
                  <img
                    src={img.thumbnailUrl}
                    className="monthly-thumbnail"
                    alt="Daily thumbnail"
                  />
                )}
              </div>
            );
          });
        })()}
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

      {loading ? (
        <div className="monthly-loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">데이터를 불러오는 중...</div>
        </div>
      ) : (
        <>
          {viewMode === 'calendar' && renderCalendarGrid()}
          {viewMode === 'time' && <MonthlyTimeGrid currentMonth={currentMonth} goToDate={goToDate} />}
          {viewMode === 'stats' && <MonthlyStats currentMonth={currentMonth} goToDate={goToDate} />}
        </>
      )}
    </div>
  );
}

export default MonthlyView;
