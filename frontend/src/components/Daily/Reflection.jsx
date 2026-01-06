import { useState, useEffect } from 'react';
import { getLocalDateString } from '../../utils/helpers';
import './EventEditModal.css';

const DEFAULT_TEMPLATE = `✦[실제] 오늘 실제로 한 것: :
✧[에너지] 0~10 중:
✧[칭찬] 칭찬하기 :
-------------------
✧Keep           :
✦Problem        :
✧TRY      :
`;

function Reflection({ value, onSave, currentDate }) {
  const [text, setText] = useState(value || DEFAULT_TEMPLATE);
  const [customTemplate, setCustomTemplate] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateText, setTemplateText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReflection, setAiReflection] = useState('');

  useEffect(() => {
    loadCustomTemplate();
  }, [value]);

  const loadCustomTemplate = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reflection-template`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success && result.data) {
        setCustomTemplate(result.data.template);
        // If no saved reflection for this date, use custom template or default
        setText(value || result.data.template || DEFAULT_TEMPLATE);
      } else {
        // No custom template, use value or default
        setText(value || DEFAULT_TEMPLATE);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      setText(value || DEFAULT_TEMPLATE);
    }
  };

  const handleSave = () => {
    onSave(text);
    alert('회고가 저장되었습니다!');
  };

  const handleSaveTemplate = async () => {
    if (!templateText.trim()) {
      alert('템플릿 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reflection-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ template: templateText })
      });

      const result = await response.json();
      if (result.success) {
        setCustomTemplate(templateText);
        setShowTemplateManager(false);
        setTemplateText('');
        // Apply the template immediately if there's no saved reflection
        if (!value) {
          setText(templateText);
        }
        alert('템플릿이 저장되었습니다!');
      } else {
        alert('템플릿 저장 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  const handleOpenTemplateManager = () => {
    setTemplateText(customTemplate || DEFAULT_TEMPLATE);
    setShowTemplateManager(true);
  };

  const handleGenerateAI = async () => {
    if (!currentDate) {
      alert('날짜 정보가 없습니다.');
      return;
    }

    setIsGeneratingAI(true);
    setAiReflection('');

    try {
      // Vite proxy를 사용하므로 상대 경로로 호출
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const dateStr = getLocalDateString(currentDate); // 한국 시간 기준 YYYY-MM-DD
      const response = await fetch(`${apiUrl}/api/ai/daily-reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ date: dateStr })
      });

      const result = await response.json();

      if (result.success) {
        setAiReflection(result.reflection);
        // 선택적으로 자동으로 텍스트에 추가
        // setText(prev => prev + '\n\n--- AI 회고 ---\n' + result.reflection);
      } else {
        alert('AI 회고 생성 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('AI 회고 생성 오류:', error);
      alert('AI 회고 생성 중 오류가 발생했습니다. ANTHROPIC_API_KEY가 설정되어 있는지 확인해주세요.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplyAI = () => {
    if (aiReflection) {
      setText(prev => {
        // 기존 텍스트가 기본 템플릿이면 AI 회고로 대체
        if (prev === DEFAULT_TEMPLATE || prev === customTemplate) {
          return aiReflection;
        }
        // 아니면 추가
        return prev + '\n\n--- AI 회고 ---\n' + aiReflection;
      });
      setAiReflection('');
    }
  };

  return (
    <div className="reflection-container">
      <div className="section-header">
        <span>📝 오늘의 회고</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="template-btn template-btn-manage"
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            title="AI 회고 생성"
            style={{
              backgroundColor: isGeneratingAI ? '#cbd5e0' : '#667eea',
              color: 'white',
              cursor: isGeneratingAI ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingAI ? '⏳ 생성중...' : '🤖 AI 회고'}
          </button>
          <button
            className="template-btn template-btn-manage"
            onClick={handleOpenTemplateManager}
            title="템플릿 관리"
          >
            ⚙️ 템플릿 설정
          </button>
        </div>
      </div>

      {/* AI 회고 결과 표시 */}
      {aiReflection && (
        <div style={{
          marginBottom: '12px',
          padding: '16px',
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong>🤖 AI 생성 회고</strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={handleApplyAI}
              >
                추가하기
              </button>
              <button
                className="btn-cancel"
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => setAiReflection('')}
              >
                닫기
              </button>
            </div>
          </div>
          <div style={{
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#2d3748'
          }}>
            {aiReflection}
          </div>
        </div>
      )}

      <textarea
        className="reflection-textarea"
        placeholder="오늘 하루를 돌아보며..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn" style={{ marginTop: '12px', width: '100%' }} onClick={handleSave}>
        저장하기
      </button>

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div className="modal-overlay" onClick={() => setShowTemplateManager(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>회고 템플릿 설정</h2>
            
            <div className="modal-scroll-content">
              <div className="form-group">
                <label>템플릿 내용</label>
                <textarea
                  className="template-textarea"
                  placeholder="나만의 회고 템플릿을 작성하세요..."
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={10}
                  style={{ width: '100%', minHeight: '200px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <div className="modal-actions-right">
                <button className="btn-cancel" onClick={() => setShowTemplateManager(false)}>
                  취소
                </button>
                <button className="btn-submit" onClick={handleSaveTemplate}>
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reflection;
