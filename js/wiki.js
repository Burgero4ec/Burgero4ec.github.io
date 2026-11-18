import { LORE, TIMELINE } from './wiki-data.js';

const CATEGORIES = [
  { id: 'all', label: 'Все статьи', icon: '✳' },
  { id: 'wars', label: 'Войны и конфликты', icon: '⚔' },
  { id: 'states', label: 'Государства и ЧВК', icon: '⌖' },
  { id: 'people', label: 'Личности сервера', icon: '◉' },
  { id: 'docs', label: 'Документы и реформы', icon: '▤' },
  { id: 'staff', label: 'Стафф и суды', icon: '⚖' },
  { id: 'memes', label: 'Мемы и инциденты', icon: '✦' },
];

const state = { category: 'all', query: '' };
let lastTrigger = null;
const grid = document.querySelector('#articleGrid');
const search = document.querySelector('#wikiSearch');
const dialog = document.querySelector('#readerDialog');
const reader = document.querySelector('#readerContent');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function renderFilters() {
  document.querySelector('#filters').innerHTML = CATEGORIES.map(category => `
    <button class="filter-chip ${state.category === category.id ? 'is-active' : ''}" type="button" data-category="${category.id}" aria-pressed="${state.category === category.id}">
      <span aria-hidden="true">${category.icon}</span>${category.label}
    </button>`).join('');
}

function visibleArticles() {
  const query = state.query.trim().toLocaleLowerCase('ru');
  return LORE.filter(article => {
    const categoryMatches = state.category === 'all' || article.category === state.category;
    const searchable = [article.title, article.excerpt, article.categoryLabel, article.author, ...(article.facts || [])].join(' ').toLocaleLowerCase('ru');
    return categoryMatches && (!query || searchable.includes(query));
  });
}

function renderArticles() {
  const articles = visibleArticles();
  const noun = articles.length === 1 ? 'статья' : articles.length > 1 && articles.length < 5 ? 'статьи' : 'статей';
  document.querySelector('#resultCount').textContent = `${articles.length} ${noun}`;
  document.querySelector('#emptyState').hidden = articles.length !== 0;
  grid.innerHTML = articles.map((article, index) => `
    <button class="article-card accent-${esc(article.accent)}" type="button" data-article="${esc(article.id)}" style="--card-delay:${Math.min(index * 45, 360)}ms">
      <span class="card-topline"><span class="card-icon" aria-hidden="true">${esc(article.icon)}</span><span class="card-category">${esc(article.categoryLabel)}</span></span>
      <span class="card-title">${esc(article.title)}</span>
      <span class="card-excerpt">${esc(article.excerpt)}</span>
      <span class="card-bottom"><span>${esc(article.readingTime)} чтения</span><span>${esc(article.author)}</span><span class="card-arrow" aria-hidden="true">↗</span></span>
    </button>`).join('');
}

function renderFeatured() {
  const article = LORE[0];
  const feature = document.querySelector('#featuredCard');
  feature.innerHTML = `
    <div class="feature-orb" aria-hidden="true"><span>${esc(article.icon)}</span><i></i><b></b></div>
    <div class="feature-copy"><div class="feature-meta"><span>${esc(article.categoryLabel)}</span><span>${esc(article.readingTime)} чтения</span></div>
      <h3>${esc(article.title)}</h3><p>${esc(article.excerpt)}</p><blockquote>«${esc(article.quote)}»</blockquote>
      <button class="text-button" type="button" data-article="${esc(article.id)}">Читать статью <span aria-hidden="true">↗</span></button>
    </div>`;
}

function renderTimeline() {
  document.querySelector('#timeline').innerHTML = TIMELINE.map((item, index) => `
    <article class="timeline-item" style="--item-delay:${index * 90}ms"><div class="timeline-node"><span></span></div>
      <div class="timeline-content"><span class="timeline-date">${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p><small>ИСТОЧНИК · ${esc(item.source)}</small></div>
    </article>`).join('');
}

function renderFacts() {
  const facts = LORE.flatMap(article => article.facts.map(text => ({ text, category: article.categoryLabel, accent: article.accent })));
  document.querySelector('#factsGrid').innerHTML = facts.slice(0, 6).map((fact, index) => `
    <article class="fact-card accent-${esc(fact.accent)}" style="--card-delay:${index * 70}ms"><span class="fact-spark" aria-hidden="true">✳</span><p>${esc(fact.text)}</p><small>${esc(fact.category)}</small></article>`).join('');
}

function openArticle(id, trigger) {
  const article = LORE.find(item => item.id === id);
  if (!article) return;
  const sections = article.sections.map(section => `<section><h3>${esc(section.heading)}</h3><p>${esc(section.text)}</p></section>`).join('');
  const facts = article.facts.map(fact => `<li>${esc(fact)}</li>`).join('');
  reader.innerHTML = `
    <p class="eyebrow">${esc(article.categoryLabel)} · ${esc(article.readingTime)} ЧТЕНИЯ</p>
    <h2 id="readerTitle">${esc(article.title)}</h2>
    <p class="reader-lead">${esc(article.excerpt)}</p>
    <blockquote>«${esc(article.quote)}»</blockquote>
    ${sections}
    <section class="reader-facts"><h3>Коротко</h3><ul>${facts}</ul></section>
    <p class="reader-source"><strong>Основание статьи:</strong> ${esc(article.source)}</p>`;
  dialog.returnValue = '';
  lastTrigger = trigger || null;
  dialog.showModal();
}

function openRandomArticle() {
  const articles = visibleArticles();
  if (!articles.length) {
    search.focus();
    return;
  }
  const article = articles[Math.floor(Math.random() * articles.length)];
  openArticle(article.id, document.activeElement);
}

document.querySelector('#filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderArticles();
});

search.addEventListener('input', () => {
  state.query = search.value;
  renderArticles();
});

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-article]');
  if (trigger) openArticle(trigger.dataset.article, trigger);
});

document.querySelectorAll('#randomTop, #randomHero').forEach(button => button.addEventListener('click', openRandomArticle));
document.querySelector('#readerClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  if (lastTrigger?.isConnected) lastTrigger.focus();
  lastTrigger = null;
});

document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable || dialog.open) return;
  event.preventDefault();
  search.focus();
});

document.querySelector('#statArticles').textContent = LORE.length.toString().padStart(2, '0');
document.querySelector('#statQuotes').textContent = LORE.length.toString().padStart(2, '0');
renderFilters();
renderFeatured();
renderArticles();
renderTimeline();
renderFacts();
