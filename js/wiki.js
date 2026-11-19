/**
 * wiki.js - База знаний, энциклопедия и лор Global Lens RP + плавная анимация переключения на архивы
 */

import { LORE, TIMELINE } from './wiki-data.js';
import { renderArchives } from './archives.js';

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

let archivesLoadedOnce = false;

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
    if (animate) {
      activeView.classList.remove('wiki-view-enter');
      void activeView.offsetWidth; // перезапуск CSS анимации
      activeView.classList.add('wiki-view-enter');
    }
  }

  // Загружаем архивы только при первом переходе (последующие переключения происходят мгновенно из памяти)
  if (targetTab === 'archives' && !archivesLoadedOnce) {
    archivesLoadedOnce = true;
    if (typeof renderArchives === 'function') {
      renderArchives();
    }
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
      <p>${esc(sec.text)}</p>
    </section>
  `).join('');

  const factsHtml = (art.facts && art.facts.length) ? `
    <div class="wiki-reader-facts-box">
      <h4>КЛЮЧЕВЫЕ ТЕЗИСЫ</h4>
      <ul>
        ${art.facts.map(f => `<li>${esc(f)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  body.innerHTML = `
    <p style="font-size:16px;color:#cbd5e1;font-weight:600;margin-bottom:16px;">${esc(art.excerpt)}</p>
    <blockquote>«${esc(art.quote)}»</blockquote>
    ${sectionsHtml}
    ${factsHtml}
    <div class="wiki-reader-source">
      <strong>Основание статьи:</strong> ${esc(art.source)}
    </div>
  `;

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

export function closeWikiReader() {
  const modal = document.getElementById('wikiReaderModal');
  if (modal) {
    modal.style.display = 'none';
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

  // Фоновая предзагрузка архивов при простое, чтобы переход на вкладку архивов был мгновенным
  const preheatArchives = () => {
    if (!archivesLoadedOnce && typeof renderArchives === 'function') {
      archivesLoadedOnce = true;
      renderArchives();
    }
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(preheatArchives, { timeout: 1500 });
  } else {
    setTimeout(preheatArchives, 600);
  }
}

// Экспорт в window для глобального доступа
if (typeof window !== 'undefined') {
  window.switchWikiTab = switchWikiTab;
  window.updateWikiGlider = updateWikiGlider;
  window.openWikiArticle = openWikiArticle;
  window.closeWikiReader = closeWikiReader;
}
