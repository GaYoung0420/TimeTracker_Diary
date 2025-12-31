import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { formatKoreanTime, getCategoryColorByName, getCategoryTextColorByName, hexToRgba, getLocalDateString } from '../../utils/helpers';
import EventEditModal from './EventEditModal';
import EventEditPopup from './EventEditPopup';
import EventEditBottomSheet from './EventEditBottomSheet';

function Timeline({ events, todos, routines, routineChecks, categories, todoCategories, loading, currentDate, onCreateEvent, onUpdateEvent, onDeleteEvent, wakeSleepInfo }) {
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
  const [dragTooltip, setDragTooltip] = useState(null); // { x, y, startTime, endTime }
  const [longPressActive, setLongPressActive] = useState(false);
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const timelineRef = useRef(null);
  const rafRef = useRef(null);
  const lastDragEndRef = useRef(null);
  const eventDragRafRef = useRef(null);
  const resizeRafRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef(null);
  const createDragStartPosRef = useRef(null);
  const createLongPressTimerRef = useRef(null);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Prevent scrolling during drag/resize operations
  useEffect(() => {
    const wrapper = timelineRef.current;
    if (!wrapper) return;

    const handleTouchMove = (e) => {
      // Prevent scroll if we're creating, dragging, or resizing
      if (isCreating || isDraggingEvent || isResizing) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use passive: false to allow preventDefault
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      wrapper.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isCreating, isDraggingEvent, isResizing]);

  // Prevent body scroll during drag/resize operations
  useEffect(() => {
    if (isCreating || isDraggingEvent || isResizing) {
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        // Restore original overflow
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = '';
      };
    }
  }, [isCreating, isDraggingEvent, isResizing]);

  // Hover line effect for each column
  useEffect(() => {
    const handleColumnMouseMove = (columnType) => (e) => {
      const hoverLine = document.getElementById(`timeline-hover-line-${columnType}`);
      const wrapper = timelineRef.current;

      if (!hoverLine || !wrapper) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const mouseY = e.clientY;
      const relativeY = mouseY - wrapperRect.top + wrapper.scrollTop;

      hoverLine.style.top = relativeY + 'px';
      hoverLine.style.display = 'block';
    };

    const handleColumnMouseLeave = (columnType) => () => {
      const hoverLine = document.getElementById(`timeline-hover-line-${columnType}`);
      if (hoverLine) {
        hoverLine.style.display = 'none';
      }
    };

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const planColumn = document.querySelector('.plan-column');
      const actualColumn = document.querySelector('.actual-column');

      if (planColumn) {
        planColumn.addEventListener('mousemove', handleColumnMouseMove('plan'));
        planColumn.addEventListener('mouseleave', handleColumnMouseLeave('plan'));
      }

      if (actualColumn) {
        actualColumn.addEventListener('mousemove', handleColumnMouseMove('actual'));
        actualColumn.addEventListener('mouseleave', handleColumnMouseLeave('actual'));
      }

      console.log('Timeline column hover events attached');
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const planColumn = document.querySelector('.plan-column');
      const actualColumn = document.querySelector('.actual-column');

      if (planColumn) {
        planColumn.removeEventListener('mousemove', handleColumnMouseMove('plan'));
        planColumn.removeEventListener('mouseleave', handleColumnMouseLeave('plan'));
      }

      if (actualColumn) {
        actualColumn.removeEventListener('mousemove', handleColumnMouseMove('actual'));
        actualColumn.removeEventListener('mouseleave', handleColumnMouseLeave('actual'));
      }
    };
  }, [events, loading]);

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

  // Get x,y coordinates from mouse or touch event
  const getEventCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
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
    
    if (isMobile()) {
      setShowEditPopup(true);
    } else {
      setShowEditModal(true);
    }
  };

  const renderWakeSleepTimes = () => {
    const { wakeTime, sleepTime } = wakeSleepInfo;

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

  const handleEventStart = (e, event, forceMobile = false) => {
    // Disable event dragging on mobile unless forced (via long press)
    if (isMobile() && !forceMobile) return;

    // Don't start dragging if already resizing
    if (isResizing) return;

    e.stopPropagation(); // Prevent creating new event
    e.preventDefault(); // Prevent scrolling on touch

    // Close edit popup/modal when starting to drag
    setShowEditPopup(false);
    setShowEditModal(false);
    setSelectedEvent(null);

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

  const handleResizeStart = (e, event, edge, forceMobile = false) => {
    // Disable event resizing on mobile unless forced (via long press)
    if (isMobile() && !forceMobile) return;

    e.stopPropagation();
    e.preventDefault();

    // Close edit popup/modal when starting to resize
    setShowEditPopup(false);
    setShowEditModal(false);
    setSelectedEvent(null);

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
    if (e.target.closest('.event-block-absolute')) return; // Don't create if clicking on event

    // Don't create new event if already creating, dragging, or resizing
    if (isCreating || isDraggingEvent || isResizing) return;

    const coords = getEventCoords(e);
    createDragStartPosRef.current = coords;

    const rect = timelineRef.current.getBoundingClientRect();
    const { clientY } = getEventCoordinates(e);
    const y = clientY - rect.top;
    const minutes = Math.floor((y / hourHeight) * 60);

    // Snap to 10-minute intervals
    const snappedMinutes = Math.round(minutes / 10) * 10;

    // On mobile, require long press before allowing event creation
    if (isMobile()) {
      createLongPressTimerRef.current = setTimeout(() => {
        setCanCreateEvent(true);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        setIsCreating(true);
        setCreatingColumn(column);
        setDragStart(snappedMinutes);
        setDragEnd(snappedMinutes);

        // Prevent scrolling once long press is activated
        if (e.cancelable) {
          e.preventDefault();
        }
      }, 500); // 500ms long press
    } else {
      // On desktop, create immediately
      setIsCreating(true);
      setCreatingColumn(column);
      setDragStart(snappedMinutes);
      setDragEnd(snappedMinutes);
    }
  };

  const handleDragMove = useCallback((e) => {
    // Prevent scrolling when dragging/resizing/creating on mobile
    if ((isCreating || isDraggingEvent || isResizing) && isMobile() && e.cancelable) {
      e.preventDefault();
    }

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

            // Update tooltip for resize
            const startHour = Math.floor(clampedMinutes / 60);
            const startMinute = clampedMinutes % 60;
            const endHour = Math.floor(newResizeEnd / 60);
            const endMinute = newResizeEnd % 60;
            const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

            setDragTooltip({
              x: e.clientX || (e.touches && e.touches[0].clientX),
              y: e.clientY || (e.touches && e.touches[0].clientY),
              startTime,
              endTime
            });
          }
        } else if (resizeEdge === 'bottom') {
          // Resizing bottom edge (changing end time)
          if (clampedMinutes > newResizeStart + 10) { // Minimum 10 minutes
            setNewResizeEnd(clampedMinutes);

            // Update tooltip for resize
            const startHour = Math.floor(newResizeStart / 60);
            const startMinute = newResizeStart % 60;
            const endHour = Math.floor(clampedMinutes / 60);
            const endMinute = clampedMinutes % 60;
            const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

            setDragTooltip({
              x: e.clientX || (e.touches && e.touches[0].clientX),
              y: e.clientY || (e.touches && e.touches[0].clientY),
              startTime,
              endTime
            });
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

          // Update tooltip for dragging
          const endMinutes = clampedMinutes + originalEventDuration;
          const startHour = Math.floor(clampedMinutes / 60);
          const startMinute = clampedMinutes % 60;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
          const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

          setDragTooltip({
            x: e.clientX || (e.touches && e.touches[0].clientX),
            y: e.clientY || (e.touches && e.touches[0].clientY),
            startTime,
            endTime
          });
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
  }, [isCreating, isDraggingEvent, isResizing, resizeEdge, newResizeStart, newResizeEnd, hourHeight, dragOffset, newEventPosition, originalEventDuration]);

  const handleMouseUp = useCallback(async () => {
    // Cancel long press timer for event creation on mobile
    if (createLongPressTimerRef.current) {
      clearTimeout(createLongPressTimerRef.current);
      createLongPressTimerRef.current = null;
    }
    setCanCreateEvent(false);

    // Clear tooltip on mouse up
    setDragTooltip(null);

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

    // Check if this was actually a drag or just a tap (for mobile scrolling)
    if (createDragStartPosRef.current && isMobile()) {
      const coords = getEventCoords({ clientX: 0, clientY: 0 }); // Dummy coords, will use lastDragEndRef
      // On mobile, if the user didn't drag much (less than 20px vertically), cancel creation
      const verticalDragDistance = Math.abs(dragEnd - dragStart) * (hourHeight / 60);
      if (verticalDragDistance < 20) {
        setIsCreating(false);
        setCreatingColumn(null);
        lastDragEndRef.current = null;
        createDragStartPosRef.current = null;
        return;
      }
    }
    createDragStartPosRef.current = null;

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
        const scrollTop = timelineRef.current.scrollTop;
        const eventTopOffset = (start / 60) * hourHeight;
        
        // Calculate viewport Y of the event top
        let viewportY = rect.top + eventTopOffset - scrollTop;
        
        // Calculate viewport X based on column
        let viewportX = rect.left;
        
        if (creatingColumn === 'plan') {
           const planCol = timelineRef.current.querySelector('.plan-column');
           if (planCol) {
               const colRect = planCol.getBoundingClientRect();
               viewportX = colRect.right + 20; 
           } else {
               viewportX = rect.left + (rect.width / 3) + 20;
           }
        } else {
           const actualCol = timelineRef.current.querySelector('.actual-column');
           if (actualCol) {
               const colRect = actualCol.getBoundingClientRect();
               viewportX = colRect.left - 400; // Position to left of column (popup width ~380)
           } else {
               viewportX = rect.right - 400;
           }
        }
        
        // Ensure bounds
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        const popupHeight = 450;
        const popupWidth = 380;
        
        if (viewportY + popupHeight > screenHeight) {
            viewportY = screenHeight - popupHeight - 20;
        }
        if (viewportY < 20) viewportY = 20;
        
        if (viewportX + popupWidth > screenWidth) {
            viewportX = screenWidth - popupWidth - 20;
        }
        if (viewportX < 20) viewportX = 20;

        setSelectedEvent(newEvent);
        setPopupPosition({
          x: viewportX,
          y: viewportY
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

  // Long press handlers for mobile
  const startLongPress = (event, e, isResize = false, edge = null) => {
    if (!isMobile()) return;

    const coords = getEventCoords(e);
    touchStartPosRef.current = coords;

    longPressTimerRef.current = setTimeout(() => {
      setLongPressActive(true);
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Prevent scrolling once long press is activated
      if (e.cancelable) {
        e.preventDefault();
      }

      // Start drag or resize after long press with forceMobile = true
      if (isResize) {
        handleResizeStart(e, event, edge, true);
      } else {
        handleEventStart(e, event, true);
      }
    }, 500); // 500ms long press
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleEventTouchStart = (event, e) => {
    e.stopPropagation();
    startLongPress(event, e, false);
  };

  const handleEventTouchMove = (e) => {
    // If already dragging or resizing, prevent scroll and don't interfere (let parent handle it)
    if (isDraggingEvent || isResizing) {
      if (e.cancelable) {
        e.preventDefault();
      }
      return;
    }

    if (!touchStartPosRef.current) return;

    const coords = getEventCoords(e);
    const deltaX = Math.abs(coords.x - touchStartPosRef.current.x);
    const deltaY = Math.abs(coords.y - touchStartPosRef.current.y);

    // If moved more than 10px, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      if (!longPressActive) {
        cancelLongPress();
      }
    }
  };

  const handleEventTouchEnd = (event, e) => {
    cancelLongPress();

    // Check if touch moved (tap should be stationary)
    let isTap = false;
    if (touchStartPosRef.current) {
      const coords = getEventCoords(e);
      const deltaX = Math.abs(coords.x - touchStartPosRef.current.x);
      const deltaY = Math.abs(coords.y - touchStartPosRef.current.y);

      // Only treat as tap if movement is less than 5px
      isTap = deltaX < 5 && deltaY < 5;
    }

    // If long press was not activated, not dragging/resizing, and was a tap, treat as click
    if (!longPressActive && !isDraggingEvent && !isResizing && isTap) {
      handleEventClick(event, e);
    }

    setLongPressActive(false);
    touchStartPosRef.current = null;
  };

  const handleEventClick = (event, e) => {
    if (!timelineRef.current) return;

    setSelectedEvent(event);

    // On mobile, open popup (which will render as bottom sheet) instead of modal
    if (isMobile()) {
      setShowEditPopup(true);
    } else {
      // On desktop, open popup at click position
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const popupWidth = 380; // Approximate width
      const popupHeight = 450; // Approximate height

      let x = clickX + 20;
      let y = clickY - 100;

      // Check right edge
      if (x + popupWidth > screenWidth) {
        x = clickX - popupWidth - 20;
      }

      // Check bottom edge
      if (y + popupHeight > screenHeight) {
        y = screenHeight - popupHeight - 20;
      }
      
      // Check top edge
      if (y < 20) {
        y = 20;
      }

      setPopupPosition({ x, y });
      setShowEditPopup(true);
    }
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

    // Calculate display times based on current position (for dragging/resizing)
    let displayStartTime, displayEndTime;
    if (isBeingDragged || isBeingResized) {
      const startHour = Math.floor(displayStartMinutes / 60);
      const startMinute = displayStartMinutes % 60;
      const endHour = Math.floor(displayEndMinutes / 60);
      const endMinute = displayEndMinutes % 60;
      displayStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      displayEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
    } else {
      displayStartTime = timeStr.substring(0, 5);
      displayEndTime = endTimeStr.substring(0, 5);
    }

    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    const durationText = durationHours > 0
      ? `${durationHours}시간 ${durationMins}분`
      : `${durationMins}분`;

    const isSmallEvent = durationMinutes <= 50;

    return (
      <div
        key={event.id}
        className={`event-block-absolute ${longPressActive && draggingEvent?.id === event.id ? 'long-press-active' : ''}`}
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
        onTouchStart={(e) => !isTodo && handleEventTouchStart(event, e)}
        onTouchMove={(e) => !isTodo && handleEventTouchMove(e)}
        onTouchEnd={(e) => !isTodo && handleEventTouchEnd(event, e)}
        onClick={(e) => {
          // Only trigger click if not dragging, not resizing, and not a todo
          if (!isDraggingEvent && !isResizing && !isTodo && !isMobile()) {
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
                height: isMobile() ? '12px' : '6px',
                cursor: 'ns-resize',
                zIndex: 10,
                background: longPressActive && isMobile() ? 'rgba(35, 131, 226, 0.3)' : 'transparent'
              }}
              onMouseDown={(e) => handleResizeStart(e, event, 'top')}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (isMobile()) {
                  startLongPress(event, e, true, 'top');
                } else {
                  handleResizeStart(e, event, 'top');
                }
              }}
              onTouchMove={(e) => isMobile() && handleEventTouchMove(e)}
              onTouchEnd={(e) => {
                if (isMobile()) {
                  cancelLongPress();
                  setLongPressActive(false);
                  touchStartPosRef.current = null;
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div
              className="resize-handle resize-handle-bottom"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: isMobile() ? '12px' : '6px',
                cursor: 'ns-resize',
                zIndex: 10,
                background: longPressActive && isMobile() ? 'rgba(35, 131, 226, 0.3)' : 'transparent'
              }}
              onMouseDown={(e) => handleResizeStart(e, event, 'bottom')}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (isMobile()) {
                  startLongPress(event, e, true, 'bottom');
                } else {
                  handleResizeStart(e, event, 'bottom');
                }
              }}
              onTouchMove={(e) => isMobile() && handleEventTouchMove(e)}
              onTouchEnd={(e) => {
                if (isMobile()) {
                  cancelLongPress();
                  setLongPressActive(false);
                  touchStartPosRef.current = null;
                }
              }}
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

    // Calculate display times
    const startHour = Math.floor(start / 60);
    const startMinute = start % 60;
    const endHour = Math.floor(end / 60);
    const endMinute = end % 60;
    const displayStartTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const displayEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    const durationMinutes = end - start;
    const isSmallEvent = durationMinutes <= 50;

    return (
      <div
        className="event-block-absolute"
        style={{
          background: 'rgba(66, 133, 244, 0.3)',
          border: '2px dashed #4285F4',
          top: `${topPosition}px`,
          height: `${Math.max(height, 20)}px`,
          pointerEvents: 'none',
          padding: isSmallEvent ? '1px 4px' : '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isSmallEvent ? 'center' : 'flex-start'
        }}
      >
        <div className="event-title" style={{
          fontSize: isSmallEvent ? '10px' : '11px',
          lineHeight: isSmallEvent ? '1.1' : '1.4',
          whiteSpace: isSmallEvent ? 'nowrap' : 'normal',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          새 이벤트
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

  // Convert routines to plan/actual events based on check status
  const { routinePlanEvents, routineActualEvents } = useMemo(() => {
    if (!routines || !Array.isArray(routines)) {
      console.log('[Timeline] No routines or not array:', routines);
      return { routinePlanEvents: [], routineActualEvents: [] };
    }

    console.log('[Timeline] All routines:', routines);
    const planEvents = [];
    const actualEvents = [];

    // Convert currentDate to YYYY-MM-DD string
    const dateString = getLocalDateString(currentDate);
    console.log('[Timeline] Date string:', dateString);

    const filteredRoutines = routines.filter(routine => {
      // Check if routine has valid scheduled_time and is active
      const hasTime = routine.scheduled_time &&
             routine.active &&
             typeof routine.scheduled_time === 'string' &&
             routine.scheduled_time.includes(':');

      if (!hasTime) return false;

      // Parse weekdays if it's a string
      let weekdays = routine.weekdays;
      if (typeof weekdays === 'string') {
        try {
          weekdays = JSON.parse(weekdays);
        } catch (e) {
          console.error(`[Timeline] Failed to parse weekdays for routine ${routine.text}:`, e);
          weekdays = null;
        }
      }

      // Check weekday filter
      if (weekdays && Array.isArray(weekdays) && weekdays.length > 0) {
        const weekday = currentDate.getDay();
        if (!weekdays.includes(weekday)) {
          console.log(`[Timeline] Routine ${routine.text}: filtered out by weekday (${weekday} not in ${weekdays})`);
          return false;
        }
      }

      // Check date range filter
      if (routine.start_date) {
        if (dateString < routine.start_date) {
          console.log(`[Timeline] Routine ${routine.text}: filtered out by start_date (${dateString} < ${routine.start_date})`);
          return false;
        }
      }
      if (routine.end_date) {
        if (dateString > routine.end_date) {
          console.log(`[Timeline] Routine ${routine.text}: filtered out by end_date (${dateString} > ${routine.end_date})`);
          return false;
        }
      }

      console.log(`[Timeline] Routine ${routine.text}: INCLUDED`);
      return true;
    });

    console.log('[Timeline] Filtered routines with time:', filteredRoutines);

    filteredRoutines.forEach(routine => {
        const startTime = routine.scheduled_time;
        const duration = routine.duration || 30;

        try {
          const [hours, minutes] = startTime.split(':').map(Number);
          const endMinutes = hours * 60 + minutes + duration;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;

          // Ensure time format includes seconds (HH:MM:SS)
          const formattedStartTime = startTime.split(':').length === 2
            ? `${startTime}:00`
            : startTime;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

          const routineEvent = {
            id: `routine-${routine.id}`,
            title: `${routine.emoji || '✓'} ${routine.text}`,
            date: dateString,
            start: `${dateString}T${formattedStartTime}`,
            end: `${dateString}T${endTime}`,
            category_id: null,
            is_plan: true,
            isRoutine: true,
            routineId: routine.id
          };

          console.log('[Timeline] Created routine event:', routineEvent);

          // Always add routines to plan events only
          planEvents.push(routineEvent);
        } catch (error) {
          console.error('Error converting routine to event:', routine, error);
        }
      });

    console.log('[Timeline] Routine plan events:', planEvents);
    console.log('[Timeline] Routine actual events:', actualEvents);
    return { routinePlanEvents: planEvents, routineActualEvents: actualEvents };
  }, [routines, routineChecks, currentDate]);

  // Separate events by is_plan field (memoized to prevent re-filtering on every render)
  const { planEvents, actualEvents } = useMemo(() => {
    const allPlanEvents = [...events.filter(e => e.is_plan === true), ...todoEvents, ...routinePlanEvents];
    const allActualEvents = [...events.filter(e => e.is_plan === false), ...routineActualEvents];
    console.log('[Timeline] Final plan events (with routines):', allPlanEvents);
    console.log('[Timeline] Final actual events (with routines):', allActualEvents);
    return {
      planEvents: allPlanEvents,
      actualEvents: allActualEvents
    };
  }, [events, todoEvents, routinePlanEvents, routineActualEvents]);

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

      {/* Drag tooltip - temporarily hidden */}
      {false && dragTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${dragTooltip.x + 15}px`,
            top: `${dragTooltip.y - 10}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          {dragTooltip.startTime} - {dragTooltip.endTime}
        </div>
      )}

      <div className="timeline-grid">
        <div className="timeline-header">
          <div>계획</div>
          <div>시간</div>
          <div>실제</div>
        </div>

        <div
          ref={timelineRef}
          className="timeline-wrapper"
          style={{ minHeight: `${24 * hourHeight}px`, position: 'relative' }}
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
            setDragTooltip(null);
            lastDragEndRef.current = null;
          }}
        >
          <div className="timeline-columns">
            <div
              className="timeline-column plan-column"
              onMouseDown={(e) => handleDragStart(e, 'plan')}
              onTouchStart={(e) => handleDragStart(e, 'plan')}
              style={{ position: 'relative' }}
            >
              <div className="timeline-hover-line" id="timeline-hover-line-plan"></div>
              {planEvents.map(event => renderEventBlock(event, event.is_todo))}
              {isCreating && creatingColumn === 'plan' && renderDragPreview()}
            </div>
            <div className="timeline-column time-column"></div>
            <div
              className="timeline-column actual-column"
              onMouseDown={(e) => handleDragStart(e, 'actual')}
              onTouchStart={(e) => handleDragStart(e, 'actual')}
              style={{ position: 'relative' }}
            >
              <div className="timeline-hover-line" id="timeline-hover-line-actual"></div>
              {actualEvents.map(event => renderEventBlock(event, false))}
              {isCreating && creatingColumn === 'actual' && renderDragPreview()}
            </div>
          </div>

          <div className="time-markers">
            {Array.from({ length: 24 }, (_, hour) => {
              const { wakeTime, wakeDateTime } = wakeSleepInfo;

              // Debug log (only log once per render, at hour 0)
              if (hour === 0) {
                console.log('Wake/Sleep Times:', wakeSleepInfo);
              }

              // Check if wake/sleep times are on the current date
              const currentDateStr = getLocalDateString(currentDate);

              let isWakeHour = false;
              if (wakeDateTime && wakeDateTime !== '-' && wakeDateTime !== null) {
                const wakeDate = wakeDateTime.split('T')[0];
                const wakeHour = parseInt(wakeDateTime.split('T')[1].split(':')[0]);
                isWakeHour = wakeDate === currentDateStr && wakeHour === hour;
              }

              // Check if this hour matches any actual sleep event's start time
              let isSleepHour = false;
              const sleepEvents = events.filter(event =>
                event.title === '잠' &&
                event.category && event.category.name && event.category.name.includes('잠') &&
                event.is_plan === false
              );

              for (const sleepEvent of sleepEvents) {
                // Extract hour from start time (format: "YYYY-MM-DDTHH:mm:ss" or "HH:mm:ss")
                let eventHour;
                if (sleepEvent.start && sleepEvent.start.includes('T')) {
                  // Format: "YYYY-MM-DDTHH:mm:ss"
                  eventHour = parseInt(sleepEvent.start.split('T')[1].split(':')[0]);
                } else if (sleepEvent.start_time) {
                  // Format: "HH:mm:ss"
                  eventHour = parseInt(sleepEvent.start_time.split(':')[0]);
                }

                if (eventHour === hour) {
                  isSleepHour = true;
                  break;
                }
              }

              const labelStyle = {
                color: isWakeHour ? '#e03131' : isSleepHour ? '#1971c2' : undefined,
                fontWeight: isWakeHour || isSleepHour ? 'bold' : undefined,
                fontSize: isWakeHour || isSleepHour ? 16 : undefined,
                backgroundColor: isWakeHour ? '#ffe0e0' : isSleepHour ? '#e0f2ff' : undefined,
                borderRadius: isWakeHour || isSleepHour ? '4px' : undefined,
                padding: isWakeHour || isSleepHour ? '2px 4px' : undefined,
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
        isMobile() ? (
          <EventEditBottomSheet
            event={selectedEvent}
            categories={categories}
            onUpdate={handleEventUpdate}
            onDelete={handleEventDelete}
            onClose={() => {
              setShowEditPopup(false);
              setSelectedEvent(null);
            }}
          />
        ) : (
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
        )
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
