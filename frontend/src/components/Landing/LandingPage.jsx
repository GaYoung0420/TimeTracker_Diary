import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const faqData = [
    {
      question: "무료인가요?",
      answer: "네, 현재 모든 기능을 무료로 제공합니다."
    },
    {
      question: "데이터는 안전한가요?",
      answer: "Supabase 엔터프라이즈급 암호화와 사용자별 완전 격리로 안전하게 보호됩니다."
    },
    {
      question: "모바일에서도 사용할 수 있나요?",
      answer: "네, 반응형 디자인으로 모바일/태블릿/데스크톱 모두 최적화되어 있습니다."
    },
    {
      question: "캘린더 연동은 어떻게 하나요?",
      answer: "Google 로그인 시 자동 연동되며, iCloud/Outlook은 설정에서 ICS URL만 입력하면 됩니다."
    },
    {
      question: "기존 생산성 도구에서 데이터를 가져올 수 있나요?",
      answer: "현재는 수동 입력이 필요하지만, 향후 CSV 임포트 기능을 준비 중입니다."
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="nav-logo">
            <span className="logo-icon">⏱️</span>
            <span className="logo-text">TimeTracker Diary</span>
          </div>
          <div className="nav-menu">
            <button className="nav-link" onClick={() => scrollToSection('features')}>기능</button>
            <button className="nav-link" onClick={() => scrollToSection('how-to-use')}>사용법</button>
            <button className="nav-link" onClick={() => scrollToSection('pricing')}>요금</button>
            <button className="nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
          </div>
          <div className="nav-auth">
            <button className="btn-text" onClick={() => navigate('/login')}>로그인</button>
            <button className="btn-primary" onClick={() => navigate('/register')}>무료로 시작하기</button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            하루를 <span className="highlight">계획</span>하고, <br />
            <span className="highlight">실행</span>하고, <span className="highlight">돌아보는</span><br />
            똑똑한 방법
          </h1>
          <p className="hero-subtitle">
            할일, 타임라인, 루틴, 회고까지.<br />
            흩어진 생산성 도구들을 하나로 통합하세요.
          </p>
          <div className="hero-cta">
            <button className="btn-primary btn-lg" onClick={() => navigate('/register')}>
              👉 무료로 시작하기
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="dashboard-preview">
            {/* Abstract representation of the dashboard */}
            <div className="preview-header"></div>
            <div className="preview-body">
              <div className="preview-sidebar"></div>
              <div className="preview-content">
                <div className="preview-chart"></div>
                <div className="preview-list">
                  <div className="preview-item"></div>
                  <div className="preview-item"></div>
                  <div className="preview-item"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="landing-section-header">
          <h2>생산성 앱은 많은데, 왜 더 바쁘게 느껴질까요?</h2>
        </div>
        <div className="problem-grid">
          <div className="problem-card">
            <div className="problem-icon">🔄</div>
            <p>할일은 Todoist, 시간은 Toggl, 습관은 Habitica...<br />앱을 왔다갔다하며 시간 낭비</p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">📊</div>
            <p>각 앱의 데이터가 따로 놀아서<br />내 하루를 한눈에 볼 수 없음</p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">🗓️</div>
            <p>캘린더 일정과 실제 내 계획이<br />따로 관리됨</p>
          </div>
          <div className="problem-card">
            <div className="problem-icon">😵</div>
            <p>결국 "오늘 뭐했지?" 하며<br />하루를 마무리</p>
          </div>
        </div>
        <div className="problem-solution-arrow">⬇</div>
        <div className="problem-conclusion">
          <h3>이제 하나의 공간에서 모든 것을 관리하세요.</h3>
        </div>
      </section>

      {/* Solution Section */}
      <section className="solution-section">
        <div className="landing-section-header">
          <h2>TimeTracker Diary는<br />당신의 하루를 위한 올인원 운영체제입니다</h2>
        </div>
        <div className="solution-values">
          <div className="value-item">
            <span className="check-icon">✨</span>
            <span>계획부터 실행, 회고까지 한 화면에서</span>
          </div>
          <div className="value-item">
            <span className="check-icon">✨</span>
            <span>시각화된 타임라인으로 시간이 어디로 가는지 명확하게</span>
          </div>
          <div className="value-item">
            <span className="check-icon">✨</span>
            <span>캘린더 연동으로 업무 일정과 개인 계획 통합 관리</span>
          </div>
          <div className="value-item">
            <span className="check-icon">✨</span>
            <span>데이터 기반 인사이트로 나만의 생산성 패턴 발견</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="landing-section-header">
          <h2>핵심 기능</h2>
          <p>생산성을 높이고 삶의 균형을 찾는데 필요한 모든 도구</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">🎯</div>
            <h3>스마트 데일리 뷰</h3>
            <p>드래그 앤 드롭 타임라인, 투두리스트, 포모도로 타이머, 루틴 트래커를 한 화면에서 관리하세요.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">📊</div>
            <h3>월간 뷰 & 통계</h3>
            <p>히트맵으로 월간 패턴을 파악하고, 루틴 달성률과 카테고리별 시간 사용 통계를 확인하세요.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">🔗</div>
            <h3>캘린더 통합</h3>
            <p>Google, iCloud, Outlook 캘린더를 자동으로 연동하여 모든 일정을 한곳에서 확인하세요.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">🎨</div>
            <h3>완전한 커스터마이징</h3>
            <p>나만의 카테고리와 색상을 설정하고, 내 스타일대로 하루를 디자인하세요.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">📝</div>
            <h3>회고 & 감정 기록</h3>
            <p>하루의 기분을 기록하고, 일기와 사진으로 소중한 순간을 저장하세요.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">🔐</div>
            <h3>안전한 멀티유저</h3>
            <p>Google 계정으로 1초 만에 시작하고, 엔터프라이즈급 보안으로 데이터를 안전하게 보호하세요.</p>
          </div>
        </div>
      </section>

      {/* Scenario Section */}
      <section id="how-to-use" className="workflow-section">
        <div className="landing-section-header">
          <h2>TimeTracker Diary와 함께하는 하루</h2>
        </div>
        <div className="workflow-steps">
          <div className="step">
            <div className="step-time">아침 8시</div>
            <h3>하루 계획하기 📅</h3>
            <p>캘린더 일정 확인, 투두 정리,<br />아침 루틴 체크</p>
          </div>
          <div className="step-divider">→</div>
          <div className="step">
            <div className="step-time">낮 12시</div>
            <h3>집중 실행하기 🍅</h3>
            <p>포모도로 타이머로 집중,<br />완료 시 타임라인 자동 기록</p>
          </div>
          <div className="step-divider">→</div>
          <div className="step">
            <div className="step-time">저녁 10시</div>
            <h3>하루 회고하기 ✍️</h3>
            <p>계획 vs 실제 비교,<br />감정 및 일기 작성</p>
          </div>
        </div>
      </section>

      {/* Differentiation Section */}
      <section className="differentiation-section">
        <div className="landing-section-header">
          <h2>왜 TimeTracker Diary인가요?</h2>
        </div>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>기존 앱들</th>
                <th>구분</th>
                <th className="highlight-col">TimeTracker Diary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>할일 따로, 시간 기록 따로</td>
                <td>통합성</td>
                <td className="highlight-col">✅ 투두 완료 즉시 타임라인 기록</td>
              </tr>
              <tr>
                <td>계획한 시간 vs 실제 비교 불가</td>
                <td>분석</td>
                <td className="highlight-col">✅ 계획/실제 구분으로 정확한 분석</td>
              </tr>
              <tr>
                <td>캘린더 일정 따로 관리</td>
                <td>연동</td>
                <td className="highlight-col">✅ 모든 캘린더 자동 통합</td>
              </tr>
              <tr>
                <td>데이터가 각 앱에 흩어짐</td>
                <td>인사이트</td>
                <td className="highlight-col">✅ 한곳에서 모든 인사이트 확인</td>
              </tr>
              <tr>
                <td>단순 기록만 가능</td>
                <td>기록</td>
                <td className="highlight-col">✅ 감정 + 사진 + 회고까지 풍부한 기록</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="landing-section-header">
          <h2>요금 안내</h2>
          <p>복잡한 요금제 없이, 모든 기능을 무료로 시작하세요.</p>
        </div>
        <div className="pricing-card">
          <div className="pricing-header">
            <h3>Free Plan</h3>
            <div className="price">₩0 <span className="period">/ 월</span></div>
            <p>개인 사용자를 위한 모든 기능 포함</p>
          </div>
          <div className="pricing-features">
            <ul>
              <li>✅ 무제한 타임라인 기록</li>
              <li>✅ 모든 통계 및 분석</li>
              <li>✅ 캘린더 연동 (Google, iCloud, Outlook)</li>
              <li>✅ 포모도로 타이머</li>
              <li>✅ 사진 업로드 및 일기</li>
            </ul>
          </div>
          <button className="btn-primary btn-full" onClick={() => navigate('/register')}>
            지금 무료로 시작하기
          </button>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="landing-section-header">
          <h2>견고하고 안전한 기술</h2>
        </div>
        <div className="trust-grid">
          <div className="trust-item">
            <span className="trust-icon">⚛️</span>
            <span>React 18 + Vite</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🛡️</span>
            <span>Supabase Security</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">☁️</span>
            <span>Oracle Cloud</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>OAuth 2.0 인증</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="landing-section-header">
          <h2>자주 묻는 질문</h2>
        </div>
        <div className="faq-list">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${openFaqIndex === index ? 'active' : ''}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-question">
                <h3>{faq.question}</h3>
                <span className="faq-toggle-icon">
                  {openFaqIndex === index ? '−' : '+'}
                </span>
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bottom-cta-section">
        <div className="bottom-cta-content">
          <h2>복잡한 생산성 도구는 이제 그만.<br />하나로 시작하세요.</h2>
          <div className="cta-benefits">
            <span>✅ 완전 무료</span>
            <span>✅ 30초 회원가입</span>
            <span>✅ 캘린더 자동 연동</span>
          </div>
          <button className="btn-primary btn-xl" onClick={() => navigate('/register')}>
            무료로 시작하기
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-text">TimeTracker Diary</span>
            <p>당신의 하루를 더 의미있게</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>서비스</h4>
              <a href="#">주요 기능</a>
              <a href="#">업데이트 소식</a>
              <a href="#">로드맵</a>
            </div>
            <div className="link-group">
              <h4>지원</h4>
              <a href="#">FAQ</a>
              <a href="#">문의하기</a>
              <a href="#">이용약관</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 TimeTracker Diary. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
