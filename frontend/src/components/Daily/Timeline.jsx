import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { formatKoreanTime, getCategoryColorByName, getCategoryTextColorByName, hexToRgba, getLocalDateString } from '../../utils/helpers';
import EventEditModal from './EventEditModal';
import EventEditPopup from './EventEditPopup';

function Timeline({ events, todos, categories, todoCategories, loading, currentDate, onCreateEvent, onUpdateEvent, onDeleteEvent, getWakeSleepTimes }) {
  const hourHeight = 40;
  const [isCreating, setIsCreating] = useState(false);
  const [creatingColumn, setCreatingColumn] = useState(null); // 'plan' or 'actual'
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isDraggingEvent, setIsDraggingEvent] = useState(false);
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [newEventPosition, setNewEventPosition] = useState(null);
  const [originalEventDuration, setOriginalEventDuration] = useState(null); // Store original duration in minutes
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null); // 'top' or 'bottom'
  const [resizingEvent, setResizingEvent] = useState(null);
  const [newResizeStart, setNewResizeStart] = useState(null);
  const [newResizeEnd, setNewResizeEnd] = useState(null);
  const timelineRef = useRef(null);
  const rafRef = useRef(null);
  const lastDragEndRef = useRef(null);
  const eventDragRafRef = useRef(null);
  const resizeRafRef = useRef(null);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Get coordinates from mouse or touch event
  const getEventCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { clientY: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientY: e.changedTouches[0].clientY };
    }
    return { clientY: e.clientY };
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  };

  const handleAddEventClick = () => {
    // Create a new event template
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 10) * 10; // Round to nearest 10 minutes
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const endTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute + 30).padStart(2, '0')}`;

    setSelectedEvent({
      id: null, // null means new event
      title: '',
      start_time: startTime,
      end_time: endTime,
      category_id: categories.length > 0 ? categories[0].id : null,
      description: '',
      is_plan: false // Default to actual event
    });
    setShowEditModal(true);
  };

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
        <button
          className="add-event-button-mobile"
          onClick={handleAddEventClick}
          title="이벤트 추가"
        >
          ➕ 이벤트 추가
        </button>
      </div>
    );
  };

  const handleEventStart = (e, event) => {
    // Disable event dragging on mobile
    if (isMobile()) return;

    // Don't start dragging if already resizing
    if (isResizing) return;

    e.stopPropagation(); // Prevent creating new event
    e.preventDefault(); // Prevent scrolling on touch

    const rect = timelineRef.current.getBoundingClientRect();
    const { clientY } = getEventCoordinates(e);
    const y = clientY - rect.top;

    const currentDayStr = getLocalDateString(currentDate);
    const [startDateStr, timeStr] = event.start.split('T');
    const [startHour, startMinute] = timeStr.split(':').map(Number);
    
    // Calculate actual duration in minutes from event start to end (regardless of date boundaries)
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const actualDuration = Math.round((eventEnd - eventStart) / (1000 * 60));
    
    // Calculate start minutes relative to current day view
    let eventStartMinutes;
    if (startDateStr < currentDayStr) {
      eventStartMinutes = 0; // Started before today, show from 00:00
    } else if (startDateStr > currentDayStr) {
      return; // Starts after today, shouldn't be draggable in this view
    } else {
      eventStartMinutes = startHour * 60 + startMinute;
    }
    
    const eventTopPosition = (eventStartMinutes / 60) * hourHeight;

    // Calculate offset from event top
    const offset = y - eventTopPosition;

    setIsDraggingEvent(true);
    setDraggingEvent(event);
    setDragOffset(offset);
    setNewEventPosition(eventStartMinutes);
    setOriginalEventDuration(actualDuration); // Store actual duration
  };

  const handleResizeStart = (e, event, edge) => {
    // Disable event resizing on mobile
    if (isMobile()) return;

    e.stopPropagation();
    e.preventDefault();

    const currentDayStr = getLocalDateString(currentDate);
    const [startDateStr, startTimeStr] = event.start.split('T');
    const [endDateStr, endTimeStr] = event.end.split('T');
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    // Calculate start minutes relative to current day (00:00)
    let startMinutes;
    if (startDateStr < currentDayStr) {
      startMinutes = 0; // Started before today, show from 00:00
    } else if (startDateStr > currentDayStr) {
      return; // Starts after today, shouldn't be visible
    } else {
      startMinutes = startHour * 60 + startMinute;
    }

    // Calculate end minutes relative to current day (00:00)
    let endMinutes;
    if (endDateStr > currentDayStr) {
      endMinutes = 24 * 60 + (endHour * 60 + endMinute); // Ends tomorrow
    } else if (endDateStr < currentDayStr) {
      return; // Ends before today, shouldn't be visible
    } else {
      endMinutes = endHour * 60 + endMinute;
    }

    setIsResizing(true);
    setResizeEdge(edge);
    setResizingEvent(event);
    setNewResizeStart(startMinutes);
    setNewResizeEnd(endMinutes);
    // Prevent event dragging while resizing
    setIsDraggingEvent(false);
    setDraggingEvent(null);
  };

  const handleDragStart = (e, column) => {
    // Disable drag event creation on mobile
    if (isMobile()) return;

    if (e.target.closest('.event-block-absolute')) return; // Don't create if clicking on event

    const rect = timelineRef.current.getBoundingClientRect();
    const { clientY } = getEventCoordinates(e);
    const y = clientY - rect.top;
    const minutes = Math.floor((y / hourHeight) * 60);

    // Snap to 10-minute intervals
    const snappedMinutes = Math.round(minutes / 10) * 10;

    setIsCreating(true);
    setCreatingColumn(column);
    setDragStart(snappedMinutes);
    setDragEnd(snappedMinutes);
  };

  const handleDragMove = useCallback((e) => {
    // Handle event resizing
    if (isResizing) {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }

      resizeRafRef.current = requestAnimationFrame(() => {
        const rect = timelineRef.current.getBoundingClientRect();
        const { clientY } = getEventCoordinates(e);
        const y = clientY - rect.top;
        const targetMinutes = Math.floor((y / hourHeight) * 60);
        const snappedMinutes = Math.round(targetMinutes / 10) * 10;
        // Allow resizing beyond 24 hours (up to 48 hours for next day)
        const clampedMinutes = Math.max(0, Math.min(48 * 60, snappedMinutes));

        if (resizeEdge === 'top') {
          // Resizing top edge (changing start time)
          if (clampedMinutes < newResizeEnd - 10) { // Minimum 10 minutes
            setNewResizeStart(clampedMinutes);
          }
        } else if (resizeEdge === 'bottom') {
          // Resizing bottom edge (changing end time)
          if (clampedMinutes > newResizeStart + 10) { // Minimum 10 minutes
            setNewResizeEnd(clampedMinutes);
          }
        }
      });
      return;
    }

    // Handle event dragging
    if (isDraggingEvent) {
      if (eventDragRafRef.current) {
        cancelAnimationFrame(eventDragRafRef.current);
      }

      eventDragRafRef.current = requestAnimationFrame(() => {
        const rect = timelineRef.current.getBoundingClientRect();
        const { clientY } = getEventCoordinates(e);
        const y = clientY - rect.top;
        const targetMinutes = Math.floor((y - dragOffset) / hourHeight * 60);

        // Snap to 10-minute intervals
        const snappedMinutes = Math.round(targetMinutes / 10) * 10;
        // Allow dragging up to start of next day (consider event duration)
        const clampedMinutes = Math.max(0, snappedMinutes);

        if (newEventPosition !== clampedMinutes) {
          setNewEventPosition(clampedMinutes);
        }
      });
      return;
    }

    // Handle event creation
    if (!isCreating) return;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Schedule update for next frame
    rafRef.current = requestAnimationFrame(() => {
      const rect = timelineRef.current.getBoundingClientRect();
      const { clientY } = getEventCoordinates(e);
      const y = clientY - rect.top;
      const minutes = Math.floor((y / hourHeight) * 60);

      // Snap to 10-minute intervals for event creation
      const snappedMinutes = Math.round(minutes / 10) * 10;

      // Only update if changed significantly (reduces re-renders)
      if (lastDragEndRef.current !== snappedMinutes) {
        lastDragEndRef.current = snappedMinutes;
        setDragEnd(snappedMinutes);
      }
    });
  }, [isCreating, isDraggingEvent, isResizing, resizeEdge, newResizeStart, newResizeEnd, hourHeight, dragOffset, newEventPosition]);

  const handleMouseUp = useCallback(async () => {
    // Handle event resizing completion
    if (isResizing && resizingEvent) {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }

      const currentDateStr = getLocalDateString(currentDate);
      const [originalStartDate, originalStartTime] = resizingEvent.start.split('T');
      const [originalEndDate, originalEndTime] = resizingEvent.end.split('T');

      let updates = {};

      if (resizeEdge === 'top') {
        // Resizing top edge - only change start_time, keep end_time unchanged
        let newStartHour = Math.floor(newResizeStart / 60);
        let newStartMinute = newResizeStart % 60;
        let newStartDateStr = currentDateStr;

        // Handle if dragged before midnight (can't go to previous day in current implementation)
        if (newResizeStart < 0) {
          setIsResizing(false);
          setResizeEdge(null);
          setResizingEvent(null);
          setNewResizeStart(null);
          setNewResizeEnd(null);
          return;
        }

        const new_start_time = `${String(newStartHour).padStart(2, '0')}:${String(newStartMinute).padStart(2, '0')}:00`;

        updates = {
          start_time: new_start_time,
          date: newStartDateStr
        };

      } else if (resizeEdge === 'bottom') {
        // Resizing bottom edge - only change end_time, keep start_time unchanged
        let newEndHour = Math.floor(newResizeEnd / 60);
        let newEndMinute = newResizeEnd % 60;

        // Handle day overflow for end time (event spans to next day)
        if (newResizeEnd >= 24 * 60) {
          newEndHour = Math.floor(newResizeEnd / 60) - 24;
          newEndMinute = newResizeEnd % 60;
        }

        const new_end_time = `${String(newEndHour).padStart(2, '0')}:${String(newEndMinute).padStart(2, '0')}:00`;

        updates = {
          end_time: new_end_time
        };
      }

      try {
        await onUpdateEvent(resizingEvent.id, updates);
      } catch (error) {
        console.error('Failed to resize event:', error);
      }

      setIsResizing(false);
      setResizeEdge(null);
      setResizingEvent(null);
      setNewResizeStart(null);
      setNewResizeEnd(null);
      return;
    }

    // Handle event dragging completion
    if (isDraggingEvent && draggingEvent) {
      if (eventDragRafRef.current) {
        cancelAnimationFrame(eventDragRafRef.current);
        eventDragRafRef.current = null;
      }

      const currentDayStr = getLocalDateString(currentDate);
      const [startDateStr] = draggingEvent.start.split('T');

      // Use stored duration instead of recalculating
      const duration = originalEventDuration;

      const newStartMinutes = newEventPosition;
      const newEndMinutes = newStartMinutes + duration;

      // Prevent dragging before midnight of current day
      if (newStartMinutes < 0) {
        setIsDraggingEvent(false);
        setDraggingEvent(null);
        setNewEventPosition(null);
        setOriginalEventDuration(null);
        return;
      }

      const currentDateStr = getLocalDateString(currentDate);
      let newStartDateStr = currentDateStr;
      let newStartHour = Math.floor(newStartMinutes / 60);
      let newStartMinute = newStartMinutes % 60;
      let newEndHour = Math.floor(newEndMinutes / 60);
      let newEndMinute = newEndMinutes % 60;

      // Handle day overflow if end time goes past midnight
      if (newEndMinutes >= 24 * 60) {
        newEndHour = Math.floor(newEndMinutes / 60) - 24;
        newEndMinute = newEndMinutes % 60;
      }

      const new_start_time = `${String(newStartHour).padStart(2, '0')}:${String(newStartMinute).padStart(2, '0')}:00`;
      const new_end_time = `${String(newEndHour).padStart(2, '0')}:${String(newEndMinute).padStart(2, '0')}:00`;

      // Calculate original start minutes for comparison
      const [origStartDateStr, origTimeStr] = draggingEvent.start.split('T');
      const [origStartHour, origStartMinute] = origTimeStr.split(':').map(Number);
      let originalStartMinutes;
      if (origStartDateStr < currentDayStr) {
        originalStartMinutes = 0;
      } else {
        originalStartMinutes = origStartHour * 60 + origStartMinute;
      }

      // Only update if position changed
      if (newStartMinutes !== originalStartMinutes) {
        try {
          const updates = {
            start_time: new_start_time,
            end_time: new_end_time,
            date: newStartDateStr
          };

          await onUpdateEvent(draggingEvent.id, updates);
        } catch (error) {
          console.error('Failed to update event:', error);
        }
      }

      setIsDraggingEvent(false);
      setDraggingEvent(null);
      setNewEventPosition(null);
      setOriginalEventDuration(null);
      return;
    }

    // Handle event creation
    if (!isCreating) return;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);

    // Minimum 10 minutes
    if (end - start < 10) {
      setIsCreating(false);
      lastDragEndRef.current = null;
      return;
    }

    const startHour = Math.floor(start / 60);
    const startMinute = start % 60;
    const endHour = Math.floor(end / 60);
    const endMinute = end % 60;

    const start_time = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
    const end_time = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

    // Determine default category and is_plan based on column
    const is_plan = creatingColumn === 'plan';
    // Use first category as default (will need at least one category in database)
    const defaultCategory = categories.find(c => c.id) || categories[0];
    const category_id = defaultCategory ? defaultCategory.id : null;

    try {
      const newEvent = await onCreateEvent('새 이벤트', start_time, end_time, category_id, is_plan, '');

      // Open edit popup immediately after creating event
      if (newEvent && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const eventTopPosition = (start / 60) * hourHeight;
        const columnWidth = rect.width / 3; // timeline has 3 columns (plan, time, actual)

        setSelectedEvent(newEvent);
        setPopupPosition({
          x: creatingColumn === 'plan' ? columnWidth + 10 : rect.width - 10,
          y: eventTopPosition + 220
        });
        setShowEditPopup(true);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }

    setIsCreating(false);
    setDragStart(null);
    setDragEnd(null);
    setCreatingColumn(null);
    lastDragEndRef.current = null;
  }, [isCreating, isDraggingEvent, isResizing, draggingEvent, resizingEvent, newEventPosition, newResizeStart, newResizeEnd, dragStart, dragEnd, creatingColumn, categories, onCreateEvent, onUpdateEvent]);

  const handleDragEnd = handleMouseUp;

  const handleEventClick = (event, e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setSelectedEvent(event);
    setPopupPosition({
      x: clickX + 10 > rect.width / 2 ? clickX + 150 : clickX + 10,
      y: clickY + 220 > rect.height ? clickY - 30 : clickY + 10
    });
    setShowEditPopup(true);
  };

  const handleEventUpdate = async (id, updates) => {
    try {
      await onUpdateEvent(id, updates);
      setShowEditPopup(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleEventDelete = async (id) => {
    try {
      await onDeleteEvent(id);
      setShowEditPopup(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleModalUpdate = async (id, updates) => {
    try {
      if (id === null) {
        // Create new event
        const { title, start_time, end_time, category_id, description, is_plan } = updates;
        await onCreateEvent(title, start_time, end_time, category_id, is_plan, description);
      } else {
        // Update existing event
        await onUpdateEvent(id, updates);
      }
      setShowEditModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleModalDelete = async (id) => {
    try {
      await onDeleteEvent(id);
      setShowEditModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const renderEventBlock = (event, isTodo = false) => {
    const currentDayStr = getLocalDateString(currentDate);
    const [dateStr, timeStr] = event.start.split('T');
    const [endDateStr, endTimeStr] = event.end.split('T');

    // Calculate start minutes relative to current day (00:00)
    let startMinutes;
    if (dateStr < currentDayStr) {
      startMinutes = 0; // Started before today
    } else if (dateStr > currentDayStr) {
      return null; // Starts after today
    } else {
      const [startHour, startMinute] = timeStr.split(':').map(Number);
      startMinutes = startHour * 60 + startMinute;
    }

    // Calculate end minutes relative to current day (00:00)
    let endMinutes;
    if (endDateStr > currentDayStr) {
      endMinutes = 24 * 60; // Ends after today
    } else if (endDateStr < currentDayStr) {
      return null; // Ends before today
    } else {
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);
      endMinutes = endHour * 60 + endMinute;
    }

    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes <= 0) return null;

    // If this is the event being dragged, use the new position
    const isBeingDragged = isDraggingEvent && draggingEvent && draggingEvent.id === event.id;
    const isBeingResized = isResizing && resizingEvent && resizingEvent.id === event.id;
    
    let displayStartMinutes, displayEndMinutes;
    
    if (isBeingResized) {
      displayStartMinutes = newResizeStart;
      displayEndMinutes = newResizeEnd;
    } else if (isBeingDragged) {
      displayStartMinutes = newEventPosition;
      displayEndMinutes = newEventPosition + durationMinutes;
    } else {
      displayStartMinutes = startMinutes;
      displayEndMinutes = endMinutes;
    }
    
    const displayDuration = displayEndMinutes - displayStartMinutes;
    const topPosition = (displayStartMinutes / 60) * hourHeight;
    const height = (displayDuration / 60) * hourHeight;

    // Get category info from nested category object (populated by backend)
    const categoryInfo = event.category || { color: '#9E9E9E', name: '기타' };
    const blockColor = categoryInfo.color;
    const bgColor = isBeingDragged ? hexToRgba(blockColor, 0.6) : isTodo ? hexToRgba(blockColor, 0.25) : hexToRgba(blockColor, 0.35);

    const displayStartTime = timeStr.substring(0, 5);
    const displayEndTime = endTimeStr.substring(0, 5);

    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    const durationText = durationHours > 0
      ? `${durationHours}시간 ${durationMins}분`
      : `${durationMins}분`;

    const isSmallEvent = durationMinutes <= 30;

    return (
      <div
        key={event.id}
        className="event-block-absolute"
        style={{
          background: bgColor,
          color: '#000',
          top: `${topPosition}px`,
          height: `${Math.max(height, 20)}px`,
          cursor: isTodo ? 'default' : (isBeingDragged ? 'grabbing' : 'grab'),
          opacity: isTodo ? 0.9 : (isBeingDragged ? 0.8 : 1),
          zIndex: isBeingDragged ? 1000 : 1,
          transition: isBeingDragged ? 'none' : 'top 0.1s ease-out',
          border: isTodo ? `2px dashed ${blockColor}` : undefined,
          padding: isSmallEvent ? '1px 4px' : '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isSmallEvent ? 'center' : 'flex-start'
        }}
        onMouseDown={(e) => !isTodo && handleEventStart(e, event)}
        onTouchStart={(e) => !isTodo && handleEventStart(e, event)}
        onClick={(e) => {
          // Only trigger click if not dragging, not resizing, and not a todo
          if (!isDraggingEvent && !isResizing && !isTodo) {
            handleEventClick(event, e);
          }
        }}
        title={isTodo ? `📋 ${event.title}\n${displayStartTime} - ${displayEndTime}\n(할일 계획)` : `${event.title}\n${displayStartTime} - ${displayEndTime}\n${durationText}`}
      >
        {!isTodo && (
          <>
            <div 
              className="resize-handle resize-handle-top"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                cursor: 'ns-resize',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(e, event, 'top')}
              onTouchStart={(e) => handleResizeStart(e, event, 'top')}
              onClick={(e) => e.stopPropagation()}
            />
            <div 
              className="resize-handle resize-handle-bottom"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '6px',
                cursor: 'ns-resize',
                zIndex: 10
              }}
              onMouseDown={(e) => handleResizeStart(e, event, 'bottom')}
              onTouchStart={(e) => handleResizeStart(e, event, 'bottom')}
              onClick={(e) => e.stopPropagation()}
            />
          </>
        )}
        <div className="event-title" style={{ 
          fontSize: isSmallEvent ? '10px' : '11px',
          lineHeight: isSmallEvent ? '1.1' : '1.4',
          whiteSpace: isSmallEvent ? 'nowrap' : 'normal',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {isTodo ? '📋 ' : ''}{event.title}
          {isSmallEvent && (
            <span style={{ marginLeft: '4px', fontSize: '9px', opacity: 0.8, fontWeight: 'normal' }}>
              {displayStartTime}-{displayEndTime}
            </span>
          )}
        </div>
        {!isSmallEvent && (
          <div className="event-time">
            {displayStartTime} - {displayEndTime}
          </div>
        )}
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

  // Convert todos to event-like format for display
  const todoEvents = useMemo(() => {
    if (!todos || todos.length === 0) return [];

    return todos
      .filter(todo => todo.scheduled_time) // Show all todos with scheduled time, even if completed
      .map(todo => {
        // Determine category (Event Category)
        let category = null;
        
        // 1. Direct Event Category
        if (todo.category_id) {
            category = categories.find(c => c.id == todo.category_id);
        }
        
        // 2. Linked Event Category via Todo Category
        if (!category && todo.todo_category_id && todoCategories) {
            const todoCat = todoCategories.find(tc => tc.id == todo.todo_category_id);
            if (todoCat && todoCat.event_category_id) {
                category = categories.find(c => c.id == todoCat.event_category_id);
            }
        }
        
        // 3. Fallback
        if (!category) {
             category = { color: '#9E9E9E', name: '기타' };
        }

        // Calculate Start/End Time
        const dateStr = getLocalDateString(currentDate);
        let startTime = todo.scheduled_time; 
        if (startTime.length === 5) startTime += ':00'; // Ensure HH:MM:SS
        
        // Handle duration
        const duration = parseInt(todo.duration) || 30; // Default 30 mins
        
        // Calculate end time
        const [hours, minutes] = startTime.split(':').map(Number);
        const startTotalMinutes = hours * 60 + minutes;
        const endTotalMinutes = startTotalMinutes + duration;
        
        const endHours = Math.floor(endTotalMinutes / 60) % 24;
        const endMinutes = endTotalMinutes % 60;
        
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

        return {
          id: `todo-${todo.id}`,
          title: `📝 ${todo.text}`,
          start: `${dateStr}T${startTime}`,
          end: `${dateStr}T${endTime}`,
          category: category,
          category_id: category.id,
          is_plan: true, // Show in plan column
          is_todo: true  // Flag to identify as todo
        };
      });
  }, [todos, categories, todoCategories, currentDate]);

  // Separate events by is_plan field (memoized to prevent re-filtering on every render)
  const { planEvents, actualEvents } = useMemo(() => {
    const allPlanEvents = [...events.filter(e => e.is_plan === true), ...todoEvents];
    return {
      planEvents: allPlanEvents,
      actualEvents: events.filter(e => e.is_plan === false)
    };
  }, [events, todoEvents]);

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
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseLeave={() => {
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            if (eventDragRafRef.current) {
              cancelAnimationFrame(eventDragRafRef.current);
              eventDragRafRef.current = null;
            }
            if (resizeRafRef.current) {
              cancelAnimationFrame(resizeRafRef.current);
              resizeRafRef.current = null;
            }
            setIsCreating(false);
            setIsDraggingEvent(false);
            setDraggingEvent(null);
            setNewEventPosition(null);
            setOriginalEventDuration(null);
            setIsResizing(false);
            setResizeEdge(null);
            setResizingEvent(null);
            setNewResizeStart(null);
            setNewResizeEnd(null);
            lastDragEndRef.current = null;
          }}
        >
          <div className="timeline-columns">
            <div
              className="timeline-column plan-column"
              onMouseDown={(e) => handleDragStart(e, 'plan')}
              onTouchStart={(e) => handleDragStart(e, 'plan')}
            >
              {planEvents.map(event => renderEventBlock(event, event.is_todo))}
              {isCreating && creatingColumn === 'plan' && renderDragPreview()}
            </div>
            <div className="timeline-column time-column"></div>
            <div
              className="timeline-column actual-column"
              onMouseDown={(e) => handleDragStart(e, 'actual')}
              onTouchStart={(e) => handleDragStart(e, 'actual')}
            >
              {actualEvents.map(event => renderEventBlock(event, false))}
              {isCreating && creatingColumn === 'actual' && renderDragPreview()}
            </div>
          </div>

          <div className="time-markers">
            {Array.from({ length: 24 }, (_, hour) => {
              const { wakeTime, sleepTime } = getWakeSleepTimes();
              const wakeHour = wakeTime && wakeTime !== '-' ? parseInt(wakeTime.split(':')[0]) : null;
              const sleepHour = sleepTime && sleepTime !== '-' ? parseInt(sleepTime.split(':')[0]) : null;

              const isWakeHour = wakeHour === hour;
              const isSleepHour = sleepHour === hour;

              const labelStyle = {
                color: isWakeHour ? '#e03131' : isSleepHour ? '#1971c2' : undefined,
                fontWeight: isWakeHour || isSleepHour ? 'bold' : undefined,
                fontSize: isWakeHour || isSleepHour ? 16 : undefined,
              };

              return (
                <div key={hour} className="time-marker-row" style={{ height: `${hourHeight}px` }}>
                  <div></div>
                  <div className="time-marker-label" style={labelStyle}>
                    {String(hour).padStart(2, '0')}
                  </div>
                  <div></div>
                </div>
              );
            })}
          </div>

          {getLocalDateString(currentDate) === getLocalDateString(now) && (
            <div
              className="current-time-indicator"
              style={{
                position: 'absolute',
                top: `${(now.getHours() * 60 + now.getMinutes()) / 60 * hourHeight}px`,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'red',
                opacity: 0.2,
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                left: '-5px',
                top: '-4px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'red'
              }} />
            </div>
          )}
        </div>
      </div>

      {showEditPopup && selectedEvent && (
        <EventEditPopup
          event={selectedEvent}
          categories={categories}
          position={popupPosition}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {showEditModal && selectedEvent && (
        <EventEditModal
          event={selectedEvent}
          categories={categories}
          onUpdate={handleModalUpdate}
          onDelete={handleModalDelete}
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
