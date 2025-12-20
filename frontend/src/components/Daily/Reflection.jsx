import { useState } from 'react';

function Reflection({ value, onSave }) {
  const [text, setText] = useState(value || '');

  const handleSave = () => {
    onSave(text);
    alert('회고가 저장되었습니다!');
  };

  const defaultTemplate = `✦[실제] 오늘 실제로 한 것: :
✧[에너지] 0~10 중:
✧[칭찬] 칭찬하기 :
-------------------
✧Keep           :
✦Problem        :
✧TRY      :
 `;

  return (
    <div className="reflection-container">
      <div className="section-header">📝 오늘의 회고</div>
      <div className="reflection-prompts">
        <div>💭 오늘 가장 기억에 남는 일은?</div>
        <div>✨ 오늘 배운 점이나 느낀 점은?</div>
        <div>🎯 내일은 무엇을 해볼까?</div>
      </div>
      <textarea
        className="reflection-textarea"
        placeholder="오늘 하루를 돌아보며..."
        value={text || defaultTemplate}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn" style={{ marginTop: '12px', width: '100%' }} onClick={handleSave}>
        저장하기
      </button>
    </div>
  );
}

export default Reflection;
