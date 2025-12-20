import { api } from '../../utils/api';

function QuickActions({ currentDate, onDateChange }) {
  const dateKey = currentDate.toISOString().split('T')[0];

  const handleFeedback = async () => {
    const feedbackText = prompt('피드백을 입력하세요:');
    if (feedbackText && feedbackText.trim()) {
      try {
        const result = await api.saveFeedback(dateKey, feedbackText.trim());
        if (result.success) {
          alert('피드백이 저장되었습니다!');
        } else {
          alert('피드백 저장 실패: ' + result.error);
        }
      } catch (error) {
        console.error('Failed to save feedback:', error);
        alert('피드백 저장 중 오류가 발생했습니다.');
      }
    }
  };

  const handle10AMWake = async () => {
    const confirmed = confirm('10시 기상 일정을 생성하시겠습니까?');
    if (confirmed) {
      try {
        const result = await api.create10AMWake(dateKey);
        if (result.success) {
          alert('10시 기상 일정이 생성되었습니다!');
          // Reload calendar events
          window.location.reload();
        } else {
          alert('일정 생성 실패: ' + result.error);
        }
      } catch (error) {
        console.error('Failed to create wake event:', error);
        alert('일정 생성 중 오류가 발생했습니다.');
      }
    }
  };

  const handlePlanYesterday = () => {
    const confirmed = confirm('전날로 이동하시겠습니까?');
    if (confirmed) {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);

      if (onDateChange) {
        onDateChange(yesterday);
      } else {
        // Fallback if onDateChange is not provided
        alert('전날 계획 기능: ' + yesterday.toISOString().split('T')[0]);
      }
    }
  };

  return (
    <div className="quick-actions">
      <button className="quick-action-btn" onClick={handleFeedback}>
        <span className="btn-icon">📝</span>
        <span className="btn-label">피드백 작성</span>
      </button>
      <button className="quick-action-btn" onClick={handle10AMWake}>
        <span className="btn-icon">⏰</span>
        <span className="btn-label">10시 기상</span>
      </button>
      <button className="quick-action-btn" onClick={handlePlanYesterday}>
        <span className="btn-icon">📅</span>
        <span className="btn-label">전날 계획 세우기</span>
      </button>
    </div>
  );
}

export default QuickActions;
