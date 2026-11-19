/**
 * wiki.js - База знаний, энциклопедия и лор Global Lens RP + плавная анимация переключения на архивы
 */

import { LORE, TIMELINE } from './wiki-data.js';

const CATEGORIES = [
  { id: 'all',    label: 'Все статьи',          icon: '✳' },
  { id: 'wars',   label: 'Войны и конфликты',   icon: '⚔' },
  { id: 'states', label: 'Государства и ЧВК',   icon: '⌖' },
  { id: 'people', label: 'Личности сервера',    icon: '◉' },
  { id: 'docs',   label: 'Документы и реформы', icon: '▤' },
  { id: 'staff',  label: 'Стафф и суды',        icon: '⚖' },
  { id: 'memes',  label: 'Мемы и инциденты',    icon: '✦' }
];

const state = {
  activeTab: 'lore',
  category: 'all',
  query: ''
};


function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

/**
 * Плавный скользящий бегунок переключения вкладок (Glider)
 */
export function updateWikiGlider(tabName = state.activeTab, animate = true) {
  if (typeof window === 'undefined') return;
  const nav = document.getElementById('wikiMainTabs');
  const glider = document.getElementById('wikiTabGlider');
  if (!nav || !glider) return;

  const targetTab = nav.querySelector(`.wiki-tab-btn[data-wiki-tab="${tabName}"]`);
  if (!targetTab) return;

  // Если вкладка скрыта (например, открыта другая страница портала), откладываем расчет
  if (targetTab.offsetWidth === 0) {
    requestAnimationFrame(() => {
      const retryTab = nav.querySelector(`.wiki-tab-btn[data-wiki-tab="${tabName}"]`);
      if (retryTab && retryTab.offsetWidth > 0) {
        updateWikiGlider(tabName, false);
      }
    });
    return;
  }

  if (!animate) {
    glider.style.transition = 'none';
  } else {
    glider.style.transition = '';
  }

  const navRect = nav.getBoundingClientRect();
  const tabRect = targetTab.getBoundingClientRect();

  const left = tabRect.left - navRect.left - (nav.clientLeft || 0);
  const width = tabRect.width;

  glider.style.transform = `translate3d(${left}px, 0, 0)`;
  glider.style.width = `${width}px`;
  glider.classList.add('ready');
  nav.classList.add('glider-active');

  if (!animate) {
    void glider.offsetHeight; // reflow
    glider.style.transition = '';
  }
}

/**
 * Переключение между подразделами "База знаний и Лор" и "Архивы сезонов"
 */
export function switchWikiTab(tabName, animate = true) {
  const targetTab = tabName === 'archives' ? 'archives' : 'lore';
  if (state.activeTab === targetTab) return;
  state.activeTab = targetTab;

  const loreBtn = document.getElementById('wikiTabLoreBtn');
  const archBtn = document.getElementById('wikiTabArchBtn');
  const loreView = document.getElementById('wikiViewLore');
  const archView = document.getElementById('wikiViewArchives');

  // 1. Анимируем скользящий бегунок (быстро и чётко)
  updateWikiGlider(targetTab, animate);

  const activeBtn = targetTab === 'archives' ? archBtn : loreBtn;
  const inactiveBtn = targetTab === 'archives' ? loreBtn : archBtn;
  const activeView = targetTab === 'archives' ? archView : loreView;
  const inactiveView = targetTab === 'archives' ? loreView : archView;

  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }
  if (inactiveBtn) {
    inactiveBtn.classList.remove('active');
    inactiveBtn.setAttribute('aria-selected', 'false');
  }

  // 2. Мгновенное переключение с быстрым и плавным fade
  if (inactiveView) {
    inactiveView.style.display = 'none';
    inactiveView.classList.remove('wiki-view-enter');
  }

  if (activeView) {
    activeView.style.display = 'block';
    activeView.classList.remove('wiki-view-enter');
  }
}

function renderFilters() {
  const container = document.getElementById('wikiFilters');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <button class="wiki-filter-chip ${state.category === cat.id ? 'active' : ''}" type="button" data-category="${cat.id}">
      <span class="chip-icon">${cat.icon}</span>
      <span>${esc(cat.label)}</span>
    </button>
  `).join('');
}

function getFilteredArticles() {
  const q = state.query.trim().toLowerCase();
  return LORE.filter(art => {
    const catMatch = state.category === 'all' || art.category === state.category;
    if (!catMatch) return false;
    if (!q) return true;

    const haystack = [
      art.title,
      art.excerpt,
      art.categoryLabel,
      art.author,
      ...(art.facts || [])
    ].join(' ').toLowerCase();

    return haystack.includes(q);
  });
}

function renderArticles() {
  const grid = document.getElementById('wikiArticleGrid');
  const resultCount = document.getElementById('wikiResultCount');
  const emptyState = document.getElementById('wikiEmptyState');
  if (!grid) return;

  const list = getFilteredArticles();

  if (resultCount) {
    const n = list.length;
    let label = 'статей';
    if (n % 10 === 1 && n % 100 !== 11) label = 'статья';
    else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) label = 'статьи';
    resultCount.textContent = `${n} ${label}`;
  }

  if (emptyState) {
    emptyState.style.display = list.length === 0 ? 'block' : 'none';
  }

  grid.innerHTML = list.map(art => `
    <div class="wiki-card" data-wiki-article="${esc(art.id)}" role="button" tabindex="0">
      <div class="wiki-card-top">
        <div class="wiki-card-icon">${esc(art.icon || '📖')}</div>
        <div class="wiki-card-cat">${esc(art.categoryLabel)}</div>
      </div>
      <h3 class="wiki-card-title">${esc(art.title)}</h3>
      <p class="wiki-card-excerpt">${esc(art.excerpt)}</p>
      <div class="wiki-card-bottom">
        <span>⏱ ${esc(art.readingTime)}</span>
        <span>${esc(art.author)}</span>
        <span class="wiki-card-arrow">↗</span>
      </div>
    </div>
  `).join('');
}

function renderFeatured() {
  const container = document.getElementById('featuredCard');
  if (!container || !LORE.length) return;

  const art = LORE[0];
  container.innerHTML = `
    <div class="wiki-featured-orb">
      <span>${esc(art.icon || '⌖')}</span>
    </div>
    <div class="wiki-featured-content">
      <div class="wiki-featured-meta">
        <span>${esc(art.categoryLabel)}</span>
        <span>•</span>
        <span>${esc(art.readingTime)} чтения</span>
        <span>•</span>
        <span>${esc(art.author)}</span>
      </div>
      <h3 class="wiki-featured-title">${esc(art.title)}</h3>
      <p class="wiki-featured-excerpt">${esc(art.excerpt)}</p>
      <div class="wiki-featured-quote">«${esc(art.quote)}»</div>
      <button class="wiki-read-btn" type="button" data-wiki-article="${esc(art.id)}">
        <span>Читать статью целиком</span>
        <span>→</span>
      </button>
    </div>
  `;
}

function renderTimeline() {
  const container = document.getElementById('wikiTimeline');
  if (!container) return;

  container.innerHTML = TIMELINE.map(item => `
    <div class="wiki-timeline-item">
      <div class="wiki-timeline-node"></div>
      <div class="wiki-timeline-content">
        <span class="wiki-timeline-date">${esc(item.date)}</span>
        <h4 class="wiki-timeline-title">${esc(item.title)}</h4>
        <p class="wiki-timeline-desc">${esc(item.detail)}</p>
        <span class="wiki-timeline-source">Источник: ${esc(item.source)}</span>
      </div>
    </div>
  `).join('');
}

function renderFacts() {
  const container = document.getElementById('wikiFactsGrid');
  if (!container) return;

  const facts = LORE.flatMap(art => (art.facts || []).map(f => ({
    text: f,
    cat: art.categoryLabel
  })));

  container.innerHTML = facts.slice(0, 6).map(fact => `
    <div class="wiki-fact-card">
      <div class="wiki-fact-spark">✦</div>
      <div class="wiki-fact-text">${esc(fact.text)}</div>
      <div class="wiki-fact-cat">${esc(fact.cat)}</div>
    </div>
  `).join('');
}

export const KNOWN_MENTIONS = {
  '_ashkoo139': { name: '_ashkoo139', display: '@_ashkoo139', avatar: 'https://cdn.discordapp.com/avatars/1170359740249948181/923848364ddf7ef05ee5aaabb124f3f1.png', key: 'ashkoo139', country: 'Россия' },
  'ashkoo139': { name: '_ashkoo139', display: '@_ashkoo139', avatar: 'https://cdn.discordapp.com/avatars/1170359740249948181/923848364ddf7ef05ee5aaabb124f3f1.png', key: 'ashkoo139', country: 'Россия' },
  'bludebaff': { name: 'bludebaff', display: '@bludebaff', avatar: 'https://cdn.discordapp.com/avatars/484044030640914437/08e1a1b1a7837851e44f0b2f6efba227.png', key: 'bludebaff', country: 'Индия' },
  'ponzc': { name: 'ponzc', display: '@ponzc', avatar: 'https://cdn.discordapp.com/avatars/830428424677490728/6263ae7ec80a0684bfce6cefbdfaa1b9.png', key: 'ponzc' },
  'qwertx': { name: 'qwertx', display: '@qwertx', avatar: 'https://cdn.discordapp.com/avatars/1066701976949239905/7eb872a08892f3964ff0fb70ca8c42b6.png', key: 'qwertx' },
  'kitaezik': { name: 'kitaezik', display: '@kitaezik', avatar: 'https://cdn.discordapp.com/avatars/758998250610360341/39f0ea77a941655bebb4663e27301c27.png', key: 'kitaezik' },
  'aytac': { name: 'aytac', display: '@aytac', avatar: 'https://cdn.discordapp.com/avatars/484044030640914437/08e1a1b1a7837851e44f0b2f6efba227.png', key: 'aytac' },
  'aytaconan2': { name: 'aytaconan2', display: '@aytaconan2', avatar: 'https://cdn.discordapp.com/avatars/484044030640914437/08e1a1b1a7837851e44f0b2f6efba227.png', key: 'aytac' },
  'dyrm9': { name: 'dyrm9', display: '@dyrm9', avatar: 'https://cdn.discordapp.com/embed/avatars/2.png', key: 'dyrm9' },
  'zarplata': { name: 'zarplata', display: '@zarplata', avatar: 'https://cdn.discordapp.com/embed/avatars/4.png', key: 'zarplata', country: 'Сирия' },
  'xil3dd': { name: 'xil3dd', display: '@xil3dd', avatar: 'https://cdn.discordapp.com/embed/avatars/1.png', key: 'xil3dd' },
  'yabl1ch': { name: 'yabl1ch', display: '@yabl1ch', avatar: 'https://cdn.discordapp.com/avatars/800254982641025056/a_b7cf2697a0bf9961da88b56d3ea74720.png', key: 'yabl1ch', country: 'США' },
  'laybay': { name: 'laybay', display: '@laybay', avatar: 'https://cdn.discordapp.com/embed/avatars/5.png', key: 'laybay', country: 'Австралия' },
  'otkrilochko_78228': { name: 'otkrilochko_78228', display: '@otkrilochko_78228', avatar: 'https://cdn.discordapp.com/avatars/1170359740249948181/923848364ddf7ef05ee5aaabb124f3f1.png', key: 'otkrilochko_78228', country: 'Южная Корея' }
};

export function formatWikiText(text) {
  if (!text) return '';
  let out = esc(text);

  out = out.replace(/@([a-zA-Z0-9_\-]+)/g, (match, username) => {
    const norm = username.toLowerCase();
    const meta = KNOWN_MENTIONS[norm] || {
      name: username,
      display: '@' + username,
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      key: username
    };

    return `<span class="wiki-player-tag" data-player="${esc(meta.key)}" title="Открыть досье ${esc(meta.display)}" onclick="event.stopPropagation(); window.openPlayerDossier('${esc(meta.key)}')"><img class="wiki-player-avatar" src="${meta.avatar}" alt="${esc(meta.name)}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'"><span class="wiki-player-name">${esc(meta.display)}</span></span>`;
  });

  return out;
}

window.openPlayerDossier = function(rawKey) {
  const norm = String(rawKey || '').toLowerCase().replace(/[@\s]/g, '');
  if (norm === 'qwertx') {
    if (typeof window.openStaffModal === 'function') return window.openStaffModal('qwertx');
  }
  if (norm === 'ponzc') {
    if (typeof window.openStaffModal === 'function') return window.openStaffModal('ponzc');
  }
  if (norm === 'xil3dd') {
    if (typeof window.openStaffModal === 'function') return window.openStaffModal('xil3dd');
  }

  const meta = KNOWN_MENTIONS[norm];
  if (meta && meta.country && typeof window.openCountryModal === 'function') {
    return window.openCountryModal(meta.country);
  }

  if (typeof window.go === 'function') {
    window.go('staff');
  }
};

export function openWikiArticle(id) {
  const art = LORE.find(item => item.id === id);
  if (!art) return;

  const modal = document.getElementById('wikiReaderModal');
  const title = document.getElementById('wikiReaderTitle');
  const sub = document.getElementById('wikiReaderSub');
  const icon = document.getElementById('wikiReaderIcon');
  const body = document.getElementById('wikiReaderBody');

  if (!modal || !body) return;

  if (title) title.textContent = art.title;
  if (sub) sub.textContent = `${art.categoryLabel} · ${art.readingTime} чтения · ${art.author}`;
  if (icon) icon.textContent = art.icon || '📖';

  const sectionsHtml = (art.sections || []).map(sec => `
    <section>
      <h3>${esc(sec.heading)}</h3>
      <p>${formatWikiText(sec.text)}</p>
    </section>
  `).join('');

  const factsHtml = (art.facts && art.facts.length) ? `
    <div class="wiki-reader-facts-box">
      <h4>КЛЮЧЕВЫЕ ТЕЗИСЫ</h4>
      <ul>
        ${art.facts.map(f => `<li>${formatWikiText(f)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  body.innerHTML = `
    <p style="font-size:16px;color:#cbd5e1;font-weight:600;margin-bottom:16px;line-height:1.6">${formatWikiText(art.excerpt)}</p>
    <blockquote>«${formatWikiText(art.quote)}»</blockquote>
    ${sectionsHtml}
    ${factsHtml}
    <div class="wiki-reader-source">
      <strong>Основание статьи:</strong> ${esc(art.source)}
    </div>
  `;

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });
  document.body.classList.add('modal-open');
}

export function closeWikiReader() {
  const modal = document.getElementById('wikiReaderModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.style.display = 'none';
      }
    }, 220);
    document.body.classList.remove('modal-open');
  }
}

export function openRandomArticle() {
  const list = getFilteredArticles();
  if (!list.length) return;
  const item = list[Math.floor(Math.random() * list.length)];
  openWikiArticle(item.id);
}

export function initWiki() {
  // Статистика в шапке вики
  const statArt = document.getElementById('statArticles');
  const statQuotes = document.getElementById('statQuotes');
  if (statArt) statArt.textContent = LORE.length.toString();
  if (statQuotes) statQuotes.textContent = LORE.length.toString();

  // Переключение вкладок "Лор" / "Архивы"
  const loreBtn = document.getElementById('wikiTabLoreBtn');
  const archBtn = document.getElementById('wikiTabArchBtn');
  if (loreBtn) {
    loreBtn.addEventListener('click', () => switchWikiTab('lore', true));
  }
  if (archBtn) {
    archBtn.addEventListener('click', () => switchWikiTab('archives', true));
  }

  // Фильтры категорий
  const filterWrap = document.getElementById('wikiFilters');
  if (filterWrap) {
    filterWrap.addEventListener('click', e => {
      const btn = e.target.closest('[data-category]');
      if (!btn) return;
      state.category = btn.dataset.category;
      renderFilters();
      renderArticles();
    });
  }

  // Поиск
  const searchInput = document.getElementById('wikiSearch');
  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = searchInput.value;
        renderArticles();
      }, 150);
    });
  }

  // Кнопка "Случайная статья"
  const randomBtn = document.getElementById('wikiRandomBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', openRandomArticle);
  }

  // Клик по карточкам статей для открытия модалки
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-wiki-article]');
    if (trigger) {
      e.preventDefault();
      openWikiArticle(trigger.dataset.wikiArticle);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const trigger = document.activeElement ? document.activeElement.closest('[data-wiki-article]') : null;
      if (trigger) {
        e.preventDefault();
        openWikiArticle(trigger.dataset.wikiArticle);
      }
    }
  });

  // Закрытие модального окна
  const closeBtn = document.getElementById('wikiReaderClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeWikiReader);
  }

  const modal = document.getElementById('wikiReaderModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeWikiReader();
      }
    });
  }

  // Клавиша Escape для закрытия модалки
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeWikiReader();
    }
  });

  // Автоматический перерасчет бегунка при изменении размеров экрана
  window.addEventListener('resize', () => {
    updateWikiGlider(state.activeTab, false);
  });

  // Отрисовка всех секций
  renderFilters();
  renderFeatured();
  renderArticles();
  renderTimeline();
  renderFacts();

  // Инициализация позиции бегунка
  requestAnimationFrame(() => {
    updateWikiGlider(state.activeTab, false);
  });

}

// Экспорт в window для глобального доступа
if (typeof window !== 'undefined') {
  window.switchWikiTab = switchWikiTab;
  window.updateWikiGlider = updateWikiGlider;
  window.openWikiArticle = openWikiArticle;
  window.closeWikiReader = closeWikiReader;
}
