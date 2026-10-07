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

  // Гарантированные метаданные ключевых создателей
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
      ? 'Вы вошли как ' + name + ' — синхронизировано с Discord сервером.'
      : 'Данные вашего игрового профиля: страна, экономика, кредиты и инвестиции';
  }
}

export async function handleLogin() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || params.get('auth') || params.get('t');

  // 1. Вход по одноразовой ссылке/токену от Discord бота
  if (token) {
    history.replaceState(null, '', location.pathname + location.hash);
    try {
      if (API_BASE) {
        const data = await fetch(`${API_BASE}/api/auth?token=${encodeURIComponent(token)}`).then(r => r.json());
        if (data.status === 'ok') {
          window.glUser = data.user;
          localStorage.setItem('gl-user', JSON.stringify(window.glUser));
          localStorage.setItem('gl-auth-source', 'bot');
          if (data.session) localStorage.setItem('gl-session', data.session);
        }
      } else {
        let foundEntry = null;

        // Проверяем sha256 хэш токена в auth_tokens.json
        if (window.crypto && crypto.subtle) {
          try {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
            const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
            const used = readLS('gl-used-tokens', []);
            if (!used.includes(hash)) {
              const r = await fetch(AUTH_TOKENS_URL + '?t=' + Date.now());
              if (r.ok) {
                const tokens = await r.json();
                foundEntry = tokens[hash] || tokens[token];
                if (foundEntry) {
                  used.push(hash);
                  localStorage.setItem('gl-used-tokens', JSON.stringify(used));
                }
              }
            }
          } catch (eHash) {}
        }

        // Проверяем base64 JSON токен от бота
        if (!foundEntry) {
          try {
            const decoded = JSON.parse(atob(token));
            if (decoded && (decoded.id || decoded.user_id)) {
              const uId = String(decoded.id || decoded.user_id);
              const pm = playerMeta(uId);
              foundEntry = {
                id: uId,
                name: decoded.name || decoded.username || pm.name,
                avatar: decoded.avatar || decoded.avatar_url || pm.avatar
              };
            }
          } catch (eDec) {}
        }

        // Проверяем токен как Discord ID
        if (!foundEntry && /^\d+$/.test(token)) {
          const pm = playerMeta(token);
          foundEntry = {
            id: token,
            name: pm.name || ('Игрок #' + token.slice(-4)),
            avatar: pm.avatar || defaultAvatar(token)
          };
        }

        if (foundEntry) {
          window.glUser = {
            id: String(foundEntry.id),
            name: foundEntry.name,
            avatar: foundEntry.avatar || defaultAvatar(String(foundEntry.id))
          };
          localStorage.setItem('gl-user', JSON.stringify(window.glUser));
          localStorage.setItem('gl-auth-source', 'bot');
        }
      }
    } catch (e) {
      console.error('[Global Lens] auth error:', e);
    }
  }

  // 2. Если сессия уже сохранена в localStorage
  if (!window.glUser) {
    try {
      const saved = JSON.parse(localStorage.getItem('gl-user'));
      if (saved && saved.id) {
        window.glUser = saved;
      }
    } catch (e) {}
  }

  // 3. По умолчанию сразу открываем профиль картографа 𝕻𝖔𝖓𝖟𝖈 (Бразилия)
  if (!window.glUser) {
    window.glUser = {
      id: '830428424677490728',
      name: '𝕻𝖔𝖓𝖟𝖈',
      avatar: defaultAvatar('830428424677490728')
    };
    try {
      localStorage.setItem('gl-user', JSON.stringify(window.glUser));
    } catch (e) {}
  }

  syncUserUI();
  decorateStaff();
  renderCabinet();

  // Фоновая загрузка базы игроков и обновление кабинета
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
    body.innerHTML = `
      <div class="card wide login-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <h3><svg class="ic"><use href="#i-user"/></svg>Регистрация и Вход в Личный кабинет</h3>
          <span class="badge" style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3)">Сезон 28</span>
        </div>
        <p style="margin-top:10px;color:var(--dim);font-size:13.5px;line-height:1.5">
          Личный кабинет позволяет просматривать экономику вашего государства, уровень поддержки, лицензии и союзные связи.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:14px;margin-top:20px">
          <div style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(74,222,128,0.25);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="font-weight:700;font-size:14px;color:#4ade80;display:flex;align-items:center;gap:8px">
                <svg class="ic" style="width:18px;height:18px"><use href="#i-scroll"/></svg> Новым игрокам: Регистрация
              </div>
              <p style="font-size:12px;color:var(--dim);margin:8px 0 14px">
                Подайте анкету на свободное государство или автономию через официальный Discord-сервер проекта.
              </p>
            </div>
            <a class="cta fill" style="width:100%;justify-content:center" target="_blank" rel="noopener" href="https://discord.gg/edPpSRmRNu">
              📝 Зарегистрироваться в сезоне
            </a>
          </div>

          <div style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(88,101,242,0.3);display:flex;flex-direction:column;justify-content:space-between">
            <div>
              <div style="font-weight:700;font-size:14px;color:#818cf8;display:flex;align-items:center;gap:8px">
                <svg class="ic" style="width:18px;height:18px"><use href="#i-discord"/></svg> Авторизация через бота
              </div>
              <p style="font-size:12px;color:var(--dim);margin:8px 0 14px">
                Напишите боту команду <b>/login</b> в личные сообщения для входа по персональной ссылке.
              </p>
            </div>
            <a class="cta fill" style="width:100%;justify-content:center;background:#5865F2;color:#ffffff" target="_blank" rel="noopener" href="${BOT_DM_URL}">
              <svg class="ic"><use href="#i-discord"/></svg> Открыть ЛС бота (/login)
            </a>
          </div>
        </div>

        <div style="margin-top:22px;padding-top:16px;border-top:1px solid var(--line)">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
            <b style="font-size:13.5px;color:#fff">👤 Быстрый вход для зарегистрированных участников:</b>
            <span style="font-size:11.5px;color:var(--dim)">Выберите профиль в 1 клик</span>
          </div>
          <div class="cta-row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">
            <button class="cta ghost" style="border-color:rgba(74,222,128,0.4);color:#4ade80" onclick="window.selectCabinetUser('830428424677490728')">
              🇧🇷 Войти как 𝕻𝖔𝖓𝖟𝖈
            </button>
            <button class="cta ghost" onclick="window.selectCabinetUser('758998250610360341')">
              🇭🇳 Китаёзик
            </button>
            <button class="cta outline" onclick="window.openPlayerPickerModal()">
              <svg class="ic"><use href="#i-search"/></svg> Найти свой профиль из базы...
            </button>
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
    country: pLive.country || (pLive.countries && pLive.countries[0]) || (u.id === '830428424677490728' ? 'Бразилия' : 'Не указана'),
    type: pLive.entity_type === 'Автономия' ? 'autonomy' : (pLive.entity_type === 'Организация' ? 'organization' : 'country'),
    gdp: pLive.gdp || (countries && countries[pLive.country]?.gdp) || (u.id === '830428424677490728' ? 14850616435226 : 20387000000),
    population: pLive.population || (countries && countries[pLive.country]?.population) || (u.id === '830428424677490728' ? 234982475 : 8575000),
    balance: pLive.balance || 0,
    support: pLive.support != null ? pLive.support : (u.id === '830428424677490728' ? 96.5 : 95.0),
    corruption: pLive.corruption != null ? pLive.corruption : (u.id === '830428424677490728' ? 6.0 : 8.0),
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
  } : null));

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
        <h3><svg class="ic"><use href="#i-scroll"/></svg> Вы ещё не зарегистрировали страну в 28 сезоне</h3>
        <p>Ваш Discord-аккаунт пока не привязан к конкретному государству или организации в сезоне.</p>
        <div class="cta-row" style="margin-top:16px;justify-content:flex-start;gap:10px;flex-wrap:wrap">
          <a class="cta fill" target="_blank" rel="noopener" href="https://discord.gg/edPpSRmRNu">
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
          ${(me.categories && me.categories.length) ? `<div class="kv"><span>Категории</span><b>${esc(me.categories.join(' · '))}</b></div>` : ''}
          ${me.is_staff ? `<div class="kv"><span>Статус на сервере</span><b style="color:var(--yellow)">★ Персонал / Создатель картографии</b></div>` : ''}
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
window.testPlayersWebhook = testPlayersWebhook;
