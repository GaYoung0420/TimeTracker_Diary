function MoodSelector({ selectedMood, onSelect }) {
  const moods = [
    { value: 'bad', emoji: '😢', label: 'Bad' },
    { value: 'soso', emoji: '😐', label: 'So-So' },
    { value: 'good', emoji: '😊', label: 'Good' }
  ];

  return (
    <div className="mood-container">
      <div className="section-header">😊 오늘의 기분</div>
      <div className="mood-selector">
        {moods.map((mood) => (
          <button
            key={mood.value}
            className={`mood-btn ${selectedMood === mood.value ? 'selected' : ''}`}
            data-mood={mood.value}
            onClick={() => onSelect(mood.value)}
          >
            <span className="mood-emoji">{mood.emoji}</span>
            <span className="mood-label">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MoodSelector;
