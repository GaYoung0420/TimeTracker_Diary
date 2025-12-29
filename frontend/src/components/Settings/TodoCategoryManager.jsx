import { useState } from 'react';
import './CategoryManager.css';

function TodoCategoryManager({ todoCategories, eventCategories, onAdd, onUpdate, onDelete, onClose }) {
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
    <div className="todo-category-manager">
      <div className="todo-manager-header">
        <h3>투두 카테고리 관리</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn-add-icon" 
            onClick={() => setIsAdding(true)}
            title="새 카테고리 추가"
          >
            +
          </button>
          {onClose && (
            <button
              className="btn-close-icon"
              onClick={onClose}
              title="닫기"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="todo-add-form">
          <div className="form-row">
            <input
              type="text"
              className="todo-input-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="카테고리 이름"
              autoFocus
            />
            <div className="color-picker-wrapper">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <select
              className="todo-select-event"
              value={newEventCategoryId || ''}
              onChange={(e) => setNewEventCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">-- 이벤트 카테고리 연결 (선택) --</option>
              {eventCategories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn-form-save" onClick={handleAdd}>추가</button>
            <button className="btn-form-cancel" onClick={() => {
              setIsAdding(false);
              setNewName('');
              setNewEventCategoryId(null);
            }}>취소</button>
          </div>
        </div>
      )}

      <div className="todo-manager-list">
        {todoCategories?.length === 0 ? (
          <div className="empty-state">투두 카테고리가 없습니다</div>
        ) : (
          todoCategories?.map((todoCategory) => (
            editingId === todoCategory.id ? (
              <div key={todoCategory.id} className="todo-manager-item editing">
                <div className="todo-edit-form">
                  <div className="form-row">
                    <input
                      type="text"
                      className="todo-input-name"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <select
                      className="todo-select-event"
                      value={editingEventCategoryId || ''}
                      onChange={(e) => setEditingEventCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">-- 이벤트 카테고리 연결 --</option>
                      {eventCategories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="btn-form-save" onClick={saveEdit}>저장</button>
                    <button className="btn-form-cancel" onClick={cancelEdit}>취소</button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={todoCategory.id} className="todo-manager-item">
                <div className="todo-item-content">
                  <div 
                    className="color-dot"
                    style={{ backgroundColor: todoCategory.color || '#4a9eff' }}
                  />
                  <span className="todo-item-name">{todoCategory.name}</span>
                  {todoCategory.event_category_id && getEventCategoryById(todoCategory.event_category_id) && (
                    <span className="linked-badge">
                      {getEventCategoryById(todoCategory.event_category_id).name}
                    </span>
                  )}
                </div>
                <div className="todo-item-actions">
                  <button
                    className="btn-icon-edit"
                    onClick={() => startEdit(todoCategory)}
                    title="수정"
                  >
                    ✎
                  </button>
                  <button
                    className="btn-icon-delete"
                    onClick={() => {
                      if (confirm('이 카테고리를 삭제하시겠습니까?')) {
                        onDelete(todoCategory.id);
                      }
                    }}
                    title="삭제"
                  >
                    ×
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
