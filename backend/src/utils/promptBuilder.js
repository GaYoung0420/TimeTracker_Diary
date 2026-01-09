/**
 * 이벤트 시간 계산 (분 단위)
 */
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60; // 다음날로 넘어간 경우

  return duration;
}

/**
 * 분을 시간/분 형식으로 변환
 */
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

/**
 * 카테고리별 시간 집계
 */
function aggregateCategoryTime(events) {
  const categoryMap = {};
  let totalMinutes = 0;

  events.forEach(event => {
    if (event.is_sleep) return; // 수면 시간 제외

    const duration = calculateDuration(event.start_time, event.end_time);
    const categoryName = event.category_name || '미분류';

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = {
        name: categoryName,
        color: event.category_color,
        minutes: 0
      };
    }

    categoryMap[categoryName].minutes += duration;
    totalMinutes += duration;
  });

  // 퍼센티지 계산
  const breakdown = Object.values(categoryMap).map(cat => ({
    ...cat,
    hours: Math.floor(cat.minutes / 60),
    remainingMinutes: cat.minutes % 60,
    percentage: totalMinutes > 0 ? ((cat.minutes / totalMinutes) * 100).toFixed(1) : 0
  }));

  // 시간순 정렬
  breakdown.sort((a, b) => b.minutes - a.minutes);

  return {
    breakdown,
    totalMinutes,
    totalHours: (totalMinutes / 60).toFixed(1)
  };
}

/**
 * 일일 회고 프롬프트 생성
 */
export function buildDailyReflectionPrompt(data) {
  const {
    date,
    weekday,
    events = [],
    routines = [],
    routineChecks = {},
    todos = [],
    mood,
    reflection_text
  } = data;

  // 기분 라벨
  const moodLabels = {
    good: '😊 좋음',
    soso: '😐 보통',
    bad: '😢 나쁨'
  };

  // 이벤트 데이터 처리 (수면 제외)
  const activeEvents = events.filter(e => !e.is_sleep && !e.is_plan);
  const categoryStats = aggregateCategoryTime(activeEvents);

  // 루틴 달성률
  const checkedRoutines = routines.filter(r => routineChecks[r.id]);
  const routineCompletionRate = routines.length > 0
    ? ((checkedRoutines.length / routines.length) * 100).toFixed(0)
    : 0;

  // 할일 완료율
  const completedTodos = todos.filter(t => t.completed);
  const todoCompletionRate = todos.length > 0
    ? ((completedTodos.length / todos.length) * 100).toFixed(0)
    : 0;

  // 프롬프트 구성
  let prompt = `# 일일 회고 생성 요청

## 날짜
${date} (${weekday})

## 당일 실제 수행한 활동
`;

  if (activeEvents.length === 0) {
    prompt += '기록된 활동이 없습니다.\n\n';
  } else {
    activeEvents.forEach(event => {
      const duration = calculateDuration(event.start_time, event.end_time);
      prompt += `- ${event.title} (${event.start_time} ~ ${event.end_time}, ${formatDuration(duration)})\n`;
      prompt += `  카테고리: ${event.category_name || '미분류'}\n`;
      if (event.description) {
        prompt += `  메모: ${event.description}\n`;
      }
      prompt += '\n';
    });
    prompt += `총 활동 시간: ${categoryStats.totalHours}시간\n\n`;
  }

  prompt += `## 카테고리별 시간 사용\n`;
  if (categoryStats.breakdown.length === 0) {
    prompt += '데이터 없음\n\n';
  } else {
    categoryStats.breakdown.forEach(cat => {
      prompt += `- ${cat.name}: ${formatDuration(cat.minutes)} (${cat.percentage}%)\n`;
    });
    prompt += '\n';
  }

  prompt += `## 루틴 달성 현황\n`;
  if (routines.length === 0) {
    prompt += '설정된 루틴이 없습니다.\n\n';
  } else {
    routines.forEach(routine => {
      const checked = routineChecks[routine.id];
      prompt += `- ${routine.emoji || '⚪'} ${routine.text}: ${checked ? '✅ 완료' : '❌ 미완료'}\n`;
      if (routine.scheduled_time) {
        prompt += `  (목표 시간: ${routine.scheduled_time})\n`;
      }
    });
    prompt += `\n달성률: ${routineCompletionRate}%\n\n`;
  }

  prompt += `## 할일 완료 현황 (총 ${todos.length}개 중 ${completedTodos.length}개 완료)\n`;
  if (todos.length === 0) {
    prompt += '등록된 할일이 없습니다.\n\n';
  } else {
    todos.forEach(todo => {
      const status = todo.completed ? '✅ 완료' : '⬜ 미완료';
      prompt += `- ${status} : ${todo.text}\n`;
      if (todo.category_name) {
        prompt += `  [${todo.category_name}]`;
      }
      if (todo.duration) {
        prompt += ` (예상: ${todo.duration}분)`;
      }
      if (todo.pomodoro_count > 0) {
        prompt += ` 🍅 ${todo.pomodoro_count}`;
      }
      prompt += '\n';
    });
    prompt += `\n전체 달성률: ${todoCompletionRate}%\n\n`;
  }

  prompt += `## 기분\n`;
  prompt += `${mood ? moodLabels[mood] : '기록 없음'}\n\n`;

  prompt += `## 사용자 작성 회고\n`;
  prompt += `${reflection_text || '작성되지 않음'}\n\n`;

  prompt += `---

# 요청사항
당신은 공감력 있는 시간 관리 코치입니다.
데이터를 분석하여 성찰을 돕는 일일 회고와 내일의 할일 추천을 작성하세요.

## 파트 1: 일일 회고

**회고 구조:**

📊 오늘의 하이라이트
[가장 의미 있었던 활동과 시간 사용의 특징을 2-3문장으로]

✨ 잘한 점
- [구체적 성과 2-3개, 숫자와 함께]

🤔 생각해볼 점
- [개선 영역을 비판 없이 객관적으로]
- [낭비 시간의 의미 탐색]

🔄 발견한 패턴
- [시간대별 에너지 흐름]
- [루틴 실패의 연결고리]

💬 나에게 묻기
- [데이터 기반 2-3개 질문]

🌱 내일의 작은 실험
- [구체적이고 측정 가능한 1-2가지 제안]

**작성 원칙:**
- 친근하고 격려하는 톤 (반말 사용)
- 구체적인 숫자와 데이터 인용
- 실행 가능한 제안 제공
- 250-350자 내외로 작성
- 불필요한 꾸밈말 없이 진솔하게
- 예시 시작: "오늘 하루도 수고했어!"

**조건부 분석 추가:**
IF 낭비 시간 > 30%:
  "에너지 회복이 필요한 시기일 수 있습니다. 핸드폰 시간이 진짜 휴식이었는지 점검해보세요."

IF 루틴 달성률 < 40%:
  "루틴이 현재 삶과 맞지 않을 수 있습니다. 목표 시간을 조정하거나 루틴 개수를 줄여보세요."

IF 지적 활동 > 4시간:
  "4.5시간의 집중 시간은 훌륭합니다. 이 몰입을 만든 조건을 내일도 재현해보세요."

---

## 파트 2: 내일의 할일 추천

오늘의 데이터를 분석하여 내일 실행할 구체적인 할 일을 추천해주세요.

**추천 원칙:**
1. 미완료 루틴과 할일을 우선 고려
2. 오늘의 시간 사용 패턴을 고려하여 균형 잡힌 제안
3. 실행 가능하고 구체적인 작은 단위로 제안 (1시간 이내)
4. [중요] 시도할 수 있는 가장 작고 쉬운일을 추가
5. 각 할 일은 한 문장으로 명확하게
6. 3-5개의 할 일을 추천 (너무 많지 않게)


**응답 형식 (반드시 이 형식을 따라주세요):**

TASK_START
- [첫 번째 할 일]
- [두 번째 할 일]
- [세 번째 할 일]
TASK_END

각 할 일은 반드시 "- "로 시작하고, 한 줄로 작성해주세요.
TASK_START와 TASK_END 사이에만 할 일 목록을 작성하세요.

**예시:**
내일은 오늘 못한 루틴을 우선 챙기고, 미완료 할일을 마무리하는 데 집중해봐!

TASK_START
- 아침 운동 30분 하기
- 미완료 과제 1개 완료하기
- 독서 20분 하기
- 저녁 명상 10분 하기
TASK_END`;

  return prompt;
}

/**
 * 다음날 할 일 추천 프롬프트 생성
 */
export function buildTaskRecommendationPrompt(data) {
  const {
    date,
    weekday,
    events = [],
    routines = [],
    routineChecks = {},
    todos = [],
    mood,
    reflection_text
  } = data;

  // 카테고리별 시간 통계
  const activeEvents = events.filter(e => !e.is_sleep && !e.is_plan);
  const categoryStats = aggregateCategoryTime(activeEvents);

  // 루틴 분석
  const incompleteRoutines = routines.filter(r => !routineChecks[r.id]);
  const routineCompletionRate = routines.length > 0
    ? ((routines.filter(r => routineChecks[r.id]).length / routines.length) * 100).toFixed(0)
    : 0;

  // 할일 분석
  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const todoCompletionRate = todos.length > 0
    ? ((completedTodos.length / todos.length) * 100).toFixed(0)
    : 0;

  // 프롬프트 구성
  let prompt = `# 다음날 할 일 추천 요청

## 오늘의 데이터 분석 (${date}, ${weekday})

### 시간 사용 패턴
`;

  if (categoryStats.breakdown.length === 0) {
    prompt += '기록된 활동이 없습니다.\n\n';
  } else {
    prompt += `총 활동 시간: ${categoryStats.totalHours}시간\n\n`;
    categoryStats.breakdown.forEach(cat => {
      prompt += `- ${cat.name}: ${formatDuration(cat.minutes)} (${cat.percentage}%)\n`;
    });
    prompt += '\n';
  }

  prompt += `### 루틴 달성 현황 (달성률: ${routineCompletionRate}%)\n`;
  if (routines.length === 0) {
    prompt += '설정된 루틴이 없습니다.\n\n';
  } else {
    prompt += `완료: ${routines.length - incompleteRoutines.length}개\n`;
    prompt += `미완료: ${incompleteRoutines.length}개\n`;
    if (incompleteRoutines.length > 0) {
      prompt += '\n미완료 루틴:\n';
      incompleteRoutines.forEach(routine => {
        prompt += `- ${routine.emoji || '⚪'} ${routine.text}`;
        if (routine.scheduled_time) {
          prompt += ` (목표: ${routine.scheduled_time})`;
        }
        prompt += '\n';
      });
    }
    prompt += '\n';
  }

  prompt += `### 할일 완료 현황 (달성률: ${todoCompletionRate}%)\n`;
  if (todos.length === 0) {
    prompt += '등록된 할일이 없습니다.\n\n';
  } else {
    prompt += `완료: ${completedTodos.length}개\n`;
    prompt += `미완료: ${incompleteTodos.length}개\n`;
    if (incompleteTodos.length > 0) {
      prompt += '\n미완료 할일:\n';
      incompleteTodos.forEach(todo => {
        prompt += `- ${todo.text}`;
        if (todo.category_name) {
          prompt += ` [${todo.category_name}]`;
        }
        if (todo.duration) {
          prompt += ` (예상: ${todo.duration}분)`;
        }
        prompt += '\n';
      });
    }
    prompt += '\n';
  }

  prompt += `### 기분
${mood ? (mood === 'good' ? '😊 좋음' : mood === 'soso' ? '😐 보통' : '😢 나쁨') : '기록 없음'}

### 사용자 회고
${reflection_text || '작성되지 않음'}

---

# 요청사항

당신은 데이터 기반 시간 관리 코치입니다.
오늘의 데이터를 분석하여 내일 실행할 구체적인 할 일을 추천해주세요.

**추천 원칙:**
1. 미완료 루틴과 할일을 우선 고려
2. 오늘의 시간 사용 패턴을 고려하여 균형 잡힌 제안
3. 실행 가능하고 구체적인 작은 단위로 제안 (1시간 이내)
4. 각 할 일은 한 문장으로 명확하게
5. 3-5개의 할 일을 추천 (너무 많지 않게)

**응답 형식 (반드시 이 형식을 따라주세요):**

다음날 추천하는 할 일이야! 오늘 하루를 분석해서 정리해봤어.

TASK_START
- [첫 번째 할 일]
- [두 번째 할 일]
- [세 번째 할 일]
- [네 번째 할 일]
- [다섯 번째 할 일]
TASK_END

각 할 일은 반드시 "- "로 시작하고, 한 줄로 작성해주세요.
TASK_START와 TASK_END 사이에만 할 일 목록을 작성하고, 다른 설명은 그 밖에 작성해주세요.

**예시:**
내일은 오늘 못한 루틴을 우선 챙기고, 미완료 할일을 마무리하는 데 집중해봐!

TASK_START
- 아침 운동 30분 하기
- 미완료 과제 1개 완료하기
- 독서 20분 하기
- 저녁 명상 10분 하기
TASK_END

이 할일들을 완료하면 오늘보다 더 균형 잡힌 하루가 될 거야!`;

  return prompt;
}

/**
 * 주간 인사이트 프롬프트 생성 (미래 확장용)
 */
export function buildWeeklyInsightPrompt(weekData) {
  // TODO: 주간 데이터 기반 프롬프트 생성
  return '주간 인사이트 기능은 준비중입니다.';
}
