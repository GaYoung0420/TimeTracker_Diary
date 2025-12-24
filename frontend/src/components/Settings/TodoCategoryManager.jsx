import { useState } from 'react';
import './CategoryManager.css';

function TodoCategoryManager({ todoCategories, eventCategories, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEventCategoryId, setNewEventCategoryId] = useState(null);
  const [newColor, setNewColor] = useState('#4a9eff');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingEventCategoryId, setEditingEventCategoryId] = useState(null);
  const [editingColor, setEditingColor] = useState('#4a9eff');

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim(), newEventCategoryId, newColor);
      setNewName('');
      setNewEventCategoryId(null);
      setNewColor('#4a9eff');
      setIsAdding(false);
    }
  };

  const startEdit = (todoCategory) => {
    setEditingId(todoCategory.id);
    setEditingName(todoCategory.name);
    setEditingEventCategoryId(todoCategory.event_category_id || null);
    setEditingColor(todoCategory.color || '#4a9eff');
  };

  const saveEdit = () => {
    if (editingName.trim()) {
      onUpdate(editingId, editingName.trim(), editingEventCategoryId, editingColor);
      setEditingId(null);
      setEditingName('');
      setEditingEventCategoryId(null);
      setEditingColor('#4a9eff');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingEventCategoryId(null);
  };

  const getEventCategoryById = (id) => {
    return eventCategories?.find(c => c.id === id);
  };

  return (
    <div className="category-manager">
      <div className="category-manager-header">
        <h3>투두 카테고리 관리</h3>
        <button className="btn-add" onClick={() => setIsAdding(true)}>
          + 추가
        </button>
      </div>

      {isAdding && (
        <div className="category-edit-form">
          <div className="form-group">
            <label>카테고리 이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 개인, 업무, 학습..."
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>색상</label>
            <div className="color-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
              />
              <span className="color-value" style={{ fontSize: '13px', color: '#666' }}>{newColor}</span>
            </div>
          </div>
          <div className="form-group">
            <label>연결할 이벤트 카테고리 (선택)</label>
            <select
              value={newEventCategoryId || ''}
              onChange={(e) => setNewEventCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">-- 선택 안 함 --</option>
              {eventCategories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn-save" onClick={handleAdd}>저장</button>
            <button className="btn-cancel" onClick={() => {
              setIsAdding(false);
              setNewName('');
              setNewEventCategoryId(null);
            }}>취소</button>
          </div>
        </div>
      )}

      <div className="todo-category-list">
        {todoCategories?.length === 0 ? (
          <div className="empty-state">투두 카테고리가 없습니다</div>
        ) : (
          todoCategories?.map((todoCategory) => (
            editingId === todoCategory.id ? (
              <div key={todoCategory.id} className="category-edit-form">
                <div className="form-group">
                  <label>카테고리 이름</label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>색상</label>
                  <div className="color-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingColor}
                      onChange={(e) => setEditingColor(e.target.value)}
                      style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                    />
                    <span className="color-value" style={{ fontSize: '13px', color: '#666' }}>{editingColor}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>연결할 이벤트 카테고리</label>
                  <select
                    value={editingEventCategoryId || ''}
                    onChange={(e) => setEditingEventCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- 선택 안 함 --</option>
                    {eventCategories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button className="btn-save" onClick={saveEdit}>저장</button>
                  <button className="btn-cancel" onClick={cancelEdit}>취소</button>
                </div>
              </div>
            ) : (
              <div key={todoCategory.id} className="todo-category-item">
                <div className="todo-category-info">
                  <span className="todo-category-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className="category-color-dot"
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: todoCategory.color || '#4a9eff',
                        display: 'inline-block'
                      }}
                    />
                    {todoCategory.name}
                  </span>
                  {todoCategory.event_category_id && getEventCategoryById(todoCategory.event_category_id) && (
                    <span className="linked-event-category">
                      → {getEventCategoryById(todoCategory.event_category_id).name}
                      <span 
                        className="category-color-dot"
                        style={{ backgroundColor: getEventCategoryById(todoCategory.event_category_id).color }}
                      />
                    </span>
                  )}
                </div>
                <div className="category-actions">
                  <button className="btn-edit" onClick={() => startEdit(todoCategory)}>
                    수정
                  </button>
                  <button className="btn-delete" onClick={() => onDelete(todoCategory.id)}>
                    삭제
                  </button>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}

export default TodoCategoryManager;
