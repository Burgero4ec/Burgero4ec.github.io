/**
 * js/alliances.js - Модуль военно-политических и экономических альянсов Global Lens (Сезон 31)
 */
import { esc, fmtNum, normName } from './utils.js';
import { renderFlag } from './season.js';

export const ALLIANCES_MASTER = [
  {
    tag: 'ODTO',
    name: 'ОДТО',
    fullName: 'Организация Договора Тихоокеанской Обороны',
    type: 'Военно-политический',
    color: '#06b6d4',
    pillClass: 'cyan',
    icon: '🛡️',
    leader: 'Индия',
    leaderFlag: '🇮🇳',
    defaultMembers: ['Индия', 'Южная Корея', 'Австралия', 'Тайвань'],
    description: 'Ключевой тихоокеанский пакт коллективной обороны и безопасности, сформированный для сдерживания гегемонии в океанических акваториях и защиты союзников в Азиатско-Тихоокеанском регионе.'
  },
  {
    tag: 'PEC',
    name: 'ТЭС',
    fullName: 'Тихоокеанское экономическое сообщество (PEC)',
    type: 'Экономический',
    color: '#10b981',
    pillClass: 'emerald',
    icon: '🌐',
    leader: 'Индия',
    leaderFlag: '🇮🇳',
    defaultMembers: ['Индия', 'Австралия', 'Тайвань'],
    description: 'Экономический альянс The Fire Rises, учреждённый Индией как финансовое дополнение к ОДТО. Включает Инвестиционный банк развития ($20 млрд капитал), беспошлинный технопояс «Китай + 1» (0% налог на 10 лет) и прямую мультивалютную клиринговую систему PEC-Clear.'
  },
  {
    tag: 'NATO',
    name: 'НАТО',
    fullName: 'Североатлантический альянс (NATO)',
    type: 'Военно-политический',
    color: '#3b82f6',
    pillClass: 'blue',
    icon: '⚔️',
    leader: 'США',
    leaderFlag: '🇺🇸',
    defaultMembers: ['США'],
    description: 'Трансатлантический военно-политический союз коллективной безопасности, объединяющий ведущие державы западного полушария.'
  },
  {
    tag: 'EU',
    name: 'ЕС',
    fullName: 'Европейский союз',
    type: 'Экономический и политический',
    color: '#eab308',
    pillClass: 'yellow',
    icon: '⭐',
    leader: 'Германия',
    leaderFlag: '🇩🇪',
    defaultMembers: ['Германия', 'Ирландия', 'Испания', 'Великобритания', 'Турция'],
    description: 'Наднациональное экономическое и политическое объединение европейских государств с общим внутренним рынком, едиными таможенными правилами и координацией внешней политики.'
  },
  {
    tag: 'SCO',
    name: 'ШОС',
    fullName: 'Шанхайская организация сотрудничества',
    type: 'Военно-политический',
    color: '#ef4444',
    pillClass: 'red',
    icon: '🤝',
    leader: 'КНР',
    leaderFlag: '🇨🇳',
    defaultMembers: ['КНР', 'Россия', 'Азербайджан', 'Сирия', 'Иран', 'Индия'],
    description: 'Евразийский политический, экономический альянс и блок безопасности, нацеленный на противодействие терроризму, обеспечение стабильности и координацию ресурсных коридоров.'
  },
  {
    tag: 'BRICS',
    name: 'БРИКС',
    fullName: 'Межгосударственное объединение БРИКС',
    type: 'Экономический',
    color: '#f59e0b',
    pillClass: 'amber',
    icon: '🏛️',
    leader: 'КНР',
    leaderFlag: '🇨🇳',
    defaultMembers: ['КНР', 'Россия'],
    description: 'Межгосударственное объединение крупнейших развивающихся экономик, нацеленное на дедолларизацию расчётов, финансирование инфраструктуры через пул резервов и многополярную модель.'
  },
  {
    tag: 'AXIS',
    name: 'Ось Сопротивления',
    fullName: 'Ось Сопротивления',
    type: 'Военно-политический',
    color: '#f97316',
    pillClass: 'orange',
    icon: '🔥',
    leader: 'Иран',
    leaderFlag: '🇮🇷',
    defaultMembers: ['Иран', 'Сирия'],
    description: 'Региональная коалиция Ближнего Востока антизападной и антиимпериалистической направленности, ведущая асимметричную координацию и взаимную военную поддержку.'
  },
  {
    tag: 'CSTO',
    name: 'ОДКБ',
    fullName: 'Организация Договора о коллективной безопасности',
    type: 'Военный',
    color: '#e11d48',
    pillClass: 'ruby',
    icon: '🛡️',
    leader: 'Россия',
    leaderFlag: '🇷🇺',
    defaultMembers: ['Россия', 'Сирия'],
    description: 'Региональная военно-политическая организация коллективной безопасности на постсоветском пространстве с взаимными гарантиями защиты суверенитета.'
  }
];

export const ALLIANCE_LOOKUP = {};
for (const a of ALLIANCES_MASTER) {
  ALLIANCE_LOOKUP[a.name.toLowerCase()] = a;
  ALLIANCE_LOOKUP[a.tag.toLowerCase()] = a;
}

/**
 * Подсчёт агрегированных показателей альянсов на основе активных стран сезона
 */
export function computeAlliancesData(seasonEntities = {}, countriesData = {}) {
  const result = [];
  const entitiesList = Object.values(seasonEntities).filter(e => e && e.country);

  for (const master of ALLIANCES_MASTER) {
    const item = { ...master };
    const membersMap = new Map();

    // 1. Сначала добавляем дефолтных участников
    for (const mName of master.defaultMembers) {
      membersMap.set(normName(mName), {
        name: mName,
        flag: countriesData[mName]?.flag || '🏳️',
        gdp: countriesData[mName]?.gdp || 0,
        population: countriesData[mName]?.population || 0,
        player: null,
        isLeader: (normName(mName) === normName(master.leader))
      });
    }

    // 2. Обогащаем реальными данными из активных сущностей сезона
    for (const ent of entitiesList) {
      const cName = ent.country;
      const cNorm = normName(cName);
      const roles = (ent.roles || []).map(r => (typeof r === 'string' ? r : (r && r.name) || '')).filter(Boolean);

      let belongs = membersMap.has(cNorm);
      let isLeaderOfThis = false;

      for (const r of roles) {
        if (r.startsWith('Лидер: ')) {
          const lTarget = r.replace('Лидер: ', '').trim();
          if (normName(lTarget) === normName(master.name) || normName(lTarget) === normName(master.tag)) {
            belongs = true;
            isLeaderOfThis = true;
          }
        } else if (normName(r) === normName(master.name) || normName(r) === normName(master.tag)) {
          belongs = true;
        }
      }

      // Особый случай для Индии и ТЭС
      if (cNorm === 'индия' && (master.name === 'ТЭС' || master.name === 'ОДТО')) {
        belongs = true;
        isLeaderOfThis = true;
      }

      if (belongs) {
        const flag = countriesData[cName]?.flag || ent.flag || '🏳️';
        membersMap.set(cNorm, {
          name: cName,
          flag: flag,
          gdp: ent.gdp || countriesData[cName]?.gdp || 0,
          population: ent.population || countriesData[cName]?.population || 0,
          player: ent.player || ent.ruler,
          nickname: ent.nickname,
          isLeader: isLeaderOfThis || (normName(cName) === normName(master.leader))
        });
      }
    }

    const members = Array.from(membersMap.values()).sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0));
    const totalGdp = members.reduce((sum, m) => sum + (Number(m.gdp) || 0), 0);
    const totalPop = members.reduce((sum, m) => sum + (Number(m.population) || 0), 0);
    const leaderObj = members.find(m => m.isLeader) || members[0] || null;

    item.members = members;
    item.totalGdp = totalGdp;
    item.totalPop = totalPop;
    item.leaderCountry = leaderObj ? leaderObj.name : master.leader;
    item.leaderPlayer = leaderObj ? (leaderObj.player || leaderObj.nickname) : null;
    item.leaderFlag = leaderObj ? leaderObj.flag : master.leaderFlag;

    result.push(item);
  }

  return result;
}

/**
 * Рендер карточек альянсов для страницы сезона
 */
export function renderSeasonAlliancesCards(alliancesList) {
  if (!alliancesList || !alliancesList.length) return '';

  return alliancesList.map(al => {
    const leaderHtml = al.leaderCountry
      ? `<span class="al-leader-badge" title="Лидер альянса">👑 ${renderFlag(al.leaderFlag, al.leaderCountry)} <b>${esc(al.leaderCountry)}</b>${al.leaderPlayer ? ` <span class="al-player">(@${esc(al.leaderPlayer)})</span>` : ''}</span>`
      : '—';

    const membersFlagsHtml = al.members.map(m => `
      <span class="al-member-chip" title="${esc(m.name)}" onclick="event.stopPropagation(); window.openCountryModal('${esc(m.name)}')">
        ${renderFlag(m.flag, m.name)}
        <span class="al-member-name">${esc(m.name)}</span>
      </span>
    `).join('');

    const gdpStr = al.totalGdp > 0 ? ('$' + fmtNum(al.totalGdp)) : '—';
    const popStr = al.totalPop > 0 ? fmtNum(al.totalPop) : '—';

    return `
      <div class="c-card alliance-card" style="--al-color:${al.color}" onclick="window.openAllianceModal('${esc(al.name)}')">
        <div class="al-card-head">
          <div class="al-head-left">
            <span class="al-icon">${al.icon}</span>
            <div>
              <div class="al-title">${esc(al.name)} <span class="al-tag">(${esc(al.tag)})</span></div>
              <div class="al-full-name">${esc(al.fullName)}</div>
            </div>
          </div>
          <span class="al-type-badge al-type-${al.pillClass}">${esc(al.type)}</span>
        </div>

        <div class="al-leader-row">
          <span class="al-label">Лидер блока:</span>
          ${leaderHtml}
        </div>

        <div class="al-stats-row">
          <div class="al-stat">
            <span>ВВП блока</span>
            <b>${gdpStr}</b>
          </div>
          <div class="al-stat">
            <span>Население</span>
            <b>${popStr}</b>
          </div>
          <div class="al-stat">
            <span>Участников</span>
            <b>${al.members.length}</b>
          </div>
        </div>

        <div class="al-members-preview">
          <span class="al-label">Состав:</span>
          <div class="al-members-wrap">${membersFlagsHtml}</div>
        </div>

        <div class="al-card-footer">
          <button class="al-btn-dossier" onclick="event.stopPropagation(); window.openAllianceModal('${esc(al.name)}')">
            <span>📋 Досье блока</span>
          </button>
          <button class="al-btn-globe" onclick="event.stopPropagation(); window.showAllianceOnGlobe('${esc(al.name)}')">
            <span>🌍 На глобус</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Открытие подробного модального окна альянса
 */
let cachedAlliancesData = null;

export function setCachedAlliancesData(data) {
  cachedAlliancesData = data;
}

export function openAllianceModal(allianceName) {
  const norm = normName(allianceName);
  let al = null;
  if (cachedAlliancesData) {
    al = cachedAlliancesData.find(a => normName(a.name) === norm || normName(a.tag) === norm);
  }
  if (!al) {
    al = ALLIANCES_MASTER.find(a => normName(a.name) === norm || normName(a.tag) === norm);
  }
  if (!al) return;

  const modal = document.getElementById('allianceModal');
  if (!modal) return;

  const iconEl = document.getElementById('amIcon');
  const nameEl = document.getElementById('amName');
  const subEl = document.getElementById('amSub');
  const statusEl = document.getElementById('amStatusBar');
  const statsBox = document.getElementById('amStatsGrid');
  const detailsBox = document.getElementById('amDetailsList');

  if (iconEl) {
    iconEl.textContent = al.icon || '🛡️';
    iconEl.style.color = al.color;
    iconEl.style.borderColor = al.color;
  }
  if (nameEl) nameEl.textContent = al.name + ' · ' + al.fullName;
  if (subEl) subEl.textContent = `${al.type} альянс · Сезон 31`;

  if (statusEl) {
    statusEl.innerHTML = `
      <div class="al-modal-leader-chip">
        <span class="crown-badge">👑 ПРЕДСЕДАТЕЛЬСТВО</span>
        ${renderFlag(al.leaderFlag, al.leaderCountry)}
        <b>${esc(al.leaderCountry)}</b>
        ${al.leaderPlayer ? `<span class="player-sub">(@${esc(al.leaderPlayer)})</span>` : ''}
      </div>
    `;
  }

  if (statsBox) {
    const gdpStr = al.totalGdp > 0 ? ('$' + fmtNum(al.totalGdp)) : '—';
    const popStr = al.totalPop > 0 ? fmtNum(al.totalPop) : '—';
    statsBox.innerHTML = `
      <div class="cm-stat"><span>Совокупный ВВП</span><b>${gdpStr}</b></div>
      <div class="cm-stat"><span>Население блока</span><b>${popStr}</b></div>
      <div class="cm-stat"><span>Число государств</span><b>${(al.members || []).length}</b></div>
      <div class="cm-stat"><span>Статус пакта</span><b style="color:${al.color}">АКТИВЕН</b></div>
    `;
  }

  let detailsHtml = '';
  const addRow = (k, v) => {
    if (v) detailsHtml += `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  };

  addRow('Официальное название', esc(al.fullName));
  addRow('Классификация союза', esc(al.type));
  addRow('Страна-учредитель / Лидер', `${renderFlag(al.leaderFlag, al.leaderCountry)} ${esc(al.leaderCountry)}`);

  // Участники
  if (al.members && al.members.length) {
    const membersListHtml = al.members.map(m => `
      <span class="al-modal-member-pill" onclick="closeAllianceModal(); window.openCountryModal('${esc(m.name)}')">
        ${renderFlag(m.flag, m.name)}
        <span>${esc(m.name)}</span>
        ${m.isLeader ? '<span class="crown-mark">👑</span>' : ''}
      </span>
    `).join('');
    detailsHtml += `
      <div class="kv-block">
        <span class="kv-block-title">Государства-участники (${al.members.length}):</span>
        <div class="al-modal-members-grid">${membersListHtml}</div>
      </div>
    `;
  }

  // Описание / Доктрина блока
  if (al.description) {
    detailsHtml += `
      <div class="kv-block" style="margin-top:14px">
        <span class="kv-block-title">Доктрина и институты союза:</span>
        <p class="al-modal-doctrine-text">${esc(al.description)}</p>
      </div>
    `;
  }

  // Кнопка перехода на 3D карту
  detailsHtml += `
    <div style="margin-top:18px;text-align:center">
      <button class="country-dossier-btn al-globe-jump-btn" onclick="window.showAllianceOnGlobe('${esc(al.name)}')">
        <span>🌍 Показать блок ${esc(al.name)} на 3D глобусе</span>
      </button>
    </div>
  `;

  if (detailsBox) {
    detailsBox.innerHTML = detailsHtml;
  }

  modal.classList.add('active');
  modal.style.display = 'grid';
  document.body.style.overflow = 'hidden';
}

export function closeAllianceModal() {
  const modal = document.getElementById('allianceModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
    document.body.style.overflow = '';
  }
}

/**
 * Переход на глобус и включение подсветки альянса
 */
export function showAllianceOnGlobe(allianceName) {
  closeAllianceModal();
  if (typeof window.go === 'function') {
    window.go('about');
  }
  setTimeout(() => {
    if (typeof window.toggleFactionFilter === 'function') {
      window.toggleFactionFilter(allianceName);
    }
  }, 250);
}

// Экспорт глобально для HTML onclick
window.openAllianceModal = openAllianceModal;
window.closeAllianceModal = closeAllianceModal;
window.showAllianceOnGlobe = showAllianceOnGlobe;
