import { useState } from 'react';

function RoutineGrid({ routines, routineChecks, onToggle, onAdd, onUpdate, onDelete }) {
  const [newRoutine, setNewRoutine] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (newRoutine.trim()) {
      onAdd(newRoutine.trim());
      setNewRoutine('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const startEdit = (routine, e) => {
    e.stopPropagation();
    setEditingId(routine.id);
    setEditText(routine.text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      onUpdate(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (routineId, e) => {
    e.stopPropagation();
    if (confirm('이 루틴을 삭제하시겠습니까?')) {
      onDelete(routineId);
    }
  };

  return (
    <div className="routine-container">
      <div className="section-header">
        <span>🔁 오늘의 루틴</span>
      </div>

      <div className="routine-input-group">
        <input
          type="text"
          className="routine-input"
          placeholder="새 루틴 추가..."
          value={newRoutine}
          onChange={(e) => setNewRoutine(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="btn" onClick={handleAdd}>추가</button>
      </div>

      <div className="routine-grid">
        {routines.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9b9a97' }}>루틴이 없습니다</div>
        ) : (
          routines.map((routine) => {
            const checked = routineChecks[routine.id] || false;
            const isEditing = editingId === routine.id;

            return (
              <div
                key={routine.id}
                className={`routine-card ${checked ? 'completed' : ''}`}
                onClick={() => !isEditing && onToggle(routine.id, !checked)}
              >
                {isEditing ? (
                  <div className="routine-edit-mode" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="routine-edit-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="routine-edit-actions">
                      <button className="routine-edit-btn save" onClick={saveEdit}>✓</button>
                      <button className="routine-edit-btn cancel" onClick={cancelEdit}>✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="routine-title">{routine.text}</div>
                    <div className="routine-actions">
                      <button
                        className="routine-action-btn edit"
                        onClick={(e) => startEdit(routine, e)}
                        title="수정"
                      >
                        ✎
                      </button>
                      <button
                        className="routine-action-btn delete"
                        onClick={(e) => handleDelete(routine.id, e)}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                    <div className="routine-check">
                      {checked ? '✓' : ''}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RoutineGrid;
