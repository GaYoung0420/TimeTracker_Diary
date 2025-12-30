import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <h1 className="landing-title">TimeTracker Diary</h1>
        <p className="landing-subtitle">시간을 기록하고, 일상을 되돌아보세요</p>

        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>일일 타임라인</h3>
            <p>하루의 모든 활동을 타임라인으로 기록하고 관리하세요</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>월간 통계</h3>
            <p>한 달간의 시간 사용 패턴을 한눈에 확인하세요</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>할일 관리</h3>
            <p>할일을 계획하고 완료하며 생산성을 높이세요</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>루틴 추적</h3>
            <p>매일의 루틴을 체크하고 습관을 만들어가세요</p>
          </div>
        </div>

        <div className="landing-cta">
          <button
            className="cta-button primary"
            onClick={() => navigate('/login')}
          >
            시작하기
          </button>
        </div>
      </div>

      <div className="landing-footer">
        <p>© 2024 TimeTracker Diary. All rights reserved.</p>
      </div>
    </div>
  );
}

export default LandingPage;
