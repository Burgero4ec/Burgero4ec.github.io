import { AppRouter } from './router.js';
import { ThemeManager } from './themes.js';
import { SafeDiscordParser } from './parser.js';
import { ArchiveManager } from './archives.js';
import { DiscordAuthManager } from './auth.js';
import { DonateManager } from './donate.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Управление темами (Green, Blue, Orange)
  const themeManager = new ThemeManager();
  themeManager.initButtons();

  // 2. Discord OAuth2 безопасная авторизация
  const auth = new DiscordAuthManager({
    clientId: '1347000000000000000',
    redirectUri: window.location.origin + window.location.pathname
  });
  await auth.handleCallback();

  // 3. Безопасный парсер с DOMPurify и менеджер раздельных архивов
  const parser = new SafeDiscordParser(window.DOMPurify);
  const archives = new ArchiveManager('archiveContainer', parser);

  // 4. Донат с опциональной физикой
  new DonateManager('donateSection', 'togglePhysicsBtn');

  // 5. Роутер хешей
  new AppRouter({
    about: () => { /* активация секции */ },
    archive: () => { archives.loadSeason(26); },
    donate: () => { /* активация секции */ }
  }, 'about');
});
