import { useState } from 'react';
import PomodoroTimer from './PomodoroTimer';
import { api } from '../../utils/api';
import pomoSvg from './pomo.svg';

const TODO_CATEGORIES = [
  { name: '🐰 영적', emoji: '🐰', color: '#FFB4C4' },
  { name: '💡 IAE LAB', emoji: '💡', color: '#C4B4FF' },
  { name: '💻 취업 준비', emoji: '💻', color: '#B4FFC4' },
  { name: '😊 개인', emoji: '😊', color: '#FFFFC4' },
  { name: '🏢 회사', emoji: '🏢', color: '#B4E4FF' }
];

function TodoList({ todos, onAdd, onUpdate, onDelete, onReorder }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activePomodoroId, setActivePomodoroId] = useState(null);

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim(), selectedCategory);
      setInputValue('');
      setSelectedCategory(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
    setEditingCategory(todo.category || null);
  };

  const saveEdit = (id) => {
    if (editingText.trim()) {
      onUpdate(id, { text: editingText.trim(), category: editingCategory });
    }
    setEditingId(null);
    setEditingText('');
    setEditingCategory(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    setEditingCategory(null);
  };

  const handleEditKeyPress = (e, id) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleDragStart = (e, todo) => {
    setDraggedItem(todo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTodo) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetTodo.id) {
      setDraggedItem(null);
      return;
    }

    const sortedTodos = [...todos].sort((a, b) => a.order - b.order);
    const draggedIndex = sortedTodos.findIndex(t => t.id === draggedItem.id);
    const targetIndex = sortedTodos.findIndex(t => t.id === targetTodo.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder the array
    const newTodos = [...sortedTodos];
    const [removed] = newTodos.splice(draggedIndex, 1);
    newTodos.splice(targetIndex, 0, removed);

    // Update order values
    const updates = newTodos.map((todo, index) => ({
      id: todo.id,
      order: index
    }));

    onReorder(updates);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Sort todos by order
  const sortedTodos = [...todos].sort((a, b) => a.order - b.order);

  const getCategoryColor = (categoryName) => {
    const category = TODO_CATEGORIES.find(c => c.name === categoryName);
    return category ? category.color : '#a8a8a8';
  };

  const handleStartPomodoro = (todoId) => {
    setActivePomodoroId(todoId);
  };

  const handlePomodoroComplete = async (todoId) => {
    try {
      const result = await api.incrementPomodoro(todoId);
      if (result.success) {
        // Refresh the todo to show updated pomodoro count
        onUpdate(todoId, {});
      }
    } catch (error) {
      console.error('Failed to increment pomodoro:', error);
    }
  };

  const handleClosePomodoro = () => {
    setActivePomodoroId(null);
  };

  const renderTomatoIcons = (count) => {
    if (!count || count === 0) return null;

    return (
      <div className="pomodoro-tomatoes" style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
        {Array.from({ length: count }).map((_, index) => (
          <img
            key={index}
            src={pomoSvg}
            alt="pomodoro"
            width="16"
            height="16"
            style={{ display: 'block' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="todo-container">
      <div className="section-header">✅ 오늘 할 일</div>

      <div className="todo-input-group">
        <input
          type="text"
          className="todo-input"
          placeholder="할 일을 입력하세요..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="btn" onClick={handleAdd}>추가</button>
      </div>

      <div className="todo-category-selector">
        {TODO_CATEGORIES.map((category) => (
          <button
            key={category.name}
            className={`category-chip ${selectedCategory === category.name ? 'selected' : ''}`}
            style={{
              backgroundColor: selectedCategory === category.name ? category.color : '#f0f0f0',
              color: selectedCategory === category.name ? '#ffffff' : '#666666'
            }}
            onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <ul className="todo-list">
        {sortedTodos.length === 0 ? (
          <li style={{ textAlign: 'left', fontSize: '13px', color: '#9b9a97', padding: '8px 0', listStyle: 'none' }}>
            할 일이 없습니다
          </li>
        ) : (
          sortedTodos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${draggedItem?.id === todo.id ? 'dragging' : ''}`}
              draggable={editingId !== todo.id}
              onDragStart={(e) => handleDragStart(e, todo)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, todo)}
              onDragEnd={handleDragEnd}
            >
              <span className="todo-drag-handle">⋮</span>
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.completed}
                onChange={() => onUpdate(todo.id, { completed: !todo.completed })}
              />
              {editingId === todo.id ? (
                <div className="todo-edit-container">
                  <input
                    type="text"
                    className="todo-edit-input"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyPress(e, todo.id)}
                    onBlur={() => saveEdit(todo.id)}
                    autoFocus
                  />
                  <div className="todo-edit-categories">
                    {TODO_CATEGORIES.map((category) => (
                      <button
                        key={category.name}
                        className={`category-chip-small ${editingCategory === category.name ? 'selected' : ''}`}
                        style={{
                          backgroundColor: editingCategory === category.name ? category.color : '#f0f0f0',
                          color: editingCategory === category.name ? '#ffffff' : '#666666'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(editingCategory === category.name ? null : category.name);
                        }}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="todo-content">
                  <span
                    className={`todo-text ${todo.completed ? 'completed' : ''}`}
                    onDoubleClick={() => startEdit(todo)}
                  >
                    {todo.text}
                  </span>
                  {todo.category && (
                    <span
                      className="todo-category-badge"
                      style={{ backgroundColor: getCategoryColor(todo.category) }}
                    >
                      {todo.category}
                    </span>
                  )}
                  {renderTomatoIcons(todo.pomodoro_count)}
                  <button
                    className="pomodoro-start-btn"
                    onClick={() => handleStartPomodoro(todo.id)}
                    title="뽀모도로 시작"
                  >
                    🍅
                  </button>
                </div>
              )}
              <button className="todo-delete" onClick={() => onDelete(todo.id)}>
                ×
              </button>
            </li>
          ))
        )}
      </ul>

      {activePomodoroId && (
        <PomodoroTimer
          todoId={activePomodoroId}
          todoText={sortedTodos.find(t => t.id === activePomodoroId)?.text || ''}
          pomodoroCount={sortedTodos.find(t => t.id === activePomodoroId)?.pomodoro_count || 0}
          onComplete={() => handlePomodoroComplete(activePomodoroId)}
          onClose={handleClosePomodoro}
        />
      )}
    </div>
  );
}

export default TodoList;
