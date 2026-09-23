/**
 * animations.js - Анимации появления блоков в стиле odyssey-mpg.xyz
 */

let odysseyObserver = null;

export function initOdysseyAnimations() {
  if (typeof window === 'undefined') return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.08
  };

  odysseyObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('odyssey-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  refreshOdysseyElements();
}

/**
 * Сканирует документ и прикрепляет наблюдатель к новым карточкам и блокам
 */
export function refreshOdysseyElements(root = document) {
  if (!odysseyObserver) return;

  const selectors = [
    '.card',
    '.c-card',
    '.stat',
    '.stats-col',
    '.sec-title',
    '.folder',
    '.member',
    '.update-card',
    '.hero',
    '.about-split',
    '.grid-3 > article',
    '.grid-2 > article'
  ];

  const elements = root.querySelectorAll(selectors.join(', '));
  elements.forEach((el, index) => {
    if (!el.classList.contains('odyssey-item')) {
      el.classList.add('odyssey-item');
      // Присваиваем индекс задержки внутри родителя
      const parent = el.parentElement;
      const siblingIndex = parent ? Array.from(parent.children).indexOf(el) : (index % 6);
      el.style.setProperty('--odyssey-delay', Math.min(siblingIndex, 8));
      odysseyObserver.observe(el);
    }
  });
}

/**
 * Каскадный запуск появления при переключении страницы в стиле Odyssey
 * @param {HTMLElement} pageEl
 */
export function triggerOdysseyPageReveal(pageEl) {
  if (!pageEl) return;

  const items = pageEl.querySelectorAll('.card, .c-card, .stat, .stats-col, .sec-title, .folder, .member, .update-card, .hero');
  items.forEach((el, i) => {
    el.classList.remove('odyssey-visible');
    el.classList.add('odyssey-item');
    const delay = Math.min(i * 0.045, 0.4);
    el.style.setProperty('--odyssey-stagger', `${delay}s`);
  });

  // Запуск с микрозадержкой для срабатывания transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      items.forEach(el => {
        el.classList.add('odyssey-visible');
      });
    });
  });
}
