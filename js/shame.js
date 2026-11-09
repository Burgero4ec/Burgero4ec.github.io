/**
 * shame.js - Доска позора Global Lens (Понзс и Айтек)
 */
import { esc } from './utils.js';
import { STAFF_MODAL_ITEMS } from './staff_data.js';

let activePersona = 'ponzc';
let activeFilter = 'all';
let searchQuery = '';
let isInitialized = false;

const shameDataCache = {
  ponzc: null,
  aytac: null
};

export const PERSONA_CONFIGS = {
  ponzc: {
    id: 'ponzc',
    name: '𝕻𝖔𝖓𝖟𝖈',
    alias: '@ponzc',
    discordId: '830428424677490728',
    avatar: 'https://cdn.discordapp.com/avatars/830428424677490728/3f56105a102a8ede36259e2ab9ca5051.png?size=1024',
    status: 'ПОД НАДЗОРОМ',
    statusClass: 'dot-pulse-red',
    statusBorder: 'rgba(239, 68, 68, 0.55)',
    statusBg: '#190808',
    statusColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    cardBorder: 'rgba(239, 68, 68, 0.3)',
    avatarRing: 'conic-gradient(from 0deg, #ef4444, #eab308, #ef4444, #f97316, #ef4444)',
    badges: [
      { class: 'badge-admin', icon: '#i-crown', text: 'АДМИНИСТРАТОР' },
      { class: 'badge-ludik', text: '🎰 ГЛАВНЫЙ ЛУДИК' },
      { class: 'badge-cart', icon: '#i-compass', text: 'КАРТОГРАФ' },
      { class: 'badge-record', text: '💀 200 СТАТЕЙ И НАГРАД' }
    ],
    bio: 'Легендарный администратор проекта и бессменный покоритель рулеток Global Luds. Известен тактическими рейдами в тапочках, утерей плащ-палаток в бою, переговорами с пальмами и раздачей конфет сиротам перед телекамерами. За время службы удостоился 200 орденов, медалей и курьёзных знаков отличия в Кавказской Горской Республике и БРН «Русич».',
    quoteTitle: 'ГЛАВНЫЙ ДЕВИЗ И ВЕРДИКТ:',
    quoteText: '«Доказал, что некоторые участники проекта также являются лудоманами»',
    stats: [
      { num: '200', numId: 'shameCountTotal', label: 'Всего курьёзов и наград' },
      { num: '100', label: 'Горская Республика (1–100)' },
      { num: '100', label: 'БРН «Русич» (101–200)' },
      { num: '100%', highlight: true, label: 'Шанс слива в Global Luds' }
    ],
    searchPlaceholder: 'Поиск по 200 пунктам (тапочки, БТР, взятка, папаха)...',
    tabs: [
      { id: 'all', label: '⚡ Все (200)' },
      { id: 'caucasus', label: '🏔️ Горская Республика (1–100)' },
      { id: 'rusich', label: '🛡️ БРН «Русич» (101–200)' }
    ],
    filterItem: (item, filter) => {
      if (filter === 'caucasus') return item.id >= 1 && item.id <= 100;
      if (filter === 'rusich') return item.id >= 101 && item.id <= 200;
      return true;
    },
    getBadgeHtml: (item) => {
      if (item.id === 0) return '<span class="shame-cat-tag special">ОСОБЫЙ ПРОВАЛ</span>';
      if (item.id >= 1 && item.id <= 100) return '<span class="shame-cat-tag caucasus">ГОРСКАЯ РЕСПУБЛИКА</span>';
      if (item.id >= 101 && item.id <= 200) return '<span class="shame-cat-tag rusich">БРН «РУСИЧ»</span>';
      return '';
    }
  },
  aytac: {
    id: 'aytac',
    name: 'AytacOnan2 (Айтек)',
    alias: '@aytaconan2_',
    discordId: '484044030640914437',
    avatar: 'https://cdn.discordapp.com/avatars/484044030640914437/a85444c050d4e5b4c749d702ec5cbd69.png?size=1024',
    status: 'В РЕЖИМЕ ВАЙБКОДИНГА',
    statusClass: 'dot-pulse-amber',
    statusBorder: 'rgba(245, 158, 11, 0.55)',
    statusBg: '#1a1306',
    statusColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.18)',
    cardBorder: 'rgba(245, 158, 11, 0.35)',
    avatarRing: 'conic-gradient(from 0deg, #f59e0b, #ef4444, #3b82f6, #10b981, #f59e0b)',
    badges: [
      { class: 'badge-admin', icon: '#i-crown', text: 'ОСНОВАТЕЛЬ СЕРВЕРА' },
      { class: 'badge-vibecode', text: '⚡ ВЕЛИКИЙ ВАЙБКОДЕР' },
      { class: 'badge-bot', icon: '#i-wrench', text: 'СОЗДАТЕЛЬ БОТА' },
      { class: 'badge-record', text: '📉 30 ЭПИЧЕСКИХ ГРЕХОВ' }
    ],
    bio: 'Основатель, Священный Император и Отец Сервера Global Lens RP. Создатель всемогущего бота, тянущего на себе всю механику сервера. Главный виртуоз вайбкодинга прямо на живых игроках, виновник мутов за падение доходов, создатель налога 25% и напутствия «Успешной игры». Добровольно явился на Стену Позора!',
    quoteTitle: 'ГЛАВНЫЙ ДЕВИЗ И ВЕРДИКТ:',
    quoteText: '«Успешной игры. В продакшене само протестируется!»',
    stats: [
      { num: '30', numId: 'shameCountTotal', label: 'Всего грехов и подвигов' },
      { num: '10', label: 'Вайбкодинг и баги (1–10)' },
      { num: '10', label: 'Экономический террор (11–20)' },
      { num: '99.9%', highlight: true, label: 'Шанс краша на вайпе' }
    ],
    searchPlaceholder: 'Поиск по грехам (вайбкодинг, доходы, комиссия 25%, бот, ГЭС)...',
    tabs: [
      { id: 'all', label: '⚡ Все (30)' },
      { id: 'dev', label: '💻 Вайбкодинг (1–10)' },
      { id: 'economy', label: '📉 Экономика (11–20)' },
      { id: 'emperor', label: '👑 Священный Император (21–30)' }
    ],
    filterItem: (item, filter) => {
      if (filter === 'dev') return item.id >= 1 && item.id <= 10;
      if (filter === 'economy') return item.id >= 11 && item.id <= 20;
      if (filter === 'emperor') return item.id >= 21 && item.id <= 30;
      return true;
    },
    getBadgeHtml: (item) => {
      if (item.id === 0) return '<span class="shame-cat-tag special">ОТЕЦ СЕРВЕРА</span>';
      if (item.id >= 1 && item.id <= 10) return '<span class="shame-cat-tag dev">ВАЙБКОДИНГ</span>';
      if (item.id >= 11 && item.id <= 20) return '<span class="shame-cat-tag economy">ЭКОНОМИКА</span>';
      if (item.id >= 21 && item.id <= 30) return '<span class="shame-cat-tag emperor">ИМПЕРАТОР</span>';
      return '';
    }
  }
};

export async function loadShameData(personaKey = activePersona) {
  if (shameDataCache[personaKey] && shameDataCache[personaKey].length) {
    return shameDataCache[personaKey];
  }

  const fileName = personaKey === 'aytac' ? 'data/awards_aytac.json' : 'data/awards_ponzc.json';

  try {
    const res = await fetch(fileName);
    if (res.ok) {
      const data = await res.json();
      if (data && data.items && data.items.length) {
        shameDataCache[personaKey] = data.items;
        return shameDataCache[personaKey];
      }
    }
  } catch (e) {
    console.warn(`[Shame] Fetch ${fileName} failed, using bundled fallback:`, e);
  }

  // Резервный парсинг из встроенных данных STAFF_MODAL_ITEMS
  const fallbackHtml = STAFF_MODAL_ITEMS && STAFF_MODAL_ITEMS[personaKey];
  if (fallbackHtml) {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fallbackHtml;
      const parsed = [];
      let currentCat = 'ОСОБЫЕ ЗАСЛУГИ';
      let idCounter = 0;
      tempDiv.querySelectorAll('.award').forEach(el => {
        const lbl = el.querySelector('.lbl');
        if (lbl) {
          currentCat = lbl.textContent.trim();
          return;
        }
        const b = el.querySelector('b');
        const span = el.querySelector('span:not(.lbl)');
        if (b) {
          const name = b.textContent.trim();
          const desc = span ? span.textContent.replace(/^—\s*/, '').trim() : '';
          parsed.push({
            id: idCounter++,
            category: currentCat,
            name: name,
            description: desc
          });
        }
      });
      if (parsed.length > 0) {
        shameDataCache[personaKey] = parsed;
        return parsed;
      }
    } catch (e2) {
      console.error('[Shame] Fallback parse failed:', e2);
    }
  }

  return [];
}

export function renderProfileCard(persona) {
  const card = document.getElementById('shameProfileCard');
  if (!card) return;

  card.style.borderColor = persona.cardBorder || 'rgba(239, 68, 68, 0.3)';

  const badgesHtml = (persona.badges || []).map(b => `
    <span class="shame-badge ${b.class}">
      ${b.icon ? `<svg class="ic"><use href="${b.icon}"/></svg>` : ''} ${esc(b.text)}
    </span>
  `).join('');

  const statsHtml = (persona.stats || []).map(st => `
    <div class="shame-stat-card">
      <b class="shame-stat-num ${st.highlight ? 'highlight' : ''}" ${st.numId ? `id="${st.numId}"` : ''}>${st.num}</b>
      <span>${esc(st.label)}</span>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="shame-profile-glow" style="background: radial-gradient(circle, ${persona.glowColor} 0%, transparent 70%);"></div>
    <div class="shame-profile-body">
      <!-- Аватарка -->
      <div class="shame-avatar-wrapper">
        <div class="shame-avatar-ring" style="background: ${persona.avatarRing};"></div>
        <div class="shame-avatar-ring-outer"></div>
        <div class="shame-avatar-img-box">
          <img src="${persona.avatar}" alt="${esc(persona.name)}" class="shame-avatar-img">
        </div>
        <div class="shame-avatar-status" style="border-color:${persona.statusBorder};background:${persona.statusBg};color:${persona.statusColor}">
          <span class="${persona.statusClass}"></span> ${esc(persona.status)}
        </div>
        <div class="shame-id-chip">ID: ${persona.discordId}</div>
      </div>

      <!-- Инфо-досье -->
      <div class="shame-info">
        <div class="shame-info-top">
          <div class="shame-name-row">
            <h2 class="shame-name">${esc(persona.name)}</h2>
            <span class="shame-alias">${esc(persona.alias)}</span>
          </div>
          <div class="shame-badges-row">
            ${badgesHtml}
          </div>
        </div>

        <p class="shame-bio">
          ${esc(persona.bio)}
        </p>

        <div class="shame-quote-box">
          <svg class="ic quote-ic"><use href="#i-alert-circle"/></svg>
          <div>
            <b>${esc(persona.quoteTitle)}</b>
            <span>${esc(persona.quoteText)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Статистика -->
    <div class="shame-stats-grid">
      ${statsHtml}
    </div>
  `;
}

export function renderFilterTabs(persona) {
  const container = document.getElementById('shameFilterTabs');
  if (!container) return;

  container.innerHTML = persona.tabs.map(tab => `
    <button class="shame-tab-btn ${tab.id === activeFilter ? 'active' : ''}" data-filter="${tab.id}">
      ${esc(tab.label)}
    </button>
  `).join('');

  container.querySelectorAll('.shame-tab-btn').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.shame-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      renderCards();
    };
  });
}

export async function renderCards() {
  const container = document.getElementById('shameItemsGrid');
  if (!container) return;

  const persona = PERSONA_CONFIGS[activePersona] || PERSONA_CONFIGS.ponzc;
  const items = await loadShameData(activePersona);

  if (!items || !items.length) {
    container.innerHTML = '<p class="loading">Загрузка данных доски позора...</p>';
    return;
  }

  const q = searchQuery.toLowerCase().trim();
  const filtered = items.filter(it => {
    // 1. Фильтрация по категории
    if (activeFilter !== 'all' && typeof persona.filterItem === 'function') {
      if (!persona.filterItem(it, activeFilter)) return false;
    }
    // 2. Фильтрация по поисковому запросу
    if (q) {
      const text = ((it.name || '') + ' ' + (it.description || '') + ' ' + (it.category || '')).toLowerCase();
      return text.includes(q);
    }
    return true;
  });

  const countTotalEl = document.getElementById('shameCountTotal');
  if (countTotalEl && !q && activeFilter === 'all') {
    countTotalEl.textContent = items.length;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="shame-empty">
        <svg class="ic"><use href="#i-search"/></svg>
        <b>Ничего не найдено</b>
        <p>По запросу «${esc(q)}» не обнаружено ни одного зафиксированного курьёза.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(it => {
    const isSpecial = it.id === 0;
    const catBadge = persona.getBadgeHtml ? persona.getBadgeHtml(it) : '';

    return `
      <div class="shame-card ${isSpecial ? 'shame-special' : ''}">
        <div class="shame-card-head">
          <span class="shame-card-num">#${it.id === 0 ? '★' : it.id}</span>
          ${catBadge}
        </div>
        <div class="shame-card-title">${esc(it.name)}</div>
        ${it.description ? `<div class="shame-card-desc">— ${esc(it.description)}</div>` : ''}
      </div>
    `;
  }).join('');
}

export async function switchShamePersona(personaKey) {
  if (!PERSONA_CONFIGS[personaKey]) return;
  activePersona = personaKey;
  activeFilter = 'all';
  searchQuery = '';

  // Обновляем кнопки переключателя
  document.querySelectorAll('.shame-persona-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.persona === personaKey);
  });

  const persona = PERSONA_CONFIGS[personaKey];

  // Сброс поля поиска
  const searchInput = document.getElementById('shameSearchInput');
  const clearBtn = document.getElementById('shameSearchClear');
  if (searchInput) {
    searchInput.value = '';
    searchInput.placeholder = persona.searchPlaceholder;
  }
  if (clearBtn) clearBtn.style.display = 'none';

  // Рендерим шапку профиля, вкладки и карточки
  renderProfileCard(persona);
  renderFilterTabs(persona);
  await renderCards();
}

export async function initShameBoard() {
  const container = document.getElementById('shameItemsGrid');
  if (!container) return;

  const persona = PERSONA_CONFIGS[activePersona] || PERSONA_CONFIGS.ponzc;

  // Инициализация кнопок переключателя персон
  document.querySelectorAll('.shame-persona-btn').forEach(btn => {
    btn.onclick = () => {
      const p = btn.dataset.persona;
      if (p && p !== activePersona) {
        switchShamePersona(p);
      }
    };
  });

  // Привязка живого поиска (вешаем один раз)
  const searchInput = document.getElementById('shameSearchInput');
  const clearBtn = document.getElementById('shameSearchClear');
  if (searchInput && !isInitialized) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
      renderCards();
    };
  }
  if (clearBtn && !isInitialized) {
    clearBtn.onclick = () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        renderCards();
      }
    };
  }

  isInitialized = true;

  renderProfileCard(persona);
  renderFilterTabs(persona);
  await renderCards();
}

// Экспорт в глобальное пространство window
window.initShameBoard = initShameBoard;
window.switchShamePersona = switchShamePersona;
