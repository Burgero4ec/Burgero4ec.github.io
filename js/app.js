/**
 * app.js - Главная модульная точка входа Global Lens (ES6 Modules)
 * Заменяет монолит на 925 строк чистой архитектурой
 */
import { AppRouter } from './router.js';
import { ThemeManager } from './themes.js';
import { SafeDiscordParser } from './parser.js';
import { ArchiveManager } from './archives.js';
import { DiscordAuthManager } from './auth.js';
import { DonateManager } from './donate.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Инициализация тем (Green, Blue, Orange)
  const themeManager = new ThemeManager();
  themeManager.initButtons();

  // 2. Инициализация Discord OAuth2 авторизации
  const auth = new DiscordAuthManager({
    clientId: '1347000000000000000', // Укажите Client ID вашего Discord приложения
    redirectUri: window.location.origin + window.location.pathname
  });
  await auth.handleCallback();

  // Обновление плашки пользователя
  const userContainer = document.getElementById('userProfileBar');
  if (userContainer) {
    if (auth.currentUser) {
      userContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <img src="${auth.currentUser.avatarUrl}" class="w-7 h-7 rounded-full border border-emerald-400" alt="avatar" />
          <span class="text-xs text-white font-medium">${auth.currentUser.globalName}</span>
          <button id="logoutBtn" class="text-[10px] text-zinc-400 hover:text-rose-400 ml-2">Выйти</button>
        </div>
      `;
      document.getElementById('logoutBtn')?.addEventListener('click', () => auth.logout());
    } else {
      userContainer.innerHTML = `
        <a href="${auth.getLoginUrl()}" class="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold flex items-center gap-1.5 transition">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          Войти через Discord
        </a>
      `;
    }
  }

  // 3. Инициализация безопасного парсера и менеджера архивов
  const parser = new SafeDiscordParser(window.DOMPurify);
  const archives = new ArchiveManager('archiveContainer', parser);

  // 4. Донат и опциональная физика
  new DonateManager('donateSection', 'togglePhysicsBtn');

  // 5. Маршрутизатор по разделам сайта
  new AppRouter({
    about: () => {
      document.getElementById('aboutSection')?.classList.remove('hidden');
      document.getElementById('archiveSection')?.classList.add('hidden');
      document.getElementById('donateSection')?.classList.add('hidden');
    },
    archive: () => {
      document.getElementById('aboutSection')?.classList.add('hidden');
      document.getElementById('archiveSection')?.classList.remove('hidden');
      document.getElementById('donateSection')?.classList.add('hidden');
      archives.loadSeason(26);
    },
    donate: () => {
      document.getElementById('aboutSection')?.classList.add('hidden');
      document.getElementById('archiveSection')?.classList.add('hidden');
      document.getElementById('donateSection')?.classList.remove('hidden');
    }
  }, 'about');

  console.log('Global Lens App v2.0 Modular System Loaded.');
});
