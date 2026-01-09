import { useState, useEffect, useRef } from 'react';
import { getLocalDateString } from '../../utils/helpers';
import { api } from '../../utils/api';
import './EventEditModal.css';

const DEFAULT_TEMPLATE = `✦[실제] 오늘 실제로 한 것: :
✧[에너지] 0~10 중:
✧[칭찬] 칭찬하기 :
-------------------
✧Keep           :
✦Problem        :
✧TRY      :
`;

function Reflection({ value, onSave, currentDate, onAddTodo }) {
  const [text, setText] = useState(value || DEFAULT_TEMPLATE);
  const [customTemplate, setCustomTemplate] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templateText, setTemplateText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReflection, setAiReflection] = useState('');
  const [recommendedTasks, setRecommendedTasks] = useState([]);
  const [taskMessage, setTaskMessage] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadCustomTemplate();
  }, [value]);

  useEffect(() => {
    // 텍스트 내용이 변경될 때마다 높이 조절
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // 높이 초기화
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // 내용에 맞춰 높이 설정
    }
  }, [text]);

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
    setRecommendedTasks([]);
    setTaskMessage('');
    setSelectedTasks([]);

    try {
      const dateStr = getLocalDateString(currentDate);

      // 회고 API 한 번만 호출 (할일 추천도 포함)
      const reflectionResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/daily-reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: dateStr })
      });

      const result = await reflectionResponse.json();

      if (result.success) {
        // 회고 텍스트 설정
        setAiReflection(result.reflection);

        // 할일 추천 설정
        if (result.tasks && result.tasks.length > 0) {
          setRecommendedTasks(result.tasks);
          setSelectedTasks(result.tasks);
        }
      } else {
        console.error('AI 회고 생성 실패:', result.error);
        alert('AI 생성 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('AI 생성 오류:', error);
      alert('AI 생성 중 오류가 발생했습니다. ANTHROPIC_API_KEY가 설정되어 있는지 확인해주세요.');
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

  const handleToggleTask = (task) => {
    setSelectedTasks(prev => {
      if (prev.includes(task)) {
        return prev.filter(t => t !== task);
      } else {
        return [...prev, task];
      }
    });
  };

  const handleAddSelectedTasks = async () => {
    if (!currentDate || selectedTasks.length === 0) {
      alert('선택된 할일이 없습니다.');
      return;
    }

    if (!onAddTodo) {
      alert('할일 추가 기능을 사용할 수 없습니다.');
      return;
    }

    try {
      // 다음날 날짜 계산
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 선택된 태스크들을 추가
      for (const task of selectedTasks) {
        await onAddTodo(tomorrow, task);
      }

      alert(`${selectedTasks.length}개의 할일이 다음날에 추가되었습니다!`);
      setRecommendedTasks([]);
      setTaskMessage('');
      setSelectedTasks([]);
    } catch (error) {
      console.error('할일 추가 오류:', error);
      alert('할일 추가 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="reflection-container">
      <div className="section-header">
        <span>📝 오늘의 회고</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-category-settings-small"
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            title="AI 회고 및 내일 할일 추천"
            style={{
              cursor: isGeneratingAI ? 'not-allowed' : 'pointer',
              opacity: isGeneratingAI ? 0.7 : 1,
              backgroundColor: isGeneratingAI ? '#f7f6f3' : 'white'
            }}
          >
            {isGeneratingAI ? '⏳ 생성중...' : <><span style={{fontSize: '16px'}}>🤖</span> AI 회고 & 내일 할일</>}
          </button>
          <button
            className="btn-category-settings-small"
            onClick={handleOpenTemplateManager}
            title="템플릿 설정"
            style={{
              width: '38px',
              padding: 0
            }}
          >
            ⚙️
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

      {/* AI 할일 추천 결과 표시 */}
      {recommendedTasks.length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <strong style={{ fontSize: '16px', color: '#1a202c', fontWeight: '600' }}>AI 추천 다음날 할일</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px', 
                  backgroundColor: 'var(--primary-color)', 
                  color: 'var(--text-on-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: selectedTasks.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedTasks.length === 0 ? 0.6 : 1
                }}
                onClick={handleAddSelectedTasks}
                disabled={selectedTasks.length === 0}
              >
                선택한 항목 추가 ({selectedTasks.length})
              </button>
              <button
                className="btn-cancel"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#4a5568',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setRecommendedTasks([]);
                  setTaskMessage('');
                  setSelectedTasks([]);
                }}
              >
                닫기
              </button>
            </div>
          </div>

          {taskMessage && (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#4a5568',
              marginBottom: '16px',
              whiteSpace: 'pre-wrap',
              padding: '12px',
              backgroundColor: '#f7fafc',
              borderRadius: '8px'
            }}>
              {taskMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendedTasks.map((task, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  border: selectedTasks.includes(task) ? '1px solid var(--primary-color)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedTasks.includes(task) ? '0 0 0 1px var(--primary-color)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!selectedTasks.includes(task)) e.currentTarget.style.backgroundColor = '#f7fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: selectedTasks.includes(task) ? 'none' : '2px solid #cbd5e0',
                  backgroundColor: selectedTasks.includes(task) ? 'var(--primary-color)' : 'white',
                  marginRight: '12px',
                  transition: 'all 0.2s'
                }}>
                  {selectedTasks.includes(task) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="var(--text-on-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task)}
                  onChange={() => handleToggleTask(task)}
                  style={{ display: 'none' }} // Hide default checkbox
                />
                <span style={{
                  fontSize: '15px',
                  color: '#2d3748',
                  flex: 1,
                  fontWeight: '500'
                }}>
                  {task}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="reflection-textarea"
        placeholder="오늘 하루를 돌아보며..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ minHeight: '120px', overflowY: 'hidden' }}
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
