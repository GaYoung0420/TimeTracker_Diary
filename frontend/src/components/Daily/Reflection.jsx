import { useState, useEffect } from 'react';
import './EventEditModal.css';

const DEFAULT_TEMPLATE = `✦[실제] 오늘 실제로 한 것: :
✧[에너지] 0~10 중:
✧[칭찬] 칭찬하기 :
-------------------
✧Keep           :
✦Problem        :
✧TRY      :
`;

function Reflection({ value, onSave }) {
  const [text, setText] = useState(value || DEFAULT_TEMPLATE);
  const [customTemplate, setCustomTemplate] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateText, setTemplateText] = useState('');

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

  return (
    <div className="reflection-container">
      <div className="section-header">
        <span>📝 오늘의 회고</span>
        <button
          className="template-btn template-btn-manage"
          onClick={handleOpenTemplateManager}
          title="템플릿 관리"
        >
          ⚙️ 템플릿 설정
        </button>
      </div>
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
