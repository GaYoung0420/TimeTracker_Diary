import React, { useState, useEffect, useRef } from 'react';

const CategoryLineChart = ({ dailyStats, categories, currentMonth, height = 300 }) => {
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hiddenCategories, setHiddenCategories] = useState(new Set());

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const toggleCategory = (catId) => {
    const newHidden = new Set(hiddenCategories);
    if (newHidden.has(catId)) {
      newHidden.delete(catId);
    } else {
      newHidden.add(catId);
    }
    setHiddenCategories(newHidden);
  };

  if (!dailyStats || !categories || categories.length === 0) {
    return (
      <div className="line-chart-placeholder" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        데이터가 없습니다
      </div>
    );
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Filter visible categories
  const visibleCategories = categories.filter(cat => !hiddenCategories.has(cat.id));

  // Prepare data
  let maxMinutes = 0;
  const categoryData = visibleCategories.map(cat => {
    const points = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const minutes = (dailyStats[dateKey] && dailyStats[dateKey][cat.id]) || 0;
      points.push({ day, minutes, dateKey });
      if (minutes > maxMinutes) maxMinutes = minutes;
    }
    return { ...cat, points };
  });

  // Add some padding to maxMinutes
  maxMinutes = Math.max(maxMinutes, 60); // At least 1 hour
  const yAxisMax = Math.ceil(maxMinutes / 60) * 60; // Round up to nearest hour

  // Dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  // Use chartWidth if available, otherwise fallback (e.g. 600) but we render nothing until width is known to avoid flash
  const effectiveWidth = chartWidth || 600;
  const drawWidth = effectiveWidth - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  // Scales
  const xScale = (day) => ((day - 1) / (daysInMonth - 1)) * drawWidth;
  const yScale = (minutes) => drawHeight - (minutes / yAxisMax) * drawHeight;

  // Generate paths
  const paths = categoryData.map(cat => {
    const d = cat.points.map((p, i) => {
      const x = xScale(p.day);
      const y = yScale(p.minutes);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    return { ...cat, d };
  });

  // Generate Y-axis ticks (hours)
  const yTicks = [];
  const hourStep = Math.max(1, Math.ceil(yAxisMax / 60 / 5)); // At least 1 hour step, aim for ~5 ticks
  for (let m = 0; m <= yAxisMax; m += hourStep * 60) {
    yTicks.push(m);
  }

  // Generate X-axis ticks (every 5 days)
  const xTicks = [];
  for (let d = 1; d <= daysInMonth; d += 5) {
    xTicks.push(d);
  }

  return (
    <div className="category-line-chart" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {chartWidth > 0 && (
        <svg width={effectiveWidth} height={height}>
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Grid Lines (Y) */}
            {yTicks.map(m => (
              <line
                key={`grid-y-${m}`}
                x1={0}
                y1={yScale(m)}
                x2={drawWidth}
                y2={yScale(m)}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* Axes */}
            <line x1={0} y1={0} x2={0} y2={drawHeight} stroke="#e2e8f0" strokeWidth="1" />
            <line x1={0} y1={drawHeight} x2={drawWidth} y2={drawHeight} stroke="#e2e8f0" strokeWidth="1" />

            {/* Y-axis Labels */}
            {yTicks.map(m => (
              <text
                key={`label-y-${m}`}
                x={-10}
                y={yScale(m)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="#94a3b8"
                fontWeight="500"
              >
                {m / 60}h
              </text>
            ))}

            {/* X-axis Labels */}
            {xTicks.map(d => (
              <text
                key={`label-x-${d}`}
                x={xScale(d)}
                y={drawHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
                fontWeight="500"
              >
                {d}
              </text>
            ))}

            {/* Lines */}
            {paths.map(cat => (
              <path
                key={`line-${cat.id}`}
                d={cat.d}
                fill="none"
                stroke={cat.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={hoveredPoint && hoveredPoint.catId !== cat.id ? 0.2 : 0.9}
                style={{ transition: 'opacity 0.2s ease' }}
              />
            ))}

            {/* Points (Vertices) */}
            {categoryData.map(cat => (
              <g key={`points-${cat.id}`}>
                {cat.points.map((p, i) => {
                  if (p.minutes === 0) return null; 
                  const x = xScale(p.day);
                  const y = yScale(p.minutes);
                  const isHovered = hoveredPoint && hoveredPoint.catId === cat.id && hoveredPoint.day === p.day;
                  
                  return (
                    <circle
                      key={`point-${cat.id}-${i}`}
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 3.5}
                      fill={cat.color}
                      stroke="#fff"
                      strokeWidth={isHovered ? 3 : 2}
                      onMouseEnter={() => setHoveredPoint({ x: x + padding.left, y: y + padding.top, ...p, catName: cat.name, color: cat.color, catId: cat.id })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    />
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      )}

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: hoveredPoint.x,
            top: hoveredPoint.y - 10,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1e293b',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: `1px solid ${hoveredPoint.color}`,
            marginBottom: '8px'
          }}
        >
          <div style={{ fontWeight: '600', color: hoveredPoint.color, marginBottom: '2px' }}>{hoveredPoint.catName}</div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            {hoveredPoint.day}일: <span style={{ color: '#1e293b', fontWeight: '500' }}>{Math.floor(hoveredPoint.minutes / 60)}시간 {hoveredPoint.minutes % 60}분</span>
          </div>
          <div style={{ 
            position: 'absolute', 
            bottom: '-5px', 
            left: '50%', 
            transform: 'translateX(-50%) rotate(45deg)', 
            width: '10px', 
            height: '10px', 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRight: `1px solid ${hoveredPoint.color}`,
            borderBottom: `1px solid ${hoveredPoint.color}`,
            zIndex: -1
          }}></div>
        </div>
      )}
      
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px', gap: '16px' }}>
        {categories.map(cat => {
          const isHidden = hiddenCategories.has(cat.id);
          return (
            <div 
              key={cat.id} 
              onClick={() => toggleCategory(cat.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontSize: '13px', 
                color: isHidden ? '#cbd5e1' : '#475569',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '4px 8px',
                borderRadius: '16px',
                backgroundColor: isHidden ? 'transparent' : '#f8fafc',
                border: `1px solid ${isHidden ? 'transparent' : '#e2e8f0'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ 
                width: '10px', 
                height: '10px', 
                backgroundColor: isHidden ? '#cbd5e1' : cat.color, 
                borderRadius: '50%', 
                marginRight: '8px',
                boxShadow: isHidden ? 'none' : `0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 3px ${cat.color}`
              }}></div>
              <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{cat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryLineChart;
