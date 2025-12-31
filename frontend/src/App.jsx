import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import DailyView from './components/Daily/DailyView';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import LandingPage from './components/Landing/LandingPage';
import SettingsModal from './components/Settings/SettingsModal';
import { api } from './utils/api';

// Lazy load MonthlyView since it's not needed initially
const MonthlyView = lazy(() => import('./components/Monthly/MonthlyView'));

// Protected Route Component
function ProtectedRoute({ children, user, isCheckingAuth }) {
  const location = useLocation();

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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Main App Component
function MainApp({ user, onLogout }) {
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('currentView') || 'daily';
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const savedDate = localStorage.getItem('currentDate');
    return savedDate ? new Date(savedDate) : new Date();
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState('main');
  const lastDailyClickTime = useRef(0);

  const openSettings = (section = 'main') => {
    setSettingsInitialSection(section);
    setShowSettingsModal(true);
  };

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('currentDate', currentDate.toISOString());
  }, [currentDate]);

  const switchView = (view) => {
    setCurrentView(view);
  };

  const handleDailyClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastDailyClickTime.current;

    if (timeSinceLastClick < 300 && currentView === 'daily') {
      setCurrentDate(new Date());
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
              onClick={onLogout}
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

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Reset to today's date when logging in
    localStorage.setItem('currentDate', new Date().toISOString());
    localStorage.setItem('currentView', 'daily');
    const from = location.state?.from?.pathname || '/app';
    navigate(from, { replace: true });
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    // Reset to today's date when registering
    localStorage.setItem('currentDate', new Date().toISOString());
    localStorage.setItem('currentView', 'daily');
    navigate('/app', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Login Page */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/app" replace />
          ) : (
            <Login
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => navigate('/register')}
            />
          )
        }
      />

      {/* Register Page */}
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/app" replace />
          ) : (
            <Register
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => navigate('/login')}
            />
          )
        }
      />

      {/* Main App (Protected) */}
      <Route
        path="/app/*"
        element={
          <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
            <MainApp user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
