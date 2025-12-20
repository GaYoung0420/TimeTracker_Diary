import { useState } from 'react';

function TodoList({ todos, onAdd, onUpdate, onDelete }) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
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

      <ul className="todo-list">
        {todos.length === 0 ? (
          <li style={{ textAlign: 'left', fontSize: '13px', color: '#9b9a97', padding: '8px 0', listStyle: 'none' }}>
            할 일이 없습니다
          </li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className="todo-item">
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.completed}
                onChange={() => onUpdate(todo.id, { completed: !todo.completed })}
              />
              <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                {todo.text}
              </span>
              <button className="todo-delete" onClick={() => onDelete(todo.id)}>
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default TodoList;
