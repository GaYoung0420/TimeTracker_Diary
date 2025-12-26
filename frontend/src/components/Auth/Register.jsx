import { useState } from 'react';
import { api } from '../../utils/api';
import './Auth.css';

export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const result = await api.register(email, password, username || null);

      if (result.success) {
        onRegisterSuccess(result.user);
      } else {
        setError(result.message || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('서버와 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-brand-section">
        <div className="auth-brand-graphics">
          <div className="graphic-circle circle-1"></div>
          <div className="graphic-circle circle-2"></div>
          <div className="graphic-circle circle-3"></div>
        </div>
        <div className="auth-brand-content">
          <h1 className="auth-brand-title">TimeTracker<br/>Diary</h1>
          <p className="auth-brand-subtitle">하루를 기록하고, 더 나은 내일을 계획하세요.</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-box">
          <h1 className="auth-title">회원가입</h1>
          <p className="auth-subtitle">새로운 계정을 만들어보세요.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">이메일 *</label>
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
              <label htmlFor="username">이름 (선택)</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">비밀번호 *</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자 이상"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인 *</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="link-button"
              >
                로그인
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
