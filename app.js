/* ===== КОНФИГ ===== */
const GH_URLS = {
  updates: 'https://raw.githubusercontent.com/Burgero4ec/Burgero4ec.github.io/refs/heads/main/Archive_%F0%9F%93%94%E3%83%BB%D0%BE%D0%B1%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F.html',
  bot: 'https://raw.githubusercontent.com/AytacOnan2/ToS-and-Privacy-Policy-Global-Lens-Bot/main/TERMS_OF_SERVICE.md',
  privacy: 'https://raw.githubusercontent.com/AytacOnan2/ToS-and-Privacy-Policy-Global-Lens-Bot/main/PRIVACY_POLICY.md'
};

/* Нормализуем redirect_uri: /index.html → /  (добавьте ЭТОТ адрес в Discord Developer Portal → OAuth2 → Redirects) */
const DISCORD_CLIENT_ID = '1125471835924992150';
const DISCORD_REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');
console.info('[Global Lens] OAuth2 redirect_uri:', DISCORD_REDIRECT);

/* ===== УТИЛИТЫ ===== */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function parseTs(s) {
  const m = (s || '').match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
}
function trimDeep(v) {
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(trimDeep);
  if (v && typeof v === 'object') { const o = {}; for (const [k, val] of Object.entries(v)) o[k.trim()] = trimDeep(val); return o; }
  return v;
}
function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2).replace('.', ',') + ' трлн';
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' млрд';
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' млн';
  return Math.round(n).toLocaleString('ru-RU');
}

/* ===== DISCORD-РАЗМЕТКА ===== */
function inline(s) {
  s = String(s).replace(/<:[a-zA-Z0-9_]+:\d+>/g, '');
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>');
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<u>$1</u>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return s;
}
function renderMarkdown(raw) {
  const src = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span class=['"]?attachment-note['"]?>([\s\S]*?)<\/span>/gi, (m, c) => '\n-# 📎 ' + c.trim());
  const lines = src.split('\n');
  let html = '', inCode = false, codeBuf = [], listType = null;
  const closeList = () => { if (listType) { html += '</' + listType + '>'; listType = null; } };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (!inCode) { closeList(); inCode = true; codeBuf = []; }
      else { html += '<pre class="dc-code">' + esc(codeBuf.join('\n')) + '</pre>'; inCode = false; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const t = line.trim();
    if (!t) { closeList(); continue; }
    if (/^─+$/.test(t)) { closeList(); html += '<div class="dc-divider"></div>'; continue; }
    if (/^⠀+$/.test(t)) { closeList(); html += '<div class="dc-gap"></div>'; continue; }
    if (t.startsWith('-# ')) { closeList(); html += '<div class="small-text">' + inline(t.slice(3)) + '</div>'; continue; }
    if (t.startsWith('### ')) { closeList(); html += '<div class="dc-h3">' + inline(t.slice(4)) + '</div>'; continue; }
    if (t.startsWith('## ')) { closeList(); html += '<div class="dc-h2">' + inline(t.slice(3)) + '</div>'; continue; }
    if (t.startsWith('# ')) { closeList(); html += '<div class="dc-h1">' + inline(t.slice(2)) + '</div>'; continue; }
    const ulm = t.match(/^[-*] (.+)/);
    if (ulm) { if (listType !== 'ul') { closeList(); html += '<ul class="dc-list">'; listType = 'ul'; } html += '<li>' + inline(ulm[1]) + '</li>'; continue; }
    const olm = t.match(/^\d+[.)] (.+)/);
    if (olm) { if (listType !== 'ol') { closeList(); html += '<ol class="dc-list">'; listType = 'ol'; } html += '<li>' + inline(olm[1]) + '</li>'; continue; }
    closeList();
    html += '<p class="dc-p">' + inline(t) + '</p>';
  }
  if (inCode) html += '<pre class="dc-code">' + esc(codeBuf.join('\n')) + '</pre>';
  closeList();
  return html;
}

/* ===== ОБНОВЛЕНИЯ / ПРЕССА ===== */
const cache = { updates: null, press: null };
const readOrder = { updates: 'desc', press: 'desc' };
const MERGE_GAP_MS = 5 * 60 * 1000;

function parseMessages(doc) {
  return [...doc.querySelectorAll('.message')].map(m => {
    const content = m.querySelector('.content');
    if (!content) return null;
    const ts = m.querySelector('.timestamp'), author = m.querySelector('.author'), reply = m.querySelector('.reply');
    const rawTs = ts ? ts.textContent.split('|')[0].trim() : '';
    return { date: parseTs(rawTs), dateStr: rawTs, author: author ? author.textContent.trim() : 'Global Lens BOT', content: content.innerHTML.trim(), reply: reply ? reply.textContent.trim() : '' };
  }).filter(x => x && x.content);
}
function renderDiscordMessages(items, container, statsContainer, order) {
  const sorted = items.slice().sort((a, b) => order === 'asc' ? a.date - b.date : b.date - a.date);
  if (!sorted.length) { container.innerHTML = '<p class="loading">Пока нет сообщений.</p>'; return; }
  const groups = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    const sameAuthor = last && last.author === item.author;
    const closeTime = sameAuthor && Math.abs(item.date - last.lastDateMs) <= MERGE_GAP_MS;
    if (sameAuthor && closeTime) {
      last.contents.push(item.content);
      if (item.reply && !last.reply) last.reply = item.reply;
      last.lastDate = item.dateStr; last.lastDateMs = item.date;
    } else {
      groups.push({ author: item.author, contents: [item.content], reply: item.reply, firstDate: item.dateStr, lastDate: item.dateStr, lastDateMs: item.date });
    }
  }
  const authors = new Set(groups.map(g => g.author));
  if (statsContainer) {
    statsContainer.innerHTML =
      '<div class="us-item"><b>' + items.length + '</b>сообщений</div>' +
      '<div class="us-item"><b>' + groups.length + '</b>постов</div>' +
      '<div class="us-item"><b>' + authors.size + '</b>авторов</div>' +
      '<div class="us-item"><b>' + sorted[0].dateStr.split(' ')[0] + '</b>первое</div>' +
      '<div class="us-item"><b>' + sorted[sorted.length - 1].dateStr.split(' ')[0] + '</b>последнее</div>';
  }
  container.innerHTML = groups.map(g => {
    const dateLine = g.firstDate === g.lastDate ? g.firstDate : g.firstDate + ' — ' + g.lastDate;
    return '<article class="update-card"><div class="update-meta"><span class="update-author">' + esc(g.author) + '</span><span class="update-date">' + esc(dateLine) + '</span></div>' +
      (g.reply ? '<div class="update-content"><div class="small-text">↪ ' + esc(g.reply) + '</div></div>' : '') +
      '<div class="update-content">' + g.contents.map(c => renderMarkdown(c)).join('') + '</div></article>';
  }).join('');
  container.querySelectorAll('.spoiler').forEach(sp => sp.addEventListener('click', () => sp.classList.toggle('revealed')));
}
function rerender(type) {
  if (type === 'archives') { renderArchives(); return; }
  if (!cache[type]) return;
  renderDiscordMessages(cache[type],
    document.getElementById(type === 'updates' ? 'updatesBody' : 'pressBody'),
    document.getElementById(type === 'updates' ? 'updatesStats' : 'pressStats'),
    readOrder[type]);
}
async function loadUpdates() {
  const el = document.getElementById('updatesBody');
  try {
    const r = await fetch(GH_URLS.updates);
    if (!r.ok) throw 0;
    cache.updates = parseMessages(new DOMParser().parseFromString(await r.text(), 'text/html'));
    rerender('updates');
  } catch (e) { el.innerHTML = '<p class="loading">Не удалось загрузить обновления. Проверьте URL в GH_URLS.updates.</p>'; }
}
async function loadPress() {
  const el = document.getElementById('pressBody');
  try {
    const r = await fetch('press_content.html');
    if (!r.ok) throw 0;
    cache.press = parseMessages(new DOMParser().parseFromString(await r.text(), 'text/html'));
    rerender('press');
  } catch (e) { el.innerHTML = '<p class="loading">Не удалось загрузить прессу. Файл press_content.html должен лежать рядом с index.html.</p>'; }
}
document.querySelectorAll('.order-toggle').forEach(toggle => {
  const type = toggle.dataset.for;
  const btns = toggle.querySelectorAll('button');
  const sync = () => btns.forEach(b => b.classList.toggle('active', b.dataset.order === readOrder[type]));
  sync();
  btns.forEach(btn => btn.addEventListener('click', () => { readOrder[type] = btn.dataset.order; sync(); rerender(type); }));
});

/* ===== ПРАВИЛА / ФРАГМЕНТЫ ===== */
function md(t) {
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
async function loadRules(key, elId) {
  const el = document.getElementById(elId);
  try {
    const r = await fetch(GH_URLS[key]);
    if (!r.ok) throw 0;
    el.innerHTML = md(await r.text());
  } catch (e) { el.innerHTML = '<p class="loading">Не удалось загрузить правила. Проверьте ссылки в GH_URLS.</p>'; }
}
async function loadFragment(url, id) {
  const el = document.getElementById(id);
  try {
    const r = await fetch(url);
    if (!r.ok) throw 0;
    el.innerHTML = await r.text();
  } catch (e) { el.innerHTML = '<p class="loading">Не удалось загрузить раздел. Файл ' + url + ' должен лежать рядом с index.html.</p>'; }
}
loadRules('bot', 'rulesBotBody');
loadRules('privacy', 'rulesPrivacyBody');
loadFragment('rules_server_content.html', 'rulesServerBody');
loadFragment('staff_content.html', 'staffBody');

/* ===== СЧЁТЧИКИ ===== */
function countUp(el, target) {
  const dur = 1400, t0 = performance.now();
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}
function countUpAll(key, target) { document.querySelectorAll('[data-stat="' + key + '"]').forEach(el => countUp(el, target)); }
function animateStats() { document.querySelectorAll('#page-home .stat b[data-count]').forEach(el => countUp(el, +el.dataset.count)); }

/* ===== СЕЗОН ИЗ БД (с ремонтом JSON) ===== */
function repairJson(text) {
  return text.split('\n').map(line => {
    const m = line.match(/^(\s*)"(.*)":(.*)$/);
    if (!m) return line;
    return m[1] + '"' + m[2].replace(/"/g, '\\"') + '":' + m[3];
  }).join('\n');
}
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Файл ' + url + ' не найден (HTTP ' + r.status + ').');
  const text = await r.text();
  try { return JSON.parse(text); }
  catch (e) {
    try { return JSON.parse(repairJson(text)); }
    catch (e2) { throw new Error('Ошибка разбора ' + url + ': ' + e2.message); }
  }
}
async function loadSeason() {
  const body = document.getElementById('seasonBody');
  try {
    const [countriesRaw, seasonRaw] = await Promise.all([fetchJson('countries2014.json'), fetchJson('seasoninfo.json')]);
    const C = trimDeep(countriesRaw), S = trimDeep(seasonRaw);
    /* ИСПРАВЛЕНИЕ: проставляем name из ключа, иначе c.name === undefined */
    for (const [k, v] of Object.entries(C)) if (v && typeof v === 'object') v.name = k;
    const taken = new Set(), states = [], orgs = [], autos = [];
    for (const p of Object.values(S)) {
      if (p.type === 'country') { taken.add(p.country); states.push({ name: p.country, info: C[p.country] }); }
      else if (p.type === 'organization') orgs.push({ name: p.country });
      else if (p.type === 'autonomy') autos.push({ name: p.country, host: p.host_country });
    }
    const ru = (a, b) => a.name.localeCompare(b.name, 'ru');
    states.sort(ru); orgs.sort(ru); autos.sort(ru);
    const FREE = Object.values(C).filter(c => !taken.has(c.name));
    countUpAll('countries', states.length);
    countUpAll('orgs', orgs.length);
    countUpAll('autos', autos.length);
    const flagOf = n => (C[n] && C[n].flag) || '🏳️';
    const cardState = s => '<div class="c-card"><span class="c-flag">' + (s.info ? s.info.flag : '🏳️') + '</span><div class="c-info"><div class="c-name">' + s.name + '</div><div class="c-sub">' + (s.info ? s.info.continent : '—') + '</div></div><span class="badge-taken">ЗАНЯТО</span></div>';
    const cardOrg = o => '<div class="c-card"><span class="c-flag c-ic"><svg class="ic"><use href="#i-shield"/></svg></span><div class="c-info"><div class="c-name">' + o.name + '</div><div class="c-sub">Организация</div></div><span class="badge-taken">ЗАНЯТО</span></div>';
    const cardAuto = a => '<div class="c-card"><span class="c-flag">' + flagOf(a.host) + '</span><div class="c-info"><div class="c-name">' + a.name + '</div><div class="c-sub">Автономия: ' + a.host + '</div></div><span class="badge-taken">ЗАНЯТО</span></div>';
    const cardFree = c => '<div class="c-card"><span class="c-flag">' + c.flag + '</span><div class="c-info"><div class="c-name">' + c.name + '</div><div class="c-sub">' + c.continent + '</div></div><span class="badge-free">СВОБОДНО</span></div>';
    function renderFree(q) {
      q = (q || '').trim().toLowerCase();
      const list = FREE.filter(c => c.name && c.name.toLowerCase().includes(q));
      const by = {};
      list.forEach(c => { (by[c.continent] = by[c.continent] || []).push(c); });
      const order = ['Европа', 'Азия', 'Африка', 'Северная Америка', 'Южная Америка', 'Австралия и Океания'];
      const conts = Object.keys(by).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
      document.getElementById('freeCount').textContent = list.length;
      document.getElementById('freeGroups').innerHTML = conts.length
        ? conts.map(cont => '<div class="m-sub">' + cont.toUpperCase() + ' (' + by[cont].length + ')</div><div class="grid-3" style="margin-bottom:26px">' + by[cont].sort(ru).map(cardFree).join('') + '</div>').join('')
        : '<p class="loading">Ничего не найдено.</p>';
    }
    body.innerHTML =
      '<div class="sec-title"><svg class="ic"><use href="#i-globe"/></svg>ГОСУДАРСТВА</div><div class="grid-3">' + (states.map(cardState).join('') || '<p class="loading">Нет данных.</p>') + '</div>' +
      '<div class="sec-title"><svg class="ic"><use href="#i-shield"/></svg>ОРГАНИЗАЦИИ</div><div class="grid-3">' + (orgs.map(cardOrg).join('') || '<p class="loading">Нет данных.</p>') + '</div>' +
      '<div class="sec-title"><svg class="ic"><use href="#i-map"/></svg>АВТОНОМИИ</div><div class="grid-3">' + (autos.map(cardAuto).join('') || '<p class="loading">Нет данных.</p>') + '</div>' +
      '<div class="sec-title"><svg class="ic"><use href="#i-compass"/></svg>СВОБОДНЫЕ СТРАНЫ — <span id="freeCount">' + FREE.length + '</span></div>' +
      '<div class="search-wrap"><svg class="ic"><use href="#i-search"/></svg><input id="countrySearch" class="search-input" type="text" placeholder="Поиск страны..."></div>' +
      '<div id="freeGroups"></div>';
    renderFree('');
    document.getElementById('countrySearch').addEventListener('input', e => renderFree(e.target.value));
  } catch (e) {
    console.error('[Global Lens]', e);
    body.innerHTML = '<p class="loading">' + esc(e.message) + '</p>';
  }
}
loadSeason();

/* ===== DISCORD OAuth2 + ЛИЧНЫЙ КАБИНЕТ ===== */
function discordLogin() {
  const u = new URL('https://discord.com/oauth2/authorize');
  u.searchParams.set('client_id', DISCORD_CLIENT_ID);
  u.searchParams.set('response_type', 'token');
  u.searchParams.set('redirect_uri', DISCORD_REDIRECT);
  u.searchParams.set('scope', 'identify');
  location.href = u.toString();
}
function discordLogout() {
  localStorage.removeItem('gl-discord-token');
  localStorage.removeItem('gl-discord-user');
  window.glUser = null;
  syncUserUI();
  renderCabinet();
}
function discordAvatar(u, size) {
  if (u.avatar) return 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png?size=' + (size || 128);
  return 'https://cdn.discordapp.com/embed/avatars/' + (Number(BigInt(u.id) >> 22n) % 6) + '.png';
}
function syncUserUI() {
  const label = document.getElementById('cabinetLabel');
  const note = document.getElementById('donateUserNote');
  const name = window.glUser ? (window.glUser.global_name || window.glUser.username) : null;
  if (label) label.textContent = name || 'Личный кабинет';
  if (note) note.textContent = name ? 'Вы вошли как ' + name + ' — покупки будут привязаны к этому аккаунту.' : 'Войдите через Discord, чтобы покупки привязывались к аккаунту.';
}
async function handleDiscordCallback() {
  if (location.hash.includes('access_token=')) {
    const p = new URLSearchParams(location.hash.slice(1));
    const token = p.get('access_token');
    if (token) { localStorage.setItem('gl-discord-token', token); history.replaceState(null, '', location.pathname + location.search); }
  }
  const token = localStorage.getItem('gl-discord-token');
  if (token) {
    try {
      const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw 0;
      window.glUser = await r.json();
      localStorage.setItem('gl-discord-user', JSON.stringify(window.glUser));
    } catch (e) { localStorage.removeItem('gl-discord-token'); window.glUser = null; }
  } else {
    try { window.glUser = JSON.parse(localStorage.getItem('gl-discord-user')); } catch (e) { window.glUser = null; }
  }
  syncUserUI();
  if (document.getElementById('page-cabinet').classList.contains('active')) renderCabinet();
}
const SPEC_NAMES = { industry: 'Промышленность', trade: 'Торговля', tech: 'Технологии', agriculture: 'Сельское хозяйство' };
async function renderCabinet() {
  const body = document.getElementById('cabinetBody');
  if (!body) return;
  if (!window.glUser) {
    body.innerHTML = '<div class="card wide login-card"><h3><svg class="ic"><use href="#i-user"/></svg>Вы не вошли</h3><p>Кабинет показывает данные вашего игрового профиля: страну, ВВП, поддержку, кредиты и инвестиции.</p><div class="cta-row"><button class="cta fill" onclick="discordLogin()">Войти через Discord</button></div></div>';
    return;
  }
  const u = window.glUser;
  let season = null, countries = null;
  try {
    const [sr, cr] = await Promise.all([fetchJson('seasoninfo.json'), fetchJson('countries2014.json')]);
    season = trimDeep(sr); countries = trimDeep(cr);
  } catch (e) {}
  const me = season ? season[u.id] : null;
  const flagOf = n => (countries && countries[n]) ? countries[n].flag : '🏳️';
  let html = '<div class="card wide profile-card"><div class="profile-head"><img class="profile-ava" src="' + discordAvatar(u) + '" alt=""><div><div class="profile-name">' + esc(u.global_name || u.username) + '</div><div class="profile-sub">ID: ' + u.id + '</div></div><button class="cta ghost" style="margin-left:auto" onclick="discordLogout()">Выйти</button></div></div>';
  if (!me) {
    html += '<div class="card wide"><h3>Вы ещё не зарегистрированы в сезоне</h3><p>Ваш Discord-аккаунт не найден в базе сезона. Выберите свободную страну и подайте заявку на сервере.</p><div class="cta-row" style="justify-content:flex-start"><a class="cta ghost" href="#" data-go="season">Смотреть страны</a></div></div>';
  } else {
    const typeNames = { country: 'Государство', organization: 'Организация', autonomy: 'Автономия' };
    html += '<div class="stats"><div class="stat"><b>' + fmtNum(me.gdp) + '</b><span>ВВП</span></div><div class="stat"><b>' + fmtNum(me.balance) + '</b><span>Баланс</span></div><div class="stat"><b>' + (me.support != null ? me.support.toFixed(1) + '%' : '—') + '</b><span>Поддержка</span></div><div class="stat"><b>' + (me.corruption != null ? me.corruption.toFixed(1) + '%' : '—') + '</b><span>Коррупция</span></div></div>';
    html += '<div class="grid-2"><div class="card"><h3>' + flagOf(me.country) + ' ' + esc(me.country) + '</h3>' +
      '<div class="kv"><span>Тип</span><b>' + (typeNames[me.type] || me.type) + '</b></div>' +
      (me.org_type ? '<div class="kv"><span>Форма</span><b>' + esc(me.org_type) + '</b></div>' : '') +
      (me.host_country ? '<div class="kv"><span>Метрополия</span><b>' + flagOf(me.host_country) + ' ' + esc(me.host_country) + '</b></div>' : '') +
      (me.ideology ? '<div class="kv"><span>Гос. строй</span><b>' + esc(me.ideology.state || '—') + '</b></div><div class="kv"><span>Экономика</span><b>' + esc(me.ideology.economy || '—') + '</b></div>' : '') +
      (me.specialization ? '<div class="kv"><span>Специализация</span><b>' + (SPEC_NAMES[me.specialization] || esc(me.specialization)) + '</b></div>' : '') +
      (me.population ? '<div class="kv"><span>Население</span><b>' + fmtNum(me.population) + '</b></div>' : '') +
      (me.taxes ? '<div class="kv"><span>Налоги</span><b>НДС ' + me.taxes.nds + '% · НДФЛ ' + me.taxes.ndfl + '%</b></div>' : '') +
      (me.alliance_type && me.alliance_type.military ? '<div class="kv"><span>Военный блок</span><b>' + esc(me.alliance_type.military) + '</b></div>' : '') +
      (me.alliance_type && me.alliance_type.economic ? '<div class="kv"><span>Экон. блок</span><b>' + esc(me.alliance_type.economic) + '</b></div>' : '') +
      (me.shield ? '<div class="kv"><span>Щит до</span><b>' + new Date(me.shield).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</b></div>' : '') +
      '</div>';
    const credits = me.credits ? Object.values(me.credits) : [];
    html += '<div class="card"><h3>💳 Кредиты' + (credits.length ? ' (' + credits.length + ')' : '') + '</h3>';
    html += credits.length ? credits.map(c =>
      '<div class="credit-item"><b>Кредит ' + esc(c.id) + '</b>' +
      '<div class="row"><span>Взято</span><b>' + fmtNum(c.amount_taken) + '</b></div>' +
      '<div class="row"><span>Остаток долга</span><b>' + fmtNum(c.debt_current) + '</b></div>' +
      '<div class="row"><span>Платёж</span><b>' + fmtNum(c.hourly_payment) + '/ч · осталось ' + c.term_hours_left + ' ч</b></div>' +
      (c.reason ? '<div class="row"><span>Причина</span><b>' + esc(c.reason) + '</b></div>' : '') + '</div>').join('')
      : '<p>Активных кредитов нет.</p>';
    html += '</div></div>';
    const inv = me.investments || [];
    const totalInv = inv.reduce((s, i) => s + (i.amount || 0), 0);
    html += '<div class="card wide"><h3>📈 Инвестиции в вас</h3>';
    html += inv.length ? '<p>Инвесторов: ' + inv.length + ' · общая сумма ' + fmtNum(totalInv) + '.</p>' + inv.map(i =>
      '<div class="credit-item"><b>' + flagOf(i.investor_country) + ' ' + esc(i.investor_country) + '</b>' +
      '<div class="row"><span>Сумма</span><b>' + fmtNum(i.amount) + '</b></div>' +
      '<div class="row"><span>Доля</span><b>' + (i.share_percent || 0).toFixed(2) + '%</b></div></div>').join('')
      : '<p>Входящих инвестиций нет.</p>';
    html += '</div>';
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); go(el.dataset.go); }));
}
document.addEventListener('click', e => { if (e.target.closest('[data-go="cabinet"]')) renderCabinet(); });

/* ===== НАВИГАЦИЯ ===== */
const infoIds = ['about', 'news', 'updates'];
const ruleIds = ['rules-server', 'rules-bot', 'rules-privacy'];
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
  document.querySelectorAll('.side-nav .active').forEach(x => x.classList.remove('active'));
  if (infoIds.includes(id) || ruleIds.includes(id)) { document.getElementById('infoBtn').classList.add('active'); document.getElementById('infoGroup').classList.add('open'); }
  if (ruleIds.includes(id)) document.getElementById('rulesGroup').classList.add('open');
  const sel = document.querySelector('.side-nav [data-go="' + id + '"]');
  if (sel) sel.classList.add('active');
  if (id === 'home') animateStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); go(el.dataset.go); }));
document.getElementById('infoBtn').addEventListener('click', () => document.getElementById('infoGroup').classList.toggle('open'));
document.getElementById('rulesBtn').addEventListener('click', () => document.getElementById('rulesGroup').classList.toggle('open'));

/* ===== ТЕМЫ ===== */
const names = { green: 'Green', blue: 'Blue', orange: 'Orange' };
function applyTheme(theme, save = true) {
  if (!names[theme]) theme = 'green';
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('.theme-btn').forEach(x => x.classList.toggle('active', x.dataset.themeSet === theme));
  document.getElementById('themeName').textContent = names[theme];
  if (save) try { localStorage.setItem('gl-theme', theme); } catch (e) {}
}
(function () { let s = null; try { s = localStorage.getItem('gl-theme'); } catch (e) {} applyTheme(s || 'green', false); })();
document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeSet, true)));

/* ===== АРХИВЫ СЕЗОНОВ ===== */
const ARCHIVE_SEASONS = [22, 21, 20, 19, 2, 1]; // по мере архивации просто добавляйте номера: [20, 19, 18...]
const ARCHIVE_KINDS = [
  { id: 'countries', emoji: '📺', label: 'Новости стран и автономий' },
  { id: 'orgs',      emoji: '👥', label: 'Новости организаций' },
  { id: 'events',    emoji: '🗽', label: 'События' }
];
const archiveCache = {};                       // "сезон:тип" -> сообщения
const archState = { season: 'all', kind: 'all', q: '' };
readOrder.archives = 'desc';

/* Имя файла по вашему паттерну: "Архив: 🗽・19-сезон" -> Archive_🗽・19-сезон.html
   Если файлы лежат в папке или называются иначе — правьте только эту функцию. */
function archiveUrl(season, kind) {
  const emoji = { countries: '📺', orgs: '👥', events: '🗽' }[kind];
  return 'Archive_' + encodeURIComponent(emoji + '・' + season + '-сезон') + '.html';
}

async function loadArchiveFile(season, kind) {
  const key = season + ':' + kind;
  if (archiveCache[key]) return archiveCache[key];
  const r = await fetch(archiveUrl(season, kind));
  if (!r.ok) throw new Error('Файл не найден: ' + archiveUrl(season, kind));
  const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
  const msgs = [...doc.querySelectorAll('.message')].map(m => {
    const content = m.querySelector('.content');
    if (!content) return null;
    const ts = m.querySelector('.timestamp'), author = m.querySelector('.author');
    const rawTs = ts ? ts.textContent.split('|')[0].trim() : '';
    return {
      date: parseTs(rawTs),
      dateStr: rawTs,
      author: author ? author.textContent.trim() : '—',
      content: content.innerHTML.trim(),
      text: (content.textContent || '').trim(),
      season: season,
      kind: kind
    };
  }).filter(x => x && x.text); // пустые сообщения бота пропускаем
  archiveCache[key] = msgs;
  return msgs;
}

function renderArchFolders() {
  const el = document.getElementById('archFolders');
  if (!el) return;
  el.innerHTML = ARCHIVE_SEASONS.slice().sort((a, b) => b - a).map(s =>
    '<div class="folder"><h3>📁 Сезон ' + s + '</h3><div class="folder-files">' +
    ARCHIVE_KINDS.map(k =>
      '<button class="folder-file" data-season="' + s + '" data-kind="' + k.id + '">' + k.emoji + ' ' + k.label + '</button>'
    ).join('') + '</div></div>').join('');
  el.querySelectorAll('.folder-file').forEach(b => b.addEventListener('click', () => {
    archState.season = b.dataset.season;
    archState.kind = b.dataset.kind;
    document.getElementById('archSeason').value = b.dataset.season;
    document.getElementById('archKind').value = b.dataset.kind;
    renderArchives();
  }));
}

function initArchControls() {
  const sel = document.getElementById('archSeason');
  if (!sel) return;
  sel.innerHTML = '<option value="all">Все сезоны</option>' +
    ARCHIVE_SEASONS.slice().sort((a, b) => b - a).map(s => '<option value="' + s + '">Сезон ' + s + '</option>').join('');
  sel.addEventListener('change', () => { archState.season = sel.value; renderArchives(); });
  document.getElementById('archKind').addEventListener('change', e => { archState.kind = e.target.value; renderArchives(); });
  document.getElementById('archSearch').addEventListener('input', e => { archState.q = e.target.value; renderArchives(); });
}

async function renderArchives() {
  const body = document.getElementById('archBody');
  const stats = document.getElementById('archStats');
  if (!body) return;
  const seasons = archState.season === 'all' ? ARCHIVE_SEASONS : [Number(archState.season)];
  const kinds = archState.kind === 'all' ? ARCHIVE_KINDS.map(k => k.id) : [archState.kind];
  body.innerHTML = '<p class="loading">Загрузка архивов...</p>';
  try {
    const lists = await Promise.all(seasons.flatMap(s => kinds.map(k => loadArchiveFile(s, k).catch(() => []))));
    let msgs = lists.flat();
    const q = archState.q.trim().toLowerCase();
    if (q) msgs = msgs.filter(m =>
      m.author.toLowerCase().includes(q) ||   // по нику
      m.text.toLowerCase().includes(q) ||     // по содержанию
      m.dateStr.includes(q) ||                // по дате (например "06.04.2026")
      String(m.season).includes(q)            // по сезону
    );
    msgs.sort((a, b) => readOrder.archives === 'asc' ? a.date - b.date : b.date - a.date);
    stats.innerHTML =
      '<div class="us-item"><b>' + msgs.length + '</b>сообщений</div>' +
      '<div class="us-item"><b>' + new Set(msgs.map(m => m.author)).size + '</b>авторов</div>' +
      '<div class="us-item"><b>' + new Set(msgs.map(m => m.season)).size + '</b>сезонов</div>';
    if (!msgs.length) { body.innerHTML = '<p class="loading">Ничего не найдено.</p>'; return; }
    body.innerHTML = msgs.map(m => {
      const k = ARCHIVE_KINDS.find(x => x.id === m.kind);
      return '<article class="update-card">' +
        '<div class="update-meta"><span class="update-author">' + esc(m.author) + '</span>' +
        '<span class="update-date">' + esc(m.dateStr) + '</span>' +
        '<span class="arch-badge">' + k.emoji + ' сезон ' + m.season + '</span></div>' +
        '<div class="update-content">' + renderMarkdown(m.content) + '</div></article>';
    }).join('');
    body.querySelectorAll('.spoiler').forEach(sp => sp.addEventListener('click', () => sp.classList.toggle('revealed')));
  } catch (e) {
    console.error('[Global Lens]', e);
    body.innerHTML = '<p class="loading">' + esc(e.message) + '</p>';
  }
}


/* ===== ЗАПУСК ===== */
handleDiscordCallback();
loadUpdates();
loadPress();
animateStats();
renderArchFolders();
initArchControls();

