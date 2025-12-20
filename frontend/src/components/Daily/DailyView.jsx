import { useState } from 'react';
import { useDailyData } from '../../hooks/useDailyData';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import Timeline from './Timeline';
import TodoList from './TodoList';
import RoutineGrid from './RoutineGrid';
import MoodSelector from './MoodSelector';
import Reflection from './Reflection';
import ImageUpload from './ImageUpload';
import CategoryStats from './CategoryStats';

function DailyView({ currentDate, setCurrentDate }) {
  const { dailyData, loading, addTodo, updateTodo, deleteTodo, updateRoutineCheck, addRoutine, updateRoutine, deleteRoutine, saveData, addImageToState, removeImageFromState } = useDailyData(currentDate);
  const { calendars, events, wakeSleepEvents, loading: calendarLoading } = useCalendarEvents(currentDate);

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

        <Timeline
          events={events}
          wakeSleepEvents={wakeSleepEvents}
          calendars={calendars}
          loading={calendarLoading}
          currentDate={currentDate}
        />
      </div>

      {/* Right Panel: Todo & Reflection */}
      <div className="right-panel">
        <CategoryStats events={events} />

        <RoutineGrid
          routines={dailyData.routines}
          routineChecks={dailyData.routineChecks}
          onToggle={updateRoutineCheck}
          onAdd={addRoutine}
          onUpdate={updateRoutine}
          onDelete={deleteRoutine}
        />

        <TodoList
          todos={dailyData.todos}
          onAdd={addTodo}
          onUpdate={updateTodo}
          onDelete={deleteTodo}
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
        />
      </div>
    </div>
  );
}

export default DailyView;
