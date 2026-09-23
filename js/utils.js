/**
 * utils.js - Вспомогательные функции экранирования, форматирования и безопасных URL
 */

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function parseTs(s) {
  const m = (s || '').match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
}

export function trimDeep(v) {
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(trimDeep);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k.trim()] = trimDeep(val);
    return o;
  }
  return v;
}

export function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2).replace('.', ',') + ' трлн';
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' млрд';
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' млн';
  return Math.round(n).toLocaleString('ru-RU');
}

export function readLS(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}

export function normName(s) {
  return String(s || '').toLowerCase().replace(/[\s_.\-]/g, '');
}

export function defaultAvatar(id) {
  try {
    return 'https://cdn.discordapp.com/embed/avatars/' + (Number(BigInt(id || 0) >> 22n) % 6) + '.png';
  } catch (e) {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

export function userAvatar(u) {
  return (u && u.avatar) || (u && u.avatarUrl) || defaultAvatar(u ? u.id : '0');
}

export function safeUrl(url) {
  const t = String(url || '').trim().toLowerCase();
  if (t.startsWith('javascript:') || t.startsWith('data:') || t.startsWith('vbscript:')) return '#';
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/') || t.startsWith('#')) return url;
  return '#';
}

export function renderError(msg, retryFnName) {
  return (
    '<div class="error-box">' +
    '<p class="loading" style="margin-bottom: 12px;">' + esc(msg) + '</p>' +
    (retryFnName ? '<button class="cta ghost" onclick="' + esc(retryFnName) + '()">🔄 Повторить попытку</button>' : '') +
    '</div>'
  );
}

export function debounce(fn, delay = 250) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
