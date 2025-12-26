import { useState } from 'react';
import { api } from '../../utils/api';
import './Auth.css';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(email, password);

      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('서버와 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-brand-section">
        <div className="auth-brand-graphics">
          <div className="graphic-bg-gradient"></div>
          <div className="graphic-clock-face">
            <div className="clock-hand hour-hand"></div>
            <div className="clock-hand minute-hand"></div>
            <div className="clock-center"></div>
          </div>
          <div className="graphic-cards-container">
            <div className="glass-card card-top">
              <div className="card-line"></div>
              <div className="card-line short"></div>
            </div>
            <div className="glass-card card-middle">
              <div className="card-icon"></div>
              <div className="card-content"></div>
            </div>
            <div className="glass-card card-bottom">
              <div className="card-chart-bar"></div>
              <div className="card-chart-bar"></div>
              <div className="card-chart-bar"></div>
            </div>
          </div>
        </div>
        <div className="auth-brand-content">
          <h1 className="auth-brand-title">TimeTracker<br/>Diary</h1>
          <p className="auth-brand-subtitle">하루를 기록하고, 더 나은 내일을 계획하세요.</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-box">
          <h1 className="auth-title">로그인</h1>
          <p className="auth-subtitle">서비스 이용을 위해 로그인해주세요.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="link-button"
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
