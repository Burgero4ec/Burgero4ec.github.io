/**
 * globe.js - Интерактивная 3D-навигация по земному шару (model-viewer) и хотспоты
 */

export function initGlobeNavigation() {
  const model = document.getElementById('heroModel');
  if (!model) return;

  function refreshHotspotPositions() {
    ['hotspot-na', 'hotspot-ea', 'hotspot-me', 'hotspot-ap'].forEach(slotName => {
      try {
        const el = model.querySelector(`[slot="${slotName}"]`);
        if (el && typeof model.updateHotspot === 'function') {
          model.updateHotspot({
            name: slotName,
            position: el.getAttribute('data-position'),
            normal: el.getAttribute('data-normal')
          });
        }
      } catch (err) {
        console.warn('[Globe] Hotspot position update failed:', err);
      }
    });
  }

  // Синхронизация видимости меток на сфере в зависимости от угла камеры
  function syncHotspotVisibility() {
    ['hotspot-na', 'hotspot-ea', 'hotspot-me', 'hotspot-ap'].forEach(slotName => {
      try {
        const q = model.queryHotspot(slotName);
        const el = document.querySelector(`[slot="${slotName}"]`);
        if (q && el) {
          if (q.facingCamera) {
            el.setAttribute('data-visible', '');
          } else {
            el.removeAttribute('data-visible');
          }
        }
      } catch (err) {
        console.warn('[Globe] Hotspot query failed:', err);
      }
    });
  }

  model.addEventListener('load', () => {
    refreshHotspotPositions();
    syncHotspotVisibility();
  });
  model.addEventListener('camera-change', syncHotspotVisibility);
  refreshHotspotPositions();
  syncHotspotVisibility();
  setInterval(syncHotspotVisibility, 150);

  let autoRotateTimer = null;

  function orbitTo(orbitStr) {
    if (!orbitStr) return;
    try {
      model.cameraOrbit = orbitStr;
      if (model.hasAttribute('auto-rotate')) {
        model.removeAttribute('auto-rotate');
      }
      if (autoRotateTimer) clearTimeout(autoRotateTimer);
      autoRotateTimer = setTimeout(() => {
        try {
          if (!model.hasAttribute('auto-rotate')) {
            model.setAttribute('auto-rotate', '');
          }
        } catch (timerErr) {
          console.error('[Globe] Failed to resume auto-rotation:', timerErr);
        }
      }, 8000);
    } catch (err) {
      console.error('[Globe] Failed to orbit camera:', err);
    }
  }

  document.querySelectorAll('.l-pill[data-orbit], .hotspot[data-orbit]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const targetOrbit = el.getAttribute('data-orbit');
      orbitTo(targetOrbit);
    });
  });
}
