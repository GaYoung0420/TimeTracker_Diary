function CategoryStats({ events, categories, onOpenSettings, currentDate }) {
  // 카테고리별 시간 계산 (실제 이벤트만)
  const calculateCategoryStats = () => {
    // 모든 카테고리를 0으로 초기화
    const stats = {};

    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        stats[cat.id] = {
          name: cat.name,
          hours: 0,
          color: cat.color
        };
      });
    }

    // 실제 이벤트만 필터링 (is_plan = false)
    const actualEvents = events.filter(e => e.is_plan === false);

    // Parse ISO string as local time (ignore timezone offset)
    const parseLocalTime = (isoString) => {
      if (!isoString) return new Date();
      const localIso = isoString.split(/[+Z]/)[0];
      return new Date(localIso);
    };

    // 현재 날짜의 시작/끝 시간
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 이벤트가 있으면 시간 계산
    if (actualEvents && actualEvents.length > 0) {
      actualEvents.forEach(event => {
        const categoryId = event.category_id;

        if (categoryId && stats[categoryId]) {
          // Parse start and end times as local time (ignore timezone)
          const eventStart = parseLocalTime(event.start);
          const eventEnd = parseLocalTime(event.end);

          // 현재 날짜에 해당하는 시간만 계산
          const effectiveStart = eventStart > dayStart ? eventStart : dayStart;
          const effectiveEnd = eventEnd < dayEnd ? eventEnd : dayEnd;

          // 음수 방지
          if (effectiveEnd > effectiveStart) {
            const duration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60); // 시간 단위
            stats[categoryId].hours += duration;
          }
        }
      });
    }

    return stats;
  };

  const stats = calculateCategoryStats();
  const categoryList = categories || [];

  return (
    <div className="category-stats-container">
      <div className="section-header">
        <span>📊 카테고리별 시간 (실제)</span>
        <button
          className="btn-category-settings-small"
          onClick={onOpenSettings}
          title="카테고리 관리"
        >
          ⚙️
        </button>
      </div>

      <div className="category-matrix-wrapper">
        <table className="category-matrix">
          <thead>
            <tr>
              <th></th>
              {categoryList.map(cat => (
                <th key={cat.id} style={{ borderBottom: `3px solid ${cat.color}`, color: '#37352f' }}>
                  {cat.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>시간</th>
              {categoryList.map(cat => (
                <td key={cat.id} style={{ borderBottom: `3px solid ${cat.color}`, color: '#37352f' }}>
                  <span className="category-time">
                    {stats[cat.id] ? stats[cat.id].hours.toFixed(1) : '0.0'}h
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CategoryStats;
