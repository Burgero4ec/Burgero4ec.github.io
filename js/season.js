/**
 * season.js - Модуль сезона: карточки стран с FlagCDN, модальные окна и адаптация данных
 */
import { esc, fmtNum, trimDeep } from './utils.js';
import { SPEC_NAMES, API_BASE } from './config.js';
import { playerMeta } from './auth.js';
import { countUpAll, getMapInfo } from './stats.js';
import { refreshOdysseyElements } from './animations.js';

export let SEASON_DATA_STORE = {};

// Преобразование эмодзи-флагов в ISO-коды для подгрузки FlagCDN
export function emojiToCountryCode(flagEmoji) {
  if (!flagEmoji || typeof flagEmoji !== 'string') return null;
  const chars = Array.from(flagEmoji.trim());
  if (chars.length === 2) {
    const cp0 = chars[0].codePointAt(0);
    const cp1 = chars[1].codePointAt(0);
    if (cp0 >= 0x1F1E6 && cp0 <= 0x1F1FF && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF) {
      return String.fromCharCode(cp0 - 0x1F1E6 + 97) + String.fromCharCode(cp1 - 0x1F1E6 + 97);
    }
  }
  return null;
}

export function renderFlag(flagStr, countryName = '') {
  if (!flagStr) return '<span class="c-flag fallback">🏳️</span>';
  if (flagStr.includes('<svg') || flagStr.includes('c-ic')) return flagStr;

  const code = emojiToCountryCode(flagStr);
  if (code) {
    return `<img class="c-flag-img" src="https://flagcdn.com/w80/${code}.png" srcset="https://flagcdn.com/w160/${code}.png 2x" alt="${esc(countryName)}" loading="lazy">`;
  }
  return `<span class="c-flag emoji-flag" title="${esc(countryName)}">${flagStr}</span>`;
}

export function seasonCard(o) {
  SEASON_DATA_STORE[o.key] = o;
  const pm = o.playerId ? playerMeta(o.playerId) : null;
  const statusHtml = pm
    ? `<span class="player-chip" title="${esc(pm.name)}"><img src="${pm.avatar}" alt=""><span>${esc(pm.name)}</span></span>`
    : `<span class="badge-free">СВОБОДНО</span>`;

  return `
    <div class="c-card season-card-btn" data-key="${esc(o.key)}" onclick="window.openCountryModal('${esc(o.key)}')">
      <div class="c-flag-box">${o.flagHtml}</div>
      <div class="c-info">
        <div class="c-name" title="${esc(o.name)}">${esc(o.name)}</div>
        <div class="c-sub">${esc(o.continent || '')}${o.typeLabel ? ' · ' + o.typeLabel : ''}</div>
      </div>
      <div class="c-right-slot">${statusHtml}</div>
      <svg class="c-arrow-icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
    </div>
  `;
}

export function openCountryModal(key) {
  const o = SEASON_DATA_STORE[key];
  if (!o) return;

  const d = o.data || {};
  const pm = o.playerId ? playerMeta(o.playerId) : null;
  const modal = document.getElementById('countryModal');
  if (!modal) return;

  // Шапка модального окна
  const flagEl = document.getElementById('cmFlag');
  const nameEl = document.getElementById('cmName');
  const subEl = document.getElementById('cmSub');
  const statusEl = document.getElementById('cmStatus');

  if (flagEl) flagEl.innerHTML = o.flagHtml;
  if (nameEl) nameEl.textContent = o.name;
  if (subEl) subEl.textContent = (o.continent || '') + (o.typeLabel ? ' · ' + o.typeLabel : '');

  if (statusEl) {
    statusEl.innerHTML = pm
      ? `<div class="player-chip modal-player"><img src="${pm.avatar}" alt=""><span>${esc(pm.name)}</span><span class="player-id">ID: ${esc(o.playerId)}</span></div>`
      : `<span class="badge-free big">СВОБОДНА ДЛЯ РЕГИСТРАЦИИ</span>`;
  }

  // Быстрые карточки показателей
  const statsBox = document.getElementById('cmStatsGrid');
  if (statsBox) {
    statsBox.innerHTML = `
      <div class="cm-stat"><span>ВВП</span><b>${fmtNum(d.gdp != null ? d.gdp : d.base_gdp)}</b></div>
      <div class="cm-stat"><span>Население</span><b>${fmtNum(d.population)}</b></div>
      <div class="cm-stat"><span>Рождаемость</span><b>${d.birth_rate != null ? d.birth_rate + '‰' : '—'}</b></div>
      <div class="cm-stat"><span>Ресурс. индекс</span><b>${d.resource_index != null ? d.resource_index : '—'}</b></div>
    `;
  }

  // Детальная таблица
  let detailsHtml = '';
  const addRow = (k, v) => {
    if (v) detailsHtml += `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  };

  if (d.balance != null) addRow('Бюджет / Баланс', fmtNum(d.balance));
  if (d.support != null) addRow('Поддержка населения', (typeof d.support === 'number' ? d.support.toFixed(1) + '%' : d.support));
  if (d.corruption != null) addRow('Уровень коррупции', (typeof d.corruption === 'number' ? d.corruption.toFixed(1) + '%' : d.corruption));
  if (d.ideology) {
    addRow('Гос. строй', esc(d.ideology.state || '—'));
    addRow('Экономический строй', esc(d.ideology.economy || '—'));
  }
  if (d.specialization) addRow('Специализация', SPEC_NAMES[d.specialization] || esc(d.specialization));
  if (d.alliance_type) {
    if (d.alliance_type.military) addRow('Военный блок', esc(d.alliance_type.military));
    if (d.alliance_type.economic) addRow('Экономический блок', esc(d.alliance_type.economic));
    if (d.alliance_type.intergovernmental) addRow('Межправительственный блок', esc(d.alliance_type.intergovernmental));
  }
  if (d.taxes) addRow('Налогообложение', `НДС ${d.taxes.nds}% · НДФЛ ${d.taxes.ndfl}%`);
  if (d.shield) {
    addRow('Действие щита до', new Date(d.shield).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }));
  }

  const detailsBox = document.getElementById('cmDetailsList');
  if (detailsBox) {
    detailsBox.innerHTML = detailsHtml || '<p class="loading">Дополнительных сведений нет</p>';
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeCountryModal() {
  const modal = document.getElementById('countryModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

export async function fetchSeasonData() {
  try {
    if (API_BASE) {
      return await Promise.all([
        fetch(`${API_BASE}/api/season`).then(r => r.json()),
        fetch(`${API_BASE}/api/countries`).then(r => r.json())
      ]);
    }
    throw new Error('No API');
  } catch (e) {
    // Проверяем наличие файла сезона с данными стран
    let seasonData = {};
    try {
      const s26 = await fetchJson('data/seasons/season-26.json');
      // Если в season-26 есть страны, берем его
      if (s26 && Object.values(s26).some(v => v && (v.country || v.type === 'country'))) {
        seasonData = s26;
      } else {
        // Иначе подгружаем season-25 с полным перечнем стран
        seasonData = await fetchJson('data/seasons/season-25.json');
      }
    } catch (e2) {
      try {
        seasonData = await fetchJson('data/seasons/season-25.json');
      } catch (e3) {
        seasonData = {};
      }
    }

    let countriesData = {};
    try {
      countriesData = await fetchJson('countries2014.json');
    } catch (e4) {
      countriesData = {};
    }

    // Если данные заблокированы политикой file:///, используем встроенный базовый состав
    if (!seasonData || !Object.keys(seasonData).length) {
      seasonData = {
        "1": { type: "country", country: "Германия", gdp: 29950312987765, population: 90708409, balance: 142000000 },
        "2": { type: "country", country: "Франция", gdp: 24500000000000, population: 68000000, balance: 95000000 },
        "3": { type: "country", country: "Великобритания", gdp: 27000000000000, population: 67000000, balance: 110000000 },
        "4": { type: "country", country: "КНР", gdp: 38000000000000, population: 1410000000, balance: 500000000 },
        "5": { type: "country", country: "США", gdp: 45000000000000, population: 335000000, balance: 650000000 },
        "6": { type: "country", country: "Япония", gdp: 18000000000000, population: 125000000, balance: 80000000 },
        "7": { type: "organization", country: "Североатлантический Пакт", gdp: 0, population: 0, balance: 0 },
        "8": { type: "organization", country: "Евразийский Экономический Союз", gdp: 0, population: 0, balance: 0 },
        "9": { type: "autonomy", country: "Гренландия", gdp: 3000000000, population: 56000, balance: 1200000 }
      };
    }

    if (!countriesData || !Object.keys(countriesData).length) {
      countriesData = {
        "Германия": { flag: "🇩🇪", continent: "Европа", gdp: 29950312987765, population: 90708409 },
        "Франция": { flag: "🇫🇷", continent: "Европа", gdp: 24500000000000, population: 68000000 },
        "Великобритания": { flag: "🇬🇧", continent: "Европа", gdp: 27000000000000, population: 67000000 },
        "КНР": { flag: "🇨🇳", continent: "Азия", gdp: 38000000000000, population: 1410000000 },
        "США": { flag: "🇺🇸", continent: "Северная Америка", gdp: 45000000000000, population: 335000000 },
        "Япония": { flag: "🇯🇵", continent: "Азия", gdp: 18000000000000, population: 125000000 },
        "Североатлантический Пакт": { flag: "🌐", continent: "Организации" },
        "Евразийский Экономический Союз": { flag: "🤝", continent: "Организации" },
        "Гренландия": { flag: "🇬🇱", continent: "Северная Америка", gdp: 3000000000, population: 56000 }
      };
    }

    return [seasonData, countriesData];
  }
}

export async function loadSeason() {
  const body = document.getElementById('seasonBody');
  if (!body) return;

  try {
    const [seasonRaw, countriesRaw] = await fetchSeasonData();
    const C = trimDeep(countriesRaw), S = trimDeep(seasonRaw);
    SEASON_DATA_STORE = {};

    for (const [k, v] of Object.entries(C)) {
      if (v && typeof v === 'object') v.name = k;
    }

    const states = [], orgs = [], autos = [];
    for (const [id, p] of Object.entries(S)) {
      if (!p || typeof p !== 'object' || !p.country) continue;
      const cc = C[p.country] || {};
      const flagMarkup = renderFlag(cc.flag, p.country);

      if (p.type === 'country' || !p.type) {
        states.push({
          key: 'p' + id,
          name: p.country,
          flagHtml: flagMarkup,
          continent: p.continent || cc.continent || 'Прочие',
          typeLabel: 'Государство',
          data: p,
          playerId: id
        });
      } else if (p.type === 'organization') {
        orgs.push({
          key: 'p' + id,
          name: p.country,
          flagHtml: '<span class="c-flag c-ic"><svg class="ic"><use href="#i-shield"/></svg></span>',
          continent: (C[p.host_country] || {}).continent || '',
          typeLabel: 'Организация' + (p.org_type ? ' · ' + p.org_type : ''),
          data: p,
          playerId: id
        });
      } else if (p.type === 'autonomy') {
        autos.push({
          key: 'p' + id,
          name: p.country,
          flagHtml: renderFlag((C[p.host_country] || {}).flag, p.country),
          continent: (C[p.host_country] || {}).continent || '',
          typeLabel: 'Автономия · ' + (p.host_country || ''),
          data: p,
          playerId: id
        });
      }
    }

    const ru = (a, b) => a.name.localeCompare(b.name, 'ru');
    states.sort(ru);
    orgs.sort(ru);
    autos.sort(ru);

    const taken = new Set(states.map(s => s.name));
    const FREE = Object.values(C)
      .filter(c => c && c.name && !taken.has(c.name))
      .map(c => ({
        key: 'f' + c.name,
        name: c.name,
        flagHtml: renderFlag(c.flag, c.name),
        continent: c.continent || 'Прочие',
        typeLabel: '',
        data: c,
        playerId: null
      }));

    if (!getMapInfo()) {
      countUpAll('countries', states.length);
      countUpAll('orgs', orgs.length);
      countUpAll('autos', autos.length);
    }

    function renderFree(q) {
      q = (q || '').trim().toLowerCase();
      const list = FREE.filter(c => c.name && c.name.toLowerCase().includes(q));
      const by = {};
      list.forEach(c => {
        (by[c.continent] = by[c.continent] || []).push(c);
      });
      const order = ['Европа', 'Азия', 'Африка', 'Северная Америка', 'Южная Америка', 'Австралия и Океания'];
      const conts = Object.keys(by).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

      const fc = document.getElementById('freeCount'), fg = document.getElementById('freeGroups');
      if (fc) fc.textContent = list.length;
      if (fg) {
        fg.innerHTML = conts.length
          ? conts.map(cont => `
              <div class="m-sub">${cont.toUpperCase()} (${by[cont].length})</div>
              <div class="grid-3 season-grid" style="margin-bottom:26px">
                ${by[cont].sort(ru).map(seasonCard).join('')}
              </div>
            `).join('')
          : '<p class="loading">Ничего не найдено.</p>';
      }
      refreshOdysseyElements(fg);
    }

    body.innerHTML = `
      <div class="sec-title"><svg class="ic"><use href="#i-globe"/></svg>ГОСУДАРСТВА <span class="sec-counter">${states.length}</span></div>
      <div class="grid-3 season-grid">${states.map(seasonCard).join('') || '<p class="loading">Нет данных.</p>'}</div>
      
      <div class="sec-title"><svg class="ic"><use href="#i-shield"/></svg>ОРГАНИЗАЦИИ <span class="sec-counter">${orgs.length}</span></div>
      <div class="grid-3 season-grid">${orgs.map(seasonCard).join('') || '<p class="loading">Нет данных.</p>'}</div>
      
      <div class="sec-title"><svg class="ic"><use href="#i-map"/></svg>АВТОНОМИИ <span class="sec-counter">${autos.length}</span></div>
      <div class="grid-3 season-grid">${autos.map(seasonCard).join('') || '<p class="loading">Нет данных.</p>'}</div>
      
      <div class="sec-title"><svg class="ic"><use href="#i-compass"/></svg>СВОБОДНЫЕ СТРАНЫ — <span id="freeCount">${FREE.length}</span></div>
      <div class="search-wrap">
        <svg class="ic"><use href="#i-search"/></svg>
        <input id="countrySearch" class="search-input" type="text" placeholder="Поиск свободной страны...">
      </div>
      <div id="freeGroups"></div>
    `;

    renderFree('');
    const se = document.getElementById('countrySearch');
    if (se) se.addEventListener('input', e => renderFree(e.target.value));

    refreshOdysseyElements(body);
  } catch (e) {
    console.error('[Global Lens] loadSeason error:', e);
    body.innerHTML = '<p class="loading">' + esc(e.message) + '</p>';
  }
}

// Экспорт глобальных функций для разметки
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;

// Закрытие модального окна по Escape или клику вне контента
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCountryModal();
});
document.addEventListener('click', e => {
  if (e.target && e.target.classList.contains('country-modal-overlay')) {
    closeCountryModal();
  }
});
