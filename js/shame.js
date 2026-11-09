/**
 * shame.js - Доска позора Понза (200 курьёзов, наград и провалов)
 */
import { esc } from './utils.js';
import { STAFF_MODAL_ITEMS } from './staff_data.js';

let shameItems = null;

export async function loadShameData() {
  if (shameItems && shameItems.length) return shameItems;
  try {
    const res = await fetch('data/awards_ponzc.json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.items && data.items.length) {
        shameItems = data.items;
        return shameItems;
      }
    }
  } catch (e) {
    console.warn('[Shame] Fetch failed, using bundled fallback:', e);
  }

  // Резервный парсинг из встроенных данных STAFF_MODAL_ITEMS.ponzc
  if (STAFF_MODAL_ITEMS && STAFF_MODAL_ITEMS.ponzc) {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = STAFF_MODAL_ITEMS.ponzc;
      const parsed = [];
      let currentCat = 'ОСОБЫЕ ЗАСЛУГИ';
      let idCounter = 0;
      tempDiv.querySelectorAll('.award').forEach(el => {
        const lbl = el.querySelector('.lbl');
        if (lbl) {
          currentCat = lbl.textContent.trim();
          return;
        }
        const b = el.querySelector('b');
        const span = el.querySelector('span:not(.lbl)');
        if (b) {
          const name = b.textContent.trim();
          const desc = span ? span.textContent.replace(/^—\s*/, '').trim() : '';
          parsed.push({
            id: idCounter++,
            category: currentCat,
            name: name,
            description: desc
          });
        }
      });
      if (parsed.length > 0) {
        shameItems = parsed;
        return shameItems;
      }
    } catch (e2) {
      console.error('[Shame] Fallback parse failed:', e2);
    }
  }

  return [];
}

export async function initShameBoard() {
  const container = document.getElementById('shameItemsGrid');
  if (!container) return;

  const items = await loadShameData();
  if (!items || !items.length) {
    container.innerHTML = '<p class="loading">Загрузка данных доски позора...</p>';
    return;
  }

  let activeFilter = 'all';
  let searchQuery = '';

  function render() {
    const q = searchQuery.toLowerCase().trim();
    const filtered = items.filter(it => {
      // Фильтрация по категории
      if (activeFilter === 'caucasus') {
        if (it.id < 1 || it.id > 100) return false;
      } else if (activeFilter === 'rusich') {
        if (it.id < 101 || it.id > 200) return false;
      }
      // Фильтрация по поисковому запросу
      if (q) {
        const text = ((it.name || '') + ' ' + (it.description || '') + ' ' + (it.category || '')).toLowerCase();
        return text.includes(q);
      }
      return true;
    });

    const countTotalEl = document.getElementById('shameCountTotal');
    if (countTotalEl && !q && activeFilter === 'all') {
      countTotalEl.textContent = items.length;
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="shame-empty">
          <svg class="ic"><use href="#i-search"/></svg>
          <b>Ничего не найдено</b>
          <p>По запросу «${esc(q)}» не обнаружено ни одного зафиксированного курьёза.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(it => {
      const isCaucasus = it.id >= 1 && it.id <= 100;
      const isRusich = it.id >= 101 && it.id <= 200;
      const isSpecial = it.id === 0;

      let catBadge = '';
      if (isSpecial) {
        catBadge = '<span class="shame-cat-tag special">ОСОБЫЙ ПРОВАЛ</span>';
      } else if (isCaucasus) {
        catBadge = '<span class="shame-cat-tag caucasus">ГОРСКАЯ РЕСПУБЛИКА</span>';
      } else if (isRusich) {
        catBadge = '<span class="shame-cat-tag rusich">БРН «РУСИЧ»</span>';
      }

      return `
        <div class="shame-card ${isSpecial ? 'shame-special' : ''}">
          <div class="shame-card-head">
            <span class="shame-card-num">#${it.id === 0 ? '★' : it.id}</span>
            ${catBadge}
          </div>
          <div class="shame-card-title">${esc(it.name)}</div>
          ${it.description ? `<div class="shame-card-desc">— ${esc(it.description)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Привязка вкладок категорий
  document.querySelectorAll('.shame-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.shame-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      render();
    };
  });

  // Привязка живого поиска
  const searchInput = document.getElementById('shameSearchInput');
  const clearBtn = document.getElementById('shameSearchClear');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
      render();
    };
  }
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        render();
      }
    };
  }

  render();
}

window.initShameBoard = initShameBoard;
