export class DiscordAuthManager {
  constructor(config = {}) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri || window.location.origin + window.location.pathname;
    this.storageKey = 'gl_discord_session';
    this.currentUser = this.loadSession();
  }

  getLoginUrl() {
    const scope = encodeURIComponent('identify');
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('gl_oauth_state', state);
    return `https://discord.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=token&scope=${scope}&state=${state}`;
  }

  async handleCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return false;
    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    
    if (accessToken) {
      const r = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (r.ok) {
        const u = await r.json();
        this.currentUser = { id: u.id, username: u.username, avatar: u.avatar };
        localStorage.setItem(this.storageKey, JSON.stringify({ user: this.currentUser, expiresAt: Date.now() + 604800000 }));
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      }
    }
    return false;
  }
}
