import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import EmojiPicker from 'emoji-picker-react';
import './EventEditModal.css';
import './RoutineGrid.css';

function RoutineGrid({ routines, routineChecks, currentDate, onToggle, onAdd, onUpdate, onDelete, onReorder }) {
  const [newRoutine, setNewRoutine] = useState('');
  const [newEmoji, setNewEmoji] = useState('✓');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newWeekdays, setNewWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]); // All days by default
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editEmoji, setEditEmoji] = useState('✓');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editWeekdays, setEditWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef(null);
  const editEmojiButtonRef = useRef(null);

  const handleToggle = (id, checked) => {
    if (checked) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#87CEEB', '#90EE90']
      });
    }
    onToggle(id, checked);
  };

  const handleAdd = () => {
    if (newRoutine.trim()) {
      onAdd(
        newRoutine.trim(),
        newEmoji,
        undefined,
        newScheduledTime,
        newDuration,
        newWeekdays.length > 0 ? newWeekdays : null,
        newStartDate || null,
        newEndDate || null
      );
      setNewRoutine('');
      setNewEmoji('✓');
      setNewScheduledTime('');
      setNewDuration(30);
      setNewWeekdays([0, 1, 2, 3, 4, 5, 6]);
      setNewStartDate('');
      setNewEndDate('');
      setShowAddModal(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const startEdit = (routine, e) => {
    if (e) e.stopPropagation();
    setEditingId(routine.id);
    setEditText(routine.text);
    setEditEmoji(routine.emoji || '✓');
    setEditScheduledTime(routine.scheduled_time || '');
    setEditDuration(routine.duration || 30);
    setEditWeekdays(routine.weekdays || [0, 1, 2, 3, 4, 5, 6]);
    setEditStartDate(routine.start_date || '');
    setEditEndDate(routine.end_date || '');
  };

  const saveEdit = () => {
    if (editText.trim()) {
      onUpdate(editingId, {
        text: editText.trim(),
        emoji: editEmoji,
        scheduled_time: editScheduledTime || null,
        duration: editDuration,
        weekdays: editWeekdays.length > 0 ? editWeekdays : null,
        start_date: editStartDate || null,
        end_date: editEndDate || null
      });
    }
    setEditingId(null);
    setEditText('');
    setEditEmoji('✓');
    setEditScheduledTime('');
    setEditDuration(30);
    setEditWeekdays([0, 1, 2, 3, 4, 5, 6]);
    setEditStartDate('');
    setEditEndDate('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditEmoji('✓');
    setEditScheduledTime('');
    setEditDuration(30);
    setEditWeekdays([0, 1, 2, 3, 4, 5, 6]);
    setEditStartDate('');
    setEditEndDate('');
  };

  const handleDelete = (routineId, e) => {
    e.stopPropagation();
    if (confirm('이 루틴을 삭제하시겠습니까?')) {
      onDelete(routineId);
    }
  };

  const handleDragStart = (e, routine) => {
    setDraggedItem(routine);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetRoutine) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetRoutine.id) {
      setDraggedItem(null);
      return;
    }

    const sortedRoutines = [...routines].sort((a, b) => a.order - b.order);
    const draggedIndex = sortedRoutines.findIndex(r => r.id === draggedItem.id);
    const targetIndex = sortedRoutines.findIndex(r => r.id === targetRoutine.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newRoutines = [...sortedRoutines];
    const [removed] = newRoutines.splice(draggedIndex, 1);
    newRoutines.splice(targetIndex, 0, removed);

    const updates = newRoutines.map((routine, index) => ({
      id: routine.id,
      order: index
    }));

    onReorder(updates);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Helper function to get date string in YYYY-MM-DD format
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter routines based on current date's weekday and date range
  const filteredRoutines = routines.filter(routine => {
    const weekday = currentDate.getDay();
    const dateString = getLocalDateString(currentDate);

    console.log(`[RoutineGrid] Checking routine: ${routine.text}`);
    console.log(`  - weekdays:`, routine.weekdays, `(type: ${typeof routine.weekdays}, isArray: ${Array.isArray(routine.weekdays)})`);
    console.log(`  - current weekday: ${weekday} (type: ${typeof weekday})`);

    // Parse weekdays if it's a string
    let weekdays = routine.weekdays;
    if (typeof weekdays === 'string') {
      try {
        weekdays = JSON.parse(weekdays);
        console.log(`  - Parsed weekdays from string:`, weekdays);
      } catch (e) {
        console.error(`  - Failed to parse weekdays string:`, e);
        weekdays = null;
      }
    }

    // Check weekday filter
    if (weekdays && Array.isArray(weekdays) && weekdays.length > 0) {
      console.log(`  - weekdays array contents:`, weekdays.map(d => `${d} (${typeof d})`));
      console.log(`  - includes check: ${weekdays.includes(weekday)}`);
      if (!weekdays.includes(weekday)) {
        console.log(`[RoutineGrid] ${routine.text} filtered out by weekday`);
        return false;
      }
    } else {
      console.log(`  - NO weekday filter (weekdays is null or not array or empty)`);
    }

    // Check date range filter
    if (routine.start_date) {
      if (dateString < routine.start_date) {
        console.log(`[RoutineGrid] ${routine.text} filtered out by start_date`);
        return false;
      }
    }
    if (routine.end_date) {
      if (dateString > routine.end_date) {
        console.log(`[RoutineGrid] ${routine.text} filtered out by end_date`);
        return false;
      }
    }

    console.log(`[RoutineGrid] ${routine.text} INCLUDED`);
    return true;
  });

  const sortedRoutines = [...filteredRoutines].sort((a, b) => a.order - b.order);
  const allSortedRoutines = [...routines].sort((a, b) => a.order - b.order);

  return (
    <div className="routine-container">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🔁 오늘의 루틴</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="btn-category-settings-small"
            onClick={() => setShowAddModal(true)}
            title="새 루틴 추가"
          >
            +
          </button>
          <button
            className="btn-category-settings-small"
            onClick={() => setShowManageModal(true)}
            title="루틴 관리"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="routine-grid">
        {sortedRoutines.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9b9a97' }}>루틴이 없습니다</div>
        ) : (
          sortedRoutines.map((routine) => {
            const checked = routineChecks[routine.id] || false;
            const isEditing = editingId === routine.id;

            return (
              <div
                key={routine.id}
                className={`routine-card ${checked ? 'completed' : ''}`}
                onClick={() => handleToggle(routine.id, !checked)}
              >
                <div className="routine-title">{routine.text}</div>
                <div className="routine-check">
                  {checked ? (routine.emoji || '✓') : ''}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="routine-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="routine-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="routine-modal-title">새 루틴 추가</h3>
            <div className="form-group">
              <input
                type="text"
                className="routine-modal-input"
                placeholder="루틴 이름 입력..."
                value={newRoutine}
                onChange={(e) => setNewRoutine(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="emoji-label">완료 시 표시할 이모지</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={emojiButtonRef}
                  type="text"
                  className="emoji-input"
                  placeholder="이모지 입력 (예: ✓, ⭐, 🎯)"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))}
                  maxLength="2"
                  readOnly
                  onClick={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setEmojiPickerPosition({
                      top: rect.bottom + window.scrollY + 8,
                      left: rect.left + window.scrollX
                    });
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="emoji-label">예정 시간 (선택사항)</label>
              <input
                type="time"
                className="routine-modal-input"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="emoji-label">소요 시간 (분)</label>
              <input
                type="number"
                className="routine-modal-input"
                placeholder="30"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 30)}
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="emoji-label">반복 요일</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewWeekdays(prev =>
                        prev.includes(idx)
                          ? prev.filter(d => d !== idx)
                          : [...prev, idx].sort()
                      );
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: newWeekdays.includes(idx) ? '2px solid #4A90E2' : '1px solid #ccc',
                      backgroundColor: newWeekdays.includes(idx) ? '#E3F2FD' : '#fff',
                      cursor: 'pointer',
                      fontWeight: newWeekdays.includes(idx) ? 'bold' : 'normal'
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="emoji-label">시작 날짜 (선택사항)</label>
              <input
                type="date"
                className="routine-modal-input"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="emoji-label">종료 날짜 (선택사항)</label>
              <input
                type="date"
                className="routine-modal-input"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
            <div className="routine-modal-actions">
              <button className="routine-btn-cancel" onClick={() => setShowAddModal(false)}>취소</button>
              <button className="routine-btn-save" onClick={handleAdd}>추가</button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && (
        <div className="routine-modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="routine-manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="routine-manage-header">
              <h3 className="routine-modal-title">루틴 관리</h3>
              <button className="btn-close-modal" onClick={() => setShowManageModal(false)}>×</button>
            </div>
            <div className="routine-manage-list">
              {allSortedRoutines.length === 0 ? (
                <div className="routine-manage-empty">루틴이 없습니다</div>
              ) : (
                allSortedRoutines.map((routine) => {
                  const isEditing = editingId === routine.id;
                  return (
                    <div
                      key={routine.id}
                      className="routine-manage-item"
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, routine)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, routine)}
                      onDragEnd={handleDragEnd}
                      style={isEditing ? { position: 'relative' } : {}}
                    >
                      <div className="routine-drag-handle">⋮⋮</div>
                      {isEditing ? (
                        <>
                          <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="routine-manage-input"
                                  placeholder="루틴 이름"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  autoFocus
                                  style={{ flex: 1 }}
                                />
                                <input
                                  ref={editEmojiButtonRef}
                                  type="text"
                                  className="emoji-input-inline"
                                  placeholder="이모지"
                                  value={editEmoji}
                                  onChange={(e) => setEditEmoji(e.target.value.slice(0, 2))}
                                  maxLength="2"
                                  readOnly
                                  onClick={(e) => {
                                    const rect = e.target.getBoundingClientRect();
                                    setEmojiPickerPosition({
                                      top: rect.bottom + window.scrollY + 8,
                                      left: rect.left + window.scrollX
                                    });
                                    setShowEditEmojiPicker(!showEditEmojiPicker);
                                  }}
                                  style={{ cursor: 'pointer', width: '60px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="time"
                                  className="routine-manage-input"
                                  placeholder="예정 시간"
                                  value={editScheduledTime}
                                  onChange={(e) => setEditScheduledTime(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <input
                                  type="number"
                                  className="routine-manage-input"
                                  placeholder="분"
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(parseInt(e.target.value) || 30)}
                                  min="1"
                                  style={{ width: '80px' }}
                                />
                                <span style={{ fontSize: '12px', color: '#666' }}>분</span>
                              </div>
                              <div style={{ marginTop: '8px' }}>
                                <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>반복 요일</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditWeekdays(prev =>
                                          prev.includes(idx)
                                            ? prev.filter(d => d !== idx)
                                            : [...prev, idx].sort()
                                        );
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        borderRadius: '3px',
                                        border: editWeekdays.includes(idx) ? '1.5px solid #4A90E2' : '1px solid #ccc',
                                        backgroundColor: editWeekdays.includes(idx) ? '#E3F2FD' : '#fff',
                                        cursor: 'pointer',
                                        fontWeight: editWeekdays.includes(idx) ? 'bold' : 'normal'
                                      }}
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>시작</label>
                                  <input
                                    type="date"
                                    className="routine-manage-input"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                    style={{ fontSize: '11px' }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>종료</label>
                                  <input
                                    type="date"
                                    className="routine-manage-input"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                    style={{ fontSize: '11px' }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="routine-manage-edit-actions">
                              <button className="btn-save-small" onClick={saveEdit}>✓</button>
                              <button className="btn-cancel-small" onClick={cancelEdit}>✕</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="routine-manage-text">
                            <span style={{ marginRight: '8px', fontSize: '16px' }}>{routine.emoji || '✓'}</span>
                            {routine.text}
                            {routine.scheduled_time && (
                              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                                {routine.scheduled_time.slice(0, 5)} ({routine.duration || 30}분)
                              </span>
                            )}
                          </div>
                          <div className="routine-manage-actions">
                            <button
                              className="btn-icon-edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(routine);
                              }}
                              title="수정"
                            >
                              ✎
                            </button>
                            <button
                              className="btn-icon-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('이 루틴을 삭제하시겠습니까?')) {
                                  onDelete(routine.id);
                                }
                              }}
                              title="삭제"
                            >
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="routine-manage-footer">
              <button className="btn-close-manage" onClick={() => setShowManageModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Portal로 렌더링되는 이모지 피커 */}
      {(showEmojiPicker || showEditEmojiPicker) && createPortal(
        <>
          {/* 백드롭 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => {
              setShowEmojiPicker(false);
              setShowEditEmojiPicker(false);
            }}
          />
          {/* 이모지 피커 */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxWidth: '90vw',
              maxHeight: '80vh'
            }}
          >
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                if (showEmojiPicker) {
                  setNewEmoji(emojiObject.emoji);
                  setShowEmojiPicker(false);
                } else if (showEditEmojiPicker) {
                  setEditEmoji(emojiObject.emoji);
                  setShowEditEmojiPicker(false);
                }
              }}
              width={window.innerWidth < 768 ? '90vw' : '350px'}
              height={window.innerWidth < 768 ? '60vh' : '400px'}
              previewConfig={{ showPreview: false }}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export default RoutineGrid;
