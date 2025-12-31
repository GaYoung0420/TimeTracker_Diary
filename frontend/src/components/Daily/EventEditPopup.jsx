import { useState, useRef, useEffect } from 'react';
import './EventEditPopup.css';

function EventEditPopup({ event, categories, position, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(event.title);
  const [startDate, setStartDate] = useState(event.date || event.start.split('T')[0]);
  const [startTime, setStartTime] = useState(event.start_time || event.start.split('T')[1].substring(0, 5));
  const [endDate, setEndDate] = useState(event.date || event.end.split('T')[0]);
  const [endTime, setEndTime] = useState(event.end_time || event.end.split('T')[1].substring(0, 5));
  const [categoryId, setCategoryId] = useState(event.category_id);
  const [isPlan, setIsPlan] = useState(event.is_plan || false);
  const popupRef = useRef(null);

  // Auto-focus title input when popup opens
  useEffect(() => {
    const titleInput = popupRef.current?.querySelector('input[type="text"]');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, startDate, startTime, endDate, endTime, categoryId, isPlan]);

  const handleSave = () => {
    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    onUpdate(event.id, {
      title,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      date: startDate,
      category_id: categoryId,
      is_plan: isPlan
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleDelete = () => {
    if (window.confirm('이 이벤트를 삭제하시겠습니까?')) {
      onDelete(event.id);
    }
  };

  return (
    <div
      ref={popupRef}
      className="event-edit-popup"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="popup-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="이벤트 제목"
          className="popup-title-input"
        />
      </div>

      <div className="popup-row">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(parseInt(e.target.value))}
          className="popup-category-select"
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="popup-divider"></div>

      <div className="popup-row time-row">
        <span className="time-label">시작</span>
        <div className="popup-time-input-group">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="popup-date-input"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="popup-time-input"
          />
        </div>
      </div>
      <div className="popup-row time-row">
        <span className="time-label">종료</span>
        <div className="popup-time-input-group">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="popup-date-input"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="popup-time-input"
          />
        </div>
      </div>

      <div className="popup-divider"></div>

      <div className="popup-row toggle-row">
        <span className="popup-label">계획 여부</span>
        <label className="popup-toggle">
          <input 
            type="checkbox" 
            checked={isPlan} 
            onChange={(e) => setIsPlan(e.target.checked)} 
          />
          <span className="popup-toggle-slider"></span>
        </label>
      </div>

      <div className="popup-actions">
        {event.id && (
          <button onClick={handleDelete} className="popup-btn-delete">
            삭제
          </button>
        )}
        <button onClick={handleSave} className="popup-btn-save">
          저장
        </button>
      </div>
    </div>
  );
}

export default EventEditPopup;
