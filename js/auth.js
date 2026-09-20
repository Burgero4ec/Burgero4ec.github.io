/**
 * auth.js - Безопасная авторизация через Discord OAuth2 вместо открытого auth_tokens.json
 */
export class DiscordAuthManager {
  constructor(config = {}) {
    this.clientId = config.clientId || '1125471835924992150'; // ID приложения Discord
    this.redirectUri = config.redirectUri || window.location.origin + window.location.pathname;
    this.storageKey = 'gl_discord_session';
    this.currentUser = this.loadSession();
  }

  loadSession() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          return parsed.user;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Генерация ссылки для перехода на авторизацию Discord
   */
  getLoginUrl() {
    const scope = encodeURIComponent('identify');
    const responseType = 'token'; // Либо 'code' при наличии Worker бэкенда
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('gl_oauth_state', state);

    return `https://discord.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=${responseType}&scope=${scope}&state=${state}`;
  }

  /**
   * Проверка возврата из Discord после редиректа
   */
  async handleCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return false;

    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('gl_oauth_state');

    if (savedState && state !== savedState) {
      console.error('OAuth state mismatch: потенциальная CSRF атака');
      return false;
    }

    if (accessToken) {
      try {
        const userRes = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!userRes.ok) throw new Error('Не удалось получить профиль Discord');

        const userData = await userRes.json();
        const sessionUser = {
          id: userData.id,
          username: userData.username,
          globalName: userData.global_name || userData.username,
          avatarUrl: userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
            : 'https://cdn.discordapp.com/embed/avatars/0.png'
        };

        const session = {
          user: sessionUser,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 дней
        };
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.currentUser = sessionUser;

        // Очищаем хэш токена из адресной строки для безопасности
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      } catch (err) {
        console.error('Ошибка Discord OAuth:', err);
      }
    }
    return false;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    this.currentUser = null;
    window.location.reload();
  }
}
