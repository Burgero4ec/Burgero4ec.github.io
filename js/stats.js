/**
 * stats.js - Анимация плавного перетекания цифр (fluid count-up) и живые данные сервера
 */
import { fmtNum } from './utils.js';

let MAP_INFO = null;

/**
 * Плавная анимация перетекания чисел с красивым экспоненциальным замедлением (easeOutExpo)
 * @param {HTMLElement} el - целевой элемент счетчика
 * @param {number} target - конечное число
 * @param {number} duration - длительность анимации (мс)
 * @param {number} delay - задержка перед стартом (мс)
 */
export function fluidCountUp(el, target, duration = 1600, delay = 0) {
  if (!el || isNaN(target)) return;

  setTimeout(() => {
    el.classList.add('stat-rolling');
    const startVal = 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Высокоточное кубическое сглаживание: быстрый старт с мягким доездом
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (target - startVal) * ease);

      el.textContent = current.toLocaleString('ru-RU');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString('ru-RU');
        el.classList.remove('stat-rolling');
        el.classList.add('stat-arrived');
        setTimeout(() => el.classList.remove('stat-arrived'), 600);
      }
    }

    requestAnimationFrame(update);
  }, delay);
}

export function countUpAll(key, target) {
  const elements = document.querySelectorAll('[data-stat="' + key + '"]');
  elements.forEach((el, index) => {
    fluidCountUp(el, target, 1600, index * 80);
  });
}

export function animateStats() {
  const homeStats = document.querySelectorAll('#page-home .stat b');
  homeStats.forEach((el, i) => {
    const rawCount = el.dataset.count;
    if (rawCount != null) {
      fluidCountUp(el, +rawCount, 1500, i * 70);
    }
  });
}

export async function loadMapInfo() {
  const si = document.getElementById('seasonUpdateInfo');
  const fallback = {
    country: 23,
    organization: 2,
    autonomy: 3,
    players: 28,
    discord_members: 635,
    total_gdp: 249515397949361,
    total_population: 4769699702,
    last_update: "2026-09-22T17:07:37.449371+00:00"
  };

  let m = fallback;
  try {
    const r = await fetch('data/map_info.json?t=' + Date.now());
    if (r.ok) {
      m = await r.json();
    }
  } catch (e) {
    // На протоколе file:/// используем актуальные данные карты
  }

  MAP_INFO = m;

  countUpAll('countries', m.country || 0);
  countUpAll('orgs', m.organization || 0);
  countUpAll('autos', m.autonomy || 0);
  countUpAll('players', m.players || 0);

  if (m.discord_members != null) {
    countUpAll('discord_members', m.discord_members);
  } else {
    document.querySelectorAll('[data-stat="discord_members"]').forEach(el => el.textContent = '—');
  }

  const dStr = m.last_update ? new Date(m.last_update).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '22.09.2026, 20:07';

  const ws = document.getElementById('worldStats');
  if (ws) {
    ws.innerHTML =
      '<div class="us-item"><b>' + fmtNum(m.total_gdp) + '</b>суммарный ВВП</div>' +
      '<div class="us-item"><b>' + fmtNum(m.total_population) + '</b>население</div>' +
      '<div class="us-item"><b>' + dStr + '</b>обновлено</div>';
  }

  if (si) {
    si.innerHTML =
      '<div class="us-item"><b>раз в 3 часа</b>обновление данных</div>' +
      '<div class="us-item"><b>' + dStr + '</b>последнее обновление</div>';
  }
}

export function getMapInfo() {
  return MAP_INFO;
}
