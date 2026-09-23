/**
 * season.js - Модуль сезона: карточки стран с FlagCDN и векторными SVG флагами,
 * 3-вкладочный каталог (Свободные страны, ЧВК и Организации, Свободные автономии),
 * полнофункциональные модальные окна и интеграция с анимациями Odyssey.
 */
import { esc, fmtNum, trimDeep, debounce } from './utils.js';
import { SPEC_NAMES, API_BASE } from './config.js';
import { playerMeta } from './auth.js';
import { countUpAll, getMapInfo } from './stats.js';
import { refreshOdysseyElements } from './animations.js';
import { PMC_AND_ORGS, FREE_AUTONOMIES } from './season_data.js';

export const SEASON_ITEMS = new Map();
export let SEASON_DATA_STORE = {};

export const MODAL_ICONS = {
  gdp: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0"/></svg>',
  population: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  birth: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0"/><path d="M12 3a2 2 0 0 1 2 2"/></svg>',
  resource: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 7-10 11L2 10l4-7z"/><path d="M2 10h20M12 21 8 10l4-7 4 7-4 11z"/></svg>',
  balance: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
  support: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18M7 16l4-5 4 3 5-7"/></svg>',
  corruption: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8a3 3 0 0 1-6 0M2 16l3-8 3 8a3 3 0 0 1-6 0M12 3v18M4 7h16"/></svg>',
  sparkles: '<svg class="modal-callout-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/><path d="M5 3v4M7 5H3M19 17v4M21 19h-4"/></svg>',
  flag: '<svg class="modal-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  swords: '<svg class="modal-callout-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/></svg>'
};

export function pluralCountries(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return n + ' стран';
  if (mod10 === 1) return n + ' страна';
  if (mod10 >= 2 && mod10 <= 4) return n + ' страны';
  return n + ' стран';
}

export function pluralPMC(n) {
  return n + ' ЧВК';
}

export function pluralAutonomies(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return n + ' автономий';
  if (mod10 === 1) return n + ' автономия';
  if (mod10 >= 2 && mod10 <= 4) return n + ' автономии';
  return n + ' автономий';
}

export function pluralOrgs(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return n + ' организаций';
  if (mod10 === 1) return n + ' организация';
  if (mod10 >= 2 && mod10 <= 4) return n + ' организации';
  return n + ' организаций';
}

export function kvRow(k, v) {
  return v ? '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>' : '';
}

/* Конвертация Unicode эмодзи флага в ISO 3166-1 alpha-2 код страны */
export function emojiToCountryCode(emoji) {
  if (!emoji || typeof emoji !== 'string') return null;
  const trimmed = emoji.trim();
  if (/^[a-z]{2}(-[a-z]{2,3})?$/i.test(trimmed)) return trimmed.toLowerCase();
  const chars = [...trimmed];
  if (chars.length >= 2) {
    const cp0 = chars[0].codePointAt(0);
    const cp1 = chars[1].codePointAt(0);
    if (cp0 >= 0x1F1E6 && cp0 <= 0x1F1FF && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF) {
      return (String.fromCharCode(cp0 - 0x1F1E6 + 65) + String.fromCharCode(cp1 - 0x1F1E6 + 65)).toLowerCase();
    }
  }
  return null;
}

/* Генерация графического флага (векторный SVG, легкий вес ~200-700 байт) */
export function getFlagHtml(flagStr, countryName = '', isLarge = false) {
  if (!flagStr) return '<span class="c-flag">🏳️</span>';
  const cName = countryName || '';
  const w = isLarge ? 58 : 32;
  const h = isLarge ? 40 : 22;

  // Кастомные флаги регионов и образований
  if (cName === 'ДНР' || flagStr === '⬛🟦🟥') {
    return '<span class="c-flag custom-flag" title="ДНР"><svg class="c-flag-svg" viewBox="0 0 28 20" width="' + w + '" height="' + h + '"><rect width="28" height="6.67" fill="#000"/><rect y="6.67" width="28" height="6.67" fill="#0055b5"/><rect y="13.33" width="28" height="6.67" fill="#e4181c"/></svg></span>';
  }
  if (cName === 'ЛНР' || flagStr === '🟦🟦🟥') {
    return '<span class="c-flag custom-flag" title="ЛНР"><svg class="c-flag-svg" viewBox="0 0 28 20" width="' + w + '" height="' + h + '"><rect width="28" height="6.67" fill="#4192d9"/><rect y="6.67" width="28" height="6.67" fill="#001282"/><rect y="13.33" width="28" height="6.67" fill="#d31e11"/></svg></span>';
  }
  if (cName === 'Южная Осетия' || flagStr === '🟥⬜🟨') {
    return '<span class="c-flag custom-flag" title="Южная Осетия"><svg class="c-flag-svg" viewBox="0 0 28 20" width="' + w + '" height="' + h + '"><rect width="28" height="6.67" fill="#ffffff"/><rect y="6.67" width="28" height="6.67" fill="#d31e11"/><rect y="13.33" width="28" height="6.67" fill="#ffcc00"/></svg></span>';
  }
  if (cName === 'Абхазия' || flagStr === ':🟩⬜🟩:') {
    return '<span class="c-flag custom-flag" title="Абхазия"><svg class="c-flag-svg" viewBox="0 0 28 20" width="' + w + '" height="' + h + '"><rect width="28" height="20" fill="#339933"/><rect y="2.86" width="28" height="2.86" fill="#fff"/><rect y="8.57" width="28" height="2.86" fill="#fff"/><rect y="14.29" width="28" height="2.86" fill="#fff"/><rect width="10" height="11.43" fill="#e4181c"/><circle cx="5" cy="5.7" r="2.8" fill="#fff"/></svg></span>';
  }
  if (cName === 'Каталония') {
    return '<span class="c-flag custom-flag" title="Каталония"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="32" height="22" fill="#ffd700"/><rect y="2.4" width="32" height="2.4" fill="#d22730"/><rect y="7.3" width="32" height="2.4" fill="#d22730"/><rect y="12.2" width="32" height="2.4" fill="#d22730"/><rect y="17.1" width="32" height="2.4" fill="#d22730"/></svg></span>';
  }
  if (cName === 'Техас') {
    return '<span class="c-flag custom-flag" title="Техас"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="10.6" height="22" fill="#002868"/><rect x="10.6" width="21.4" height="11" fill="#ffffff"/><rect x="10.6" y="11" width="21.4" height="11" fill="#bf0a30"/><polygon points="5.3,6.5 6.5,10.2 10.3,10.2 7.2,12.5 8.4,16.2 5.3,13.9 2.2,16.2 3.4,12.5 0.3,10.2 4.1,10.2" fill="#ffffff"/></svg></span>';
  }
  if (cName === 'Шотландия') {
    return '<span class="c-flag custom-flag" title="Шотландия"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="32" height="22" fill="#005eb8"/><line x1="0" y1="0" x2="32" y2="22" stroke="#ffffff" stroke-width="3.2"/><line x1="0" y1="22" x2="32" y2="0" stroke="#ffffff" stroke-width="3.2"/></svg></span>';
  }
  if (cName === 'Квебек') {
    return '<span class="c-flag custom-flag" title="Квебек"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="32" height="22" fill="#003399"/><rect x="14" width="4" height="22" fill="#ffffff"/><rect y="9" width="32" height="4" fill="#ffffff"/></svg></span>';
  }
  if (cName === 'Чечня' || cName === 'Чеченская Республика') {
    return '<span class="c-flag custom-flag" title="Чечня"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="32" height="12" fill="#008a00"/><rect y="12" width="32" height="2.2" fill="#ffffff"/><rect y="14.2" width="32" height="7.8" fill="#d22730"/><rect width="5.5" height="22" fill="#ffffff"/><path d="M2.7 2 v18 M1.2 5 h3 M1.2 11 h3 M1.2 17 h3" stroke="#d2aa00" stroke-width="0.9"/></svg></span>';
  }
  if (cName === 'Курдистан' || cName === 'Иракский Курдистан') {
    return '<span class="c-flag custom-flag" title="Курдистан"><svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '"><rect width="32" height="7.33" fill="#e4181c"/><rect y="7.33" width="32" height="7.33" fill="#ffffff"/><rect y="14.66" width="32" height="7.34" fill="#1b9a2c"/><circle cx="16" cy="11" r="3.2" fill="#ffcc00"/></svg></span>';
  }

  const code = emojiToCountryCode(flagStr);

  // Кастомные флаги с точными пропорциями (Беларусь, Швейцария, Ватикан)
  if (cName === 'Беларусь' || code === 'by') {
    return (
      '<span class="c-flag custom-flag" title="Беларусь">' +
        '<svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '">' +
          '<rect width="32" height="14.67" fill="#d22730"/>' +
          '<rect y="14.67" width="32" height="7.33" fill="#009739"/>' +
          '<rect width="7.4" height="22" fill="#ffffff"/>' +
          '<g fill="#d22730">' +
            '<path d="M3.7 0.8 L6.2 3.3 L3.7 5.8 L1.2 3.3 Z M3.7 5.8 L6.2 8.3 L3.7 10.8 L1.2 8.3 Z M3.7 10.8 L6.2 13.3 L3.7 15.8 L1.2 13.3 Z M3.7 15.8 L6.2 18.3 L3.7 20.8 L1.2 18.3 Z"/>' +
            '<path d="M3.7 3.3 L4.7 4.3 L3.7 5.3 L2.7 4.3 Z M3.7 8.3 L4.7 9.3 L3.7 10.3 L2.7 9.3 Z M3.7 13.3 L4.7 14.3 L3.7 15.3 L2.7 14.3 Z M3.7 18.3 L4.7 19.3 L3.7 20.3 L2.7 19.3 Z" fill="#ffffff"/>' +
            '<line x1="0.6" y1="0" x2="0.6" y2="22" stroke="#d22730" stroke-width="0.8"/>' +
            '<line x1="6.8" y1="0" x2="6.8" y2="22" stroke="#d22730" stroke-width="0.8"/>' +
          '</g>' +
        '</svg>' +
      '</span>'
    );
  }
  if (cName === 'Швейцария' || code === 'ch') {
    return (
      '<span class="c-flag custom-flag" title="Швейцария">' +
        '<svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '">' +
          '<rect width="32" height="22" fill="#d52b1e"/>' +
          '<rect x="14" y="3.5" width="4" height="15" fill="#ffffff" rx="0.5"/>' +
          '<rect x="8.5" y="9" width="15" height="4" fill="#ffffff" rx="0.5"/>' +
        '</svg>' +
      '</span>'
    );
  }
  if (cName === 'Ватикан' || code === 'va') {
    return (
      '<span class="c-flag custom-flag" title="Ватикан">' +
        '<svg class="c-flag-svg" viewBox="0 0 32 22" width="' + w + '" height="' + h + '">' +
          '<rect width="16" height="22" fill="#ffe000"/>' +
          '<rect x="16" width="16" height="22" fill="#ffffff"/>' +
          '<g transform="translate(17.5, 2) scale(0.48)">' +
            '<path d="M13 1 C10 1 7 4 7 8 C7 10 9 12 13 12 C17 12 19 10 19 8 C19 4 16 1 13 1 Z" fill="#ffffff" stroke="#cfa320" stroke-width="1.2"/>' +
            '<path d="M7 6 Q13 8 19 6 M7 9 Q13 11 19 9 M8 12 Q13 14 18 12" stroke="#d4af37" stroke-width="1.3" fill="none"/>' +
            '<circle cx="13" cy="1" r="1.2" fill="#ffd700"/>' +
            '<path d="M6 28 L20 14 M7 29 A2 2 0 1 0 5 25" stroke="#d4af37" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
            '<path d="M20 28 L6 14 M19 29 A2 2 0 1 1 21 25" stroke="#a0aab0" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
            '<path d="M18 12 L21 15 M19 13 L22 16" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round"/>' +
            '<path d="M8 12 L5 15 M7 13 L4 16" stroke="#a0aab0" stroke-width="1.5" stroke-linecap="round"/>' +
            '<circle cx="13" cy="21" r="2.2" fill="#d32f2f"/>' +
            '<path d="M13 22 Q9 25 7 27 M13 22 Q17 25 19 27" stroke="#d32f2f" stroke-width="1.2" fill="none"/>' +
          '</g>' +
        '</svg>' +
      '</span>'
    );
  }

  if (code) {
    return (
      '<span class="c-flag">' +
        '<img class="c-flag-img" src="https://flagcdn.com/' + code + '.svg" width="' + w + '" height="' + h + '" alt="' + esc(cName || code) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'inline\';">' +
        '<span class="flag-fallback" style="display:none">' + esc(flagStr) + '</span>' +
      '</span>'
    );
  }

  return '<span class="c-flag"><span class="flag-fallback">' + esc(flagStr) + '</span></span>';
}

export const renderFlag = getFlagHtml;

export function seasonCard(o) {
  SEASON_ITEMS.set(o.key, o);
  SEASON_DATA_STORE[o.key] = o;
  const pm = o.playerId ? playerMeta(o.playerId) : null;
  const isTaken = o.isTaken || pm != null || (o.data && o.data.isTaken);
  const right = pm
    ? '<span class="player-chip"><img src="' + pm.avatar + '" alt="">' + esc(pm.name) + '</span>'
    : (isTaken
        ? '<span class="badge-taken">АКТИВНО</span>'
        : '<span class="badge-free">СВОБОДНО</span>');

  return (
    '<div class="c-card reveal-on-scroll odyssey-item" data-season-key="' + esc(o.key) + '" role="button" tabindex="0" onclick="window.openSeasonModal(\'' + esc(o.key) + '\')" aria-label="' + esc(o.name) + ' — открыть подробности">' +
      o.flagHtml +
      '<div class="c-info">' +
        '<div class="c-name">' + esc(o.name) + '</div>' +
        '<div class="c-sub">' + esc(o.continent || '') + (o.typeLabel ? ' · ' + o.typeLabel : '') + '</div>' +
      '</div>' +
      right +
      '<span class="c-open-btn" aria-hidden="true" title="Подробнее">' +
        '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      '</span>' +
    '</div>'
  );
}

export function renderCategoryHeader(title, subtitle, iconId, count) {
  return (
    '<div class="category-header reveal-on-scroll odyssey-item">' +
      '<div class="category-title-group">' +
        '<span class="category-icon"><svg class="ic"><use href="#' + iconId + '"/></svg></span>' +
        '<div>' +
          '<h2 class="category-title">' + esc(title) + '</h2>' +
          '<div class="category-desc">' + esc(subtitle) + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="category-badge">' + count + '</span>' +
    '</div>'
  );
}

export function renderEmptyCategory(iconId, text, subtext) {
  return (
    '<div class="category-empty reveal-on-scroll odyssey-item">' +
      '<div class="category-empty-icon"><svg class="ic"><use href="#' + iconId + '"/></svg></div>' +
      '<div class="category-empty-text">' +
        '<b>' + esc(text) + '</b>' +
        '<span>' + esc(subtext) + '</span>' +
      '</div>' +
    '</div>'
  );
}

export function openSeasonModal(key) {
  const o = SEASON_ITEMS.get(key) || SEASON_DATA_STORE[key];
  if (!o) return;

  const modal = document.getElementById('seasonModal');
  const content = document.getElementById('seasonModalContent');
  if (!modal || !content) return;

  const d = o.data || {};
  const pm = o.playerId ? playerMeta(o.playerId) : null;
  const isTaken = o.isTaken || pm != null || (d && d.isTaken);
  const isFree = !isTaken;
  const flagSource = o.flag || d.flag || (o.data && o.data.flag) || '';
  const largeFlag = getFlagHtml(flagSource, o.name, true);

  let html = '';
  // Шапка карточки в модалке (только флаг, название и слева статус)
  html += '<div class="modal-header-card">';
  html += '<div class="modal-flag-wrap">' + (o.flagHtml && o.flagHtml.includes('c-ic') ? o.flagHtml : largeFlag) + '</div>';
  html += '<div class="modal-title-area">';
  html += '<h3 id="modalCardTitle">' + esc(o.name) + '</h3>';
  html += '<div class="modal-tags">';
  if (o.typeLabel) html += '<span class="modal-tag">' + esc(o.typeLabel) + '</span>';
  html += isFree
    ? '<span class="badge-free modal-status-badge">СВОБОДНО</span>'
    : (pm
        ? '<span class="player-chip modal-player-chip"><img src="' + pm.avatar + '" alt="">' + esc(pm.name) + '</span>'
        : '<span class="badge-taken modal-status-badge">АКТИВНО</span>');
  html += '</div></div></div>';

  if (d.isPMC) {
    // Карточка ЧВК
    html += '<div class="modal-grid-stats">';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.balance + ' Капитал ЧВК</span><span class="modal-stat-value accent">' + fmtNum(d.capital) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.population + ' Личный состав</span><span class="modal-stat-value">' + fmtNum(d.personnel) + ' бойцов</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.flag + ' Базирование</span><span class="modal-stat-value">' + esc(d.host_country) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.resource + ' Боеготовность</span><span class="modal-stat-value accent">' + esc(d.readiness || '100%') + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.gdp + ' Ставка контракта</span><span class="modal-stat-value">' + esc(d.contract_rate || 'Договорная') + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.support + ' Лояльность / рейтинг</span><span class="modal-stat-value">' + (d.support != null ? d.support.toFixed(1) : '90.0') + '%</span></div>';
    html += '</div>';

    if (isFree) {
      html += '<div class="modal-callout">';
      html += '<div class="modal-callout-icon">' + MODAL_ICONS.swords + '</div>';
      html += '<div class="modal-callout-body">';
      html += '<h4>Организация свободна для регистрации в Сезоне 28</h4>';
      html += '<p>Возглавьте эту организацию или частную военную компанию, выполняйте контракты правительств, защищайте инфраструктуру или ведите геополитические спецоперации. Подайте заявку на сервере Discord.</p>';
      html += '<a class="cta fill" href="https://discord.gg/edPpSRmRNu" target="_blank" rel="noopener"><svg class="ic"><use href="#i-discord"/></svg>Подать заявку в Discord</a>';
      html += '</div></div>';
    } else {
      html += '<div class="modal-callout active-callout">';
      html += '<div class="modal-callout-icon">' + MODAL_ICONS.swords + '</div>';
      html += '<div class="modal-callout-body">';
      html += '<h4>Организация активна в Сезоне 28</h4>';
      html += '<p>Данная организация уже зарегистрирована и принимает активное участие в геополитических событиях текущего сезона.</p>';
      html += '</div></div>';
    }

    if (d.specialization || d.equipment) {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title"><svg class="ic"><use href="#i-shield"/></svg>Профиль деятельности и оснащение</div>';
      html += '<div class="d-grid">';
      if (d.specialization) html += kvRow('Специализация', esc(d.specialization));
      if (d.equipment) html += kvRow('Вооружение и техника', esc(d.equipment));
      html += '</div></div>';
    }
  } else if (d.isAutonomy) {
    // Карточка автономии
    html += '<div class="modal-grid-stats">';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.gdp + ' ВВП региона</span><span class="modal-stat-value accent">' + fmtNum(d.gdp) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.population + ' Население</span><span class="modal-stat-value">' + fmtNum(d.population) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.flag + ' Метрополия</span><span class="modal-stat-value">' + esc(d.host_country) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.resource + ' Ресурсный индекс</span><span class="modal-stat-value">' + (d.resource_index || 7) + ' / 10</span></div>';
    if (d.birth_rate != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.birth + ' Рождаемость</span><span class="modal-stat-value">' + d.birth_rate + ' ‰</span></div>';
    if (d.support != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.support + ' Поддержка автономии</span><span class="modal-stat-value">' + d.support.toFixed(1) + '%</span></div>';
    html += '</div>';

    if (isFree) {
      html += '<div class="modal-callout">';
      html += '<div class="modal-callout-icon">' + MODAL_ICONS.sparkles + '</div>';
      html += '<div class="modal-callout-body">';
      html += '<h4>Автономия свободна для регистрации в Сезоне 28</h4>';
      html += '<p>Возьмите под управление данный автономный регион, развивайте локальную экономику, ведите переговоры с метрополией или расширяйте полномочия суверенитета. Подайте заявку на сервере Discord.</p>';
      html += '<a class="cta fill" href="https://discord.gg/edPpSRmRNu" target="_blank" rel="noopener"><svg class="ic"><use href="#i-discord"/></svg>Подать заявку в Discord</a>';
      html += '</div></div>';
    }

    if (d.status || d.capital) {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title"><svg class="ic"><use href="#i-landmark"/></svg>Политический статус</div>';
      html += '<div class="d-grid">';
      if (d.status) html += kvRow('Статус', esc(d.status));
      if (d.capital) html += kvRow('Административный центр', esc(d.capital));
      html += '</div></div>';
    }
  } else {
    // Карточка суверенного государства
    html += '<div class="modal-grid-stats">';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.gdp + ' ВВП</span><span class="modal-stat-value accent">' + fmtNum(d.gdp != null ? d.gdp : d.base_gdp) + '</span></div>';
    html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.population + ' Население</span><span class="modal-stat-value">' + fmtNum(d.population) + '</span></div>';
    if (d.birth_rate != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.birth + ' Рождаемость</span><span class="modal-stat-value">' + d.birth_rate + ' ‰</span></div>';
    if (d.resource_index != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.resource + ' Ресурсный индекс</span><span class="modal-stat-value">' + d.resource_index + ' / 10</span></div>';
    if (d.balance != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.balance + ' Казна (баланс)</span><span class="modal-stat-value accent">' + fmtNum(d.balance) + '</span></div>';
    if (d.support != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.support + ' Поддержка населения</span><span class="modal-stat-value">' + d.support.toFixed(1) + '%</span></div>';
    if (d.corruption != null) html += '<div class="modal-stat-box"><span class="modal-stat-label">' + MODAL_ICONS.corruption + ' Уровень коррупции</span><span class="modal-stat-value">' + d.corruption.toFixed(1) + '%</span></div>';
    html += '</div>';

    if (isFree) {
      html += '<div class="modal-callout">';
      html += '<div class="modal-callout-icon">' + MODAL_ICONS.sparkles + '</div>';
      html += '<div class="modal-callout-body">';
      html += '<h4>Государство свободно для регистрации в Сезоне 28</h4>';
      html += '<p>Вы можете занять это государство и возглавить его развитие. Перейдите на наш Discord-сервер, выберите страну и подайте заявку.</p>';
      html += '<a class="cta fill" href="https://discord.gg/edPpSRmRNu" target="_blank" rel="noopener"><svg class="ic"><use href="#i-discord"/></svg>Подать заявку в Discord</a>';
      html += '</div></div>';
    } else {
      html += '<div class="modal-section">';
      html += '<div class="modal-section-title"><svg class="ic"><use href="#i-landmark"/></svg>Политическое устройство и экономика</div>';
      html += '<div class="d-grid">';
      if (d.ideology) {
        html += kvRow('Гос. строй', esc(d.ideology.state || '—'));
        html += kvRow('Экономика', esc(d.ideology.economy || '—'));
      }
      if (d.specialization) html += kvRow('Специализация', SPEC_NAMES[d.specialization] || esc(d.specialization));
      if (d.taxes) html += kvRow('Налоги', 'НДС ' + d.taxes.nds + '% · НДФЛ ' + d.taxes.ndfl + '%');
      html += '</div></div>';

      if (d.alliance_type && (d.alliance_type.military || d.alliance_type.economic || d.alliance_type.intergovernmental)) {
        html += '<div class="modal-section">';
        html += '<div class="modal-section-title"><svg class="ic"><use href="#i-shield"/></svg>Альянсы и блоки</div>';
        html += '<div class="d-grid">';
        if (d.alliance_type.military) html += kvRow('Военный блок', esc(d.alliance_type.military));
        if (d.alliance_type.economic) html += kvRow('Экон. блок', esc(d.alliance_type.economic));
        if (d.alliance_type.intergovernmental) html += kvRow('Межправительственный', esc(d.alliance_type.intergovernmental));
        html += '</div></div>';
      }

      if (d.shield) {
        html += '<div class="modal-section">';
        html += '<div class="modal-section-title"><svg class="ic"><use href="#i-shield"/></svg>Защита</div>';
        html += '<div class="d-grid">';
        html += kvRow('Щит активен до', new Date(d.shield).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }));
        html += '</div></div>';
      }
    }
  }

  content.innerHTML = html;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeSeasonModal() {
  const modal = document.getElementById('seasonModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

export function openCountryModal(key) {
  openSeasonModal(key);
}

export function closeCountryModal() {
  closeSeasonModal();
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
    let seasonData = null;
    try {
      const s28 = await fetchJson('data/seasons/season-28.json');
      if (s28 !== null && typeof s28 === 'object') seasonData = s28;
    } catch (err28) {
      console.warn('[Global Lens] season-28 data fetch:', err28);
    }

    if (seasonData === null) {
      try {
        const s26 = await fetchJson('data/seasons/season-26.json');
        if (s26) seasonData = s26;
      } catch (err26) {}
    }

    let countriesData = {};
    try {
      countriesData = await fetchJson('countries2014.json');
    } catch (errC) {
      console.warn('[Global Lens] countries2014.json fallback:', errC);
      countriesData = {};
    }

    return [seasonData || {}, countriesData || {}];
  }
}

let currentFreeTab = 'countries'; // 'countries' | 'pmc' | 'autonomies'

export async function loadSeason() {
  const body = document.getElementById('seasonBody');
  if (!body) return;
  body.classList.remove('loading');
  body.style.boxShadow = 'none';
  body.style.animation = 'none';

  try {
    const [seasonRaw, countriesRaw] = await fetchSeasonData();
    const C = trimDeep(countriesRaw), S = trimDeep(seasonRaw);
    for (const [k, v] of Object.entries(C)) {
      if (v && typeof v === 'object') v.name = k;
    }

    const states = [], orgs = [], autos = [];
    for (const [id, p] of Object.entries(S)) {
      if (!p || typeof p !== 'object' || !p.country) continue;
      const cc = C[p.country] || {};
      const flagStr = cc.flag || p.flag || '';
      if (p.type === 'country' || !p.type) {
        states.push({
          key: 'p' + id,
          name: p.country,
          flag: flagStr,
          flagHtml: getFlagHtml(flagStr, p.country),
          continent: p.continent || cc.continent || 'Прочие',
          typeLabel: 'Государство',
          itemType: 'country',
          data: p,
          playerId: id,
          isTaken: true
        });
      } else if (p.type === 'organization') {
        orgs.push({
          key: 'p' + id,
          name: p.country,
          flag: p.flag || '',
          flagHtml: p.flag ? getFlagHtml(p.flag, p.host_country || p.country) : '<span class="c-flag c-ic"><svg class="ic"><use href="#i-shield"/></svg></span>',
          continent: (C[p.host_country] || {}).continent || '',
          typeLabel: 'Организация' + (p.org_type ? ' · ' + p.org_type : ''),
          itemType: 'pmc',
          data: p,
          playerId: id,
          isTaken: true
        });
      } else if (p.type === 'autonomy') {
        autos.push({
          key: 'p' + id,
          name: p.country,
          flag: (C[p.host_country] || {}).flag || flagStr,
          flagHtml: getFlagHtml((C[p.host_country] || {}).flag || flagStr, p.country),
          continent: (C[p.host_country] || {}).continent || '',
          typeLabel: 'Автономия · ' + (p.host_country || ''),
          itemType: 'autonomy',
          data: p,
          playerId: id,
          isTaken: true
        });
      }
    }

    const ru = (a, b) => a.name.localeCompare(b.name, 'ru');
    states.sort(ru);
    orgs.sort(ru);
    autos.sort(ru);

    const takenStates = new Set(states.map(s => s.name));
    const takenOrgs = new Set(orgs.map(o => o.name));
    const takenAutos = new Set(autos.map(a => a.name));

    const FREE_COUNTRIES_LIST = Object.values(C).filter(c => c && c.name && !takenStates.has(c.name)).map(c => ({
      key: 'f_' + c.name,
      name: c.name,
      flag: c.flag,
      flagHtml: getFlagHtml(c.flag, c.name),
      continent: c.continent || 'Прочие',
      typeLabel: '',
      itemType: 'country',
      data: c,
      playerId: null
    }));

    const PMC_AND_ORGS_LIST = PMC_AND_ORGS.map(p => {
      const taken = p.isTaken || takenOrgs.has(p.name);
      return {
        ...p,
        isTaken: taken,
        flagHtml: getFlagHtml(p.flag, p.name),
        playerId: null
      };
    });
    const freeOrgsCount = PMC_AND_ORGS_LIST.filter(p => !p.isTaken).length;

    const FREE_AUTONOMIES_LIST = FREE_AUTONOMIES.filter(a => !takenAutos.has(a.name)).map(a => ({
      ...a,
      flagHtml: getFlagHtml(a.flag, a.name),
      playerId: null
    }));

    if (!getMapInfo()) {
      countUpAll('countries', states.length);
      countUpAll('orgs', orgs.length);
      countUpAll('autos', autos.length);
    }

    const statesHtml = states.length
      ? '<div class="grid-3 season-grid" style="margin-bottom:28px">' + states.map(seasonCard).join('') + '</div>'
      : renderEmptyCategory('i-globe', 'В Сезоне 28 пока нет зарегистрированных государств', 'Все государства свободны для выбора в каталоге ниже.');

    const orgsHtml = orgs.length
      ? '<div class="grid-3 season-grid" style="margin-bottom:28px">' + orgs.map(seasonCard).join('') + '</div>'
      : renderEmptyCategory('i-shield', 'Организации ещё не основаны', 'Игроки могут создавать альянсы и блоки в процессе игры.');

    const autosHtml = autos.length
      ? '<div class="grid-3 season-grid" style="margin-bottom:28px">' + autos.map(seasonCard).join('') + '</div>'
      : renderEmptyCategory('i-map', 'Автономии пока отсутствуют', 'Автономии могут появляться по ходу развития геополитики сезона.');

    body.innerHTML =
      renderCategoryHeader('Государства', 'Суверенные страны под управлением участников', 'i-globe', states.length) +
      statesHtml +
      renderCategoryHeader('Организации', 'Международные блоки, альянсы и объединения', 'i-shield', orgs.length) +
      orgsHtml +
      renderCategoryHeader('Автономии', 'Территории с особым статусом и автономии', 'i-map', autos.length) +
      autosHtml +
      '<div class="category-header reveal-on-scroll odyssey-item">' +
        '<div class="category-title-group">' +
          '<span class="category-icon" id="freeCategoryIcon"><svg class="ic"><use href="#i-globe"/></svg></span>' +
          '<div>' +
            '<h2 class="category-title" id="freeCategoryTitle">Свободные страны</h2>' +
            '<div class="category-desc" id="freeCategoryDesc">Доступны для регистрации участников в Сезоне 28</div>' +
          '</div>' +
        '</div>' +
        '<span class="category-badge" id="freeCategoryBadge">' + FREE_COUNTRIES_LIST.length + '</span>' +
      '</div>' +
      '<div class="free-tabs-nav reveal-on-scroll odyssey-item" role="tablist" aria-label="Категории доступных для регистрации объектов">' +
        '<button class="free-tab active" data-tab="countries" role="tab" aria-selected="true">' +
          '<svg class="ic"><use href="#i-globe"/></svg>' +
          '<span>Свободные страны</span>' +
          '<span class="free-tab-count" id="tabCountCountries">' + FREE_COUNTRIES_LIST.length + '</span>' +
        '</button>' +
        '<button class="free-tab" data-tab="pmc" role="tab" aria-selected="false">' +
          '<svg class="ic"><use href="#i-swords"/></svg>' +
          '<span>ЧВК и Организации</span>' +
          '<span class="free-tab-count" id="tabCountPMC">' + freeOrgsCount + '</span>' +
        '</button>' +
        '<button class="free-tab" data-tab="autonomies" role="tab" aria-selected="false">' +
          '<svg class="ic"><use href="#i-map"/></svg>' +
          '<span>Свободные автономии</span>' +
          '<span class="free-tab-count" id="tabCountAutonomies">' + FREE_AUTONOMIES_LIST.length + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="search-wrap reveal-on-scroll odyssey-item">' +
        '<svg class="ic"><use href="#i-search"/></svg>' +
        '<input id="catalogSearch" class="search-input" type="text" placeholder="Поиск страны..." aria-label="Поиск по каталогу">' +
      '</div>' +
      '<div id="freeCatalogList"></div>';

    function renderCatalog(q) {
      q = (q || '').trim().toLowerCase();
      const container = document.getElementById('freeCatalogList');
      const hdrBadge = document.getElementById('freeCategoryBadge');
      const hdrTitle = document.getElementById('freeCategoryTitle');
      const hdrDesc = document.getElementById('freeCategoryDesc');
      const hdrIcon = document.getElementById('freeCategoryIcon');
      if (!container) return;

      if (currentFreeTab === 'countries') {
        if (hdrTitle) hdrTitle.textContent = 'Свободные страны';
        if (hdrDesc) hdrDesc.textContent = 'Доступны для регистрации участников в Сезоне 28';
        if (hdrIcon) hdrIcon.innerHTML = '<svg class="ic"><use href="#i-globe"/></svg>';
        const list = FREE_COUNTRIES_LIST.filter(c => !q || (c.name && c.name.toLowerCase().includes(q)));
        if (hdrBadge) hdrBadge.textContent = list.length;

        const by = {};
        list.forEach(c => { (by[c.continent] = by[c.continent] || []).push(c); });
        const order = ['Европа', 'Азия', 'Африка', 'Северная Америка', 'Южная Америка', 'Австралия и Океания'];
        const conts = Object.keys(by).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

        container.innerHTML = conts.length
          ? conts.map(cont =>
              '<div class="continent-header-bar reveal-on-scroll odyssey-item">' +
                '<div class="continent-badge-icon"><svg class="ic"><use href="#i-globe"/></svg></div>' +
                '<div class="continent-title-wrap">' +
                  '<h3 class="continent-name">' + esc(cont.toUpperCase()) + '</h3>' +
                  '<span class="continent-count">' + pluralCountries(by[cont].length) + '</span>' +
                '</div>' +
                '<div class="continent-divider-line"></div>' +
              '</div>' +
              '<div class="grid-3 season-grid" style="margin-bottom:28px">' + by[cont].sort(ru).map(seasonCard).join('') + '</div>'
            ).join('')
          : '<p class="loading">Ничего не найдено по вашему запросу.</p>';
      } else if (currentFreeTab === 'pmc') {
        if (hdrTitle) hdrTitle.textContent = 'Организации и ЧВК';
        if (hdrDesc) hdrDesc.textContent = 'Государственные, частные военные компании и международные организации';
        if (hdrIcon) hdrIcon.innerHTML = '<svg class="ic"><use href="#i-shield"/></svg>';
        const list = PMC_AND_ORGS_LIST.filter(p => !q ||
          p.name.toLowerCase().includes(q) ||
          (p.host_country && p.host_country.toLowerCase().includes(q)) ||
          (p.org_category && p.org_category.toLowerCase().includes(q)) ||
          (p.data && p.data.specialization && p.data.specialization.toLowerCase().includes(q))
        );
        if (hdrBadge) hdrBadge.textContent = list.length;

        const by = {};
        list.forEach(p => {
          const cat = p.org_category || 'Частные организации';
          (by[cat] = by[cat] || []).push(p);
        });
        const order = ['Государственные организации', 'Частные организации', 'Международные организации'];
        const cats = Object.keys(by).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

        container.innerHTML = cats.length
          ? cats.map(cat =>
              '<div class="continent-header-bar reveal-on-scroll odyssey-item">' +
                '<div class="continent-badge-icon"><svg class="ic"><use href="#i-shield"/></svg></div>' +
                '<div class="continent-title-wrap">' +
                  '<h3 class="continent-name">' + esc(cat.toUpperCase()) + '</h3>' +
                  '<span class="continent-count">' + pluralOrgs(by[cat].length) + '</span>' +
                '</div>' +
                '<div class="continent-divider-line"></div>' +
              '</div>' +
              '<div class="grid-3 season-grid" style="margin-bottom:28px">' + by[cat].map(seasonCard).join('') + '</div>'
            ).join('')
          : '<p class="loading">Ничего не найдено по вашему запросу.</p>';
      } else if (currentFreeTab === 'autonomies') {
        if (hdrTitle) hdrTitle.textContent = 'Свободные автономии';
        if (hdrDesc) hdrDesc.textContent = 'Регионы и территории с особым статусом для регистрации участников';
        if (hdrIcon) hdrIcon.innerHTML = '<svg class="ic"><use href="#i-map"/></svg>';
        const list = FREE_AUTONOMIES_LIST.filter(a => !q ||
          a.name.toLowerCase().includes(q) ||
          (a.host_country && a.host_country.toLowerCase().includes(q)) ||
          (a.group_category && a.group_category.toLowerCase().includes(q)) ||
          (a.data && a.data.status && a.data.status.toLowerCase().includes(q)) ||
          (a.data && a.data.specialization && a.data.specialization.toLowerCase().includes(q))
        );
        if (hdrBadge) hdrBadge.textContent = list.length;

        const by = {};
        list.forEach(a => {
          const grp = a.group_category || 'Другие государства';
          (by[grp] = by[grp] || []).push(a);
        });
        const order = ['Россия', 'Китай', 'США', 'Другие государства'];
        const grps = Object.keys(by).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

        container.innerHTML = grps.length
          ? grps.map(grp =>
              '<div class="continent-header-bar reveal-on-scroll odyssey-item">' +
                '<div class="continent-badge-icon"><svg class="ic"><use href="#i-map"/></svg></div>' +
                '<div class="continent-title-wrap">' +
                  '<h3 class="continent-name">' + esc(grp.toUpperCase()) + '</h3>' +
                  '<span class="continent-count">' + pluralAutonomies(by[grp].length) + '</span>' +
                '</div>' +
                '<div class="continent-divider-line"></div>' +
              '</div>' +
              '<div class="grid-3 season-grid" style="margin-bottom:28px">' + by[grp].map(seasonCard).join('') + '</div>'
            ).join('')
          : '<p class="loading">Ничего не найдено по вашему запросу.</p>';
      }

      refreshOdysseyElements(container);
    }

    function setFreeTab(tab) {
      if (tab === currentFreeTab) return;
      currentFreeTab = tab;
      const tabBtns = document.querySelectorAll('.free-tab[data-tab]');
      tabBtns.forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      const input = document.getElementById('catalogSearch');
      if (input) {
        if (tab === 'countries') input.placeholder = 'Поиск страны...';
        else if (tab === 'pmc') input.placeholder = 'Поиск организации или ЧВК (название, страна)...';
        else if (tab === 'autonomies') input.placeholder = 'Поиск автономии (название, метрополия)...';
        renderCatalog(input.value);
      } else {
        renderCatalog('');
      }
    }

    document.querySelectorAll('.free-tab[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => setFreeTab(btn.dataset.tab));
    });

    renderCatalog('');
    const se = document.getElementById('catalogSearch');
    if (se) {
      se.addEventListener('input', debounce(e => renderCatalog(e.target.value), 120));
    }

    refreshOdysseyElements(body);
  } catch (e) {
    console.error('[Global Lens] Ошибка загрузки сезона:', e);
    body.innerHTML = '<p class="loading">' + esc(e.message) + '</p>';
  }
}

// Глобальные методы для обратной совместимости
window.openSeasonModal = openSeasonModal;
window.closeSeasonModal = closeSeasonModal;
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;

// Делегированные обработчики модального окна сезона
document.addEventListener('click', e => {
  const card = e.target.closest('.c-card[data-season-key]');
  if (card) {
    openSeasonModal(card.dataset.seasonKey);
    return;
  }
  if (e.target.closest('#seasonModalClose') || (e.target && (e.target.id === 'seasonModalBackdrop' || e.target.id === 'seasonModal'))) {
    closeSeasonModal();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSeasonModal();
});
