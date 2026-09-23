/**
 * archives.js - Ленивая загрузка (lazy load) архивов по выбранным сезонам и категориям
 */
import { esc, parseTs } from './utils.js';
import { renderMarkdown } from './parser.js';
import { refreshOdysseyElements } from './animations.js';

export const ARCHIVE_SEASONS = [22, 21, 20, 19, 2, 1];
export const ARCHIVE_KINDS = [
  { id: 'countries', emoji: '📺', label: 'Новости стран и автономий' },
  { id: 'orgs',      emoji: '👥', label: 'Новости организаций' },
  { id: 'events',    emoji: '🗽', label: 'События' }
];

const archiveCache = new Map();
export const archState = {
  season: '22', // По умолчанию открываем последний доступный сезон 22 вместо загрузки всех 27 файлов
  kind: 'all',
  q: '',
  order: 'desc'
};

function getArchiveUrl(season, kind) {
  const num = Number(season);
  if (num === 1 && kind === 'countries') return 'архивы/Archive_' + encodeURIComponent('📺・сезон-1-1') + '.html';
  if (num === 2 && kind === 'events') return 'архивы/Archive_' + encodeURIComponent('📺・сезон-2-ивенты') + '.html';
  if (num === 2 && kind === 'countries') return 'архивы/Archive_' + encodeURIComponent('📺・сезон-2-новости') + '.html';

  const emojiMap = { countries: '📺', orgs: '👥', events: '🗽' };
  const emoji = emojiMap[kind];
  if (!emoji) return null;
  return 'архивы/Archive_' + encodeURIComponent(emoji + '・' + num + '-сезон') + '.html';
}

export async function loadArchiveFile(season, kind) {
  const key = `${season}:${kind}`;
  if (archiveCache.has(key)) {
    return archiveCache.get(key);
  }

  const url = getArchiveUrl(season, kind);
  if (!url) return [];

  try {
    const res = await fetch(url);
    if (!res.ok) {
      archiveCache.set(key, []);
      return [];
    }

    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const messages = [...doc.querySelectorAll('.message')].map(m => {
      const content = m.querySelector('.content');
      if (!content) return null;
      const ts = m.querySelector('.timestamp');
      const author = m.querySelector('.author');
      const rawTs = ts ? ts.textContent.split('|')[0].trim() : '';
      return {
        date: parseTs(rawTs),
        dateStr: rawTs,
        author: author ? author.textContent.trim() : '—',
        content: content.innerHTML.trim(),
        text: (content.textContent || '').trim(),
        season: Number(season),
        kind: kind
      };
    }).filter(x => x && x.text);

    archiveCache.set(key, messages);
    return messages;
  } catch (err) {
    archiveCache.set(key, []);
    return [];
  }
}

export function renderArchFolders() {
  const el = document.getElementById('archFolders');
  if (!el) return;

  el.innerHTML = ARCHIVE_SEASONS.map(s => `
    <div class="folder ${String(archState.season) === String(s) ? 'active' : ''}">
      <h3>📁 Сезон ${s}</h3>
      <div class="folder-files">
        ${ARCHIVE_KINDS.map(k => `
          <button class="folder-file ${String(archState.season) === String(s) && (archState.kind === k.id || archState.kind === 'all') ? 'selected' : ''}" data-season="${s}" data-kind="${k.id}">
            ${k.emoji} ${k.label}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.folder-file').forEach(b => {
    b.addEventListener('click', () => {
      archState.season = b.dataset.season;
      archState.kind = b.dataset.kind;
      const ss = document.getElementById('archSeason');
      const kk = document.getElementById('archKind');
      if (ss) ss.value = b.dataset.season;
      if (kk) kk.value = b.dataset.kind;
      renderArchFolders();
      renderArchives();
    });
  });
}

export function initArchControls() {
  const sel = document.getElementById('archSeason');
  if (sel) {
    sel.innerHTML = `
      <option value="22" selected>Сезон 22 (рекомендуется)</option>
      <option value="21">Сезон 21</option>
      <option value="20">Сезон 20</option>
      <option value="19">Сезон 19</option>
      <option value="2">Сезон 2</option>
      <option value="1">Сезон 1</option>
      <option value="all">Все сезоны (пакетная загрузка)</option>
    `;

    sel.addEventListener('change', () => {
      archState.season = sel.value;
      renderArchFolders();
      renderArchives();
    });
  }

  const kk = document.getElementById('archKind');
  if (kk) {
    kk.addEventListener('change', e => {
      archState.kind = e.target.value;
      renderArchFolders();
      renderArchives();
    });
  }

  const qq = document.getElementById('archSearch');
  if (qq) {
    let searchTimeout = null;
    qq.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        archState.q = e.target.value;
        renderArchives();
      }, 200);
    });
  }

  // Сортировка порядка
  document.querySelectorAll('.order-toggle[data-for="archives"] button').forEach(btn => {
    btn.addEventListener('click', () => {
      archState.order = btn.dataset.order;
      document.querySelectorAll('.order-toggle[data-for="archives"] button').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderArchives();
    });
  });
}

export async function renderArchives() {
  const body = document.getElementById('archBody');
  const stats = document.getElementById('archStats');
  if (!body) return;

  const seasons = archState.season === 'all'
    ? ARCHIVE_SEASONS
    : [Number(archState.season)];

  const kinds = archState.kind === 'all'
    ? ARCHIVE_KINDS.map(k => k.id)
    : [archState.kind];

  body.innerHTML = `
    <div class="p-8 text-center text-zinc-400">
      <div class="inline-block w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <div class="text-xs font-mono">Загрузка архивов (сезон ${archState.season})...</div>
    </div>
  `;

  try {
    // Загружаем только выбранный сезон
    const lists = await Promise.all(
      seasons.flatMap(s => kinds.map(k => loadArchiveFile(s, k)))
    );

    let msgs = lists.flat();
    const q = archState.q.trim().toLowerCase();
    if (q) {
      msgs = msgs.filter(m =>
        m.author.toLowerCase().includes(q) ||
        m.text.toLowerCase().includes(q) ||
        m.dateStr.includes(q) ||
        String(m.season).includes(q)
      );
    }

    msgs.sort((a, b) => archState.order === 'asc' ? a.date - b.date : b.date - a.date);

    if (stats) {
      stats.innerHTML = `
        <div class="us-item"><b>${msgs.length}</b>сообщений</div>
        <div class="us-item"><b>${new Set(msgs.map(m => m.author)).size}</b>авторов</div>
        <div class="us-item"><b>${new Set(msgs.map(m => m.season)).size}</b>сезонов</div>
      `;
    }

    if (!msgs.length) {
      body.innerHTML = '<p class="loading">Ничего не найдено в выбранном архиве.</p>';
      return;
    }

    body.innerHTML = msgs.map(m => {
      const k = ARCHIVE_KINDS.find(x => x.id === m.kind) || { emoji: '📄' };
      return `
        <article class="update-card">
          <div class="update-meta">
            <span class="update-author">${esc(m.author)}</span>
            <span class="update-date">${esc(m.dateStr)}</span>
            <span class="arch-badge">${k.emoji} сезон ${m.season}</span>
          </div>
          <div class="update-content">${renderMarkdown(m.content)}</div>
        </article>
      `;
    }).join('');

    body.querySelectorAll('.spoiler').forEach(sp => {
      sp.addEventListener('click', () => sp.classList.toggle('revealed'));
    });

    refreshOdysseyElements(body);
  } catch (err) {
    console.error('[Global Lens] archives error:', err);
    body.innerHTML = `<p class="loading text-rose-400">Ошибка загрузки: ${esc(err.message)}</p>`;
  }
}

export function initArchives() {
  renderArchFolders();
  initArchControls();
}
