import { useState, useEffect, useRef } from 'react';
import './EventEditBottomSheet.css';

function EventEditBottomSheet({ event, categories, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(event.title || '');
  const [startDate, setStartDate] = useState(event.date || event.start.split('T')[0]);
  const [startTime, setStartTime] = useState(event.start_time || event.start.split('T')[1].substring(0, 5));
  const [endDate, setEndDate] = useState(event.date || event.end.split('T')[0]);
  const [endTime, setEndTime] = useState(event.end_time || event.end.split('T')[1].substring(0, 5));
  const [categoryId, setCategoryId] = useState(event.category_id);
  const [isPlan, setIsPlan] = useState(event.is_plan || false);
  const [isSleep, setIsSleep] = useState(event.is_sleep || false);
  
  const sheetRef = useRef(null);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close when clicking outside (on the overlay)
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('event-edit-bottom-sheet-overlay')) {
      onClose();
    }
  };

  const handleSave = () => {
    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    onUpdate(event.id, {
      title: title || '새 이벤트',
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      date: startDate,
      category_id: categoryId,
      is_plan: isPlan,
      is_sleep: isSleep
    });
    onClose();
  };

  return (
    <div className="event-edit-bottom-sheet-overlay" onClick={handleOverlayClick}>
      <div className="event-edit-bottom-sheet" ref={sheetRef}>
        <div className="sheet-header">
          <button className="sheet-btn sheet-btn-cancel" onClick={onClose}>취소</button>
          <span style={{ fontWeight: '600', fontSize: '17px' }}>새로운 이벤트</span>
          <button className="sheet-btn sheet-btn-save" onClick={handleSave}>저장</button>
        </div>

        <input
          type="text"
          className="sheet-title-input"
          placeholder="제목 추가"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="sheet-category-scroll">
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className={`sheet-category-chip ${categoryId === cat.id ? 'selected' : ''}`}
              onClick={() => setCategoryId(cat.id)}
            >
              <div className="sheet-category-dot" style={{ backgroundColor: cat.color }}></div>
              {cat.name}
            </div>
          ))}
        </div>

        <div className="sheet-row">
          <span className="sheet-label">시작</span>
          <div className="sheet-value">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="sheet-time-input"
            />
            <input 
              type="time" 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)}
              className="sheet-time-input"
            />
          </div>
        </div>

        <div className="sheet-row">
          <span className="sheet-label">종료</span>
          <div className="sheet-value">
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="sheet-time-input"
            />
            <input 
              type="time" 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)}
              className="sheet-time-input"
            />
          </div>
        </div>

        <div className="sheet-row">
          <span className="sheet-label">계획 여부</span>
          <label className="sheet-toggle">
            <input
              type="checkbox"
              checked={isPlan}
              onChange={(e) => setIsPlan(e.target.checked)}
            />
            <span className="sheet-toggle-slider"></span>
          </label>
        </div>

        <div className="sheet-row">
          <span className="sheet-label">잠</span>
          <label className="sheet-toggle">
            <input
              type="checkbox"
              checked={isSleep}
              onChange={(e) => setIsSleep(e.target.checked)}
            />
            <span className="sheet-toggle-slider"></span>
          </label>
        </div>

        {event.id && (
          <div className="sheet-row" style={{ marginTop: '20px', borderBottom: 'none' }}>
            <button 
              onClick={() => {
                if (window.confirm('이 이벤트를 삭제하시겠습니까?')) {
                  onDelete(event.id);
                  onClose();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              이벤트 삭제
            </button>
          </div>
        )}
        
        <div className="sheet-row" style={{ marginTop: '10px', borderBottom: 'none', color: '#999', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px' }}>옵션 더보기</span>
        </div>

      </div>
    </div>
  );
}

export default EventEditBottomSheet;
