import { useState } from 'react';
import { api } from '../../utils/api';
import './CategoryManager.css';

function CategoryManager({ categories, onCategoriesChange, onClose }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#16a765');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const result = await api.createCategory(newCategoryName.trim(), newCategoryColor);
      if (result.success) {
        onCategoriesChange();
        setNewCategoryName('');
        setNewCategoryColor('#16a765');
        setIsAdding(false);
      } else {
        alert('카테고리 추가 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('카테고리 추가 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;

    try {
      const result = await api.updateCategory(id, {
        name: editName.trim(),
        color: editColor
      });
      if (result.success) {
        onCategoriesChange();
        setEditingId(null);
        setEditName('');
        setEditColor('');
      } else {
        alert('카테고리 수정 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('카테고리 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까? (사용 중인 카테고리는 삭제할 수 없습니다)')) {
      return;
    }

    try {
      const result = await api.deleteCategory(id);
      if (result.success) {
        onCategoriesChange();
      } else {
        alert('카테고리 삭제 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  return (
    <div className="todo-category-manager">
      <div className="todo-manager-header">
        <h3>카테고리 관리</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isAdding && (
            <button 
              className="btn-add-icon" 
              onClick={() => setIsAdding(true)}
              title="새 카테고리 추가"
            >
              +
            </button>
          )}
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

      {/* Add New Category Form */}
      {isAdding && (
        <div className="todo-add-form">
          <div className="form-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="카테고리 이름"
              className="todo-input-name"
              autoFocus
            />
            <div className="color-picker-wrapper">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-form-save" onClick={handleAdd}>
              저장
            </button>
            <button className="btn-form-cancel" onClick={() => {
              setIsAdding(false);
              setNewCategoryName('');
              setNewCategoryColor('#16a765');
            }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="todo-manager-list">
        {categories && categories.length > 0 ? (
          categories.map(cat => (
            <div key={cat.id} className={`todo-manager-item ${editingId === cat.id ? 'editing' : ''}`}>
              {editingId === cat.id ? (
                <div className="todo-edit-form">
                  <div className="form-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="todo-input-name"
                      autoFocus
                    />
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn-form-save" onClick={() => handleEdit(cat.id)}>
                      저장
                    </button>
                    <button className="btn-form-cancel" onClick={cancelEdit}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="todo-item-content">
                    <div 
                      className="color-dot"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="todo-item-name">{cat.name}</span>
                  </div>
                  <div className="todo-item-actions">
                    <button 
                      className="btn-icon-edit" 
                      onClick={() => startEdit(cat)}
                      title="수정"
                    >
                      ✎
                    </button>
                    <button 
                      className="btn-icon-delete" 
                      onClick={() => handleDelete(cat.id)}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">카테고리가 없습니다. 추가해주세요.</div>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;
