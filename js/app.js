/**
 * js/app.js - Главный координатор и точка входа модульного портала Global Lens
 */

import { initThemes, applyTheme } from './themes.js';
import { go, initNavigation, closeDrawer, openDrawer, toggleDrawer } from './navigation.js';
import { initOdysseyAnimations, refreshOdysseyElements, triggerOdysseyPageReveal } from './animations.js';
import { fluidCountUp, countUpAll, animateStats, loadMapInfo } from './stats.js';
import { loadSeason, openCountryModal, closeCountryModal, openSeasonModal, closeSeasonModal, emojiToCountryCode, renderFlag } from './season.js';
import { loadStaffData, decorateStaff, openStaffModal, closeStaffModal } from './staff.js';
import { handleLogin, discordLogout, renderCabinet, testPlayersWebhook, loadPlayers, getPlayers, playerMeta } from './auth.js';
import { loadUpdates, loadPress, loadRules, loadFragment, initOrderToggles } from './news_press.js';
import { initArchives, renderArchives, loadArchiveFile } from './archives.js';
import { initDonatePhysics, initLanyard } from './donate.js';
import { initGlobeNavigation } from './globe.js';

// Экспорт глобальных функций в window для обратной совместимости с HTML onclick
window.go = go;
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;
window.openSeasonModal = openSeasonModal;
window.closeSeasonModal = closeSeasonModal;
window.openStaffModal = openStaffModal;
window.closeStaffModal = closeStaffModal;
window.discordLogout = discordLogout;
window.testPlayersWebhook = testPlayersWebhook;
window.applyTheme = applyTheme;
window.closeDrawer = closeDrawer;
window.openDrawer = openDrawer;
window.toggleDrawer = toggleDrawer;
window.loadSeason = loadSeason;
window.animateStats = animateStats;
window.renderArchives = renderArchives;

// Инициализация при готовности DOM
async function initApp() {
  // 1. Темы оформления
  initThemes();

  // 2. Навигация и мобильное выдвижное меню
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

  // 7. Авторизация Discord и профиль игрока
  await handleLogin();

  // 8. Живая статистика сервера и карты
  loadMapInfo();
  initGlobeNavigation();

  // 9. Загрузка базы игроков, сезона и состава команды
  loadPlayers().then(() => {
    loadSeason();
    decorateStaff();
  });

  // 10. Загрузка ленты обновлений и прессы
  loadUpdates();
  loadPress();

  // 11. Загрузка правил и фрагментов
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

  // 12. Первичный роутинг по хэшу URL (#season, #staff, #donate и т.д.)
  const hash = window.location.hash.replace(/^#/, '').trim();
  if (hash && document.getElementById('page-' + hash)) {
    go(hash);
  } else {
    animateStats();
    triggerOdysseyPageReveal(document.getElementById('page-home'));
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
