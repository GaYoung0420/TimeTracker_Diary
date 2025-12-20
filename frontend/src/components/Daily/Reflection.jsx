import { useState, useEffect } from 'react';

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

  useEffect(() => {
    setText(value || DEFAULT_TEMPLATE);
  }, [value]);

  const handleSave = () => {
    onSave(text);
    alert('회고가 저장되었습니다!');
  };

  const handleUseTemplate = () => {
    setText(DEFAULT_TEMPLATE);
  };

  return (
    <div className="reflection-container">
      <div className="section-header">
        <span>📝 오늘의 회고</span>
        {text !== DEFAULT_TEMPLATE && (
          <button
            className="template-btn"
            onClick={handleUseTemplate}
            title="기본 템플릿 불러오기"
          >
            📋 템플릿
          </button>
        )}
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
    </div>
  );
}

export default Reflection;
