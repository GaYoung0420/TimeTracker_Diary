import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getLocalDateString } from '../../utils/helpers';

function MonthlyStats({ currentMonth, goToDate }) {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, [currentMonth]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const result = await api.getMonthlyRoutineMoodStats(year, month);

      if (result.success) {
        setStatsData(result.data);
      } else {
        setError(result.error || '데이터 로드 실패');
      }
    } catch (error) {
      console.error('Failed to load monthly stats:', error);
      setError(error.message || '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const renderRoutineTable = () => {
    if (!statsData || !statsData.routineStats || statsData.routineStats.length === 0) {
      return <div className="no-data">루틴 데이터가 없습니다</div>;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return (
      <div className="stats-table-wrapper">
        <table className="stats-table">
          <thead>
            <tr>
              <th className="routine-name-col">루틴</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(year, month - 1, day);
                const weekday = date.getDay();
                const isWeekend = weekday === 0 || weekday === 6;
                const today = getLocalDateString(new Date());
                const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateKey === today;

                return (
                  <th
                    key={day}
                    className={`day-col ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => goToDate(dateKey)}
                  >
                    <div className="day-num">{day}</div>
                    <div className="day-weekday">{weekdayNames[weekday]}</div>
                  </th>
                );
              })}
              <th className="percentage-col">수행률</th>
            </tr>
          </thead>
          <tbody>
            {statsData.routineStats.map(routine => (
              <tr key={routine.id}>
                <td className="routine-name">{routine.text}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isChecked = routine.dailyStatus[dateKey];
                  const date = new Date(year, month - 1, day);
                  const weekday = date.getDay();
                  const isWeekend = weekday === 0 || weekday === 6;

                  // Check if date is in the future
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const cellDate = new Date(year, month - 1, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const isFuture = cellDate > today;

                  return (
                    <td
                      key={day}
                      className={`status-cell ${isWeekend ? 'weekend' : ''} ${isFuture ? 'future' : ''}`}
                      onClick={() => goToDate(dateKey)}
                    >
                      {isFuture ? '' : (isChecked ? '🔵' : '❌')}
                    </td>
                  );
                })}
                <td className="percentage-cell">
                  <div className="percentage-bar-wrapper">
                    <div
                      className="percentage-bar"
                      style={{ width: `${routine.percentage}%` }}
                    ></div>
                    <span className="percentage-text">{routine.percentage}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMoodPieChart = () => {
    if (!statsData || !statsData.moodStats) {
      return <div className="no-data">기분 데이터가 없습니다</div>;
    }

    const { counts, percentages, total, labels } = statsData.moodStats;
    const moodColors = {
      'Good': '#a8e6cf',
      'SoSo': '#ffd3b6',
      'Bad': '#ffaaa5'
    };

    // Calculate pie chart segments
    let currentAngle = -90; // Start from top
    const segments = [];

    Object.keys(counts).forEach(mood => {
      if (counts[mood] > 0) {
        const percentage = percentages[mood];
        const angle = (percentage / 100) * 360;
        segments.push({
          mood,
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          percentage,
          count: counts[mood],
          color: moodColors[mood],
          label: labels[mood]
        });
        currentAngle += angle;
      }
    });

    // Create SVG pie chart
    const createPieSlice = (segment) => {
      const { startAngle, endAngle, color } = segment;
      const radius = 80;
      const centerX = 100;
      const centerY = 100;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      return pathData;
    };

    // Calculate label position for each segment
    const getLabelPosition = (segment) => {
      const { startAngle, endAngle } = segment;
      const midAngle = (startAngle + endAngle) / 2;
      const radius = 55; // Position label at 55% of radius from center
      const centerX = 100;
      const centerY = 100;

      const midRad = (midAngle * Math.PI) / 180;
      const x = centerX + radius * Math.cos(midRad);
      const y = centerY + radius * Math.sin(midRad);

      return { x, y };
    };

    return (
      <div className="mood-pie-container">
        <div className="pie-chart-wrapper">
          <svg viewBox="0 0 200 200" className="pie-chart">
            {segments.map((segment, index) => (
              <g key={index}>
                <path
                  d={createPieSlice(segment)}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                />
                {segment.percentage > 0 && (
                  <text
                    x={getLabelPosition(segment).x}
                    y={getLabelPosition(segment).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#333"
                    fontSize="10"
                    fontWeight="600"
                  >
                    <tspan x={getLabelPosition(segment).x} dy="-5">{segment.label}</tspan>
                    <tspan x={getLabelPosition(segment).x} dy="12">{segment.percentage}%</tspan>
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div className="pie-legend">
          {segments.map((segment, index) => (
            <div key={index} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: segment.color }}
              ></div>
              <div className="legend-label">
                {segment.label}: {segment.count}일 ({segment.percentage}%)
              </div>
            </div>
          ))}
          <div className="mood-total">총 기록일: {total}일</div>
        </div>
      </div>
    );
  };

  const renderMoodLineGraph = () => {
    if (!statsData || !statsData.dailyMoods) {
      return <div className="no-data">기분 데이터가 없습니다</div>;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    const moodValues = {
      'Good': 2,
      'SoSo': 1,
      'Bad': 0
    };

    // Create data for all days
    const allDaysData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mood = statsData.dailyMoods[dateKey];
      allDaysData.push({
        day,
        mood,
        value: mood ? moodValues[mood] : null
      });
    }

    // Filter data points with mood for drawing line
    const dataPoints = allDaysData.filter(d => d.mood !== undefined);

    if (dataPoints.length === 0) {
      return <div className="no-data">기분 데이터가 없습니다</div>;
    }

    return (
      <div className="mood-table-graph-wrapper">
        <table className="mood-table-graph">
          <thead>
            <tr>
              <th className="mood-row-label"></th>
              {allDaysData.map(({ day }) => (
                <th key={day} className="day-header">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {['Good', 'SoSo', 'Bad'].map((moodLevel, rowIndex) => (
              <tr key={moodLevel} className="mood-row">
                <td className="mood-label-cell">
                  {moodLevel === 'Good' ? '😊 Good' : moodLevel === 'SoSo' ? '😐 SoSo' : '😢 Bad'}
                </td>
                {allDaysData.map(({ day, mood }, colIndex) => {
                  const isCurrentMood = mood === moodLevel;
                  const prevDayData = colIndex > 0 ? allDaysData[colIndex - 1] : null;
                  const nextDayData = colIndex < allDaysData.length - 1 ? allDaysData[colIndex + 1] : null;

                  // Determine if we should draw lines from this cell
                  let drawLineFromPrev = false;
                  let drawLineToNext = false;
                  let lineFromPrevY = 50;
                  let lineToNextY = 50;

                  // Only draw lines if current cell has a mood
                  if (mood) {
                    // Check if we need to draw line from previous day
                    if (prevDayData && prevDayData.mood) {
                      // We're in the row of current day's mood
                      if (mood === moodLevel) {
                        drawLineFromPrev = true;
                        const prevMoodRow = moodValues[prevDayData.mood];
                        const currentMoodRow = moodValues[mood];
                        // Calculate Y position: row difference * 100 (cell height in viewBox)
                        lineFromPrevY = 50 + (prevMoodRow - currentMoodRow) * 100;
                      }
                    }

                    // Check if we need to draw line to next day
                    if (nextDayData && nextDayData.mood) {
                      // We're in the row of current day's mood
                      if (mood === moodLevel) {
                        drawLineToNext = true;
                        const nextMoodRow = moodValues[nextDayData.mood];
                        const currentMoodRow = moodValues[mood];
                        // Calculate Y position
                        lineToNextY = 50 + (nextMoodRow - currentMoodRow) * 100;
                      }
                    }
                  }

                  return (
                    <td key={day} className={`mood-cell ${isCurrentMood ? 'active' : ''}`}>
                      <div className="cell-content">
                        {isCurrentMood && <div className="mood-dot"></div>}
                        {drawLineFromPrev && (
                          <svg className="line-svg line-from-prev" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line
                              x1="0"
                              y1={lineFromPrevY}
                              x2="50"
                              y2="50"
                              stroke="#333"
                              strokeWidth="3"
                            />
                          </svg>
                        )}
                        {drawLineToNext && (
                          <svg className="line-svg line-to-next" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line
                              x1="50"
                              y1="50"
                              x2="100"
                              y2={lineToNextY}
                              stroke="#333"
                              strokeWidth="3"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRoutineBarChart = () => {
    if (!statsData || !statsData.routineStats || statsData.routineStats.length === 0) {
      return <div className="no-data">루틴 데이터가 없습니다</div>;
    }

    const routines = statsData.routineStats;

    // Get color based on percentage
    const getBarColor = (percentage) => {
      if (percentage >= 70) {
        return '#a8e6cf'; // High - mint green (same as Good mood)
      } else if (percentage >= 40) {
        return '#ffd3b6'; // Medium - peach orange (same as SoSo mood)
      } else {
        return '#ffaaa5'; // Low - coral pink (same as Bad mood)
      }
    };

    return (
      <div className="routine-bar-chart">
        {routines.map((routine, index) => (
          <div key={index} className="routine-bar-item">
            <div className="routine-bar-label">{routine.text}</div>
            <div className="routine-bar-container">
              <div
                className="routine-bar-fill"
                style={{
                  width: `${routine.percentage}%`,
                  backgroundColor: getBarColor(routine.percentage)
                }}
              >
                <span className="routine-bar-percentage">{routine.percentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMoodTable = () => {
    if (!statsData || !statsData.dailyMoods) {
      return <div className="no-data">기분 데이터가 없습니다</div>;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const moodEmojis = {
      'Good': '😊',
      'SoSo': '😐',
      'Bad': '😢'
    };
    const moodColors = {
      'Good': '#a8e6cf',
      'SoSo': '#ffd3b6',
      'Bad': '#ffaaa5'
    };

    return (
      <div className="mood-table-wrapper">
        <table className="mood-table">
          <thead>
            <tr>
              <th className="mood-label-col">날짜</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(year, month - 1, day);
                const weekday = date.getDay();
                const isWeekend = weekday === 0 || weekday === 6;
                const today = getLocalDateString(new Date());
                const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateKey === today;

                return (
                  <th
                    key={day}
                    className={`day-col ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => goToDate(dateKey)}
                  >
                    <div className="day-num">{day}</div>
                    <div className="day-weekday">{weekdayNames[weekday]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {['Good', 'SoSo', 'Bad'].map((moodLevel) => (
              <tr key={moodLevel}>
                <td className="mood-label">{moodEmojis[moodLevel]} {moodLevel}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const mood = statsData.dailyMoods[dateKey];
                  const date = new Date(year, month - 1, day);
                  const weekday = date.getDay();
                  const isWeekend = weekday === 0 || weekday === 6;

                  // Normalize mood value to match case (data comes as lowercase)
                  const normalizedMood = mood ? mood.charAt(0).toUpperCase() + mood.slice(1).toLowerCase() : null;
                  // Special case for "soso" -> "SoSo"
                  const displayMood = normalizedMood === 'Soso' ? 'SoSo' : normalizedMood;
                  const isChecked = displayMood === moodLevel;

                  // Apply background color only to cells with emoji (checked cells)
                  const cellStyle = isChecked ? { backgroundColor: moodColors[moodLevel] } : {};

                  return (
                    <td
                      key={day}
                      className={`mood-cell ${isWeekend ? 'weekend' : ''} ${isChecked ? 'checked' : ''}`}
                      onClick={() => goToDate(dateKey)}
                      title={`${dateKey}: ${mood || '없음'}`}
                      style={cellStyle}
                    >
                      {isChecked ? moodEmojis[moodLevel] : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="monthly-stats-wrapper">
        <div className="loading">통계 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monthly-stats-wrapper">
        <div className="loading" style={{ color: '#eb5757' }}>
          오류: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-stats-wrapper">
      <div className="stats-section stats-half">
          <h3 className="stats-section-title">📈 루틴 수행률</h3>
          {renderRoutineBarChart()}
        </div>
        
      <div className="stats-row">
        <div className="stats-section stats-half">
          <h3 className="stats-section-title">😊 기분 통계</h3>
          {renderMoodPieChart()}
        </div>

        
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">📊 루틴 수행 현황</h3>
        {renderRoutineTable()}
      </div>

      <div className="stats-section">
        <h3 className="stats-section-title">📅 기분 달력</h3>
        {renderMoodTable()}
      </div>

      
    </div>
  );
}

export default MonthlyStats;
