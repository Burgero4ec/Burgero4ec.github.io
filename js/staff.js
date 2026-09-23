/**
 * staff.js - Модуль персонала, плашка «это вы», модалки достижений для QWERTX, Ponzc, ! xil3dd
 */
import { esc, normName, readLS } from './utils.js';
import { STAFF_DISCORD } from './config.js';
import { countUpAll } from './stats.js';
import { getPlayers, playerMeta } from './auth.js';
import { refreshOdysseyElements } from './animations.js';
import { STAFF_MODAL_ITEMS } from './staff_data.js';

let staffDataStore = null;

export async function loadStaffData() {
  if (staffDataStore) return staffDataStore;
  try {
    const res = await fetch('data/staff.json');
    if (res.ok) {
      staffDataStore = await res.json();
      return staffDataStore;
    }
  } catch (e) {}
  return null;
}

export function decorateStaff() {
  const body = document.getElementById('staffBody');
  if (!body) return;

  const extra = readLS('gl-players', {});
  const extraByNorm = {};
  for (const [id, v] of Object.entries(extra)) {
    extraByNorm[normName(v.name)] = { id, avatar: v.avatar };
  }

  const players = getPlayers();
  const playersByNorm = {};
  if (players) {
    for (const [id, v] of Object.entries(players)) {
      playersByNorm[normName(v.nick || v.name || '')] = { id, avatar: v.avatar };
    }
  }

  const people = new Set();

  body.querySelectorAll('.member').forEach(m => {
    const b = m.querySelector('b');
    if (!b) return;

    const rawName = b.textContent.trim();
    const nn = normName(rawName);
    if (nn && nn !== 'вакансия') {
      people.add(nn);
    }

    let id = m.dataset.discordId || STAFF_DISCORD[nn] || null;
    let av = id ? playerMeta(id).avatar : null;
    if (!av && playersByNorm[nn]) {
      id = id || playersByNorm[nn].id;
      av = playersByNorm[nn].avatar;
    }
    if (!av && extraByNorm[nn]) {
      id = id || extraByNorm[nn].id;
      av = extraByNorm[nn].avatar;
    }

    const ava = m.querySelector('.m-ava');
    if (av && ava && !ava.querySelector('img')) {
      ava.innerHTML = '<img src="' + av + '" alt="' + esc(rawName) + '">';
    }

    // Плашка «это вы»
    if (window.glUser) {
      const isMe = (id && String(id) === String(window.glUser.id)) || (nn === normName(window.glUser.name));
      if (isMe) {
        if (!m.querySelector('.you-badge')) {
          const badge = document.createElement('span');
          badge.className = 'you-badge';
          badge.textContent = 'это вы';
          const roleEl = m.querySelector('.m-role');
          if (roleEl) roleEl.after(badge);
          else b.after(badge);
        }
      }
    } else {
      const existingBadge = m.querySelector('.you-badge');
      if (existingBadge) existingBadge.remove();
    }
  });

  countUpAll('staff', people.size || 23);
  refreshOdysseyElements(body);
}

// Данные для модальных окон
let STAFF_MODAL_DATA = {
  qwertx: {
    title: 'ℚ𝕎𝔼ℝ𝕋𝕏',
    role: 'ЗАМ. КУРАТОРА ПОЛИТОЛОГОВ',
    badge: '⚖️ СУД ЕГО ОПРАВДАЛ',
    badgeClass: 'verdict-acquitted',
    avatar: 'https://cdn.discordapp.com/avatars/1066701976949239905/d99b9aa9ae64e50db02a59e027222752.png?size=1024',
    subtitle: 'Полный список обвинений (200 пунктов)',
    selector: '[data-discord-id="1066701976949239905"] details.long-list .award'
  },
  ponzc: {
    title: '𝕻𝖔𝖓𝖟𝖈',
    role: 'АДМИНИСТРАТОР / КАРТОГРАФИЯ',
    badge: '🏅 200 НАГРАД (КАВКАЗ + РУСИЧ)',
    badgeClass: 'awards-badge',
    avatar: 'https://cdn.discordapp.com/avatars/830428424677490728/3f56105a102a8ede36259e2ab9ca5051.png?size=1024',
    subtitle: 'Наградной лист и боевые заслуги',
    selector: '[data-discord-id="830428424677490728"] .award'
  },
  xil3dd: {
    title: '! xil3dd',
    role: 'КУРАТОР МОДЕРАТОРОВ',
    badge: '📜 200 СТАТЕЙ И ПРЕСТУПЛЕНИЙ',
    badgeClass: 'accusations-badge',
    avatar: 'https://cdn.discordapp.com/avatars/928360132482572371/75a6e47b610f5e5e0d0edf1e4d95e26b.png?size=1024',
    subtitle: 'Полный список дел и обвинений',
    selector: '[data-discord-id="928360132482572371"] .award'
  }
};

export function openStaffModal(key) {
  const modal = document.getElementById('staffModal');
  if (!modal) return;

  const cfg = STAFF_MODAL_DATA[key];
  if (!cfg) return;

  const titleEl = document.getElementById('staffModalTitle');
  const subEl = document.getElementById('staffModalSub');
  const avaEl = document.getElementById('staffModalAva');
  const badgeEl = document.getElementById('staffModalBadge');
  const bodyEl = document.getElementById('staffModalBody');
  const searchInput = document.getElementById('staffSearchInput');

  if (titleEl) titleEl.textContent = cfg.title;
  if (subEl) subEl.textContent = cfg.role + ' · ' + cfg.subtitle;
  if (avaEl) avaEl.innerHTML = `<img src="${cfg.avatar}" alt="${esc(cfg.title)}">`;
  if (badgeEl) {
    badgeEl.textContent = cfg.badge;
    badgeEl.className = 'staff-modal-badge ' + (cfg.badgeClass || '');
  }

  // Извлекаем элементы списка из кэша данных или разметки страницы
  let itemsHtml = (STAFF_MODAL_ITEMS && STAFF_MODAL_ITEMS[key]) || '';
  if (!itemsHtml && cfg.selector) {
    const elements = document.querySelectorAll(cfg.selector);
    if (elements.length > 0) {
      itemsHtml = Array.from(elements).map(el => el.outerHTML).join('');
    }
  }
  if (!itemsHtml) {
    itemsHtml = '<p class="loading">Загрузка данных...</p>';
  }

  if (bodyEl) {
    bodyEl.innerHTML = `
      ${key === 'qwertx' ? `
        <div class="verdict-banner-modal">
          <svg class="ic"><use href="#i-scale"/></svg>
          <div><b>ОКОНЧАТЕЛЬНЫЙ ВЕРДИКТ:</b> Суд признал обвинения несостоятельными и полностью оправдал QWERTX по всем 200 пунктам.</div>
        </div>
      ` : ''}
      <div class="staff-items-container" id="staffItemsList">
        ${itemsHtml}
      </div>
    `;
  }

  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      const listContainer = document.getElementById('staffItemsList');
      if (!listContainer) return;

      listContainer.querySelectorAll('.award').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
      });
    };
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeStaffModal() {
  const modal = document.getElementById('staffModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Экспорт глобальных функций для разметки onclick
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeStaffModal();
});
document.addEventListener('click', e => {
  if (e.target && e.target.classList.contains('staff-modal-overlay')) {
    closeStaffModal();
  }
});
