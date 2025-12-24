import { useState } from 'react';
import './EventEditModal.css';

function EventEditModal({ event, categories, onUpdate, onDelete, onClose }) {
  const [title, setTitle] = useState(event.title);
  const [startTime, setStartTime] = useState(event.start_time || event.start.split('T')[1].substring(0, 5));
  const [endTime, setEndTime] = useState(event.end_time || event.end.split('T')[1].substring(0, 5));
  const [category, setCategory] = useState(event.category);
  const [description, setDescription] = useState(event.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(event.id, {
      title,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      category,
      description
    });
  };

  const handleDelete = () => {
    if (window.confirm('이 이벤트를 삭제하시겠습니까?')) {
      onDelete(event.id);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>이벤트 수정</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="이벤트 제목"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>시작 시간</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>종료 시간</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이벤트 설명 (선택사항)"
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-delete" onClick={handleDelete}>
              삭제
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn-submit">
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventEditModal;
