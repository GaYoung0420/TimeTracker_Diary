function CategoryStats({ events }) {
  // 고정된 카테고리 정의 (순서대로)
  const FIXED_CATEGORIES = [
    { name: '① 낭비시간', color: '#D13F3F', number: 1 },
    { name: '② 사회적', color: '#A78400', number: 2 },
    { name: '③ 지적', color: '#1E7B34', number: 3 },
    { name: '④ 영적', color: '#C46C00', number: 4 },
    { name: '⑤ 잠', color: '#4A4AC4', number: 5 },
    { name: '⑥ 운동', color: '#008C99', number: 6 },
    { name: '⑦ 기타', color: '#654321', number: 7 }
  ];

  // 카테고리별 시간 계산
  const calculateCategoryStats = () => {
    // 모든 카테고리를 0으로 초기화
    const stats = {};
    FIXED_CATEGORIES.forEach(cat => {
      stats[cat.name] = {
        hours: 0,
        color: cat.color,
        number: cat.number
      };
    });

    // 이벤트가 있으면 시간 계산
    if (events && events.length > 0) {
      events.forEach(event => {
        const calendarName = event.calendarName || 'Unknown';
        const start = new Date(event.start);
        const end = new Date(event.end);
        const duration = (end - start) / (1000 * 60 * 60); // 시간 단위

        // 매칭되는 카테고리가 있으면 시간 추가
        if (stats[calendarName]) {
          stats[calendarName].hours += duration;
        }
      });
    }

    return stats;
  };

  const stats = calculateCategoryStats();

  return (
    <div className="category-stats-container">
      <div className="section-header">📊 카테고리별 시간</div>

      <div className="category-matrix-wrapper">
        <table className="category-matrix">
          <thead>
            <tr>
              <th></th>
              {FIXED_CATEGORIES.map(cat => (
                <th key={cat.name}>
                  <span
                    className="category-color-dot"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span style={{ color: cat.color, fontWeight: 'inherit' }}>{cat.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>시간</th>
              {FIXED_CATEGORIES.map(cat => (
                <td key={cat.name}>
                  <span className="category-time">
                    {stats[cat.name].hours.toFixed(1)}h
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
