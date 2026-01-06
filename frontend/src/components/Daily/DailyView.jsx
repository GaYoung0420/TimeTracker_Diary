import { useState, useEffect, useCallback } from 'react';
import { useDailyData } from '../../hooks/useDailyData';
import { useEvents } from '../../hooks/useEvents';
import Timeline from './Timeline';
import TodoList from './TodoList';
import RoutineGrid from './RoutineGrid';
import MoodSelector from './MoodSelector';
import Reflection from './Reflection';
import ImageUpload from './ImageUpload';
import CategoryStats from './CategoryStats';
import CategoryManager from '../Settings/CategoryManager';
import TodoCategoryManager from '../Settings/TodoCategoryManager';
import ICloudEvents from './ICloudEvents';
import { api } from '../../utils/api';
import { fetchMultipleCalendars, getEventsForDate } from '../../services/iCloudCalendar';

function DailyView({ currentDate, setCurrentDate, onOpenSettings }) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTodoCategoryManager, setShowTodoCategoryManager] = useState(false);
  const [todoCategories, setTodoCategories] = useState([]);
  const [iCloudCalendarEvents, setICloudCalendarEvents] = useState([]);
  const { dailyData, loading, addTodo, updateTodo, deleteTodo, reorderTodos, updateRoutineCheck, addRoutine, updateRoutine, deleteRoutine, reorderRoutines, saveData, addImageToState, removeImageFromState } = useDailyData(currentDate);
  const { categories, events, loading: eventsLoading, reloadCategories, createEvent, updateEvent, deleteEvent, addEventToState, wakeSleepInfo } = useEvents(currentDate);

  const loadTodoCategories = useCallback(async () => {
    try {
      const result = await api.getTodoCategories();
      if (result.success) {
        setTodoCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load todo categories:', error);
    }
  }, []);

  // Load iCloud calendar events
  const loadICloudCalendarEvents = useCallback(async () => {
    try {
      const response = await api.getCalendars();
      if (!response.success || !response.data) {
        setICloudCalendarEvents([]);
        return;
      }

      const enabledCalendars = response.data.filter(cal => cal.enabled);
      if (enabledCalendars.length === 0) {
        setICloudCalendarEvents([]);
        return;
      }

      const allEvents = await fetchMultipleCalendars(enabledCalendars);
      const todayEvents = getEventsForDate(allEvents, currentDate);

      // Filter only timed events (not all-day events)
      const timedEvents = todayEvents.filter(event => !event.isAllDay);
      setICloudCalendarEvents(timedEvents);
    } catch (error) {
      console.error('Failed to load iCloud calendar events:', error);
      setICloudCalendarEvents([]);
    }
  }, [currentDate]);

  // 투두 카테고리 로드
  useEffect(() => {
    loadTodoCategories();
  }, [loadTodoCategories]);

  // Load iCloud calendar events when date changes
  useEffect(() => {
    loadICloudCalendarEvents();

    const handleCalendarUpdate = () => {
      loadICloudCalendarEvents();
    };

    window.addEventListener('icloud-calendar-updated', handleCalendarUpdate);
    return () => {
      window.removeEventListener('icloud-calendar-updated', handleCalendarUpdate);
    };
  }, [loadICloudCalendarEvents]);

  const handleAddTodoCategory = async (name, eventCategoryId, color) => {
    try {
      const result = await api.addTodoCategory(name, eventCategoryId, color);
      if (result.success) {
        loadTodoCategories();
      }
    } catch (error) {
      console.error('Failed to add todo category:', error);
    }
  };

  const handleUpdateTodoCategory = async (id, name, eventCategoryId, color) => {
    try {
      const result = await api.updateTodoCategory(id, name, eventCategoryId, color);
      if (result.success) {
        loadTodoCategories();
      }
    } catch (error) {
      console.error('Failed to update todo category:', error);
    }
  };

  const handleDeleteTodoCategory = async (id) => {
    try {
      const result = await api.deleteTodoCategory(id);
      if (result.success) {
        loadTodoCategories();
      }
    } catch (error) {
      console.error('Failed to delete todo category:', error);
    }
  };

  const handleImageUploaded = (newImage) => {
    // Optimistically update UI
    addImageToState(newImage);
  };

  const handleImageDeleted = (imageId) => {
    // Optimistically update UI
    removeImageFromState(imageId);
  };

  const changeDate = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    };
    return date.toLocaleDateString('ko-KR', options);
  };

  return (
    <div className="main-container">
      {/* Left Panel: Time Tracker */}
      <div className="left-panel">
        <div className="time-tracker-date-header">
          <button className="date-nav-btn" onClick={() => changeDate(-1)}>◀</button>
          <div className="current-date">{formatDate(currentDate)}</div>
          <button className="date-nav-btn" onClick={() => changeDate(1)}>▶</button>
        </div>

        <ICloudEvents currentDate={currentDate} onOpenSettings={onOpenSettings} />

        <Timeline
          events={events}
          todos={dailyData.todos}
          routines={dailyData.routines}
          routineChecks={dailyData.routineChecks}
          categories={categories}
          todoCategories={todoCategories}
          loading={eventsLoading}
          currentDate={currentDate}
          onCreateEvent={createEvent}
          onUpdateEvent={updateEvent}
          onDeleteEvent={deleteEvent}
          wakeSleepInfo={wakeSleepInfo}
          iCloudCalendarEvents={iCloudCalendarEvents}
        />
      </div>

      {/* Right Panel: Todo & Reflection */}
      <div className="right-panel">
        <CategoryStats
          events={events}
          categories={categories}
          currentDate={currentDate}
          onOpenSettings={() => setShowCategoryManager(true)}
        />

        <RoutineGrid
          routines={dailyData.routines}
          routineChecks={dailyData.routineChecks}
          currentDate={currentDate}
          onToggle={updateRoutineCheck}
          onAdd={addRoutine}
          onUpdate={updateRoutine}
          onDelete={deleteRoutine}
          onReorder={reorderRoutines}
        />

        <TodoList
          todos={dailyData.todos}
          categories={categories}
          todoCategories={todoCategories}
          currentDate={currentDate}
          onAdd={addTodo}
          onUpdate={updateTodo}
          onDelete={deleteTodo}
          onReorder={reorderTodos}
          onOpenTodoCategoryManager={() => setShowTodoCategoryManager(true)}
          onEventCreated={addEventToState}
        />

        <MoodSelector
          selectedMood={dailyData.mood}
          onSelect={(mood) => saveData({ mood })}
        />

        <ImageUpload
          currentDate={currentDate}
          images={dailyData.images || []}
          onImageUploaded={handleImageUploaded}
          onImageDeleted={handleImageDeleted}
        />

        <Reflection
          value={dailyData.reflection}
          onSave={(reflection) => saveData({ reflection })}
          currentDate={currentDate}
        />
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="modal-overlay" onClick={() => setShowCategoryManager(false)}>
          <div className="modal-content category-manager-modal" onClick={(e) => e.stopPropagation()}>
            <CategoryManager
              categories={categories}
              onCategoriesChange={reloadCategories}
              onClose={() => setShowCategoryManager(false)}
            />
          </div>
        </div>
      )}

      {/* Todo Category Manager Modal */}
      {showTodoCategoryManager && (
        <div className="modal-overlay" onClick={() => setShowTodoCategoryManager(false)}>
          <div className="modal-content category-manager-modal" onClick={(e) => e.stopPropagation()}>
            <TodoCategoryManager
              todoCategories={todoCategories}
              eventCategories={categories}
              onAdd={handleAddTodoCategory}
              onUpdate={handleUpdateTodoCategory}
              onDelete={handleDeleteTodoCategory}
              onClose={() => setShowTodoCategoryManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyView;
