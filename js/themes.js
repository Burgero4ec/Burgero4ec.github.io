/**
 * themes.js - Модуль управления цветовыми схемами (green, blue, orange)
 */
export const THEMES = {
  GREEN: 'green',
  BLUE: 'blue',
  ORANGE: 'orange'
};

export class ThemeManager {
  constructor(storageKey = 'gl-theme', defaultTheme = THEMES.GREEN) {
    this.storageKey = storageKey;
    this.defaultTheme = defaultTheme;
    this.currentTheme = this.loadTheme();
  }

  loadTheme() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && Object.values(THEMES).includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Storage unavailable, fallback to default theme');
    }
    return this.defaultTheme;
  }

  applyTheme(themeName) {
    if (!Object.values(THEMES).includes(themeName)) return;

    this.currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Обновление иконок и логотипов под тему
    this.updateThemeVisuals(themeName);

    try {
      localStorage.setItem(this.storageKey, themeName);
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('gl-theme-changed', { detail: { theme: themeName } }));
  }

  updateThemeVisuals(theme) {
    const logoImg = document.getElementById('navbarLogo');
    if (logoImg) {
      logoImg.src = `img/logo_${theme}.png`;
    }
  }

  initButtons() {
    document.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.getAttribute('data-set-theme');
        this.applyTheme(theme);
      });
    });
    this.applyTheme(this.currentTheme);
  }
}
