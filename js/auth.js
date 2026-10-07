/**
 * auth.js - Авторизация через Discord OAuth2, личный кабинет игрока и синхронизация профиля
 */
import { esc, fmtNum, trimDeep, readLS, defaultAvatar, userAvatar } from './utils.js';
import { API_BASE, DISCORD_CLIENT_ID, AUTH_TOKENS_URL, PLAYERS_URL, KNOWN_PLAYERS, SPEC_NAMES, BOT_DM_URL } from './config.js';
import { fetchSeasonData } from './season.js';
import { decorateStaff } from './staff.js';
import { go } from './navigation.js';

let PLAYERS = null;
export let PLAYERS_BY_ID = {};

export function getDiscordOAuthUrl() {
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/index\.html$/, '');
  const cleanUrl = (origin + path).replace(/\/?$/, '/');
  const redirectUri = encodeURIComponent(cleanUrl);
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=identify&redirect_uri=${redirectUri}`;
}

export function discordLogin() {
  window.location.href = getDiscordOAuthUrl();
}
window.discordLogin = discordLogin;

export function getStaffTitle(id) {
  const sid = String(id);
  if (sid === '830428424677490728') return '★ Администратор / Картография';
  if (sid === '758998250610360341') return '★ Создатель сайта / Зам. Руководства';
  if (sid === '484044030640914437') return '★ Основатель сервера';
  if (sid === '800254982641025056') return '★ Куратор Анкетологов';
  if (sid === '825769203347882042') return '★ Администратор';
  if (sid === '1135494383773433937') return '★ Куратор Технологов и Картографов';
  if (sid === '928360132482572371') return '★ Куратор Модераторов';
  if (sid === '1066701976949239905') return '★ Зам. Куратора Политологов';
  if (sid === '1027662788274966539') return '★ Зам. Куратора';
  if (sid === '1137392083821416478') return '★ Зам. Куратора Модераторов и Технологов';

  const p = getPlayerById(sid);
  if (p && p.is_staff) {
    return '★ Персонал сервера';
  }
  return null;
}

export async function loadPlayers() {
  try {
    if (API_BASE) {
      PLAYERS = trimDeep(await fetch(`${API_BASE}/api/players`).then(r => r.json()));
    }
  } catch (e) {}

  if (!PLAYERS || !Object.keys(PLAYERS).length) {
    try {
      let r = await fetch('data/players.json?t=' + Date.now());
      if (!r.ok) r = await fetch('players.json?t=' + Date.now());
      if (r.ok) {
        PLAYERS = trimDeep(await r.json());
      }
    } catch (e2) {}
  }

  PLAYERS_BY_ID = {};
  if (PLAYERS) {
    const list = [
      ...(Array.isArray(PLAYERS) ? PLAYERS : []),
      ...(PLAYERS.non_staff_players || []),
      ...(PLAYERS.staff_players || []),
      ...(PLAYERS.players || []),
      ...(PLAYERS.all_players || [])
    ];
    for (const p of list) {
      if (p && p.id) {
        PLAYERS_BY_ID[String(p.id)] = p;
      }
    }
  }

  // Метаданные ключевых участников
  if (!PLAYERS_BY_ID['830428424677490728']) {
    PLAYERS_BY_ID['830428424677490728'] = {
      id: '830428424677490728',
      username: 'ponzc',
      display_name: '𝕻𝖔𝖓𝖟𝖈',
      country: 'Бразилия',
      entity_type: 'Государство',
      gdp: 14850616435226,
      population: 234982475,
      balance: 0,
      support: 96.5,
      corruption: 6.0,
      is_staff: true,
      is_registered: true
    };
  }
  if (!PLAYERS_BY_ID['758998250610360341']) {
    PLAYERS_BY_ID['758998250610360341'] = {
      id: '758998250610360341',
      username: 'qbitf',
      display_name: 'Китаёзик',
      country: 'Гондурас',
      entity_type: 'Государство',
      gdp: 28400000000,
      population: 10432860,
      balance: 14500000,
      support: 94.0,
      corruption: 8.5,
      is_staff: true,
      is_registered: true
    };
  }
}

export function getPlayers() {
  return PLAYERS_BY_ID;
}

export function getPlayerById(id) {
  if (!id) return null;
  return PLAYERS_BY_ID[String(id)] || null;
}

export function playerMeta(id) {
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    return { name: 'Неизвестный', avatar: defaultAvatar('0') };
  }
  const local = readLS('gl-players', {});
  const base = PLAYERS_BY_ID[id] || (PLAYERS && PLAYERS[id]) || local[id] || null;
  const known = KNOWN_PLAYERS[id];

  let name = known ? known.name : null;
  if (!name && base) {
    const rawNick = (base.nick || base.nickname || base.display_name || '').trim();
    const parts = rawNick.split('|').map(s => s.trim());
    if (parts.length > 1 && (parts[1] === base.country || parts[0].length <= 8)) {
      name = base.username || parts[1] || parts[0];
    } else if (rawNick && rawNick !== base.country) {
      name = rawNick;
    } else {
      name = base.username || base.name;
    }
  }
  if (!name) name = 'Игрок #' + String(id).slice(-4);

  return {
    name,
    avatar: (base && (base.avatar_url || base.avatar)) || defaultAvatar(id)
  };
}

export function syncUserUI() {
  const label = document.getElementById('cabinetLabel');
  const note = document.getElementById('donateUserNote');
  const name = window.glUser ? window.glUser.name : null;
  if (label) label.textContent = name || 'Личный кабинет';
  if (note) {
    note.textContent = name
      ? 'Вы вошли как ' + name + ' — синхронизировано с Discord.'
      : 'Данные вашего игрового профиля: страна, экономика, кредиты и инвестиции';
  }
}

export async function handleLogin() {
  // 1. Проверяем OAuth access_token от Discord в hash URL (#access_token=...)
  if (location.hash && location.hash.includes('access_token=')) {
    const hashStr = location.hash.replace(/^#/, '');
    const p = new URLSearchParams(hashStr);
    const token = p.get('access_token');
    if (token) {
      try {
        localStorage.setItem('gl-discord-token', token);
        history.replaceState(null, '', location.pathname + '#cabinet');
      } catch (e) {}
    }
  }

  // 2. Если есть токен авторизации Discord — запрашиваем профиль пользователя через Discord API
  let dToken = null;
  try {
    dToken = localStorage.getItem('gl-discord-token');
  } catch (e) {}

  if (dToken) {
    try {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: 'Bearer ' + dToken }
      });
      if (res.ok) {
        const dUser = await res.json();
        const avatarUrl = dUser.avatar
          ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png?size=128`
          : defaultAvatar(dUser.id);
        window.glUser = {
          id: String(dUser.id),
          name: dUser.global_name || dUser.username,
          avatar: avatarUrl
        };
        localStorage.setItem('gl-user', JSON.stringify(window.glUser));
        localStorage.setItem('gl-auth-source', 'discord-oauth');
      } else {
        localStorage.removeItem('gl-discord-token');
        localStorage.removeItem('gl-user');
        window.glUser = null;
      }
    } catch (e) {
      console.warn('[Global Lens] Discord API fetch error:', e);
    }
  }

  // 3. Проверяем токен от бота в URL query (?token=... или ?auth=...)
  if (!window.glUser) {
    const params = new URLSearchParams(location.search);
    const botToken = params.get('token') || params.get('auth') || params.get('t');
    if (botToken) {
      history.replaceState(null, '', location.pathname + location.hash);
      try {
        // Base64 JSON токен
        try {
          const decoded = JSON.parse(atob(botToken));
          if (decoded && (decoded.id || decoded.user_id)) {
            const uId = String(decoded.id || decoded.user_id);
            const pm = playerMeta(uId);
            window.glUser = {
              id: uId,
              name: decoded.name || decoded.username || pm.name,
              avatar: decoded.avatar || decoded.avatar_url || pm.avatar
            };
            localStorage.setItem('gl-user', JSON.stringify(window.glUser));
            localStorage.setItem('gl-auth-source', 'bot');
          }
        } catch (eDec) {
          if (/^\d+$/.test(botToken)) {
            const pm = playerMeta(botToken);
            window.glUser = {
              id: botToken,
              name: pm.name || ('Игрок #' + botToken.slice(-4)),
              avatar: pm.avatar || defaultAvatar(botToken)
            };
            localStorage.setItem('gl-user', JSON.stringify(window.glUser));
            localStorage.setItem('gl-auth-source', 'bot');
          }
        }
      } catch (e) {}
    }
  }

  // 4. Очищаем старые принудительные авто-логины (Китаёзик), чтобы не мешать настоящему входу
  try {
    const saved = JSON.parse(localStorage.getItem('gl-user'));
    const source = localStorage.getItem('gl-auth-source');
    if (saved && saved.id === '758998250610360341' && source !== 'discord-oauth' && source !== 'manual') {
      localStorage.removeItem('gl-user');
      localStorage.removeItem('gl-auth-source');
    }
  } catch (e) {}

  // 5. Проверяем сохранённую сессию (если пользователь авторизовался)
  if (!window.glUser) {
    try {
      const saved = JSON.parse(localStorage.getItem('gl-user'));
      if (saved && saved.id) {
        window.glUser = saved;
      }
    } catch (e) {}
  }

  syncUserUI();
  decorateStaff();
  renderCabinet();

  // Фоновая загрузка базы игроков и сезона
  loadPlayers().then(() => {
    syncUserUI();
    decorateStaff();
    renderCabinet();
  });
}

export function selectCabinetUser(id) {
  if (!id) return;
  const pm = playerMeta(String(id));
  const p = getPlayerById(id);
  window.glUser = {
    id: String(id),
    name: pm.name || (p && (p.username || p.display_name)) || 'Игрок',
    avatar: pm.avatar || (p && p.avatar_url) || defaultAvatar(String(id))
  };
  try {
    localStorage.setItem('gl-user', JSON.stringify(window.glUser));
    localStorage.setItem('gl-auth-source', 'manual');
  } catch (e) {}
  syncUserUI();
  decorateStaff();
  renderCabinet();
}
window.selectCabinetUser = selectCabinetUser;

export function openPlayerPickerModal() {
  let modal = document.getElementById('playerPickerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'playerPickerModal';
    modal.className = 'country-modal-overlay';
    modal.innerHTML = `
      <div class="country-modal-card" style="max-width:540px">
        <div class="cm-header">
          <div class="cm-header-left">
            <h2 style="font-size:18px"><svg class="ic"><use href="#i-users"/></svg> Выбор досье игрока</h2>
          </div>
          <button class="cm-close" onclick="document.getElementById('playerPickerModal').classList.remove('active')">✕</button>
        </div>
        <div class="cm-body" style="padding:16px 20px">
          <div class="search-wrap" style="margin-bottom:14px">
            <svg class="ic"><use href="#i-search"/></svg>
            <input id="pickerPlayerSearch" class="search-input" placeholder="Поиск по нику, стране или Discord ID...">
          </div>
          <div id="pickerPlayersList" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const listEl = modal.querySelector('#pickerPlayersList');
  const searchEl = modal.querySelector('#pickerPlayerSearch');
  const players = Object.values(PLAYERS_BY_ID);

  function renderList(query = '') {
    const q = (query || '').toLowerCase().trim();
    const filtered = players.filter(p => {
      const pm = playerMeta(String(p.id));
      const str = [p.id, p.username, p.country, p.nickname, pm.name].join(' ').toLowerCase();
      return str.includes(q);
    });

    listEl.innerHTML = filtered.map(p => {
      const pm = playerMeta(String(p.id));
      const isCur = window.glUser && String(window.glUser.id) === String(p.id);
      return `
        <div class="l-pill" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.04);border:1px solid ${isCur ? 'var(--green)' : 'rgba(255,255,255,0.1)'}" onclick="window.selectCabinetUser('${p.id}');document.getElementById('playerPickerModal').classList.remove('active')">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${pm.avatar}" style="width:30px;height:30px;border-radius:50%" alt="">
            <div>
              <b style="font-size:13.5px;color:#fff">${esc(pm.name)}</b>
              <div style="font-size:11px;color:var(--dim)">${esc(p.country || 'Участник')} · ID: ${p.id}</div>
            </div>
          </div>
          <span class="badge" style="background:${isCur ? 'var(--green)' : 'rgba(74,222,128,0.12)'};color:${isCur ? '#000' : '#4ade80'}">${isCur ? 'Активен' : 'Открыть'}</span>
        </div>
      `;
    }).join('') || '<p class="loading">Ничего не найдено</p>';
  }

  renderList();
  searchEl.value = '';
  searchEl.oninput = () => renderList(searchEl.value);
  modal.classList.add('active');
}
window.openPlayerPickerModal = openPlayerPickerModal;

export function discordLogout() {
  localStorage.removeItem('gl-user');
  localStorage.removeItem('gl-discord-token');
  localStorage.removeItem('gl-auth-source');
  localStorage.removeItem('gl-session');
  window.glUser = null;
  syncUserUI();
  renderCabinet();
  decorateStaff();
}

export async function renderCabinet() {
  const body = document.getElementById('cabinetBody');
  if (!body) return;

  if (!window.glUser) {
    const authUrl = getDiscordOAuthUrl();
    body.innerHTML = `
      <div class="card wide login-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <h3><svg class="ic"><use href="#i-user"/></svg>Вход в Личный кабинет</h3>
          <span class="pill" style="font-size:11px;padding:4px 12px;border-radius:999px;display:inline-flex;align-items:center;gap:7px;letter-spacing:0.08em;font-weight:700;border:1px solid rgba(74,222,128,0.35);background:rgba(74,222,128,0.08);color:#4ade80;box-shadow:0 0 12px rgba(74,222,128,0.12)">
            <i class="dot pulse" style="width:6px;height:6px;background:#4ade80"></i>
            Сезон 28
          </span>
        </div>
        <p style="margin-top:10px;color:var(--dim);font-size:14px;line-height:1.5">
          Войдите через официальный Discord для автоматической привязки вашего государства, экономики, баланса и лицензий:
        </p>

        <!-- Главная кнопка: Войти через Discord OAuth -->
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:12px">
          <a class="cta fill" style="background:#5865F2;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;gap:12px;font-size:15px;padding:15px 26px;border-radius:12px;font-weight:700;box-shadow:0 4px 20px rgba(88,101,242,0.35);text-decoration:none" href="${authUrl}">
            <svg class="ic" style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M20.3 4.3a18 18 0 0 0-4.4-1.3l-.2.4a16.4 16.4 0 0 0-7.5 0l-.2-.4A18 18 0 0 0 3.7 4.3C1.2 8 .5 11.7.8 15.3a18 18 0 0 0 5.5 2.8c.5-.6.9-1.3 1.2-2-.5-.2-.9-.4-1.3-.7l.3-.2a13 13 0 0 0 11 0l.3.2c-.4.3-.8.5-1.3.7.3.7.7 1.4 1.2 2a18 18 0 0 0 5.5-2.8c.4-4.2-.7-7.9-2.9-11zM8.5 13.3c-1 0-1.9-1-1.9-2.1 0-1.2.8-2.1 1.9-2.1 1 0 1.9 1 1.9 2.1 0 1.2-.9 2.1-1.9 2.1zm7 0c-1 0-1.9-1-1.9-2.1 0-1.2.8-2.1 1.9-2.1s1.9 1 1.9 2.1c0 1.2-.9 2.1-1.9 2.1z"/></svg>
            Войти через Discord
          </a>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;margin-top:6px">
            <a class="cta outline" style="justify-content:center;font-size:13px;padding:12px;text-decoration:none" target="_blank" rel="noopener" href="https://discord.com/channels/1209153077651963924/1209160476764667905/1351208509458616362">
              📝 Подать заявку на регистрацию в сезоне
            </a>
            <span class="cta ghost" style="justify-content:center;font-size:13px;padding:12px;border-color:rgba(239,68,68,0.45);color:#f87171;background:rgba(239,68,68,0.08);cursor:not-allowed;user-select:none;display:inline-flex;align-items:center;gap:7px" title="Вход по ссылке бота в данный момент недоступен">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.7)"></span>
              🤖 Вход по ссылке бота (недоступен)
            </span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const u = window.glUser;
  let season = null, countries = null;
  try {
    const [s, c] = await fetchSeasonData();
    season = trimDeep(s);
    countries = trimDeep(c);
  } catch (e) {}

  const pLive = getPlayerById(u.id);
  const me = (season && season[u.id]) || (pLive ? {
    country: pLive.country || (pLive.countries && pLive.countries[0]) || (u.id === '830428424677490728' ? 'Бразилия' : (u.id === '758998250610360341' ? 'Гондурас' : 'Не указана')),
    type: pLive.entity_type === 'Автономия' ? 'autonomy' : (pLive.entity_type === 'Организация' ? 'organization' : 'country'),
    gdp: pLive.gdp || (countries && countries[pLive.country]?.gdp) || (u.id === '830428424677490728' ? 14850616435226 : (u.id === '758998250610360341' ? 28400000000 : 20387000000)),
    population: pLive.population || (countries && countries[pLive.country]?.population) || (u.id === '830428424677490728' ? 234982475 : (u.id === '758998250610360341' ? 10432860 : 8575000)),
    balance: pLive.balance != null ? pLive.balance : (u.id === '758998250610360341' ? 14500000 : 0),
    support: pLive.support != null ? pLive.support : (u.id === '830428424677490728' ? 96.5 : (u.id === '758998250610360341' ? 94.0 : 95.0)),
    corruption: pLive.corruption != null ? pLive.corruption : (u.id === '830428424677490728' ? 6.0 : (u.id === '758998250610360341' ? 8.5 : 8.0)),
    categories: pLive.categories || (u.id === '830428424677490728' ? ['Картограф', 'Персонал'] : []),
    roles: pLive.roles || [],
    is_staff: pLive.is_staff || u.id === '830428424677490728' || u.id === '758998250610360341',
    is_registered: true,
    raw: pLive
  } : (u.id === '830428424677490728' ? {
    country: 'Бразилия',
    type: 'country',
    gdp: 14850616435226,
    population: 234982475,
    balance: 0,
    support: 96.5,
    corruption: 6.0,
    categories: ['Картограф', 'Персонал'],
    roles: [],
    is_staff: true,
    is_registered: true
  } : (u.id === '758998250610360341' ? {
    country: 'Гондурас',
    type: 'country',
    gdp: 28400000000,
    population: 10432860,
    balance: 14500000,
    support: 94.0,
    corruption: 8.5,
    categories: ['Создатель сайта', 'Персонал'],
    roles: [],
    is_staff: true,
    is_registered: true
  } : null)));

  const flagOf = n => {
    if (countries && countries[n] && countries[n].flag) return countries[n].flag;
    if (n === 'Бразилия') return '🇧🇷';
    if (n === 'Гондурас') return '🇭🇳';
    if (pLive) {
      const match = (pLive.display_name || pLive.nickname || '').match(/[\uD83C][\uDDE6-\uDDFF]{2}/);
      if (match) return match[0];
    }
    return '🏳️';
  };

  const staffTitle = getStaffTitle(u.id);

  let html = `
    <div class="card wide profile-card">
      <div class="profile-head">
        <img class="profile-ava" src="${userAvatar(u)}" alt="${esc(u.name)}">
        <div>
          <div class="profile-name">${esc(u.name)}</div>
          <div class="profile-sub">Discord ID: ${u.id}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
          <button class="cta ghost" onclick="window.openPlayerPickerModal()"><svg class="ic" style="width:14px;height:14px"><use href="#i-users"/></svg> Сменить игрока</button>
          <button class="cta ghost" onclick="window.discordLogout()">Выйти</button>
        </div>
      </div>
    </div>
  `;

  if (!me) {
    html += `
      <div class="card wide">
        <h3><svg class="ic"><use href="#i-scroll"/></svg> Вы успешно вошли через Discord</h3>
        <p>Ваш Discord-аккаунт <b>${esc(u.name)}</b> авторизован, но страна или организация в 28 сезоне пока не привязана.</p>
        <div class="cta-row" style="margin-top:16px;justify-content:flex-start;gap:10px;flex-wrap:wrap">
          <a class="cta fill" target="_blank" rel="noopener" href="https://discord.com/channels/1209153077651963924/1209160476764667905/1351208509458616362">
            📝 Зарегистрироваться в сезоне (Discord)
          </a>
          <a class="cta ghost" href="#" data-go="season">Выбрать страну на карте</a>
        </div>
      </div>
    `;
  } else {
    const typeNames = { country: 'Государство', organization: 'Организация', autonomy: 'Автономия' };
    html += `
      <div class="stats">
        <div class="stat"><b>${fmtNum(me.gdp)}</b><span>ВВП</span></div>
        <div class="stat"><b>${fmtNum(me.balance)}</b><span>Баланс</span></div>
        <div class="stat"><b>${me.support != null ? me.support.toFixed(1) + '%' : '—'}</b><span>Поддержка</span></div>
        <div class="stat"><b>${me.corruption != null ? me.corruption.toFixed(1) + '%' : '—'}</b><span>Коррупция</span></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h3>${flagOf(me.country)} ${esc(me.country)}</h3>
          <div class="kv"><span>Тип</span><b>${typeNames[me.type] || me.type}</b></div>
          <div class="kv"><span>Статус</span><b style="color:var(--green)">✓ Зарегистрирован в 28 сезоне</b></div>
          ${staffTitle ? `<div class="kv"><span>Статус на сервере</span><b style="color:var(--yellow)">${esc(staffTitle)}</b></div>` : ''}
          ${(me.categories && me.categories.length) ? `<div class="kv"><span>Категории</span><b>${esc(me.categories.join(' · '))}</b></div>` : ''}
          ${me.org_type ? `<div class="kv"><span>Форма</span><b>${esc(me.org_type)}</b></div>` : ''}
          ${me.host_country ? `<div class="kv"><span>Метрополия</span><b>${flagOf(me.host_country)} ${esc(me.host_country)}</b></div>` : ''}
          ${me.ideology ? `<div class="kv"><span>Гос. строй</span><b>${esc(me.ideology.state || '—')}</b></div><div class="kv"><span>Экономика</span><b>${esc(me.ideology.economy || '—')}</b></div>` : ''}
          ${me.specialization ? `<div class="kv"><span>Специализация</span><b>${SPEC_NAMES[me.specialization] || esc(me.specialization)}</b></div>` : ''}
          ${me.population ? `<div class="kv"><span>Население</span><b>${fmtNum(me.population)}</b></div>` : ''}
          ${me.taxes ? `<div class="kv"><span>Налоги</span><b>НДС ${me.taxes.nds}% · НДФЛ ${me.taxes.ndfl}%</b></div>` : ''}
          ${me.shield ? `<div class="kv"><span>Щит до</span><b>${new Date(me.shield).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></div>` : ''}
        </div>

        <div class="card">
          <h3>💳 Игровые лицензии и действия</h3>
          <div class="user-roles-list" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 16px">
            <span class="badge" style="background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.3);color:#4ade80;padding:4px 8px;border-radius:6px;font-size:12px">✓ Лицензия Сезона 28</span>
            ${pLive && pLive.roles ? pLive.roles.map(r => `<span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);padding:4px 8px;border-radius:6px;font-size:12px">${esc(r.name)}</span>`).join('') : ''}
          </div>
          <div class="cta-row" style="justify-content:flex-start;margin-top:14px;gap:8px;flex-wrap:wrap">
            <a class="cta fill" target="_blank" rel="noopener" href="https://discord.gg/edPpSRmRNu">
              📝 Подать анкету / Регистрация в Discord
            </a>
            <a class="cta ghost" href="#" data-go="season">
              🗺️ Обзор на 3D карте
            </a>
          </div>
        </div>
      </div>
    `;

    // Особый блок заслуг для картографа Ponzc
    if (u.id === '830428424677490728') {
      html += `
        <div class="card wide" style="margin-top:16px;background:rgba(74,222,128,0.04);border:1px solid rgba(74,222,128,0.25)">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-weight:700;font-size:14px;color:#4ade80">
                🏆 Особые заслуги: Главный картограф Global Lens
              </div>
              <p style="font-size:12.5px;color:var(--dim);margin-top:4px">
                Смог восстановить и сделать стабильную работу картографии. Также является главным лудиком на Global Luds.
              </p>
            </div>
            <button class="cta outline" onclick="window.openStaffModal('ponzc')">
              🏅 Награды и достижения (200)
            </button>
          </div>
        </div>
      `;
    }
  }

  body.innerHTML = html;
  body.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      go(el.dataset.go);
    });
  });
}

export async function testPlayersWebhook() {
  const status = document.getElementById('webhookTestStatus');
  const set = t => { if (status) status.textContent = t; };
  if (!API_BASE) {
    set('ℹ️ Автономный режим: статические файлы сезонов и игроков активны.');
    return;
  }
  set('Проверка связи...');
  try {
    const data = await fetch(`${API_BASE}/api/ping`).then(r => r.json());
    set(data.status === 'ok' ? '✅ Бот на связи!' : '❌ Ответ бота: ' + JSON.stringify(data));
  } catch (e) {
    set('❌ API недоступно: ' + e.message);
  }
}

// Привязка глобальных функций для разметки onclick
window.renderCabinet = renderCabinet;
window.selectCabinetUser = selectCabinetUser;
window.openPlayerPickerModal = openPlayerPickerModal;
window.discordLogout = discordLogout;
window.discordLogin = discordLogin;
window.testPlayersWebhook = testPlayersWebhook;
