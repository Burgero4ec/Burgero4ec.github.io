/**
 * auth.js - Авторизация через Discord OAuth2, личный кабинет игрока и синхронизация профиля
 */
import { esc, fmtNum, trimDeep, readLS, defaultAvatar, userAvatar } from './utils.js';
import { API_BASE, DISCORD_CLIENT_ID, AUTH_TOKENS_URL, PLAYERS_URL, KNOWN_PLAYERS, SPEC_NAMES } from './config.js';
import { fetchSeasonData } from './season.js';
import { decorateStaff } from './staff.js';
import { go } from './navigation.js';

let PLAYERS = null;

export async function loadPlayers() {
  try {
    if (API_BASE) {
      PLAYERS = trimDeep(await fetch(`${API_BASE}/api/players`).then(r => r.json()));
      return;
    }
  } catch (e) {}

  try {
    const r = await fetch(PLAYERS_URL + '?t=' + Date.now());
    PLAYERS = r.ok ? trimDeep(await r.json()) : {};
  } catch (e2) {
    PLAYERS = {};
  }
}

export function getPlayers() {
  return PLAYERS;
}

export function playerMeta(id) {
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    return { name: 'Неизвестный', avatar: defaultAvatar('0') };
  }
  const local = readLS('gl-players', {});
  const base = (PLAYERS && PLAYERS[id]) || local[id] || KNOWN_PLAYERS[id] || null;
  return {
    name: base ? (base.nick || base.name) : 'Игрок #' + String(id).slice(-4),
    avatar: (base && base.avatar) || defaultAvatar(id)
  };
}

export function syncUserUI() {
  const label = document.getElementById('cabinetLabel');
  const note = document.getElementById('donateUserNote');
  const name = window.glUser ? window.glUser.name : null;
  if (label) label.textContent = name || 'Личный кабинет';
  if (note) {
    note.textContent = name
      ? 'Вы вошли как ' + name + ' — покупки будут привязаны к этому аккаунту.'
      : 'Данные вашего игрового профиля: страна, экономика, кредиты и инвестиции';
  }
}

export async function handleLogin() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  // Вход по токену бота
  if (token) {
    history.replaceState(null, '', location.pathname);
    try {
      if (API_BASE) {
        const data = await fetch(`${API_BASE}/api/auth?token=${encodeURIComponent(token)}`).then(r => r.json());
        if (data.status === 'ok') {
          window.glUser = data.user;
          localStorage.setItem('gl-user', JSON.stringify(window.glUser));
          if (data.session) localStorage.setItem('gl-session', data.session);
        }
      } else {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        const used = readLS('gl-used-tokens', []);
        if (!used.includes(hash)) {
          const r = await fetch(AUTH_TOKENS_URL + '?t=' + Date.now());
          if (r.ok) {
            const entry = (await r.json())[hash];
            if (entry) {
              window.glUser = { id: entry.id, name: entry.name, avatar: entry.avatar };
              localStorage.setItem('gl-user', JSON.stringify(window.glUser));
              used.push(hash);
              localStorage.setItem('gl-used-tokens', JSON.stringify(used));
            }
          }
        }
      }
    } catch (e) {
      console.error('[Global Lens] auth error:', e);
    }
  }

  // 1-Click Discord OAuth2
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    if (accessToken) {
      try {
        const dRes = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: 'Bearer ' + accessToken }
        });
        if (dRes.ok) {
          const du = await dRes.json();
          window.glUser = {
            id: du.id,
            name: du.global_name || du.username,
            avatar: du.avatar
              ? 'https://cdn.discordapp.com/avatars/' + du.id + '/' + du.avatar + '.png?size=128'
              : 'assets/logo-green.webp'
          };
          localStorage.setItem('gl-user', JSON.stringify(window.glUser));
          history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        console.error('[Global Lens] OAuth fetch error:', err);
      }
    }
  }

  if (!window.glUser) {
    try {
      window.glUser = JSON.parse(localStorage.getItem('gl-user'));
    } catch (e) {
      window.glUser = null;
    }
  }

  syncUserUI();
  decorateStaff();
  renderCabinet();
}

export function discordLogout() {
  localStorage.removeItem('gl-user');
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
    const redirect = encodeURIComponent(window.location.origin + window.location.pathname);
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=identify&redirect_uri=${redirect}`;
    body.innerHTML = `
      <div class="card wide login-card">
        <h3><svg class="ic"><use href="#i-discord"/></svg>Вход в Личный кабинет</h3>
        <p>Вход осуществляется напрямую через официальное Discord-приложение Global Lens (Client ID: <code>${DISCORD_CLIENT_ID}</code>). Войдите в 1 клик для синхронизации вашего государства и статуса персонала:</p>
        <div class="cta-row" style="margin-top:18px">
          <a class="cta fill" style="background:#5865F2;color:#ffffff;display:inline-flex;align-items:center;gap:10px;font-weight:700;padding:12px 24px;border-radius:10px;box-shadow:0 4px 14px rgba(88,101,242,0.3)" href="${authUrl}">
            <svg class="ic" style="width:22px;height:22px"><use href="#i-discord"/></svg> Войти через Discord
          </a>
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

  const me = season ? season[u.id] : null;
  const flagOf = n => (countries && countries[n]) ? countries[n].flag : '🏳️';

  let html = `
    <div class="card wide profile-card">
      <div class="profile-head">
        <img class="profile-ava" src="${userAvatar(u)}" alt="${esc(u.name)}">
        <div>
          <div class="profile-name">${esc(u.name)}</div>
          <div class="profile-sub">Discord ID: ${u.id}</div>
        </div>
        <button class="cta ghost" style="margin-left:auto" onclick="window.discordLogout()">Выйти из профиля</button>
      </div>
    </div>
  `;

  if (!me) {
    html += `
      <div class="card wide">
        <h3>Вы ещё не зарегистрированы в текущем сезоне</h3>
        <p>Ваш Discord-аккаунт пока не привязан к государству или организации в сезоне. Выберите свободную страну и подайте заявку на сервере.</p>
        <div class="cta-row" style="justify-content:flex-start">
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
          ${me.org_type ? `<div class="kv"><span>Форма</span><b>${esc(me.org_type)}</b></div>` : ''}
          ${me.host_country ? `<div class="kv"><span>Метрополия</span><b>${flagOf(me.host_country)} ${esc(me.host_country)}</b></div>` : ''}
          ${me.ideology ? `<div class="kv"><span>Гос. строй</span><b>${esc(me.ideology.state || '—')}</b></div><div class="kv"><span>Экономика</span><b>${esc(me.ideology.economy || '—')}</b></div>` : ''}
          ${me.specialization ? `<div class="kv"><span>Специализация</span><b>${SPEC_NAMES[me.specialization] || esc(me.specialization)}</b></div>` : ''}
          ${me.population ? `<div class="kv"><span>Население</span><b>${fmtNum(me.population)}</b></div>` : ''}
          ${me.taxes ? `<div class="kv"><span>Налоги</span><b>НДС ${me.taxes.nds}% · НДФЛ ${me.taxes.ndfl}%</b></div>` : ''}
          ${me.shield ? `<div class="kv"><span>Щит до</span><b>${new Date(me.shield).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></div>` : ''}
        </div>
    `;

    const credits = me.credits ? Object.values(me.credits) : [];
    html += `
      <div class="card">
        <h3>💳 Кредиты ${credits.length ? '(' + credits.length + ')' : ''}</h3>
        ${credits.length ? credits.map(c => `
          <div class="credit-item">
            <b>Кредит #${esc(c.id)}</b>
            <div class="row"><span>Взято</span><b>${fmtNum(c.amount_taken)}</b></div>
            <div class="row"><span>Остаток долга</span><b>${fmtNum(c.debt_current)}</b></div>
            <div class="row"><span>Платёж</span><b>${fmtNum(c.hourly_payment)}/ч · ${c.term_hours_left} ч</b></div>
            ${c.reason ? `<div class="row"><span>Цель</span><b>${esc(c.reason)}</b></div>` : ''}
          </div>
        `).join('') : '<p>Активных кредитов нет.</p>'}
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
window.discordLogout = discordLogout;
window.testPlayersWebhook = testPlayersWebhook;
