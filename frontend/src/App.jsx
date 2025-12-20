import { useState } from 'react';
import './App.css';
import DailyView from './components/Daily/DailyView';
import MonthlyView from './components/Monthly/MonthlyView';

function App() {
  const [currentView, setCurrentView] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const switchView = (view) => {
    setCurrentView(view);
  };

  const goToDate = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    setCurrentDate(new Date(year, month - 1, day));
    setCurrentView('daily');
  };

  return (
    <div className="App">
      {/* Header */}
      <div className="header">
        <div className="header-title">📅 2025 일기장</div>

        <div className="date-selector">
          <button
            className={`date-nav-btn view-toggle-btn ${currentView === 'daily' ? 'active' : ''}`}
            onClick={() => switchView('daily')}
          >
            Daily
          </button>
          <button
            className={`date-nav-btn view-toggle-btn ${currentView === 'monthly' ? 'active' : ''}`}
            onClick={() => switchView('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Views */}
      <div className={`view-container ${currentView === 'daily' ? 'active' : ''}`}>
        {currentView === 'daily' && (
          <DailyView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        )}
      </div>

      <div className={`view-container ${currentView === 'monthly' ? 'active' : ''}`}>
        {currentView === 'monthly' && (
          <MonthlyView goToDate={goToDate} />
        )}
      </div>
    </div>
  );
}

export default App;
