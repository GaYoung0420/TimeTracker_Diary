import { useState } from 'react';
import { api } from '../../utils/api';
import './CategoryManager.css';

function CategoryManager({ categories, onCategoriesChange }) {
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
    <div className="category-manager">
      <div className="category-manager-header">
        <h3>카테고리 관리</h3>
        {!isAdding && (
          <button className="btn-add-category" onClick={() => setIsAdding(true)}>
            + 추가
          </button>
        )}
      </div>

      {/* Add New Category Form */}
      {isAdding && (
        <div className="category-form">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="카테고리 이름"
            className="category-name-input"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(e) => setNewCategoryColor(e.target.value)}
            className="category-color-picker"
          />
          <div className="category-form-actions">
            <button className="btn-save" onClick={handleAdd}>
              저장
            </button>
            <button className="btn-cancel" onClick={() => {
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
      <div className="category-list">
        {categories && categories.length > 0 ? (
          categories.map(cat => (
            <div key={cat.id} className="category-item">
              {editingId === cat.id ? (
                <div className="category-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="category-name-input"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="category-color-picker"
                  />
                  <div className="category-form-actions">
                    <button className="btn-save" onClick={() => handleEdit(cat.id)}>
                      저장
                    </button>
                    <button className="btn-cancel" onClick={cancelEdit}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="category-info">
                    <span
                      className="category-color-box"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span className="category-name">{cat.name}</span>
                  </div>
                  <div className="category-actions">
                    <button className="btn-edit" onClick={() => startEdit(cat)}>
                      수정
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(cat.id)}>
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="no-categories">카테고리가 없습니다. 추가해주세요.</div>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;
