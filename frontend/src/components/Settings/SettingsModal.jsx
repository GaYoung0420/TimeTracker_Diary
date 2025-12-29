import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import './SettingsModal.css';

// Predefined color options for calendars
const CALENDAR_COLORS = [
  '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
  '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
];

// Calendar types
const CALENDAR_TYPES = [
  { id: 'icloud', name: 'iCloud', icon: '☁️', placeholder: 'webcal://...' },
  { id: 'google', name: 'Google Calendar', icon: '📆', placeholder: 'https://calendar.google.com/calendar/ical/...' },
  { id: 'outlook', name: 'Outlook', icon: '📧', placeholder: 'https://outlook.office365.com/...' },
  { id: 'caldav', name: 'CalDAV', icon: '🔗', placeholder: 'https://...' },
  { id: 'other', name: '기타 (ICS URL)', icon: '📅', placeholder: 'https://...' }
];

function SettingsModal({ onClose, initialSection = 'main' }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [calendars, setCalendars] = useState([]);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarType, setNewCalendarType] = useState('icloud');
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState(CALENDAR_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [isAddingCalendar, setIsAddingCalendar] = useState(false);

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      const response = await api.getCalendars();
      if (response.success) {
        setCalendars(response.data);
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
    }
  };

  const handleAddCalendar = async () => {
    if (!newCalendarName.trim()) {
      alert('캘린더 이름을 입력해주세요.');
      return;
    }

    if (!newCalendarUrl.trim()) {
      alert('캘린더 URL을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedType = CALENDAR_TYPES.find(t => t.id === newCalendarType);
      const response = await api.addCalendar(
        newCalendarName,
        newCalendarType,
        selectedType?.icon || '📅',
        newCalendarUrl,
        newCalendarColor
      );

      if (response.success) {
        await loadCalendars();
        window.dispatchEvent(new Event('icloud-calendar-updated'));

        // Reset form
        setNewCalendarName('');
        setNewCalendarType('icloud');
        setNewCalendarUrl('');
        setNewCalendarColor(CALENDAR_COLORS[0]);
        setIsAddingCalendar(false);

        alert('캘린더가 성공적으로 추가되었습니다!');
      } else {
        alert(response.error || '캘린더 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to add calendar:', error);
      alert('캘린더 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCalendar = async (id) => {
    if (!confirm('이 캘린더를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.deleteCalendar(id);
      if (response.success) {
        await loadCalendars();
        window.dispatchEvent(new Event('icloud-calendar-updated'));
      } else {
        alert(response.error || '캘린더 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete calendar:', error);
      alert('캘린더 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleCalendar = async (id) => {
    try {
      const calendar = calendars.find(cal => cal.id === id);
      const response = await api.updateCalendar(id, { enabled: !calendar.enabled });
      if (response.success) {
        await loadCalendars();
        window.dispatchEvent(new Event('icloud-calendar-updated'));
      } else {
        alert(response.error || '캘린더 상태 변경 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to toggle calendar:', error);
      alert('캘린더 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleEditCalendar = (calendar) => {
    setEditingCalendar({
      id: calendar.id,
      name: calendar.name,
      type: calendar.type,
      url: calendar.url,
      color: calendar.color
    });
  };

  const handleCancelEdit = () => {
    setEditingCalendar(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCalendar.name.trim()) {
      alert('캘린더 이름을 입력해주세요.');
      return;
    }

    if (!editingCalendar.url.trim()) {
      alert('캘린더 URL을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.updateCalendar(editingCalendar.id, {
        name: editingCalendar.name,
        url: editingCalendar.url,
        color: editingCalendar.color
      });

      if (response.success) {
        await loadCalendars();
        window.dispatchEvent(new Event('icloud-calendar-updated'));
        setEditingCalendar(null);
        alert('캘린더가 성공적으로 수정되었습니다!');
      } else {
        alert(response.error || '캘린더 수정 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to update calendar:', error);
      alert('캘린더 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMainSettings = () => (
    <div className="settings-list">
      <div 
        className="settings-item" 
        onClick={() => setActiveSection('calendar')}
      >
        <div className="settings-item-icon">📅</div>
        <div className="settings-item-content">
          <div className="settings-item-title">캘린더 구독</div>
          <div className="settings-item-desc">iCloud 캘린더 연동 설정</div>
        </div>
        <div className="settings-item-arrow">›</div>
      </div>
    </div>
  );

  const renderCalendarSettings = () => {
    const selectedType = CALENDAR_TYPES.find(t => t.id === newCalendarType);
    const showAddForm = calendars.length === 0 || isAddingCalendar;

    if (showAddForm) {
      return (
        <div className="settings-section calendar-section">
          <div className="add-calendar-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 className="form-title" style={{ margin: 0 }}>새 캘린더 추가</h4>
              {calendars.length > 0 && (
                <button 
                  onClick={() => setIsAddingCalendar(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#999', padding: '0 4px' }}
                  title="닫기"
                >
                  ×
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">캘린더 종류</label>
              <div className="calendar-type-selector">
                {CALENDAR_TYPES.map((type) => (
                  <button
                    key={type.id}
                    className={`type-option ${newCalendarType === type.id ? 'selected' : ''}`}
                    onClick={() => setNewCalendarType(type.id)}
                    type="button"
                  >
                    <span className="type-icon">{type.icon}</span>
                    <span className="type-name">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">캘린더 이름</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 개인 일정"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">캘린더 URL</label>
              <input
                type="text"
                className="form-input"
                placeholder={selectedType?.placeholder || 'https://...'}
                value={newCalendarUrl}
                onChange={(e) => setNewCalendarUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">색상 선택</label>
              <div className="color-picker-with-input">
                <input
                  type="color"
                  className="color-input"
                  value={newCalendarColor}
                  onChange={(e) => setNewCalendarColor(e.target.value)}
                />
                <div className="color-picker">
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-option ${newCalendarColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCalendarColor(color)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn-add-calendar"
              onClick={handleAddCalendar}
              disabled={isSaving}
            >
              {isSaving ? '추가 중...' : '+ 캘린더 추가'}
            </button>
          </div>

          <div className="settings-help-card">
            <h4>💡 캘린더 URL 찾는 방법</h4>

            <div className="help-section">
              <strong>☁️ iCloud:</strong>
              <ol>
                <li>iCloud.com에 로그인하여 캘린더 앱을 엽니다.</li>
                <li>공유할 캘린더 옆의 공유 아이콘을 클릭합니다.</li>
                <li>"공개 캘린더"를 체크하고 URL을 복사합니다.</li>
              </ol>
            </div>

            <div className="help-section">
              <strong>📆 Google Calendar:</strong>
              <ol>
                <li>Google Calendar 설정에서 통합 섹션을 찾습니다.</li>
                <li>"비공개 주소 (iCal 형식)" URL을 복사합니다.</li>
              </ol>
            </div>

            <div className="help-section">
              <strong>📧 Outlook:</strong>
              <ol>
                <li>Outlook 캘린더 설정에서 "게시" 또는 "공유"를 선택합니다.</li>
                <li>ICS 형식의 URL을 복사합니다.</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="settings-section calendar-section">
        <p className="settings-description">
          iCloud, Google Calendar, Outlook 등 다양한 캘린더를 추가하여 Daily View에서 확인할 수 있습니다.
        </p>

        {/* Existing Calendars List */}
        {calendars.length > 0 && (
          <div className="calendar-list">
            <h4 className="calendar-list-title">구독 중인 캘린더</h4>
            {calendars.map((calendar) => (
              <div key={calendar.id} className="calendar-item">
                {editingCalendar && editingCalendar.id === calendar.id ? (
                  // Edit Mode
                  <div className="calendar-edit-form" style={{ position: 'relative' }}>
                    <button
                      className="btn-delete-calendar-absolute"
                      onClick={() => handleDeleteCalendar(calendar.id)}
                      title="삭제"
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                    <div className="form-group">
                      <label className="form-label-small">이름</label>
                      <input
                        type="text"
                        className="form-input-small"
                        value={editingCalendar.name}
                        onChange={(e) => setEditingCalendar({...editingCalendar, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-small">URL</label>
                      <input
                        type="text"
                        className="form-input-small"
                        value={editingCalendar.url}
                        onChange={(e) => setEditingCalendar({...editingCalendar, url: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-small">색상</label>
                      <div className="color-picker-inline">
                        <input
                          type="color"
                          className="color-input"
                          value={editingCalendar.color}
                          onChange={(e) => setEditingCalendar({...editingCalendar, color: e.target.value})}
                        />
                        <div className="predefined-colors">
                          {CALENDAR_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`color-option-small ${editingCalendar.color === color ? 'selected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditingCalendar({...editingCalendar, color})}
                              type="button"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="edit-actions">
                      <button className="btn-delete-edit" onClick={() => handleDeleteCalendar(calendar.id)}>
                        삭제
                      </button>
                      <button className="btn-cancel-edit" onClick={handleCancelEdit}>
                        취소
                      </button>
                      <button className="btn-save-edit" onClick={handleSaveEdit} disabled={isSaving}>
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="calendar-item-left">
                      <button
                        className={`btn-toggle-calendar ${calendar.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => handleToggleCalendar(calendar.id)}
                        title={calendar.enabled ? '비활성화' : '활성화'}
                        style={{ marginRight: '12px' }}
                      >
                        {calendar.enabled ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : null}
                      </button>
                      <div
                        className="calendar-color-indicator"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <div className="calendar-item-info">
                        <div className="calendar-item-name">
                          <span className="calendar-type-icon">{calendar.type_icon || calendar.typeIcon || '📅'}</span>
                          {calendar.name}
                        </div>
                        <div className="calendar-item-url">{calendar.url}</div>
                      </div>
                    </div>
                    <div className="calendar-item-actions">
                      <button
                        className="btn-icon-edit"
                        onClick={() => handleEditCalendar(calendar)}
                        title="수정"
                      >
                        ✎
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <button 
          className="btn-show-add-form"
          onClick={() => setIsAddingCalendar(true)}
        >
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span> 새 캘린더 추가
        </button>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-header-left">
            {activeSection !== 'main' && (
              <button className="btn-back" onClick={() => setActiveSection('main')}>
                ←
              </button>
            )}
            <h2>{activeSection === 'main' ? '설정' : '캘린더 구독'}</h2>
          </div>
          <button className="btn-close-icon" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          {activeSection === 'main' ? renderMainSettings() : renderCalendarSettings()}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
