import { useState } from 'react';
import confetti from 'canvas-confetti';
import PomodoroTimer from './PomodoroTimer';
import HamsterFaceIcon from './HamsterFaceIcon';
import { api } from '../../utils/api';
import pomoSvg from './pomo.svg';

function TodoList({ todos, categories, todoCategories, currentDate, onAdd, onUpdate, onDelete, onReorder, onOpenTodoCategoryManager, onEventCreated }) {
  const [inputValue, setInputValue] = useState('');
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTodoCategoryId, setSelectedTodoCategoryId] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingTodoCategoryId, setEditingTodoCategoryId] = useState(null);
  const [editingScheduledTime, setEditingScheduledTime] = useState('');
  const [editingDuration, setEditingDuration] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [activePomodoroId, setActivePomodoroId] = useState(null);
  const [expandedTodos, setExpandedTodos] = useState(new Set());
  const [addingSubTodoId, setAddingSubTodoId] = useState(null);
  const [subTodoInput, setSubTodoInput] = useState('');
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'over' or 'inside'

  const isOverdue = (todo) => {
    if (!currentDate || todo.completed) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const viewDate = new Date(currentDate);
    viewDate.setHours(0, 0, 0, 0);
    
    return viewDate < today;
  };

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(
        inputValue.trim(), 
        null, 
        selectedTodoCategoryId,
        scheduledTime || null,
        duration ? parseInt(duration) : null
      );
      setInputValue('');
      setSelectedCategoryId(null);
      setSelectedTodoCategoryId(null);
      setScheduledTime('');
      setDuration('');
      setShowSettingsPopup(false);
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
    setEditingCategoryId(todo.category_id || null);
    setEditingTodoCategoryId(todo.todo_category_id || null);
    setEditingScheduledTime(todo.scheduled_time || '');
    setEditingDuration(todo.duration || '');
  };

  const saveEdit = (id) => {
    if (editingText.trim()) {
      onUpdate(id, { 
        text: editingText.trim(), 
        category_id: editingCategoryId,
        todo_category_id: editingTodoCategoryId,
        scheduled_time: editingScheduledTime || null,
        duration: editingDuration ? parseInt(editingDuration) : null
      });
    }
    setEditingId(null);
    setEditingText('');
    setEditingCategoryId(null);
    setEditingTodoCategoryId(null);
    setEditingScheduledTime('');
    setEditingDuration('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    setEditingCategoryId(null);
    setEditingTodoCategoryId(null);
    setEditingScheduledTime('');
    setEditingDuration('');
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
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetTodo, position = 'over') => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.id === targetTodo.id) {
      setDraggedItem(null);
      return;
    }

    // Prevent dropping a parent into its own child
    const isDescendant = (parent, childId) => {
      const check = (todo) => {
        if (todo.id === childId) return true;
        if (todo.children) {
          return todo.children.some(child => check(child));
        }
        return false;
      };
      return check(parent);
    };

    const draggedTodoWithChildren = organizeTodos(todos).find(t => t.id === draggedItem.id) ||
                                    organizeTodos(todos).flatMap(t => [t, ...(t.children || [])]).find(t => t.id === draggedItem.id);

    if (draggedTodoWithChildren && isDescendant(draggedTodoWithChildren, targetTodo.id)) {
      setDraggedItem(null);
      return;
    }

    // Determine the new parent_id and siblings based on drop position
    let newParentId = null;
    let siblings = [];

    if (position === 'inside') {
      // Drop inside: make it a child of the target
      newParentId = targetTodo.id;
      siblings = todos.filter(t => t.parent_id === targetTodo.id && t.id !== draggedItem.id);
    } else {
      // Drop over: same level as target
      newParentId = targetTodo.parent_id || null;
      siblings = todos.filter(t =>
        (t.parent_id === newParentId || (!t.parent_id && !newParentId)) &&
        t.id !== draggedItem.id
      );
    }

    // Find target index in siblings
    const targetIndex = siblings.findIndex(t => t.id === targetTodo.id);

    // Insert dragged item at target position
    const reorderedSiblings = [...siblings];
    reorderedSiblings.splice(targetIndex, 0, { ...draggedItem, parent_id: newParentId });

    // Create update list with new orders and parent_id
    const updates = reorderedSiblings.map((todo, index) => ({
      id: todo.id,
      order: index,
      parent_id: todo.id === draggedItem.id ? newParentId : todo.parent_id
    }));

    // Update parent_id if changed
    if (draggedItem.parent_id !== newParentId) {
      await onUpdate(draggedItem.id, { parent_id: newParentId });
    }

    // Update orders
    onReorder(updates);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragEnter = (e, todo) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Organize todos into hierarchy
  const organizeTodos = (todos) => {
    const todoMap = {};
    const rootTodos = [];

    // First pass: create a map of all todos
    todos.forEach(todo => {
      todoMap[todo.id] = { ...todo, children: [] };
    });

    // Second pass: organize into hierarchy
    todos.forEach(todo => {
      if (todo.parent_id && todoMap[todo.parent_id]) {
        todoMap[todo.parent_id].children.push(todoMap[todo.id]);
      } else {
        rootTodos.push(todoMap[todo.id]);
      }
    });

    // Sort root todos and their children by order
    const sortByOrder = (a, b) => a.order - b.order;
    rootTodos.sort(sortByOrder);
    rootTodos.forEach(todo => {
      if (todo.children) {
        todo.children.sort(sortByOrder);
      }
    });

    return rootTodos;
  };

  const sortedTodos = organizeTodos(todos);

  const toggleExpanded = (todoId) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  const handleAddSubTodo = (parentId) => {
    setAddingSubTodoId(parentId);
    setSubTodoInput('');
    // Auto-expand parent when adding sub-todo
    setExpandedTodos(new Set([...expandedTodos, parentId]));
  };

  const handleSaveSubTodo = (parentId) => {
    if (subTodoInput.trim()) {
      onAdd(subTodoInput.trim(), null, null, null, null, parentId);
      setSubTodoInput('');
      setAddingSubTodoId(null);
    }
  };

  const handleCancelSubTodo = () => {
    setSubTodoInput('');
    setAddingSubTodoId(null);
  };

  const getCategoryById = (categoryId) => {
    return categories.find(c => c.id === categoryId);
  };

  const getTodoCategoryById = (categoryId) => {
    return todoCategories?.find(c => c.id === categoryId);
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

  const handleCompleteTodo = async (todoId, completed) => {
    if (completed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#87CEEB', '#90EE90']
      });

      // Optimistic update: Update UI immediately without waiting for API
      onUpdate(todoId, { completed }, { skipApi: true });

      // 할일이 완료될 때 이벤트 생성
      try {
        const result = await api.completeTodo(todoId);
        if (result.success && result.event) {
          console.log('Event created:', result.event);
          // Success - UI is already updated
          
          // Add event to timeline if callback provided
          if (onEventCreated) {
            // Transform event to match Timeline format (add start/end ISO strings and category)
            const rawEvent = result.event;
            
            // Handle overnight events for end date
            let endIso = `${rawEvent.date}T${rawEvent.end_time}`;
            if (rawEvent.end_time < rawEvent.start_time) {
              const d = new Date(rawEvent.date);
              d.setDate(d.getDate() + 1);
              const nextDay = d.toISOString().split('T')[0];
              endIso = `${nextDay}T${rawEvent.end_time}`;
            }

            const formattedEvent = {
              ...rawEvent,
              start: `${rawEvent.date}T${rawEvent.start_time}`,
              end: endIso,
            };

            // Ensure category object exists for color
            if (!formattedEvent.category && formattedEvent.category_id) {
              const cat = categories.find(c => c.id === formattedEvent.category_id);
              if (cat) {
                formattedEvent.category = cat;
              }
            }

            onEventCreated(formattedEvent);
          }
        } else if (!result.success) {
          // 실패 시 롤백
          console.error('Failed to complete todo, rolling back');
          onUpdate(todoId, { completed: false }, { skipApi: true });
        }
      } catch (error) {
        console.error('Failed to complete todo:', error);
        // 에러 발생 시 롤백
        onUpdate(todoId, { completed: false }, { skipApi: true });
      }
    } else {
      onUpdate(todoId, { completed });
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
          <span key={index} style={{ fontSize: '16px', lineHeight: 1 }}>🍅</span>
        ))}
      </div>
    );
  };

  const renderTodoItem = (todo, depth = 0) => {
    const hasChildren = todo.children && todo.children.length > 0;
    const isExpanded = expandedTodos.has(todo.id);
    const isAddingSubTodo = addingSubTodoId === todo.id;
    const isDragging = draggedItem?.id === todo.id;
    const isDropTarget = dropTargetId === todo.id;
    const showDropInside = isDropTarget && dropPosition === 'inside';
    const showDropOver = isDropTarget && dropPosition === 'over';

    return (
      <div key={todo.id}>
        <li
          className={`todo-item ${isDragging ? 'dragging' : ''} ${showDropInside ? 'drop-inside' : ''}`}
          style={{
            paddingLeft: `${depth * 20}px`,
            borderTop: showDropOver ? '2px solid #4a9eff' : 'none',
            backgroundColor: showDropInside ? 'rgba(74, 158, 255, 0.1)' : 'transparent',
            transition: 'all 0.2s'
          }}
          draggable={editingId !== todo.id}
          onDragStart={(e) => handleDragStart(e, todo)}
          onDragOver={(e) => {
            handleDragOver(e);
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.clientY;
            const relativeY = mouseY - rect.top;
            const height = rect.height;

            setDropTargetId(todo.id);

            // Divide into three zones:
            // Top 30%: drop 'over' (before target)
            // Middle 40%: drop 'over' (after target)
            // Bottom 30%: drop 'inside' (as child)
            if (relativeY < height * 0.3) {
              setDropPosition('over');
            } else if (relativeY > height * 0.7) {
              setDropPosition('inside');
            } else {
              setDropPosition('over');
            }
          }}
          onDragLeave={() => {
            setDropTargetId(null);
            setDropPosition(null);
          }}
          onDrop={(e) => {
            const position = dropPosition || 'over';
            handleDrop(e, todo, position);
            setDropTargetId(null);
            setDropPosition(null);
          }}
          onDragEnd={() => {
            handleDragEnd();
            setDropTargetId(null);
            setDropPosition(null);
          }}
          onDragEnter={(e) => handleDragEnter(e, todo)}
        >
          <span className="todo-drag-handle">⋮</span>

          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleExpanded(todo.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
                marginRight: '4px'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {isOverdue(todo) ? (
            <div
              className="todo-checkbox overdue-arrow"
              onClick={() => handleCompleteTodo(todo.id, !todo.completed)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                flexShrink: 0,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #999',
                borderRadius: '3px',
                fontSize: '14px',
                color: '#fe7f65ff',
                background: '#fff',
                userSelect: 'none',
                fontWeight: 'bold'
              }}
              title="미완료 (클릭하여 완료)"
            >
              →
            </div>
          ) : (
            <input
              type="checkbox"
              className="todo-checkbox"
              checked={todo.completed}
              onChange={() => handleCompleteTodo(todo.id, !todo.completed)}
            />
          )}

          {editingId === todo.id ? (
            <div className="todo-edit-card compact">
              <div className="todo-edit-top-row">
                <input
                  type="text"
                  className="todo-edit-input-compact"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveEdit(todo.id);
                    }
                  }}
                  autoFocus
                  placeholder="할 일 입력"
                />
                <button className="btn-save-compact" onClick={() => saveEdit(todo.id)}>저장</button>
              </div>

              <div className="todo-edit-bottom-row">
                <div className="todo-category-scroll">
                  {todoCategories && todoCategories.length > 0 ? (
                    todoCategories.map((category) => (
                      <button
                        key={category.id}
                        className={`category-chip-micro ${editingTodoCategoryId === category.id ? 'selected' : ''}`}
                        style={editingTodoCategoryId === category.id ? { backgroundColor: category.color || '#4a9eff', color: '#37352f', borderColor: category.color || '#4a9eff' } : {}}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTodoCategoryId(editingTodoCategoryId === category.id ? null : category.id);
                        }}
                        title={category.name}
                      >
                        {category.name}
                      </button>
                    ))
                  ) : (
                    <span className="no-cat-msg">카테고리 없음</span>
                  )}
                </div>

                <div className="todo-time-compact-group">
                  <input
                    type="time"
                    className="todo-edit-time-compact"
                    value={editingScheduledTime}
                    onChange={(e) => setEditingScheduledTime(e.target.value)}
                    title="시작 시간"
                  />
                  <div className="duration-wrapper">
                    <input
                      type="number"
                      className="todo-edit-duration-compact"
                      value={editingDuration}
                      onChange={(e) => setEditingDuration(e.target.value)}
                      placeholder="분"
                      title="소요 시간(분)"
                    />
                    <span className="unit-text">m</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="todo-content">
              <span
                className={`todo-text ${todo.completed ? 'completed' : ''}`}
                onDoubleClick={() => startEdit(todo)}
              >
                {todo.text}
                {todo.scheduled_time && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                    ⏰ {todo.scheduled_time.slice(0, 5)}
                  </span>
                )}
                {todo.duration && (
                  <span style={{ marginLeft: '4px', fontSize: '11px', color: '#666' }}>
                    ({todo.duration}분)
                  </span>
                )}
              </span>
              {todo.category_id && getCategoryById(todo.category_id) && (
                <span
                  className="todo-category-badge"
                  style={{
                    backgroundColor: getCategoryById(todo.category_id).color,
                    color: '#37352f'
                  }}
                >
                  {getCategoryById(todo.category_id).name}
                </span>
              )}
              {todo.todo_category_id && getTodoCategoryById(todo.todo_category_id) && (
                <span
                  className="todo-category-badge"
                  style={{
                    backgroundColor: getTodoCategoryById(todo.todo_category_id).color || '#4a9eff',
                    color: '#37352f'
                  }}
                >
                  {getTodoCategoryById(todo.todo_category_id).name}
                </span>
              )}
              {renderTomatoIcons(todo.pomodoro_count)}
              <button
                className="pomodoro-start-btn"
                onClick={() => handleStartPomodoro(todo.id)}
                title="뽀모도로 시작"
              >
                ⏰
              </button>
            </div>
          )}

          <button
            className="add-subtodo-btn"
            onClick={() => handleAddSubTodo(todo.id)}
            title="하위 투두 추가"
            style={{
              background: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '2px 6px',
              color: '#666',
              marginRight: '4px'
            }}
          >
            +
          </button>

          <button className="todo-delete" onClick={() => onDelete(todo.id)}>
            ×
          </button>
        </li>

        {/* Sub-todo input */}
        {isAddingSubTodo && (
          <div style={{ paddingLeft: `${(depth + 1) * 20 + 30}px`, marginTop: '4px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="text"
                value={subTodoInput}
                onChange={(e) => setSubTodoInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveSubTodo(todo.id);
                  } else if (e.key === 'Escape') {
                    handleCancelSubTodo();
                  }
                }}
                placeholder="하위 할 일 입력..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '6px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={() => handleSaveSubTodo(todo.id)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#4a9eff',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                추가
              </button>
              <button
                onClick={handleCancelSubTodo}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div>
            {todo.children.map(childTodo => renderTodoItem(childTodo, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="todo-container">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✅ 오늘 할 일</span>
          <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>
          </span>
        </div>
        <button
          className="btn-category-settings-small"
          onClick={onOpenTodoCategoryManager}
          title="투두 카테고리 관리"
        >
          ⚙️
        </button>
      </div>

      <div className="todo-input-group" style={{ position: 'relative' }}>
        <input
          type="text"
          className="todo-input"
          placeholder="할 일을 입력하세요..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button 
          className="btn-settings-popup"
          onClick={() => setShowSettingsPopup(!showSettingsPopup)}
          style={{
            background: showSettingsPopup ? '#f0f0f0' : 'white',
            border: '1px solid #e9e9e7',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#666',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="상세 설정"
        >
          ➕
        </button>
        <button className="btn" onClick={handleAdd}>추가</button>

        {showSettingsPopup && (
          <div className="todo-settings-popup" style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '8px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '16px',
            zIndex: 100,
            width: '280px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>투두 카테고리</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {todoCategories && todoCategories.length > 0 ? (
                  todoCategories.map((category) => (
                    <button
                      key={category.id}
                      className={`category-chip-small ${selectedTodoCategoryId === category.id ? 'selected' : ''}`}
                      style={{
                        backgroundColor: selectedTodoCategoryId === category.id ? (category.color || '#4a9eff') : '#f0f0f0',
                        color: '#37352f',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedTodoCategoryId(selectedTodoCategoryId === category.id ? null : category.id)}
                    >
                      {category.name}
                    </button>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: '#999' }}>카테고리 없음</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>시작 시간</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>소요 시간 (분)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>
          </div>
        )}
      </div>

      <ul className="todo-list">
        {sortedTodos.length === 0 ? (
          <li style={{ textAlign: 'left', fontSize: '13px', color: '#9b9a97', padding: '8px 0', listStyle: 'none' }}>
            할 일이 없습니다
          </li>
        ) : (
          sortedTodos.map((todo) => renderTodoItem(todo))
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
