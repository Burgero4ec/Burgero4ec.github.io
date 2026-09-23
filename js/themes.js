/**
 * themes.js - Модуль управления цветовыми темами (green, blue, orange)
 */

const THEME_NAMES = { green: 'Green', blue: 'Blue', orange: 'Orange' };

export function applyTheme(theme, save = true) {
  if (!THEME_NAMES[theme]) theme = 'green';
  document.documentElement.dataset.theme = theme;

  document.querySelectorAll('.theme-btn').forEach(x => {
    x.classList.toggle('active', x.dataset.themeSet === theme);
  });

  const tn = document.getElementById('themeName');
  if (tn) tn.textContent = THEME_NAMES[theme];

  if (save) {
    try {
      localStorage.setItem('gl-theme', theme);
    } catch (e) {}
  }
}

export function initThemes() {
  let saved = null;
  try {
    saved = localStorage.getItem('gl-theme');
  } catch (e) {}
  applyTheme(saved || 'green', false);

  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.addEventListener('click', () => applyTheme(b.dataset.themeSet, true));
  });
}
