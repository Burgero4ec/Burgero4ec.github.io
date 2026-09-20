/**
 * router.js - Модульная маршрутизация хэшей для Global Lens (#about, #rules, #archive, #donate)
 */
export class AppRouter {
  constructor(routes, defaultRoute = 'about') {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentRoute = null;
    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    // Первоначальная загрузка
    this.handleHashChange();
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace('#', '').trim();
    const routeName = rawHash || this.defaultRoute;
    this.navigate(routeName, false);
  }

  navigate(routeName, updateHash = true) {
    if (this.routes[routeName]) {
      this.currentRoute = routeName;
      if (updateHash) {
        window.location.hash = `#${routeName}`;
      }
      this.routes[routeName]();
      this.updateActiveNavLinks(routeName);
    } else if (this.routes[this.defaultRoute]) {
      this.navigate(this.defaultRoute, updateHash);
    }
  }

  updateActiveNavLinks(routeName) {
    document.querySelectorAll('[data-route]').forEach(el => {
      const target = el.getAttribute('data-route');
      if (target === routeName) {
        el.classList.add('nav-active');
        el.setAttribute('aria-current', 'page');
      } else {
        el.classList.remove('nav-active');
        el.removeAttribute('aria-current');
      }
    });
  }
}
