/**
 * globe.js - Интерактивная 3D планета с векторными контурами стран мира,
 * динамической подгрузкой активных государств из файла (players.json) и флагами-метками.
 * 
 * Разработано для Global Lens (Global VPI Portal).
 */

import { WORLD_GEO } from './world_geo.js';
import { emojiToCountryCode } from './season.js';
import { KNOWN_PLAYERS } from './config.js';

// Глобальное состояние глобуса
let globeInstance = null;
let currentSource = 'players.json'; // По умолчанию читаем players.json
let activeCountriesMap = new Map(); // key: normalized name -> country record
let allFeatures = [];
let countriesDb = {}; // база данных из countries2014.json
let lastDataFingerprint = '';
let isAutoRotating = true;
let isPollingActive = true;
let pollTimer = null;
let hoveredCountryName = null;

// Фракционные цвета по умолчанию
const FACTION_COLORS = {
  'Атлантический Пакт': '#3b82f6',
  'Евразийский Союз': '#ef4444',
  'Тихоокеанский Блок': '#f59e0b',
  'Ближневосточная Лига': '#a855f7',
  'Нейтралитет': '#10b981',
  'default': '#4ade80'
};

// Привязка стран к блокам для ВПИ (холодная война / современность)
const COUNTRY_DEFAULT_FACTIONS = {
  // Атлантический Пакт (Запад)
  'сша': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'великобритания': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'франция': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'фрг': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'германия': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'южная родезия': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'родезия': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'англо-египетский судан': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'судан': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'алжир': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'нидерланды': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'норвегия': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'италия': { faction: 'Атлантический Пакт', color: '#3b82f6' },
  'испания': { faction: 'Атлантический Пакт', color: '#3b82f6' },

  // Евразийский Союз / Варшавский блок (Восток)
  'ссср': { faction: 'Евразийский Союз', color: '#ef4444' },
  'украинская сср': { faction: 'Евразийский Союз', color: '#ef4444' },
  'казахская сср': { faction: 'Евразийский Союз', color: '#ef4444' },
  'литовская сср': { faction: 'Евразийский Союз', color: '#ef4444' },
  'россия': { faction: 'Евразийский Союз', color: '#ef4444' },
  'кнр': { faction: 'Евразийский Союз', color: '#ef4444' },
  'китай': { faction: 'Евразийский Союз', color: '#ef4444' },
  'гдр': { faction: 'Евразийский Союз', color: '#ef4444' },
  'польша': { faction: 'Евразийский Союз', color: '#ef4444' },
  'чехословакия': { faction: 'Евразийский Союз', color: '#ef4444' },
  'румыния': { faction: 'Евразийский Союз', color: '#ef4444' },

  // Ближневосточная Лига
  'ирак': { faction: 'Ближневосточная Лига', color: '#a855f7' },
  'египет': { faction: 'Ближневосточная Лига', color: '#a855f7' },
  'турция': { faction: 'Ближневосточная Лига', color: '#a855f7' },
  'афганистан': { faction: 'Ближневосточная Лига', color: '#a855f7' },

  // Тихоокеанский Блок
  'тайвань': { faction: 'Тихоокеанский Блок', color: '#f59e0b' },
  'бутан': { faction: 'Тихоокеанский Блок', color: '#f59e0b' },
  'япония': { faction: 'Тихоокеанский Блок', color: '#f59e0b' },
  'индия': { faction: 'Тихоокеанский Блок', color: '#f59e0b' },
  'австралия': { faction: 'Тихоокеанский Блок', color: '#f59e0b' },

  // Нейтралы / Движение неприсоединения
  'швейцария': { faction: 'Нейтралитет', color: '#10b981' },
  'австрия': { faction: 'Нейтралитет', color: '#10b981' },
  'швеция': { faction: 'Нейтралитет', color: '#10b981' },
  'ирландия': { faction: 'Нейтралитет', color: '#10b981' },
  'югославия': { faction: 'Нейтралитет', color: '#10b981' },
  'бразилия': { faction: 'Нейтралитет', color: '#10b981' },
  'юар': { faction: 'Нейтралитет', color: '#10b981' },
  'ватикан': { faction: 'Нейтралитет', color: '#10b981' }
};

// Координаты микрогосударств и специальных объектов
const FALLBACK_COORDINATES = {
  'гдр': [52.1694, 12.6954],
  'фрг': [50.7164, 9.7344],
  'ссср': [55.7558, 37.6173],
  'украинская сср': [48.6814, 30.3621],
  'казахская сср': [47.2638, 65.2524],
  'литовская сср': [55.201, 24.0166],
  'южная родезия': [-18.8659, 29.6112],
  'родезия': [-18.8659, 29.6112],
  'англо-египетский судан': [12.8628, 30.2176],
  'алжир': [28.0339, 1.6596],
  'кнр': [35.8617, 104.1954],
  'тайвань': [23.6978, 120.9605],
  'ватикан': [41.9029, 12.4534],
  'сингапур': [1.3521, 103.8198],
  'монако': [43.7384, 7.4246],
  'сан-марино': [43.9424, 12.4578],
  'лихтенштейн': [47.166, 9.5554],
  'мальта': [35.9375, 14.3754],
  'кипр': [35.1264, 33.4299],
  'северный кипр': [35.2, 33.5],
  'люксембург': [49.8153, 6.1296],
  'бахрейн': [26.0667, 50.5577],
  'катар': [25.3548, 51.1839],
  'кувейт': [29.3117, 47.4818],
  'ливан': [33.8547, 35.8623],
  'израиль': [31.0461, 34.8516],
  'исландия': [64.9631, -19.0208],
  'днр': [48.0159, 37.8029],
  'лнр': [48.574, 39.3078],
  'абхазия': [43.0016, 41.0234],
  'южная осетия': [42.2286, 43.9706],
  'гондурас': [14.7363, -86.4169],
  'косово': [42.6026, 20.903]
};

// Нормализация названий
function normName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\s\-_]+/g, ' ');
}

// Алиасы для исторического и игрового маппинга
const COUNTRY_ALIASES = {
  'ссср': 'россия',
  'советский союз': 'россия',
  'ussr': 'россия',
  'рф': 'россия',
  'российская федерация': 'россия',

  'кнр': 'китай',
  'china': 'китай',

  'фрг': 'фрг',
  'гдр': 'гдр',
  'германия': 'фрг',

  'украинская сср': 'украина',
  'усср': 'украина',
  'казахская сср': 'казахстан',
  'литовская сср': 'литва',
  'белорусская сср': 'беларусь',
  'бсср': 'беларусь',
  'узбекская сср': 'узбекистан',
  'туркменская сср': 'туркменистан',
  'киргизская сср': 'кыргыстан',
  'кыргызстан': 'кыргыстан',
  'таджикская сср': 'таджикистан',
  'азербайджанская сср': 'азербайджан',
  'грузинская сср': 'грузия',
  'армянская сср': 'армения',
  'молдавская сср': 'молдова',
  'латвийская сср': 'латвия',
  'эстонская сср': 'эстония',
  'рсфср': 'россия',
  'южная родезия': 'зимбабве',
  'родезия': 'зимбабве',
  'англо-египетский судан': 'судан',
  'алжир': 'алжир',

  'чехословакия': 'чехия',
  'югославия': 'сербия',
  'юар': 'юар',
  'южно-африканская республика': 'юар',

  'сша': 'сша',
  'соединенные штаты': 'сша',
  'usa': 'сша',

  'великобритания': 'великобритания',
  'англия': 'великобритания',
  'uk': 'великобритания',

  'бенилюкс': 'нидерланды',
  'оаэ': 'объединенные арабские эмираты',
  'франция': 'франция',
  'тайвань': 'тайвань'
};

// 15 союзных республик СССР для целостного исторического покрытия территории
const SOVIET_UNION_REPUBLICS = [
  { iso2: 'RU', nameRu: 'Россия', repName: 'РСФСР', target: 'Россия' },
  { iso2: 'UA', nameRu: 'Украина', repName: 'Украинская ССР', target: 'Украина' },
  { iso2: 'BY', nameRu: 'Беларусь', repName: 'Белорусская ССР', target: 'Беларусь' },
  { iso2: 'KZ', nameRu: 'Казахстан', repName: 'Казахская ССР', target: 'Казахстан' },
  { iso2: 'UZ', nameRu: 'Узбекистан', repName: 'Узбекская ССР', target: 'Узбекистан' },
  { iso2: 'TM', nameRu: 'Туркменистан', repName: 'Туркменская ССР', target: 'Туркменистан' },
  { iso2: 'KG', nameRu: 'Кыргызстан', repName: 'Киргизская ССР', target: 'Кыргызстан', altRu: 'Кыргыстан' },
  { iso2: 'TJ', nameRu: 'Таджикистан', repName: 'Таджикская ССР', target: 'Таджикистан' },
  { iso2: 'AZ', nameRu: 'Азербайджан', repName: 'Азербайджанская ССР', target: 'Азербайджан' },
  { iso2: 'GE', nameRu: 'Грузия', repName: 'Грузинская ССР', target: 'Грузия' },
  { iso2: 'AM', nameRu: 'Армения', repName: 'Армянская ССР', target: 'Армения' },
  { iso2: 'MD', nameRu: 'Молдова', repName: 'Молдавская ССР', target: 'Молдова' },
  { iso2: 'LT', nameRu: 'Литва', repName: 'Литовская ССР', target: 'Литва' },
  { iso2: 'LV', nameRu: 'Латвия', repName: 'Латвийская ССР', target: 'Латвия' },
  { iso2: 'EE', nameRu: 'Эстония', repName: 'Эстонская ССР', target: 'Эстония' }
];

/**
 * Быстрый и надежный поиск активной страны/автономии/территории для полигона GeoJSON
 */
function getActiveCountryForFeature(feat) {
  if (!feat || !feat.properties) return null;
  const props = feat.properties;

  const rName = normName(props.name_ru);
  if (rName && activeCountriesMap.has(rName)) return activeCountriesMap.get(rName);

  const iso = (props.iso2 || '').toLowerCase();
  if (iso && activeCountriesMap.has(iso)) return activeCountriesMap.get(iso);

  const enName = normName(props.name_en || props.NAME || props.ADMIN);
  if (enName && activeCountriesMap.has(enName)) return activeCountriesMap.get(enName);

  return null;
}

/**
 * Проверка загрузки библиотеки Globe.gl
 */
async function ensureGlobeLibrary() {
  if (typeof window.Globe === 'function') return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="globe.gl"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'js/libs/globe.gl.min.js';
    script.onload = () => resolve();
    script.onerror = (err) => {
      console.warn('[Globe] Local globe.gl failed, trying CDN:', err);
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://unpkg.com/globe.gl@2.46.2/dist/globe.gl.min.js';
      cdnScript.onload = () => resolve();
      cdnScript.onerror = reject;
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  });
}

/**
 * Загрузка базы стран countries2014.json
 */
async function loadCountriesDatabase() {
  try {
    const res = await fetch('countries2014.json');
    if (res.ok) {
      countriesDb = await res.json();
    }
  } catch (err) {
    console.warn('[Globe] countries2014.json fetch fallback:', err);
    countriesDb = {};
  }
}

/**
 * Поиск полигона страны в GeoJSON
 */
function findFeature(countryQuery) {
  if (!countryQuery) return null;
  const qNorm = normName(countryQuery);
  const canonical = COUNTRY_ALIASES[qNorm] || qNorm;

  // 1. Поиск по name_ru
  let found = allFeatures.find(f => {
    const rName = normName(f.properties?.name_ru);
    return rName === canonical || rName === qNorm;
  });
  if (found) return found;

  // 2. Поиск по iso2
  const queryIso = countryQuery.length === 2 ? countryQuery.toUpperCase() : null;
  if (queryIso) {
    found = allFeatures.find(f => f.properties?.iso2?.toUpperCase() === queryIso);
    if (found) return found;
  }

  // 3. Поиск по name_en / NAME / ADMIN
  found = allFeatures.find(f => {
    const enName = normName(f.properties?.name_en || f.properties?.NAME || f.properties?.ADMIN);
    return enName === canonical || enName === qNorm;
  });
  if (found) return found;

  // 4. Поиск по подстроке
  found = allFeatures.find(f => {
    const rName = normName(f.properties?.name_ru);
    return rName && (rName.includes(canonical) || canonical.includes(rName));
  });

  return found || null;
}

/**
 * Извлечение флага-эмодзи из display_name игрока в Discord (например: "🇮🇶 | Ирак" -> "🇮🇶")
 */
function extractFlagFromDisplay(displayName) {
  if (!displayName || typeof displayName !== 'string') return null;
  const parts = displayName.split('|');
  if (parts.length > 1) {
    const candidate = parts[0].trim();
    // Игнорируем технические символы и иконки ЧВК
    if (candidate && candidate !== '🏢' && candidate !== '•' && candidate.length <= 8) {
      return candidate;
    }
  }
  return null;
}

/**
 * Интеллектуальное определение государства/автономии игрока по нику, ролям и Discord-тегам
 */
function resolvePlayerEntity(p) {
  const nick = (p.nickname || p.display_name || '').trim();
  const rawCountry = p.country || '';
  const entityType = p.entity_type || 'Государство';

  // 1. Автономии СССР (Советские республики в игре)
  if (nick.includes('Украинская ССР') || nick.includes('УССР')) {
    return {
      entityKey: 'Украинская ССР',
      geoTarget: 'Украина',
      flag: '⚒️🟥',
      isAutonomy: true,
      sovereign: 'СССР',
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Автономия'
    };
  }
  if (nick.includes('Казахская ССР')) {
    return {
      entityKey: 'Казахская ССР',
      geoTarget: 'Казахстан',
      flag: '⚒️🟥',
      isAutonomy: true,
      sovereign: 'СССР',
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Автономия'
    };
  }
  if (nick.includes('Литовская ССР')) {
    return {
      entityKey: 'Литовская ССР',
      geoTarget: 'Литва',
      flag: '⚒️🟥',
      isAutonomy: true,
      sovereign: 'СССР',
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Автономия'
    };
  }

  // 2. Автономии и владения Великобритании
  if (nick.includes('Родезия')) {
    return {
      entityKey: 'Южная Родезия',
      geoTarget: 'Зимбабве',
      flag: '🇬🇧',
      isAutonomy: true,
      sovereign: 'Великобритания',
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Автономия'
    };
  }
  if (nick.includes('Судан') || nick.includes('Англо-египетский')) {
    return {
      entityKey: 'Англо-египетский Судан',
      geoTarget: 'Судан',
      flag: '🇬🇧',
      isAutonomy: true,
      sovereign: 'Великобритания',
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Автономия'
    };
  }

  // 3. Автономии Франции
  if (nick.includes('Алжир')) {
    return {
      entityKey: 'Алжир',
      geoTarget: 'Алжир',
      flag: '🇫🇷',
      isAutonomy: true,
      sovereign: 'Франция',
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Автономия'
    };
  }

  // 4. ЧВК и международные организации
  if (nick.includes('DynCorp') || (rawCountry === 'Франция' && entityType === 'ЧВК')) {
    return {
      entityKey: 'DynCorp',
      geoTarget: null,
      flag: '🏢',
      isPmc: true,
      sovereign: 'Франция',
      entityType: 'ЧВК'
    };
  }
  if (nick.includes('ООН')) {
    return {
      entityKey: 'ООН',
      geoTarget: null,
      flag: '🇺🇳',
      isPmc: true,
      entityType: 'Организация'
    };
  }

  // 5. КНР vs ГДР (belousov01 имеет ник 🇨🇳 | КНР)
  if (nick.includes('КНР') || nick.includes('Китай') || nick.includes('🇨🇳')) {
    return {
      entityKey: 'КНР',
      geoTarget: 'КНР',
      flag: '🇨🇳',
      isAutonomy: false,
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Государство',
      isLeader: true
    };
  }

  // 6. Тайвань vs США (beezymeas имеет ник 🇹🇼 | Тайвань)
  if (nick.includes('Тайвань') || nick.includes('🇹🇼')) {
    return {
      entityKey: 'Тайвань',
      geoTarget: 'Тайвань',
      flag: '🇹🇼',
      isAutonomy: false,
      faction: 'Тихоокеанский Блок',
      faction_color: '#f59e0b',
      entityType: 'Государство',
      isLeader: true
    };
  }

  // 7. Разделение Германии: ГДР vs ФРГ
  if (nick.includes('СРБП') || nick.includes('ГДР')) {
    return {
      entityKey: 'ГДР',
      geoTarget: 'ГДР',
      flag: '🇩🇪',
      isAutonomy: false,
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Государство',
      isLeader: true
    };
  }
  if (nick.includes('ФРГ')) {
    return {
      entityKey: 'ФРГ',
      geoTarget: 'ФРГ',
      flag: '🇩🇪',
      isAutonomy: false,
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Государство',
      isLeader: true
    };
  }

  // 8. Главы государств (Метрополии)
  if (nick.includes('СССР')) {
    return {
      entityKey: 'СССР',
      geoTarget: 'СССР',
      flag: '⚒️🟥',
      isAutonomy: false,
      faction: 'Евразийский Союз',
      faction_color: '#ef4444',
      entityType: 'Государство',
      isLeader: true
    };
  }
  if (nick.includes('Великобритания')) {
    return {
      entityKey: 'Великобритания',
      geoTarget: 'Великобритания',
      flag: '🇬🇧',
      isAutonomy: false,
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Государство',
      isLeader: true
    };
  }
  if (nick.includes('Франция')) {
    return {
      entityKey: 'Франция',
      geoTarget: 'Франция',
      flag: '🇫🇷',
      isAutonomy: false,
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Государство',
      isLeader: true
    };
  }
  if (nick.includes('США')) {
    return {
      entityKey: 'США',
      geoTarget: 'США',
      flag: '🇺🇸',
      isAutonomy: false,
      faction: 'Атлантический Пакт',
      faction_color: '#3b82f6',
      entityType: 'Государство',
      isLeader: true
    };
  }

  // 9. Обычные государства
  return {
    entityKey: rawCountry || 'Неизвестно',
    geoTarget: rawCountry || null,
    flag: extractFlagFromDisplay(nick),
    isAutonomy: entityType === 'Автономия',
    faction: null,
    entityType: entityType,
    isLeader: entityType === 'Государство'
  };
}

/**
 * Парсер данных из файла players.json и других форматов
 */
function normalizeIncomingData(rawData) {
  if (!rawData) return [];

  // СПЕЦИАЛЬНЫЙ РЕЖИМ: players.json (экспорт игроков Global Lens Discord)
  if (rawData.countries_count && typeof rawData.countries_count === 'object') {
    const entitiesMap = new Map();
    const allPlayers = Array.isArray(rawData.all_players) ? rawData.all_players : [];

    // Группируем и распределяем игроков по реальным странам/автономиям
    for (const p of allPlayers) {
      const resolved = resolvePlayerEntity(p);
      const key = resolved.entityKey;
      if (!key || key === 'Неизвестно') continue;

      if (!entitiesMap.has(key)) {
        entitiesMap.set(key, {
          name: key,
          geoTarget: resolved.geoTarget,
          flag: resolved.flag,
          faction: resolved.faction,
          faction_color: resolved.faction_color,
          isAutonomy: resolved.isAutonomy,
          sovereign: resolved.sovereign,
          isPmc: resolved.isPmc,
          playersList: [],
          entityTypes: new Set([resolved.entityType]),
          categories: new Set()
        });
      }

      const ent = entitiesMap.get(key);
      if (resolved.flag && !ent.flag) ent.flag = resolved.flag;
      if (resolved.entityType) ent.entityTypes.add(resolved.entityType);
      if (Array.isArray(p.categories)) {
        p.categories.forEach(cat => ent.categories.add(cat));
      }

      const known = KNOWN_PLAYERS[p.id];
      let realName = known ? known.name : null;
      if (!realName) {
        const rawNick = (p.nickname || p.display_name || '').trim();
        const parts = rawNick.split('|').map(s => s.trim());
        if (parts.length > 1 && (parts[1] === p.country || parts[0].length <= 8)) {
          realName = p.username || parts[1] || parts[0];
        } else if (rawNick && rawNick !== p.country) {
          realName = rawNick;
        } else {
          realName = p.username || 'Игрок';
        }
      }

      ent.playersList.push({
        id: p.id,
        username: p.username || 'Игрок',
        displayName: realName,
        avatar: p.avatar_url,
        entityType: resolved.entityType,
        isLeader: resolved.isLeader
      });
    }

    // Добавляем страны из countries_count, которых нет в all_players
    for (const [countryName, count] of Object.entries(rawData.countries_count)) {
      if (!entitiesMap.has(countryName) && !['СССР', 'ГДР', 'ФРГ', 'Франция', 'Великобритания', 'США'].includes(countryName)) {
        entitiesMap.set(countryName, {
          name: countryName,
          geoTarget: countryName,
          flag: null,
          playerCount: count,
          playersList: [],
          entityTypes: new Set(['Государство']),
          categories: new Set()
        });
      }
    }

    // Собираем зависимости автономий для метрополий (СССР, Великобритания, Франция)
    const autonomiesBySovereign = { 'СССР': [], 'Великобритания': [], 'Франция': [] };
    for (const ent of entitiesMap.values()) {
      if (ent.isAutonomy && ent.sovereign && autonomiesBySovereign[ent.sovereign]) {
        autonomiesBySovereign[ent.sovereign].push(ent.name);
      }
    }

    // Преобразуем в единый список для глобуса
    const resultList = [];
    for (const [entityName, item] of entitiesMap.entries()) {
      const qNorm = normName(entityName);
      const factionDef = item.faction ? { faction: item.faction, color: item.faction_color } : (COUNTRY_DEFAULT_FACTIONS[qNorm] || { faction: 'Независимое государство', color: '#4ade80' });

      // Сортируем игроков: Лидер государства всегда на 1 месте!
      item.playersList.sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0));

      const playerNames = item.playersList.map(p => p.displayName || p.username);
      const mainPlayer = playerNames.length ? playerNames[0] : null;

      resultList.push({
        name: entityName,
        geoTarget: item.geoTarget || entityName,
        flag: item.flag,
        faction: factionDef.faction,
        faction_color: factionDef.color,
        player: mainPlayer,
        allPlayers: item.playersList,
        playerCount: item.playersList.length || item.playerCount || 1,
        entityTypes: Array.from(item.entityTypes),
        categories: Array.from(item.categories || []),
        isAutonomy: item.isAutonomy || false,
        sovereign: item.sovereign || null,
        autonomies: autonomiesBySovereign[entityName] || []
      });
    }

    return resultList;
  }

  // СТАНДАРТНЫЙ РЕЖИМ: active_countries / countries / seasons / arrays
  if (Array.isArray(rawData.active_countries)) return normalizeIncomingData(rawData.active_countries);
  if (Array.isArray(rawData.countries)) return normalizeIncomingData(rawData.countries);

  const list = [];
  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (typeof item === 'string') {
        list.push({ name: item });
      } else if (item && typeof item === 'object') {
        list.push({
          name: item.name || item.country || item.title || '',
          flag: item.flag || null,
          faction: item.faction || item.alliance || null,
          faction_color: item.faction_color || item.color || null,
          player: item.player || item.leader || item.owner || null,
          role: item.role || item.status || null,
          gdp: item.gdp || null,
          population: item.population || null
        });
      }
    }
    return list;
  }

  for (const [key, val] of Object.entries(rawData)) {
    if (!val || typeof val !== 'object') continue;
    if (val.country && typeof val.country === 'string') {
      list.push({
        name: val.country,
        flag: val.flag || null,
        player: val.player || val.leader || key,
        faction: val.faction || null,
        faction_color: val.faction_color || null,
        role: val.type || val.status || null,
        gdp: val.gdp || null,
        population: val.population || null
      });
    } else {
      list.push({
        name: key,
        flag: val.flag || null,
        faction: val.faction || val.alliance || null,
        faction_color: val.faction_color || val.color || null,
        player: val.player || val.leader || null,
        role: val.role || val.status || null,
        gdp: val.gdp || null,
        population: val.population || null
      });
    }
  }

  return list;
}

/**
 * Преобразование цвета HEX/RGB в RGBA с заданной прозрачностью
 */
function hexToRgba(hexOrColor, alpha = 0.2) {
  if (!hexOrColor) return `rgba(74, 222, 128, ${alpha})`;
  if (hexOrColor.startsWith('rgba')) return hexOrColor;
  if (hexOrColor.startsWith('rgb')) {
    return hexOrColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  let c = hexOrColor.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(74, 222, 128, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Форматирование чисел для карточки (ВВП, Население)
 */
function formatNum(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (num >= 1e12) return (num / 1e12).toFixed(1) + ' трлн';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + ' млрд';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + ' млн';
  return Number(num).toLocaleString('ru-RU');
}

/**
 * Загрузка активных стран из файла
 */
export async function loadActiveCountries(sourcePath = currentSource, isSilent = false) {
  currentSource = sourcePath;
  const select = document.getElementById('globeSourceSelect');
  if (select && select.value !== sourcePath && !sourcePath.startsWith('blob:')) {
    select.value = sourcePath;
  }

  try {
    const fetchUrl = sourcePath.startsWith('blob:') ? sourcePath : `${sourcePath}?_t=${Date.now()}`;
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();

    const fingerprint = JSON.stringify(rawData);
    if (fingerprint === lastDataFingerprint && isSilent) {
      return; // Данные не изменились
    }
    lastDataFingerprint = fingerprint;

    const normalizedList = normalizeIncomingData(rawData);
    applyCountriesData(normalizedList);

    // Уведомление на HUD
    flashHudSyncIndicator();
  } catch (err) {
    if (!isSilent) {
      console.warn(`[Globe] Ошибка загрузки файла ${sourcePath}:`, err);
    }
  }
}

/**
 * Применение нормализованного списка стран к 3D-глобусу
 */
function applyCountriesData(countriesList) {
  activeCountriesMap.clear();
  const htmlMarkers = [];

  for (const item of countriesList) {
    if (!item.name) continue;
    const targetQuery = item.geoTarget || item.name;
    const feat = findFeature(targetQuery);
    const dbItem = countriesDb[item.name] || (feat ? countriesDb[feat.properties?.name_ru] : null);

    // Определяем флаг
    let flag = item.flag;
    if (!flag && feat?.properties?.flag) flag = feat.properties.flag;
    if (!flag && dbItem?.flag) flag = dbItem.flag;
    if (!flag) flag = '🏳️';

    // Определяем цвет фракции
    let factionColor = item.faction_color;
    if (!factionColor && item.faction) {
      factionColor = FACTION_COLORS[item.faction] || FACTION_COLORS['default'];
    }
    if (!factionColor) {
      const qNorm = normName(item.name);
      factionColor = COUNTRY_DEFAULT_FACTIONS[qNorm]?.color || '#4ade80';
    }

    // Координаты центроида: приоритет точным координатам объекта/автономии
    let coords = null;
    const nameNorm = normName(item.name);
    const targetNorm = normName(targetQuery);
    if (FALLBACK_COORDINATES[nameNorm]) {
      coords = FALLBACK_COORDINATES[nameNorm];
    } else if (FALLBACK_COORDINATES[targetNorm]) {
      coords = FALLBACK_COORDINATES[targetNorm];
    } else if (feat?.properties?.centroid) {
      coords = feat.properties.centroid;
    }

    const countryRecord = {
      name: item.name,
      geoTarget: item.geoTarget || item.name,
      canonicalName: feat?.properties?.name_ru || item.name,
      flag: flag,
      faction: item.faction || COUNTRY_DEFAULT_FACTIONS[nameNorm]?.faction || 'Независимое государство',
      faction_color: factionColor,
      player: item.player || null,
      playerCount: item.playerCount || (item.player ? 1 : 0),
      allPlayers: item.allPlayers || [],
      entityTypes: item.entityTypes || [],
      categories: item.categories || [],
      isAutonomy: item.isAutonomy || false,
      sovereign: item.sovereign || null,
      autonomies: item.autonomies || [],
      role: item.role || (item.isAutonomy ? `Автономия (${item.sovereign})` : (item.playerCount > 1 ? `${item.playerCount} игроков` : 'Активен')),
      status: item.isAutonomy ? `Автономия (${item.sovereign})` : (item.status || 'В игре'),
      gdp: item.gdp ?? dbItem?.gdp ?? null,
      population: item.population ?? dbItem?.population ?? null,
      lat: coords ? coords[0] : 0,
      lng: coords ? coords[1] : 0,
      hasGeometry: !!feat,
      feature: feat
    };

    activeCountriesMap.set(normName(item.name), countryRecord);
    if (item.geoTarget) {
      activeCountriesMap.set(normName(item.geoTarget), countryRecord);
    }
    if (feat?.properties?.name_ru) {
      activeCountriesMap.set(normName(feat.properties.name_ru), countryRecord);
    }
    if (feat?.properties?.iso2) {
      activeCountriesMap.set(feat.properties.iso2.toLowerCase(), countryRecord);
    }

    if (coords && !countryRecord.isUnionTerritory) {
      htmlMarkers.push(countryRecord);
    }
  }

  // --- ЕДИНОЕ ПОКРЫТИЕ ТЕРРИТОРИИ СССР (15 СОЮЗНЫХ РЕСПУБЛИК) ---
  // Если в игре присутствует СССР, вся историческая советская территория окрашивается
  // в советский красный цвет (#ef4444, высота 0.012), а бейджи автономий отображаются строго над их регионами
  const ussrRecord = activeCountriesMap.get('ссср');
  if (ussrRecord) {
    for (const rep of SOVIET_UNION_REPUBLICS) {
      const repKey = normName(rep.repName);
      const nameKey = normName(rep.nameRu);
      const altKey = rep.altRu ? normName(rep.altRu) : null;
      const isoKey = rep.iso2.toLowerCase();

      // Проверяем, есть ли для этой республики отдельный зарегистрированный игрок-автономия
      const existingAutonomy = (activeCountriesMap.has(repKey) && activeCountriesMap.get(repKey).isAutonomy)
        || (activeCountriesMap.has(nameKey) && activeCountriesMap.get(nameKey).isAutonomy);

      if (existingAutonomy) {
        // Связываем автономию с СССР: советский красный цвет фракции
        const autRecord = activeCountriesMap.get(repKey) || activeCountriesMap.get(nameKey);
        if (autRecord) {
          autRecord.faction = ussrRecord.faction || 'Евразийский Союз';
          autRecord.faction_color = ussrRecord.faction_color || '#ef4444';
          autRecord.sovereign = 'СССР';
          activeCountriesMap.set(nameKey, autRecord);
          activeCountriesMap.set(repKey, autRecord);
          activeCountriesMap.set(isoKey, autRecord);
          if (altKey) activeCountriesMap.set(altKey, autRecord);
        }
      } else if (rep.iso2 !== 'RU') {
        // Прямая территория СССР (Беларусь, Узбекистан, Туркменистан, Кыргызстан, Таджикистан, Азербайджан, Грузия, Армения, Молдова, Латвия, Эстония)
        // Получает красный цвет СССР без добавления лишнего маркера-бейджа на карту
        const unionFeat = findFeature(rep.target || rep.nameRu) || findFeature(rep.iso2);
        const centroid = unionFeat?.properties?.centroid || [0, 0];

        const unionRecord = {
          name: `СССР · ${rep.repName}`,
          republicName: rep.repName,
          geoTarget: rep.nameRu,
          canonicalName: unionFeat?.properties?.name_ru || rep.nameRu,
          flag: ussrRecord.flag || '⚒️🟥',
          faction: ussrRecord.faction || 'Евразийский Союз',
          faction_color: ussrRecord.faction_color || '#ef4444',
          player: ussrRecord.player,
          allPlayers: ussrRecord.allPlayers || [],
          playerCount: ussrRecord.playerCount || 1,
          entityTypes: ['Союзная республика'],
          categories: ['Территория СССР'],
          isAutonomy: false,
          isUnionTerritory: true,
          sovereign: 'СССР',
          role: 'Союзная республика СССР',
          status: 'Союзная республика СССР',
          lat: centroid[0],
          lng: centroid[1],
          hasGeometry: !!unionFeat,
          feature: unionFeat
        };

        activeCountriesMap.set(nameKey, unionRecord);
        activeCountriesMap.set(repKey, unionRecord);
        activeCountriesMap.set(isoKey, unionRecord);
        if (altKey) activeCountriesMap.set(altKey, unionRecord);
        if (unionFeat?.properties?.name_ru) {
          activeCountriesMap.set(normName(unionFeat.properties.name_ru), unionRecord);
        }
      }
    }
  }

  // Обновляем счетчик на HUD
  const countEl = document.getElementById('globeCountryCount');
  if (countEl) {
    const totalCount = countriesList.length || activeCountriesMap.size;
    countEl.textContent = `${totalCount} стран`;
  }

  // Обновляем слои на 3D-глобусе
  if (globeInstance) {
    // 1. Обновляем полигоны (контуры и высоты)
    globeInstance.polygonsData([...allFeatures]);

    // 2. Обновляем флаги-метки
    globeInstance.htmlElementsData(htmlMarkers);
  }
}

/**
 * Создание HTML-элемента метки с флагом на 3D сфере
 */
function createFlagMarkerElement(country) {
  const wrapper = document.createElement('div');
  wrapper.className = 'globe-flag-pin';
  wrapper.setAttribute('data-country', country.name);

  const pBadge = country.playerCount > 1 ? `<span class="flag-count-pill">${country.playerCount}</span>` : '';

  wrapper.innerHTML = `
    <div class="flag-pin-badge" style="--faction-color: ${country.faction_color}; --faction-glow: ${hexToRgba(country.faction_color, 0.45)}">
      <span class="flag-icon">${country.flag}</span>
      <span class="flag-label">${country.name}</span>
      ${pBadge}
      <div class="flag-radar-dot"></div>
    </div>
  `;

  wrapper.addEventListener('click', (ev) => {
    ev.stopPropagation();
    focusCountry(country);
  });

  return wrapper;
}

/**
 * Плавный поворот камеры к выбранной стране и показ карточки
 */
export function focusCountry(country) {
  if (!country || !globeInstance) return;

  const lat = country.lat;
  const lng = country.lng;

  // Плавный перелет камеры
  globeInstance.pointOfView({
    lat: lat,
    lng: lng,
    altitude: 1.8
  }, 1200);

  // Отображение карточки страны
  showCountryCard(country);
}

/**
 * Отображение HUD-карточки выбранной страны
 */
function showCountryCard(country) {
  const card = document.getElementById('globeCountryCard');
  if (!card) return;

  const flagEl = document.getElementById('cardFlag');
  const nameEl = document.getElementById('cardName');
  const factionEl = document.getElementById('cardFaction');
  const playerEl = document.getElementById('cardPlayer');
  const statusEl = document.getElementById('cardStatus');
  const popEl = document.getElementById('cardPop');
  const gdpEl = document.getElementById('cardGdp');
  const dossierBtn = document.getElementById('cardDossierBtn');

  if (flagEl) flagEl.textContent = country.flag || '🏳️';
  if (nameEl) nameEl.textContent = country.name;
  if (factionEl) {
    factionEl.textContent = country.faction || 'Независимое государство';
    factionEl.style.color = country.faction_color || '#4ade80';
    factionEl.style.borderColor = country.faction_color || '#4ade80';
  }

  // Форматирование списка игроков
  const cleanP = (p, cName, cIso) => {
    if (!p) return '—';
    const disp = (p.displayName || p.nickname || '').trim();
    const user = (p.username || '').trim();
    if (user && disp && (disp === cName || disp.endsWith(cName) || disp.includes('| ' + cName) || (cIso && disp.includes(cIso)))) {
      return `@${user}`;
    }
    return disp || (user ? `@${user}` : '—');
  };

  if (playerEl) {
    if (country.isUnionTerritory) {
      playerEl.textContent = country.player ? `@${country.player} (Лидер СССР)` : 'СССР';
    } else if (country.allPlayers && country.allPlayers.length > 0) {
      const pFormatted = country.allPlayers.map(p => cleanP(p, country.name, country.iso2));
      if (pFormatted.length === 1) {
        playerEl.textContent = pFormatted[0];
      } else {
        playerEl.innerHTML = `<span title="${pFormatted.join(', ')}">${pFormatted[0]} (+${pFormatted.length - 1})</span>`;
      }
    } else {
      playerEl.textContent = country.player || '— (Свободно)';
    }
  }

  if (statusEl) {
    if (country.isUnionTerritory) {
      statusEl.textContent = `Союзная республика СССР`;
    } else if (country.isAutonomy && country.sovereign) {
      statusEl.textContent = `Автономия (${country.sovereign})`;
    } else if (country.autonomies && country.autonomies.length) {
      statusEl.textContent = `Метрополия · +${country.autonomies.length} авт.`;
    } else {
      const types = country.entityTypes && country.entityTypes.length ? country.entityTypes.join(', ') : 'Государство';
      statusEl.textContent = `${types} · ${country.playerCount || 1} игр.`;
    }
  }

  if (popEl) popEl.textContent = country.population ? formatNum(country.population) : '—';
  if (gdpEl) gdpEl.textContent = country.gdp ? ('$' + formatNum(country.gdp)) : '—';

  card.style.setProperty('--faction-color', country.faction_color || '#4ade80');
  card.style.display = 'block';

  // Кнопка перехода к полному досье в сезоне
  if (dossierBtn) {
    dossierBtn.onclick = async () => {
      if (typeof window.go === 'function') {
        window.go('season');
      }
      if (typeof window.loadSeason === 'function') {
        await window.loadSeason();
      }
      setTimeout(() => {
        const targetSearch = (country.isUnionTerritory && country.sovereign) ? country.sovereign : country.name;
        if (typeof window.openCountryModal === 'function') {
          window.openCountryModal(targetSearch);
        }
        const searchInput = document.getElementById('countrySearch');
        if (searchInput) {
          searchInput.value = targetSearch;
          searchInput.dispatchEvent(new Event('input'));
        }
      }, 120);
    };
  }
}

/**
 * Закрытие HUD-карточки
 */
export function closeCountryCard() {
  const card = document.getElementById('globeCountryCard');
  if (card) card.style.display = 'none';
}

/**
 * Вспышка индикатора синхронизации на HUD
 */
function flashHudSyncIndicator() {
  const liveStatus = document.getElementById('globeLiveStatus');
  if (liveStatus) {
    liveStatus.classList.add('synced-flash');
    setTimeout(() => liveStatus.classList.remove('synced-flash'), 1200);
  }
}

/**
 * Авто-опрос файла для динамического обновления при сохранении
 */
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (isPollingActive && currentSource && !currentSource.startsWith('blob:')) {
      loadActiveCountries(currentSource, true);
    }
  }, 4000);
}

/**
 * Главная инициализация интерактивного 3D глобуса
 */
export async function initGlobeNavigation() {
  const container = document.getElementById('globeContainer');
  if (!container) return;

  // 1. Загрузка библиотеки globe.gl и базы данных
  await ensureGlobeLibrary();
  await loadCountriesDatabase();

  allFeatures = WORLD_GEO?.features || [];

  // Удаляем лоадер
  const loader = document.getElementById('globeLoading');
  if (loader) loader.style.display = 'none';

  // Очищаем контейнер от предыдущих инстансов
  container.innerHTML = '';

  // 2. Инициализация Globe.gl
  globeInstance = window.Globe()(container)
    .backgroundColor('rgba(0,0,0,0)')
    .showGlobe(true)
    .globeImageUrl(null)
    .bumpImageUrl(null)
    .showGraticules(true) // Сетка меридианов и параллелей
    .showAtmosphere(true)
    .atmosphereColor('#4ade80') // Неоновое свечение атмосферы
    .atmosphereAltitude(0.18)
    
    // --- ВЕКТОРНЫЕ КОНТУРЫ СТРАН ---
    .polygonsData([...allFeatures])
    .polygonGeoJsonGeometry(d => d.geometry)
    .polygonCapColor(d => {
      const active = getActiveCountryForFeature(d);
      if (active) {
        return hexToRgba(active.faction_color, 0.16);
      }
      return 'rgba(0, 0, 0, 0)'; // Полностью прозрачное тело -> ТОЛЬКО контуры
    })
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(d => {
      const qNorm = normName(d.properties?.name_ru);
      const active = getActiveCountryForFeature(d);
      if (hoveredCountryName && (hoveredCountryName === qNorm)) {
        return '#ffffff';
      }
      if (active) {
        return active.faction_color || '#4ade80';
      }
      return 'rgba(100, 140, 180, 0.28)'; // Тонкий ненавязчивый контур остальных стран
    })
    .polygonAltitude(d => {
      const active = getActiveCountryForFeature(d);
      return active ? 0.012 : 0.003;
    })
    .polygonLabel(d => {
      const active = getActiveCountryForFeature(d);
      const name = d.properties?.name_ru || d.properties?.NAME || 'Государство';
      const flag = d.properties?.flag || '🏳️';

      if (active) {
        const cleanTooltipP = (p) => {
          if (!p) return '—';
          const disp = (p.displayName || p.nickname || '').trim();
          const user = (p.username || '').trim();
          if (user && disp && (disp === active.name || disp.endsWith(active.name) || disp.includes('| ' + active.name) || (active.iso2 && disp.includes(active.iso2)))) {
            return `@${user}`;
          }
          return disp || (user ? `@${user}` : '—');
        };
        const pNames = active.allPlayers && active.allPlayers.length 
          ? active.allPlayers.map(cleanTooltipP).join(', ')
          : (active.player ? `@${active.player}` : '—');

        let sovBadge = '';
        if (active.isUnionTerritory) {
          sovBadge = `<div class="globe-tooltip-row"><span class="k">Статус:</span> <span class="v" style="color:#f87171">Союзная республика СССР</span></div>`;
        } else if (active.isAutonomy && active.sovereign) {
          sovBadge = `<div class="globe-tooltip-row"><span class="k">Статус:</span> <span class="v" style="color:#60a5fa">Автономия (${active.sovereign})</span></div>`;
        } else if (active.autonomies && active.autonomies.length) {
          sovBadge = `<div class="globe-tooltip-row"><span class="k">Автономии:</span> <span class="v" style="color:#94a3b8">${active.autonomies.join(', ')}</span></div>`;
        }

        const roleLabel = active.isUnionTerritory ? 'Лидер СССР:' : (active.isAutonomy ? 'Игрок:' : 'Лидер:');
        const statusBadge = active.isUnionTerritory ? 'СССР' : `В СЕТИ (${active.playerCount || 1})`;

        return `
          <div class="globe-tooltip active">
            <div class="globe-tooltip-header">
              <span class="globe-tooltip-flag">${active.flag || flag}</span>
              <span class="globe-tooltip-title">${active.name}</span>
              <span class="globe-tooltip-status">${statusBadge}</span>
            </div>
            ${active.faction ? `<div class="globe-tooltip-row"><span class="k">Альянс:</span> <span class="v" style="color:${active.faction_color}">${active.faction}</span></div>` : ''}
            ${sovBadge}
            <div class="globe-tooltip-row"><span class="k">${roleLabel}</span> <span class="v">${pNames}</span></div>
            <div class="globe-tooltip-hint">Кликните для обзора и досье</div>
          </div>
        `;
      }
      return `
        <div class="globe-tooltip">
          <div class="globe-tooltip-header">
            <span class="globe-tooltip-flag">${flag}</span>
            <span class="globe-tooltip-title">${name}</span>
          </div>
          <div class="globe-tooltip-hint">Свободная территория</div>
        </div>
      `;
    })
    .onPolygonHover(hoverD => {
      hoveredCountryName = hoverD ? normName(hoverD.properties?.name_ru) : null;
      container.style.cursor = hoverD ? 'pointer' : 'grab';
    })
    .onPolygonClick(d => {
      const active = getActiveCountryForFeature(d);
      if (active) {
        focusCountry(active);
      } else {
        const centroid = d.properties?.centroid || [0, 0];
        const neutralRecord = {
          name: d.properties?.name_ru || d.properties?.NAME,
          flag: d.properties?.flag || '🏳️',
          faction: 'Свободная территория',
          faction_color: '#94a3b8',
          player: null,
          role: 'Не занята',
          lat: centroid[0],
          lng: centroid[1]
        };
        focusCountry(neutralRecord);
      }
    })

    // --- 3D МЕТКИ С ФЛАГАМИ ---
    .htmlElementsData([])
    .htmlLat(d => d.lat)
    .htmlLng(d => d.lng)
    .htmlAltitude(0.024)
    .htmlElement(d => createFlagMarkerElement(d));

  // Настройка авто-вращения камеры
  const controls = globeInstance.controls();
  if (controls) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 140;
    controls.maxDistance = 420;

    // Пауза вращения при взаимодействии мышью
    let resumeRotateTimer = null;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      if (resumeRotateTimer) clearTimeout(resumeRotateTimer);
    });
    controls.addEventListener('end', () => {
      if (!isAutoRotating) return;
      if (resumeRotateTimer) clearTimeout(resumeRotateTimer);
      resumeRotateTimer = setTimeout(() => {
        if (isAutoRotating) controls.autoRotate = true;
      }, 4000);
    });
  }

  // Установка стартовой ориентации камеры (центр на Евразию)
  globeInstance.pointOfView({ lat: 25, lng: 35, altitude: 2.3 }, 0);

  // Адаптивный ресайз при изменении размера окна
  const resizeObserver = new ResizeObserver(() => {
    if (globeInstance && container.clientWidth) {
      globeInstance.width(container.clientWidth);
      globeInstance.height(container.clientHeight);
    }
  });
  resizeObserver.observe(container);

  // 3. Подключение контролов интерфейса
  setupGlobeControls();

  // 4. Первичная загрузка стран из файла (players.json)
  await loadActiveCountries(currentSource);

  // 5. Запуск фонового авто-опроса файла на изменения
  startPolling();
}

/**
 * Настройка кнопок, селектора и карточек
 */
function setupGlobeControls() {
  // Селектор источника файла
  const select = document.getElementById('globeSourceSelect');
  const fileInput = document.getElementById('globeCustomFileInput');

  if (select) {
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        if (fileInput) fileInput.click();
      } else {
        loadActiveCountries(val);
      }
    });
  }

  // Загрузка кастомного JSON файла пользователя
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          const normalized = normalizeIncomingData(json);
          applyCountriesData(normalized);
          flashHudSyncIndicator();
          if (select) {
            let opt = select.querySelector('option[value="custom-loaded"]');
            if (!opt) {
              opt = document.createElement('option');
              opt.value = 'custom-loaded';
              select.appendChild(opt);
            }
            opt.textContent = `📁 ${file.name} (Загружен)`;
            select.value = 'custom-loaded';
          }
        } catch (err) {
          alert('Ошибка чтения JSON файла: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Кнопка принудительного обновления
  const refreshBtn = document.getElementById('globeRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      loadActiveCountries(currentSource).finally(() => {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
      });
    });
  }

  // Закрытие карточки страны
  const closeBtn = document.getElementById('closeCountryCardBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCountryCard);
  }

  // Кнопка авто-вращения (⏸ / ▶)
  const rotateBtn = document.getElementById('globeRotateToggle');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      isAutoRotating = !isAutoRotating;
      if (globeInstance) {
        globeInstance.controls().autoRotate = isAutoRotating;
      }
      rotateBtn.textContent = isAutoRotating ? '⏸ Вращение' : '▶ Вращение';
      rotateBtn.classList.toggle('active', isAutoRotating);
    });
  }

  // Кнопка сброса камеры
  const resetBtn = document.getElementById('globeResetCamera');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (globeInstance) {
        globeInstance.pointOfView({ lat: 25, lng: 35, altitude: 2.3 }, 800);
      }
    });
  }

  // Клик по фракционным бейджам внизу схемы
  document.querySelectorAll('.legend-pills button[data-faction]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const faction = btn.getAttribute('data-faction');
      if (!faction) return;

      // Ищем первую активную страну этой фракции
      for (const country of activeCountriesMap.values()) {
        if (country.faction === faction) {
          focusCountry(country);
          break;
        }
      }
    });
  });
}

// Экспорт для доступа из консоли и внешних модулей
window.reloadGlobeCountries = () => loadActiveCountries(currentSource);
window.setGlobeSource = (path) => loadActiveCountries(path);
window.focusGlobeCountry = (name) => {
  const c = activeCountriesMap.get(normName(name));
  if (c) focusCountry(c);
};
