function RoutineGrid({ routines, routineChecks, onToggle }) {
  return (
    <div className="routine-container">
      <div className="section-header">🔁 오늘의 루틴</div>

      <div className="routine-grid">
        {routines.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9b9a97' }}>루틴이 없습니다</div>
        ) : (
          routines.map((routine) => {
            const checked = routineChecks[routine.id] || false;
            return (
              <div
                key={routine.id}
                className={`routine-card ${checked ? 'completed' : ''}`}
                onClick={() => onToggle(routine.id, !checked)}
              >
                <div className="routine-title">{routine.text}</div>
                <div className="routine-check">
                  {checked ? '✓' : ''}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RoutineGrid;
