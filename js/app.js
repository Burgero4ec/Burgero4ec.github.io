/**
 * js/app.js - Главный координатор и точка входа модульного портала Global Lens
 */

import { initThemes, applyTheme } from './themes.js';
import { go, initNavigation, closeDrawer, openDrawer, toggleDrawer } from './navigation.js';
import { initOdysseyAnimations, refreshOdysseyElements, triggerOdysseyPageReveal } from './animations.js';
import { fluidCountUp, countUpAll, animateStats, loadMapInfo } from './stats.js';
import { loadSeason, openCountryModal, closeCountryModal, emojiToCountryCode, renderFlag } from './season.js';
import { loadStaffData, decorateStaff, openStaffModal, closeStaffModal } from './staff.js';
import { handleLogin, discordLogin, discordLogout, renderCabinet, testPlayersWebhook, loadPlayers, getPlayers, playerMeta } from './auth.js';
import { loadUpdates, loadPress, loadRules, loadFragment, initOrderToggles } from './news_press.js';
import { initArchives, renderArchives, loadArchiveFile } from './archives.js';
import { initDonatePhysics, initLanyard } from './donate.js';
import { initGlobeNavigation } from './globe.js';
import { initShameBoard, switchShamePersona } from './shame.js';
import { initWiki, switchWikiTab, updateWikiGlider, openWikiArticle, closeWikiReader } from './wiki.js';
import { openAllianceModal, closeAllianceModal, showAllianceOnGlobe } from './alliances.js';

// Экспорт глобальных функций в window для обратной совместимости с HTML onclick
window.go = go;
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;
window.openAllianceModal = openAllianceModal;
window.closeAllianceModal = closeAllianceModal;
window.showAllianceOnGlobe = showAllianceOnGlobe;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;
window.discordLogin = discordLogin;
window.discordLogout = discordLogout;
window.renderCabinet = renderCabinet;
window.testPlayersWebhook = testPlayersWebhook;
window.applyTheme = applyTheme;
window.initGlobeNavigation = initGlobeNavigation;
window.closeDrawer = closeDrawer;
window.openDrawer = openDrawer;
window.toggleDrawer = toggleDrawer;
window.loadSeason = loadSeason;
window.animateStats = animateStats;
window.initShameBoard = initShameBoard;
window.switchShamePersona = switchShamePersona;
window.switchWikiTab = switchWikiTab;
window.updateWikiGlider = updateWikiGlider;
window.openWikiArticle = openWikiArticle;
window.closeWikiReader = closeWikiReader;

// Инициализация при готовности DOM (мгновенный рендер без блокировок сети)
function initApp() {
  // 1. Темы оформления
  initThemes();

  // 2. Навигация и маршрутизация (чистые URL, хэши, мобильное меню)
  // Запускает начальный роут (/season, /wiki, /staff и т.д.) сразу же
  initNavigation();

  // 3. Анимации появления блоков в стиле Odyssey
  initOdysseyAnimations();

  // 4. Порядок сортировки сообщений (новые/старые)
  initOrderToggles();

  // 5. Ленивые архивы (выбор сезонов, фильтрация)
  initArchives();

  // 6. Интерактивная физика донат-магазина и бейдж новостей
  initDonatePhysics();
  initLanyard();

  // 7. Доска позора Понза
  initShameBoard();

  // 8. Вики и база знаний
  initWiki();

  // 9. Живая статистика сервера и карты (быстрый fallback/кэш)
  loadMapInfo();
  initGlobeNavigation();

  // 10. Фоновая неблокирующая авторизация Discord OAuth
  // Ни в коем случае не ждем сеть перед показом интерфейса: авторизация обновляет UI по готовности
  handleLogin().catch(e => {
    console.warn('[Global Lens] Async auth background warning:', e);
  });

  // 11. Фоновая загрузка базы игроков, сезона и состава команды
  loadPlayers().then(() => {
    loadSeason();
    decorateStaff();
  }).catch(e => {
    console.warn('[Global Lens] Players/Season async load warning:', e);
  });

  // 12. Фоновая загрузка ленты обновлений и прессы
  loadUpdates();
  loadPress();

  // 13. Фоновая загрузка правил и фрагментов
  loadRules('bot', 'rulesBotBody');
  loadRules('privacy', 'rulesPrivacyBody');
  loadFragment('rules_server_content.html', 'rulesServerBody');

  // Если персонал еще не отрисован статически в HTML, подгружаем фрагмент
  const staffContainer = document.getElementById('staffBody');
  if (staffContainer && (!staffContainer.children.length || staffContainer.querySelector('.loading'))) {
    loadFragment('staff_content.html', 'staffBody').then(() => {
      decorateStaff();
    });
  } else {
    decorateStaff();
  }

  // Обновляем регистрацию элементов в анимациях Odyssey после завершения рендера
  setTimeout(() => {
    refreshOdysseyElements();
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
