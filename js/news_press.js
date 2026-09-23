/**
 * news_press.js - Загрузка обновлений, прессы, правил и статических фрагментов
 */
import { esc, parseTs } from './utils.js';
import { GH_URLS } from './config.js';
import { renderMarkdown } from './parser.js';
import { refreshOdysseyElements } from './animations.js';

const cache = { updates: null, press: null };
const readOrder = { updates: 'desc', press: 'desc' };
const MERGE_GAP_MS = 5 * 60 * 1000;

export function parseMessages(doc) {
  if (!doc || !doc.querySelectorAll) return [];
  return [...doc.querySelectorAll('.message')].map(m => {
    const content = m.querySelector('.content');
    if (!content) return null;
    const ts = m.querySelector('.timestamp');
    const author = m.querySelector('.author');
    const reply = m.querySelector('.reply');
    const rawTs = ts ? ts.textContent.split('|')[0].trim() : '';
    return {
      date: parseTs(rawTs),
      dateStr: rawTs,
      author: author ? author.textContent.trim() : 'Global Lens BOT',
      content: content.innerHTML.trim(),
      reply: reply ? reply.textContent.trim() : ''
    };
  }).filter(x => x && x.content);
}

export function renderDiscordMessages(items, container, statsContainer, order) {
  if (!container) return;
  const sorted = items.slice().sort((a, b) => order === 'asc' ? a.date - b.date : b.date - a.date);
  if (!sorted.length) {
    container.innerHTML = '<p class="loading">Пока нет сообщений.</p>';
    return;
  }

  const groups = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    const sameAuthor = last && last.author === item.author;
    const closeTime = sameAuthor && Math.abs(item.date - last.lastDateMs) <= MERGE_GAP_MS;
    if (sameAuthor && closeTime) {
      last.contents.push(item.content);
      if (item.reply && !last.reply) last.reply = item.reply;
      last.lastDate = item.dateStr;
      last.lastDateMs = item.date;
    } else {
      groups.push({
        author: item.author,
        contents: [item.content],
        reply: item.reply,
        firstDate: item.dateStr,
        lastDate: item.dateStr,
        lastDateMs: item.date
      });
    }
  }

  const authors = new Set(groups.map(g => g.author));
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="us-item"><b>${items.length}</b>сообщений</div>
      <div class="us-item"><b>${groups.length}</b>постов</div>
      <div class="us-item"><b>${authors.size}</b>авторов</div>
      <div class="us-item"><b>${sorted[0].dateStr.split(' ')[0]}</b>первое</div>
      <div class="us-item"><b>${sorted[sorted.length - 1].dateStr.split(' ')[0]}</b>последнее</div>
    `;
  }

  container.innerHTML = groups.map(g => {
    const dateLine = g.firstDate === g.lastDate ? g.firstDate : `${g.firstDate} — ${g.lastDate}`;
    return `
      <article class="update-card">
        <div class="update-meta">
          <span class="update-author">${esc(g.author)}</span>
          <span class="update-date">${esc(dateLine)}</span>
        </div>
        ${g.reply ? `<div class="update-content"><div class="small-text">↪ ${esc(g.reply)}</div></div>` : ''}
        <div class="update-content">${g.contents.map(c => renderMarkdown(c)).join('')}</div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('.spoiler').forEach(sp => {
    sp.addEventListener('click', () => sp.classList.toggle('revealed'));
  });

  refreshOdysseyElements(container);
}

export function rerender(type) {
  if (!cache[type]) return;
  renderDiscordMessages(
    cache[type],
    document.getElementById(type === 'updates' ? 'updatesBody' : 'pressBody'),
    document.getElementById(type === 'updates' ? 'updatesStats' : 'pressStats'),
    readOrder[type]
  );
}

export async function loadUpdates() {
  const el = document.getElementById('updatesBody');
  if (!el) return;
  try {
    const r = await fetch(GH_URLS.updates);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cache.updates = parseMessages(new DOMParser().parseFromString(await r.text(), 'text/html'));
    rerender('updates');
  } catch (e) {
    el.innerHTML = '<p class="loading">Не удалось загрузить обновления. Проверьте подключение к сети.</p>';
  }
}

export async function loadPress() {
  const el = document.getElementById('pressBody');
  if (!el) return;
  try {
    const r = await fetch('press_content.html');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cache.press = parseMessages(new DOMParser().parseFromString(await r.text(), 'text/html'));
    rerender('press');
  } catch (e) {
    el.innerHTML = '<div class="card" style="text-align:center;padding:24px"><p class="lead" style="margin-bottom:14px">В локальном режиме без веб-сервера браузер ограничивает автоматическое чтение внешних HTML файлов прессы.</p><a class="cta" href="press_content.html" target="_blank" style="display:inline-flex;align-items:center;gap:8px"><span>📰 Открыть архив прессы (press_content.html)</span></a></div>';
  }
}

export function md(t) {
  return t.split(/\r?\n/).map(line => {
    const l = line.trim();
    if (!l) return '';
    if (l.startsWith('### ')) return '<h4>' + esc(l.slice(4)) + '</h4>';
    if (l.startsWith('## ')) return '<h4>' + esc(l.slice(3)) + '</h4>';
    if (l.startsWith('# ')) return '<h3>' + esc(l.slice(2)) + '</h3>';
    if (/^[-*] /.test(l)) return '<p style="margin-left:16px">— ' + esc(l.slice(2)) + '</p>';
    return '<p>' + esc(l) + '</p>';
  }).join('');
}

export async function loadRules(key, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const r = await fetch(GH_URLS[key]);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    el.innerHTML = md(await r.text());
  } catch (e) {
    el.innerHTML = '<p class="loading">Не удалось загрузить правила. Проверьте подключение к сети.</p>';
  }
}

export async function loadFragment(url, id) {
  const el = document.getElementById(id);
  if (!el) return;
  const hasContent = el.children.length > 0 && !el.querySelector('.loading');
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    el.innerHTML = await r.text();
  } catch (e) {
    if (!hasContent) {
      el.innerHTML = '<p class="loading">Не удалось загрузить раздел: ' + esc(url) + '</p>';
    }
  }
}

export function initOrderToggles() {
  document.querySelectorAll('.order-toggle').forEach(toggle => {
    const type = toggle.dataset.for;
    if (!readOrder[type]) return;
    const btns = toggle.querySelectorAll('button');
    const sync = () => btns.forEach(b => b.classList.toggle('active', b.dataset.order === readOrder[type]));
    sync();
    btns.forEach(btn => btn.addEventListener('click', () => {
      readOrder[type] = btn.dataset.order;
      sync();
      rerender(type);
    }));
  });
}
