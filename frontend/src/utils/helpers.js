// Category colors mapping
export const CATEGORY_COLOR_BY_NUM = {
  '①': '#fbb9b6',
  '②': '#fbf5b6',
  '③': '#cafbb6',
  '④': '#fbdfb6',
  '⑤': '#cab6fb',
  '⑥': '#b6f4fb',
  '⑦': '#e8ceb4'
};

export const CATEGORY_TEXT_COLORS = {
  '① 낭비시간': '#D13F3F',
  '② 사회적': '#A78400',
  '③ 지적': '#1E7B34',
  '④ 영적': '#C46C00',
  '⑤ 잠': '#4A4AC4',
  '⑥ 운동': '#008C99',
  '⑦ 기타': '#654321',
  default: '#37352f'
};

export function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(0,0,0,${alpha || 1})`;
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(ch => ch + ch).join('');
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getCategoryColorByName(name, fallbackColor) {
  if (!name) return fallbackColor || '#2383e2';
  const match = name.match(/[①②③④⑤⑥⑦⑧⑨]/);
  if (match && CATEGORY_COLOR_BY_NUM[match[0]]) {
    return CATEGORY_COLOR_BY_NUM[match[0]];
  }
  return fallbackColor || '#2383e2';
}

export function getCategoryTextColorByName(name) {
  if (!name) return '#ffffff';

  if (CATEGORY_TEXT_COLORS[name]) {
    return CATEGORY_TEXT_COLORS[name];
  }

  const match = name.match(/[①②③④⑤⑥⑦⑧⑨]/);
  if (match) {
    const numKeyMap = {
      '①': '① 낭비시간',
      '②': '② 사회적',
      '③': '③ 지적',
      '④': '④ 영적',
      '⑤': '⑤ 잠',
      '⑥': '⑥ 운동',
      '⑦': '⑦ 기타'
    };
    const key = numKeyMap[match[0]];
    if (key && CATEGORY_TEXT_COLORS[key]) {
      return CATEGORY_TEXT_COLORS[key];
    }
  }

  return CATEGORY_TEXT_COLORS.default || '#ffffff';
}

export function getLocalDateString(date) {
  // Always use Korea timezone (UTC+9) for consistent date strings
  const koreaTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = koreaTime.getFullYear();
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatKoreanTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();

  const ampm = h >= 12 ? 'pm' : 'am';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;

  if (m === 0) {
    return `${ampm} ${displayH}시`;
  }
  return `${ampm} ${displayH}시 ${m}분`;
}

export function formatEventTimeRange(start, end) {
  const opts = { hour: 'numeric', minute: '2-digit' };
  const startStr = start.toLocaleTimeString('en-US', opts);
  const endStr = end.toLocaleTimeString('en-US', opts);
  return `${startStr} - ${endStr}`;
}
