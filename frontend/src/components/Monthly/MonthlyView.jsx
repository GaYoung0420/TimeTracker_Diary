import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../utils/api';
import MonthlyTimeGrid from './MonthlyTimeGrid';
import MonthlyStats from './MonthlyStats';
import { getLocalDateString } from '../../utils/helpers';

function MonthlyView({ goToDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'time', or 'stats'
  const [loadedImages, setLoadedImages] = useState(new Set());
  const observerRef = useRef(null);

  useEffect(() => {
    loadMonthlyData();
  }, [currentMonth]);

  // Prefetch images when data is loaded
  useEffect(() => {
    if (viewMode === 'calendar' && monthlyData.length > 0) {
      // Prefetch visible images immediately
      const imagesToPrefetch = monthlyData
        .filter(d => d.firstImage && d.firstImage.thumbnailUrl)
        .slice(0, 14) // First two weeks
        .map(d => d.firstImage.thumbnailUrl);

      imagesToPrefetch.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      });
    }
  }, [monthlyData, viewMode]);

  useEffect(() => {
    // Setup Intersection Observer for lazy loading
    if (viewMode === 'calendar') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const src = img.dataset.src;
              if (src && !img.src) {
                // Create a new Image object to preload
                const preloadImg = new Image();
                preloadImg.onload = () => {
                  img.src = src;
                  img.classList.add('loaded');
                };
                preloadImg.onerror = () => {
                  img.classList.add('error');
                };
                preloadImg.src = src;
                observerRef.current.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '300px', // Preload images 300px before they enter viewport (increased for Safari)
          threshold: 0.01
        }
      );

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [viewMode]);

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

  const imageRefCallback = useCallback((node) => {
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

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
                    ref={imageRefCallback}
                    data-src={img.thumbnailUrl}
                    className="monthly-thumbnail"
                    alt="Daily thumbnail"
                    loading="lazy"
                    decoding="async"
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

      {loading && viewMode === 'calendar' ? (
        <div className="loading">로딩 중...</div>
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
