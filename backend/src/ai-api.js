import express from 'express';
import { generateDailyReflection, generateTaskRecommendations } from './services/aiService.js';
import { buildDailyReflectionPrompt, buildTaskRecommendationPrompt } from './utils/promptBuilder.js';
import { requireAuth } from './middleware/auth.js';

// Supabase를 setupAIAPI 함수의 인자로 받아서 사용
export function setupAIAPI(app, supabase) {
  /**
   * POST /api/ai/daily-reflection
   * 일일 AI 회고 생성
   */
  app.post('/api/ai/daily-reflection', requireAuth, async (req, res) => {
  try {
    const { date } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    if (!date) {
      return res.status(400).json({ error: '날짜가 필요합니다' });
    }

    // API 키 확인
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.'
      });
    }

    // 1. 해당 날짜의 이벤트 가져오기
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        *,
        categories (
          name,
          color
        )
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .eq('is_plan', false)
      .order('start_time');

    if (eventsError) throw eventsError;

    // 카테고리 정보 평탄화
    const eventsWithCategory = (events || []).map(e => ({
      ...e,
      category_name: e.categories?.name,
      category_color: e.categories?.color
    }));

    // 2. 루틴 & 루틴 체크 가져오기
    const { data: allRoutines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('order');

    if (routinesError) throw routinesError;

    // Filter routines by date range and weekday
    let filteredRoutines = allRoutines || [];
    if (filteredRoutines.length > 0) {
      const dateObj = new Date(date + 'T00:00:00');
      const weekday = dateObj.getDay();

      filteredRoutines = filteredRoutines.filter(routine => {
        // Check date range
        if (routine.start_date && date < routine.start_date) {
          return false;
        }
        if (routine.end_date && date > routine.end_date) {
          return false;
        }

        // Check weekday
        if (routine.weekdays) {
          let weekdays = routine.weekdays;
          // Parse JSON string if needed (handle multiple levels of JSON encoding)
          while (typeof weekdays === 'string') {
            try {
              weekdays = JSON.parse(weekdays);
            } catch (e) {
              console.error('Failed to parse routine weekdays:', e);
              return false;
            }
          }

          // Check if weekdays is array and contains current weekday
          if (Array.isArray(weekdays) && weekdays.length > 0) {
            if (!weekdays.includes(weekday)) {
              return false;
            }
          }
        }

        return true;
      });
    }

    const { data: routineChecksData, error: checksError } = await supabase
      .from('routine_checks')
      .select('routine_id, checked')
      .eq('user_id', userId)
      .eq('date', date);

    if (checksError) throw checksError;

    const routineChecks = {};
    (routineChecksData || []).forEach(check => {
      if (check.checked) {
        routineChecks[check.routine_id] = true;
      }
    });

    // 3. 할일 가져오기
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select(`
        *,
        todo_categories (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('date', date)
      .order('order');

    if (todosError) throw todosError;

    const todosWithCategory = (todos || []).map(t => ({
      ...t,
      category_name: t.todo_categories?.name
    }));

    // 4. 회고 & 기분 가져오기
    const { data: reflectionData, error: reflectionError } = await supabase
      .from('reflections')
      .select('reflection_text, mood')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    // 데이터가 없어도 오류가 아님
    const reflection = reflectionData || {};

    // 5. 요일 계산
    const dateObj = new Date(date);
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[dateObj.getDay()];

    // 6. 프롬프트 데이터 구성
    const promptData = {
      date,
      weekday,
      events: eventsWithCategory,
      routines: filteredRoutines,
      routineChecks,
      todos: todosWithCategory,
      mood: reflection.mood,
      reflection_text: reflection.reflection_text
    };

    // 7. 프롬프트 생성
    const prompt = buildDailyReflectionPrompt(promptData);

    // 8. Claude API 호출
    const aiResponse = await generateDailyReflection(prompt);

    // 9. 응답에서 회고와 할일 목록 파싱
    const taskMatch = aiResponse.match(/TASK_START\s*([\s\S]*?)\s*TASK_END/);
    let tasks = [];
    let aiReflectionText = aiResponse;

    if (taskMatch) {
      const tasksText = taskMatch[1];
      tasks = tasksText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
        .filter(task => task.length > 0);

      // TASK_START와 TASK_END를 제외한 회고 텍스트 추출
      aiReflectionText = aiResponse.replace(/TASK_START[\s\S]*TASK_END/, '').trim();
    }

    // 10. 응답
    res.json({
      success: true,
      reflection: aiReflectionText,
      tasks: tasks,
      prompt: process.env.NODE_ENV === 'development' ? prompt : undefined
    });

  } catch (error) {
    console.error('AI Reflection Error:', error);
    res.status(500).json({
      error: 'AI 회고 생성 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  });

  /**
   * POST /api/ai/task-recommendations
   * 다음날 할일 추천
   */
  app.post('/api/ai/task-recommendations', requireAuth, async (req, res) => {
    try {
      const { date } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: '로그인이 필요합니다' });
      }

      if (!date) {
        return res.status(400).json({ error: '날짜가 필요합니다' });
      }

      // API 키 확인
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({
          error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.'
        });
      }

      // 1. 해당 날짜의 이벤트 가져오기
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', userId)
        .eq('date', date)
        .eq('is_plan', false)
        .order('start_time');

      if (eventsError) throw eventsError;

      const eventsWithCategory = (events || []).map(e => ({
        ...e,
        category_name: e.categories?.name,
        category_color: e.categories?.color
      }));

      // 2. 루틴 & 루틴 체크 가져오기
      const { data: allRoutines, error: routinesError } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('order');

      if (routinesError) throw routinesError;

      // Filter routines by date range and weekday
      let filteredRoutines = allRoutines || [];
      if (filteredRoutines.length > 0) {
        const dateObj = new Date(date + 'T00:00:00');
        const weekday = dateObj.getDay();

        filteredRoutines = filteredRoutines.filter(routine => {
          // Check date range
          if (routine.start_date && date < routine.start_date) {
            return false;
          }
          if (routine.end_date && date > routine.end_date) {
            return false;
          }

          // Check weekday
          if (routine.weekdays) {
            let weekdays = routine.weekdays;
            // Parse JSON string if needed (handle multiple levels of JSON encoding)
            while (typeof weekdays === 'string') {
              try {
                weekdays = JSON.parse(weekdays);
              } catch (e) {
                console.error('Failed to parse routine weekdays:', e);
                return false;
              }
            }

            // Check if weekdays is array and contains current weekday
            if (Array.isArray(weekdays) && weekdays.length > 0) {
              if (!weekdays.includes(weekday)) {
                return false;
              }
            }
          }

          return true;
        });
      }

      const { data: routineChecksData, error: checksError } = await supabase
        .from('routine_checks')
        .select('routine_id, checked')
        .eq('user_id', userId)
        .eq('date', date);

      if (checksError) throw checksError;

      const routineChecks = {};
      (routineChecksData || []).forEach(check => {
        if (check.checked) {
          routineChecks[check.routine_id] = true;
        }
      });

      // 3. 할일 가져오기
      const { data: todos, error: todosError } = await supabase
        .from('todos')
        .select(`
          *,
          todo_categories (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('date', date)
        .order('order');

      if (todosError) throw todosError;

      const todosWithCategory = (todos || []).map(t => ({
        ...t,
        category_name: t.todo_categories?.name
      }));

      // 4. 회고 & 기분 가져오기
      const { data: reflectionData } = await supabase
        .from('reflections')
        .select('reflection_text, mood')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      const reflection = reflectionData || {};

      // 5. 요일 계산
      const dateObj = new Date(date);
      const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const weekday = weekdays[dateObj.getDay()];

      // 6. 프롬프트 데이터 구성
      const promptData = {
        date,
        weekday,
        events: eventsWithCategory,
        routines: filteredRoutines,
        routineChecks,
        todos: todosWithCategory,
        mood: reflection.mood,
        reflection_text: reflection.reflection_text
      };

      // 7. 프롬프트 생성
      const prompt = buildTaskRecommendationPrompt(promptData);

      // 8. Claude API 호출
      const aiResponse = await generateTaskRecommendations(prompt);

      // 9. 응답에서 할일 목록 파싱
      const taskMatch = aiResponse.match(/TASK_START\s*([\s\S]*?)\s*TASK_END/);
      let tasks = [];
      let message = aiResponse;

      if (taskMatch) {
        const tasksText = taskMatch[1];
        tasks = tasksText
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim())
          .filter(task => task.length > 0);

        // TASK_START와 TASK_END를 제외한 메시지 추출
        message = aiResponse.replace(/TASK_START[\s\S]*TASK_END/, '').trim();
      }

      // 10. 응답
      res.json({
        success: true,
        tasks,
        message,
        rawResponse: process.env.NODE_ENV === 'development' ? aiResponse : undefined,
        prompt: process.env.NODE_ENV === 'development' ? prompt : undefined
      });

    } catch (error) {
      console.error('AI Task Recommendation Error:', error);
      res.status(500).json({
        error: 'AI 할일 추천 생성 중 오류가 발생했습니다',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}
