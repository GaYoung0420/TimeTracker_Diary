import { useDailyData } from '../../hooks/useDailyData';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import Timeline from './Timeline';
import TodoList from './TodoList';
import RoutineGrid from './RoutineGrid';
import MoodSelector from './MoodSelector';
import Reflection from './Reflection';

function DailyView({ currentDate, setCurrentDate }) {
  const { dailyData, loading, addTodo, updateTodo, deleteTodo, updateRoutineCheck, saveData } = useDailyData(currentDate);
  const { calendars, events, wakeSleepEvents, loading: calendarLoading } = useCalendarEvents(currentDate);

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
        />
      </div>

      {/* Right Panel: Todo & Reflection */}
      <div className="right-panel">
        <RoutineGrid
          routines={dailyData.routines}
          routineChecks={dailyData.routineChecks}
          onToggle={updateRoutineCheck}
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

        <Reflection
          value={dailyData.reflection}
          onSave={(reflection) => saveData({ reflection })}
        />
      </div>
    </div>
  );
}

export default DailyView;
