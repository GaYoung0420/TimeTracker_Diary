import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import './App.css';
import DailyView from './components/Daily/DailyView';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import SettingsModal from './components/Settings/SettingsModal';
import { api } from './utils/api';

// Lazy load MonthlyView since it's not needed initially
const MonthlyView = lazy(() => import('./components/Monthly/MonthlyView'));

function App() {
  const [currentView, setCurrentView] = useState(() => {
    // Restore view from localStorage
    return localStorage.getItem('currentView') || 'daily';
  });
  const [currentDate, setCurrentDate] = useState(() => {
    // Restore date from localStorage
    const savedDate = localStorage.getItem('currentDate');
    return savedDate ? new Date(savedDate) : new Date();
  });
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState('main');
  const lastDailyClickTime = useRef(0);

  const openSettings = (section = 'main') => {
    setSettingsInitialSection(section);
    setShowSettingsModal(true);
  };

  // Save currentView to localStorage
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Save currentDate to localStorage
  useEffect(() => {
    localStorage.setItem('currentDate', currentDate.toISOString());
  }, [currentDate]);

  // 앱 로드 시 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await api.getCurrentUser();
        if (result.success) {
          setUser(result.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const switchView = (view) => {
    setCurrentView(view);
  };

  const handleDailyClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastDailyClickTime.current;

    // Double-click detected (within 300ms)
    if (timeSinceLastClick < 300 && currentView === 'daily') {
      setCurrentDate(new Date()); // Go to today
    } else {
      switchView('daily');
    }

    lastDailyClickTime.current = now;
  };

  const goToDate = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    setCurrentDate(new Date(year, month - 1, day));
    setCurrentView('daily');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // 로그인 시 오늘 날짜로 이동
    setCurrentDate(new Date());
    setCurrentView('daily');
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    // 회원가입 시 오늘 날짜로 이동
    setCurrentDate(new Date());
    setCurrentView('daily');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 인증 확인 중
  if (isCheckingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        로딩 중...
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return (
    <div className="App">
      {/* Header */}
      <div className="header">
        <div className="header-title">TimeTracker Diary</div>

        <div className="header-actions">
          <div className="date-selector">
            <button
              className={`date-nav-btn view-toggle-btn ${currentView === 'daily' ? 'active' : ''}`}
              onClick={handleDailyClick}
            >
              Daily
            </button>
            <button
              className={`date-nav-btn view-toggle-btn ${currentView === 'monthly' ? 'active' : ''}`}
              onClick={() => switchView('monthly')}
            >
              Monthly
            </button>
            <button
              className="date-nav-btn settings-btn"
              onClick={() => openSettings('main')}
              title="설정"
            >
              ⚙️
            </button>
          </div>

          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Views */}
      <div className={`view-container ${currentView === 'daily' ? 'active' : ''}`}>
        {currentView === 'daily' && (
          <DailyView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate} 
            onOpenSettings={() => openSettings('calendar')}
          />
        )}
      </div>

      <div className={`view-container ${currentView === 'monthly' ? 'active' : ''}`}>
        {currentView === 'monthly' && (
          <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>}>
            <MonthlyView goToDate={goToDate} />
          </Suspense>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)} 
          initialSection={settingsInitialSection}
        />
      )}
    </div>
  );
}

export default App;
