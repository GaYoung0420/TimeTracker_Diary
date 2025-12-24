import { useState, useRef } from 'react';
import { formatKoreanTime, getCategoryColorByName, getCategoryTextColorByName, hexToRgba, getLocalDateString } from '../../utils/helpers';
import EventEditModal from './EventEditModal';

function Timeline({ events, categories, loading, currentDate, onCreateEvent, onUpdateEvent, onDeleteEvent, getWakeSleepTimes }) {
  const hourHeight = 40;
  const [isCreating, setIsCreating] = useState(false);
  const [creatingColumn, setCreatingColumn] = useState(null); // 'plan' or 'actual'
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const timelineRef = useRef(null);

  if (loading) {
    return (
      <div className="timeline-wrapper">
        <div className="timeline-loading">
          <div className="loading-spinner"></div>
          <p>이벤트 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const renderWakeSleepTimes = () => {
    const { wakeTime, sleepTime } = getWakeSleepTimes();

    return (
      <div className="wake-sleep-container">
        <div className="wake-sleep-item">
          🌅 기상: <span className="time-value">{wakeTime}</span>
        </div>
        <div className="wake-sleep-item">
          🌙 취침: <span className="time-value">{sleepTime}</span>
        </div>
      </div>
    );
  };

  const handleMouseDown = (e, column) => {
    if (e.target.className.includes('event-block')) return; // Don't create if clicking on event

    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor((y / hourHeight) * 60);

    setIsCreating(true);
    setCreatingColumn(column);
    setDragStart(minutes);
    setDragEnd(minutes);
  };

  const handleMouseMove = (e) => {
    if (!isCreating) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor((y / hourHeight) * 60);

    setDragEnd(minutes);
  };

  const handleMouseUp = async () => {
    if (!isCreating) return;

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    // Minimum 15 minutes
    if (end - start < 15) {
      setIsCreating(false);
      return;
    }

    const startHour = Math.floor(start / 60);
    const startMinute = start % 60;
    const endHour = Math.floor(end / 60);
    const endMinute = end % 60;

    const start_time = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
    const end_time = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

    // Determine category based on column
    const category = creatingColumn === 'plan' ? 'plan' : 'other';

    try {
      await onCreateEvent('새 이벤트', start_time, end_time, category, '');
    } catch (error) {
      console.error('Failed to create event:', error);
    }

    setIsCreating(false);
    setDragStart(null);
    setDragEnd(null);
    setCreatingColumn(null);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleEventUpdate = async (id, updates) => {
    try {
      await onUpdateEvent(id, updates);
      setShowEditModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleEventDelete = async (id) => {
    try {
      await onDeleteEvent(id);
      setShowEditModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const renderEventBlock = (event) => {
    const [dateStr, timeStr] = event.start.split('T');
    const [endDateStr, endTimeStr] = event.end.split('T');

    const [startHour, startMinute] = timeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) return null;

    const topPosition = (startMinutes / 60) * hourHeight;
    const height = (durationMinutes / 60) * hourHeight;

    // Get category info
    const categoryInfo = categories.find(c => c.id === event.category) || { color: '#9E9E9E', name: '기타' };
    const blockColor = categoryInfo.color;
    const bgColor = hexToRgba(blockColor, 0.35);

    const displayStartTime = timeStr.substring(0, 5);
    const displayEndTime = endTimeStr.substring(0, 5);

    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    const durationText = durationHours > 0
      ? `${durationHours}시간 ${durationMins}분`
      : `${durationMins}분`;

    return (
      <div
        key={event.id}
        className="event-block-absolute"
        style={{
          background: bgColor,
          color: '#000',
          top: `${topPosition}px`,
          height: `${Math.max(height, 20)}px`,
          cursor: 'pointer'
        }}
        onClick={() => handleEventClick(event)}
        title={`${event.title}\n${displayStartTime} - ${displayEndTime}\n${durationText}`}
      >
        <div className="event-title">{event.title}</div>
        <div className="event-time">
          {displayStartTime} - {displayEndTime}
        </div>
      </div>
    );
  };

  const renderDragPreview = () => {
    if (!isCreating) return null;

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    const topPosition = (start / 60) * hourHeight;
    const height = ((end - start) / 60) * hourHeight;

    return (
      <div
        className="event-block-absolute"
        style={{
          background: 'rgba(66, 133, 244, 0.3)',
          border: '2px dashed #4285F4',
          top: `${topPosition}px`,
          height: `${Math.max(height, 20)}px`,
          pointerEvents: 'none'
        }}
      >
        <div className="event-title">새 이벤트</div>
      </div>
    );
  };

  // Separate events by category
  const planEvents = events.filter(e => e.category === 'plan');
  const actualEvents = events.filter(e => e.category !== 'plan');

  return (
    <>
      {renderWakeSleepTimes()}

      <div className="timeline-grid">
        <div className="timeline-header">
          <div>계획</div>
          <div>시간</div>
          <div>실제</div>
        </div>

        <div
          ref={timelineRef}
          className="timeline-wrapper"
          style={{ minHeight: `${24 * hourHeight}px` }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsCreating(false)}
        >
          <div className="timeline-columns">
            <div
              className="timeline-column plan-column"
              onMouseDown={(e) => handleMouseDown(e, 'plan')}
            >
              {planEvents.map(renderEventBlock)}
              {isCreating && creatingColumn === 'plan' && renderDragPreview()}
            </div>
            <div className="timeline-column time-column"></div>
            <div
              className="timeline-column actual-column"
              onMouseDown={(e) => handleMouseDown(e, 'actual')}
            >
              {actualEvents.map(renderEventBlock)}
              {isCreating && creatingColumn === 'actual' && renderDragPreview()}
            </div>
          </div>

          <div className="time-markers">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="time-marker-row" style={{ height: `${hourHeight}px` }}>
                <div></div>
                <div className="time-marker-label">{String(hour).padStart(2, '0')}</div>
                <div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEditModal && selectedEvent && (
        <EventEditModal
          event={selectedEvent}
          categories={categories}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </>
  );
}

export default Timeline;
