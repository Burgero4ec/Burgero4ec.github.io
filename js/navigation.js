/**
 * navigation.js - Маршрутизация страниц, мобильное выдвижное меню и оверлей
 */
import { triggerOdysseyPageReveal } from './animations.js';
import { animateStats } from './stats.js';
import { resetDonatePhysics } from './donate.js';

const INFO_PAGE_IDS = ['about', 'news', 'updates'];
const RULE_PAGE_IDS = ['rules-server', 'rules-bot', 'rules-privacy'];
const PAGE_ALIASES = {
  boost: 'donate',
  prices: 'donate',
  shop: 'donate',
  store: 'donate'
};

export function closeDrawer() {
  document.body.classList.remove('menu-open');
}

export function openDrawer() {
  document.body.classList.add('menu-open');
}

export function toggleDrawer() {
  document.body.classList.toggle('menu-open');
}

export function go(rawId) {
  const id = (rawId || '').replace(/^[#/]+/, '').trim().toLowerCase();
  const resolvedId = PAGE_ALIASES[id] || id;
  const target = document.getElementById('page-' + resolvedId);
  if (!target) {
    console.error('[Global Lens] Неизвестная страница:', rawId);
    return;
  }

  // Если уходим с доната, мгновенно сбрасываем физику
  if (resolvedId !== 'donate' && typeof resetDonatePhysics === 'function') {
    resetDonatePhysics(true);
  }

  // Переключение активного класса у страниц
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p === target));

  // Переключение активных ссылок в сайдбаре
  document.querySelectorAll('.side-nav .active').forEach(x => x.classList.remove('active'));

  const infoBtn = document.getElementById('infoBtn');
  const infoGroup = document.getElementById('infoGroup');
  const rulesGroup = document.getElementById('rulesGroup');

  if (INFO_PAGE_IDS.includes(resolvedId) || RULE_PAGE_IDS.includes(resolvedId)) {
    if (infoBtn) infoBtn.classList.add('active');
    if (infoGroup) infoGroup.classList.add('open');
  }
  if (RULE_PAGE_IDS.includes(resolvedId) && rulesGroup) {
    rulesGroup.classList.add('open');
  }

  const sel = document.querySelector('.side-nav [data-go="' + resolvedId + '"]') || document.querySelector('.side-nav [data-go="' + id + '"]');
  if (sel) sel.classList.add('active');

  // Закрываем мобильное меню при переходе
  closeDrawer();

  // Запуск сопутствующих анимаций
  if (resolvedId === 'home') {
    animateStats();
  } else if (resolvedId === 'cabinet') {
    if (typeof window.renderCabinet === 'function') {
      window.renderCabinet();
    }
  }

  // Запуск каскадной анимации появления элементов в стиле Odyssey
  triggerOdysseyPageReveal(target);

  // Плавный скролл наверх
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Обновляем хэш без перезагрузки
  try {
    history.pushState(null, '', '#' + id);
  } catch (e) {}
}

export function initNavigation() {
  // Клик по ссылкам навигации
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go]');
    if (el) {
      e.preventDefault();
      go(el.dataset.go);
    }
  });

  // Раскрытие групп Информация и Правила
  const infoBtn = document.getElementById('infoBtn');
  const rulesBtn = document.getElementById('rulesBtn');
  if (infoBtn) {
    infoBtn.addEventListener('click', e => {
      e.preventDefault();
      const g = document.getElementById('infoGroup');
      if (g) g.classList.toggle('open');
    });
  }
  if (rulesBtn) {
    rulesBtn.addEventListener('click', e => {
      e.preventDefault();
      const g = document.getElementById('rulesGroup');
      if (g) g.classList.toggle('open');
    });
  }

  // Мобильное меню и оверлей
  const toggleBtn = document.getElementById('menuToggle');
  const overlay = document.getElementById('drawerOverlay');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleDrawer();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }

  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', e => {
      e.preventDefault();
      closeDrawer();
    });
  }

  // Тап вне сайдбара на мобильных
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('menu-open')) return;
    if (e.target.closest('.sidebar') || e.target.closest('#menuToggle')) return;
    closeDrawer();
  });

  // Свайп влево закрывает шторку
  let sx = 0;
  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (document.body.classList.contains('menu-open') && e.changedTouches[0].clientX - sx < -50) {
      closeDrawer();
    }
  }, { passive: true });

  // Реакция на изменение хэша в браузере (кнопки назад/вперед и внешние ссылки)
  window.addEventListener('hashchange', () => {
    const rawHash = (window.location.hash || '').replace(/^[#/]+/, '').trim();
    if (rawHash) {
      go(rawHash);
    }
  });

  // Проверка стартового маршрута (хэш, search query или pathname)
  const urlParams = new URLSearchParams(window.location.search);
  const queryRoute = urlParams.get('page') || urlParams.get('tab') || urlParams.get('p') || (window.location.search.replace(/^\?/, '').split('&')[0]);
  const rawHash = (window.location.hash || '').replace(/^[#/]+/, '').trim();
  const startRoute = rawHash || queryRoute;
  if (startRoute) {
    go(startRoute);
  }
}
