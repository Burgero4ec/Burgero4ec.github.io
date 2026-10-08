/**
 * donate.js - Донат-магазин с интерактивной физикой падающих слов Matter.js
 * Включает Web Audio API звуковые эффекты, тактильную отдачу, искры столкновений,
 * плавный магнитный возврат при сбросе и кинетический отклик на движение курсора.
 */

// ===== WEB AUDIO API МИКРО-СИНТЕЗАТОР =====
class DonateSoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      const saved = localStorage.getItem('gl_sound_fx');
      if (saved !== null) this.enabled = saved === '1';
    } catch (_) {}
    this.lastCollisionTime = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('gl_sound_fx', this.enabled ? '1' : '0'); } catch (_) {}
    if (this.enabled) this.playTone(520, 0.06, 0.12, 'sine');
    return this.enabled;
  }

  playCollision(speed = 3) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastCollisionTime < 45) return;
    this.lastCollisionTime = now;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const vol = Math.min(0.18, Math.max(0.02, speed * 0.025));
      const freq = 260 + Math.random() * 160;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch (_) {}
  }

  playGrab() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;
    this.playTone(460, 0.05, 0.09, 'sine');
  }

  playToss() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;
    this.playTone(320, 0.08, 0.07, 'triangle');
  }

  playReset() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.22, 0.10, 'sine');
      }, idx * 65);
    });
  }

  playTone(freq, duration, volume, type = 'sine') {
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration + 0.01);
    } catch (_) {}
  }
}

// ===== ТАКТИЛЬНАЯ ОТДАЧА =====
function triggerHaptic(pattern = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

// ===== СИСТЕМА ИСКР ПРИ СТОЛКНОВЕНИЯХ (CANVAS FX) =====
class DonateSparkFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.resize();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, rect.width * dpr);
    this.canvas.height = Math.max(1, rect.height * dpr);
    if (this.ctx) {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }
  }

  burst(x, y, count = 5, color = '#4ade80') {
    if (!this.ctx) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        alpha: 1,
        decay: 0.038 + Math.random() * 0.03,
        size: 1.5 + Math.random() * 2,
        color
      });
    }
    if (!this.animId) this.loop();
  }

  loop() {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
    }
  }

  clear() {
    this.particles = [];
    if (this.ctx && this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);
    }
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}

export function initDonatePhysics() {
  const container = document.getElementById('donateFalling');
  const textEl = document.getElementById('fallingText');
  const resetBtn = document.getElementById('fallingReset');
  const soundBtn = document.getElementById('fallingSound');
  const fxCanvas = document.getElementById('fallingFxCanvas');
  if (!container || !textEl || typeof window.Matter === 'undefined') return;

  const Matter = window.Matter;
  const sound = new DonateSoundFX();
  const sparks = fxCanvas ? new DonateSparkFX(fxCanvas) : null;

  // Инициализация кнопки звука
  if (soundBtn) {
    const updateSoundIcons = (isOn) => {
      const onIcon = soundBtn.querySelector('.ic-sound-on');
      const offIcon = soundBtn.querySelector('.ic-sound-off');
      if (onIcon && offIcon) {
        onIcon.style.display = isOn ? 'block' : 'none';
        offIcon.style.display = isOn ? 'none' : 'block';
      }
    };
    updateSoundIcons(sound.enabled);
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newState = sound.toggle();
      updateSoundIcons(newState);
      triggerHaptic(8);
    });
  }

  // Получение актуального акцентного цвета из CSS переменной
  function getThemeAccentColor() {
    try {
      const computed = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
      return computed || '#4ade80';
    } catch (_) {
      return '#4ade80';
    }
  }

  // Убеждаемся, что слова оформлены в span.word
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hint = container.querySelector('.falling-hint');
  let hintText = hint ? hint.querySelector('.hint-text') : null;
  let hintIcon = hint ? hint.querySelector('.hint-icon') : null;

  function updateHint(type) {
    if (!hintText) return;
    if (type === 'initial') {
      hintText.textContent = canHover ? 'наведи курсор — слова упадут' : 'тапни — слова упадут';
      if (hintIcon) hintIcon.textContent = canHover ? '⚡' : '📱';
    } else if (type === 'falling') {
      hintText.textContent = canHover ? 'перетаскивай и бросай слова!' : 'перетаскивай и бросай слова!';
      if (hintIcon) hintIcon.textContent = '🎯';
    } else if (type === 'settled') {
      hintText.textContent = canHover ? 'нажми ↺ (или R), чтобы вернуть' : 'нажми ↺, чтобы вернуть';
      if (hintIcon) hintIcon.textContent = '↺';
    }
  }
  updateHint('initial');

  let engine = null;
  let runner = null;
  let wordBodies = [];
  let walls = [];
  let active = false;
  let isResetting = false;
  let cooldownUntil = 0;
  let mouseConstraint = null;

  // Слежение за движением мыши для кинетического расталкивания
  let lastMouseX = 0, lastMouseY = 0, lastMouseT = 0;

  function startPhysics() {
    if (active || isResetting) return;
    if (Date.now() < cooldownUntil) return;

    sound.ensureContext();

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W <= 20 || H <= 20) return;

    if (sparks) sparks.resize();

    engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.78 }
    });

    // 1. Создаем границы с запасом
    const wallOpts = { isStatic: true, friction: 0.35, restitution: 0.5, render: { visible: false } };
    const ground = Matter.Bodies.rectangle(W / 2, H + 25, W + 200, 50, wallOpts);
    const leftWall = Matter.Bodies.rectangle(-25, H / 2, 50, H * 2, wallOpts);
    const rightWall = Matter.Bodies.rectangle(W + 25, H / 2, 50, H * 2, wallOpts);
    const ceiling = Matter.Bodies.rectangle(W / 2, -30, W + 200, 50, wallOpts);

    walls = [ground, leftWall, rightWall, ceiling];
    Matter.World.add(engine.world, walls);

    // 2. Рассчитываем точное исходное положение каждого слова в контейнере
    const spans = textEl.querySelectorAll('.word');
    if (!spans.length) return;

    wordBodies = [...spans].map((span) => {
      const sr = span.getBoundingClientRect();
      const startX = Math.round(sr.left - rect.left + sr.width / 2);
      const startY = Math.round(sr.top - rect.top + sr.height / 2);
      const w = Math.max(20, Math.round(sr.width));
      const h = Math.max(16, Math.round(sr.height));

      // Сохраняем исходные координаты для идеального магнитного возврата
      span.dataset.origX = startX;
      span.dataset.origY = startY;

      const body = Matter.Bodies.rectangle(startX, startY, w, h, {
        restitution: 0.58,
        frictionAir: 0.016,
        friction: 0.28,
        density: 0.002,
        chamfer: { radius: 8 },
        angle: (Math.random() - 0.5) * 0.06
      });

      // Деликатный начальный импульс
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 3.6,
        y: -(Math.random() * 2.2 + 0.8)
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);

      // Мгновенная фиксация стилей без дергания
      span.style.position = 'absolute';
      span.style.left = '0px';
      span.style.top = '0px';
      span.style.width = w + 'px';
      span.style.height = h + 'px';
      span.style.margin = '0';
      span.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%) rotate(0rad)`;

      Matter.World.add(engine.world, body);
      return { elem: span, body, w, h, origX: startX, origY: startY };
    });

    // 3. Интерактивная мышь
    const mouse = Matter.Mouse.create(container);
    mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.88,
        angularStiffness: 0.7,
        render: { visible: false }
      }
    });
    Matter.World.add(engine.world, mouseConstraint);

    // Обработка захвата и броска
    Matter.Events.on(mouseConstraint, 'startdrag', (evt) => {
      const match = wordBodies.find(item => item.body === evt.body);
      if (match) {
        match.elem.classList.add('is-dragged');
        container.classList.add('is-dragging');
        sound.playGrab();
        triggerHaptic(14);
      }
    });

    Matter.Events.on(mouseConstraint, 'enddrag', (evt) => {
      const match = wordBodies.find(item => item.body === evt.body);
      if (match) {
        match.elem.classList.remove('is-dragged');
        container.classList.remove('is-dragging');
        const v = Math.hypot(evt.body.velocity.x, evt.body.velocity.y);
        if (v > 4.5) {
          sound.playToss();
          triggerHaptic(10);
        }
      }
    });

    // Звуки и искры при столкновениях
    Matter.Events.on(engine, 'collisionStart', (evt) => {
      if (!active) return;
      const themeColor = getThemeAccentColor();
      for (const pair of evt.pairs) {
        const speed = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y
        );

        if (speed > 1.8) {
          sound.playCollision(speed);
        }

        if (speed > 3.4 && sparks && pair.collision?.supports?.length) {
          const pt = pair.collision.supports[0];
          sparks.burst(pt.x, pt.y, Math.min(8, Math.round(speed * 1.5)), themeColor);
          triggerHaptic(6);
        }
      }
    });

    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    active = true;
    container.classList.add('active-physics');
    updateHint('falling');

    // Цикл синхронизации DOM со свойствами физических тел Matter.js
    (function loop() {
      if (!active) return;
      requestAnimationFrame(loop);
      for (let i = 0; i < wordBodies.length; i++) {
        const { elem, body } = wordBodies[i];
        elem.style.transform = `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
      }
    })();
  }

  // Кинетическое расталкивание курсором при быстром свайпе
  function handlePointerMove(e) {
    if (!active || !engine || mouseConstraint?.body) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastMouseT);
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const vx = (mx - lastMouseX) / dt;
    const vy = (my - lastMouseY) / dt;
    const speed = Math.hypot(vx, vy);

    lastMouseX = mx;
    lastMouseY = my;
    lastMouseT = now;

    if (speed > 0.8) {
      for (let i = 0; i < wordBodies.length; i++) {
        const { body } = wordBodies[i];
        const dist = Math.hypot(body.position.x - mx, body.position.y - my);
        if (dist < 75) {
          const forceMag = Math.min(0.008, speed * 0.0016);
          Matter.Body.applyForce(body, body.position, {
            x: vx * forceMag,
            y: vy * forceMag
          });
        }
      }
    }
  }

  container.addEventListener('pointermove', handlePointerMove, { passive: true });

  // Плавный магнитный сброс (возврат в начальное состояние)
  function stopPhysics() {
    if (!active && !isResetting) return;
    if (isResetting) return;
    isResetting = true;
    active = false;
    cooldownUntil = Date.now() + 450;

    if (resetBtn) resetBtn.classList.add('spinning');
    sound.playReset();
    triggerHaptic([12, 35, 15]);

    if (runner) {
      Matter.Runner.stop(runner);
      runner = null;
    }
    if (engine) {
      Matter.World.clear(engine.world);
      Matter.Engine.clear(engine);
      engine = null;
    }

    // Анимируем возврат элементов на исходные позиции через CSS spring
    wordBodies.forEach(({ elem, origX, origY }) => {
      elem.classList.add('returning');
      elem.style.transform = `translate(${origX}px, ${origY}px) translate(-50%, -50%) rotate(0deg)`;
    });

    setTimeout(() => {
      wordBodies.forEach(({ elem }) => {
        elem.classList.remove('returning', 'is-dragged');
        elem.style.position = '';
        elem.style.left = '';
        elem.style.top = '';
        elem.style.width = '';
        elem.style.height = '';
        elem.style.margin = '';
        elem.style.transform = '';
      });

      wordBodies = [];
      walls = [];
      mouseConstraint = null;
      if (sparks) sparks.clear();

      container.classList.remove('active-physics', 'is-dragging');
      if (resetBtn) resetBtn.classList.remove('spinning');
      updateHint('initial');
      isResetting = false;
    }, 620);
  }

  // Запуск по наведению или тапу
  if (canHover) {
    container.addEventListener('mouseenter', startPhysics);
  } else {
    const startOnTap = () => { if (!active) startPhysics(); };
    container.addEventListener('click', startOnTap);
    container.addEventListener('touchstart', startOnTap, { passive: true });
  }

  // Обработка кнопки сброса
  if (resetBtn) {
    ['pointerdown', 'touchstart', 'mousedown'].forEach(ev =>
      resetBtn.addEventListener(ev, e => e.stopPropagation())
    );
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      stopPhysics();
    });
  }

  // Горячая клавиша R для сброса физики
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
      const donatePage = document.getElementById('page-donate');
      if (donatePage && donatePage.classList.contains('active') && active) {
        stopPhysics();
      }
    }
  });

  // Отслеживание изменения размера контейнера
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (sparks) sparks.resize();
      if (active && engine && walls.length === 4) {
        const rect = container.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        Matter.Body.setPosition(walls[0], { x: W / 2, y: H + 25 });
        Matter.Body.setPosition(walls[1], { x: -25, y: H / 2 });
        Matter.Body.setPosition(walls[2], { x: W + 25, y: H / 2 });
        Matter.Body.setPosition(walls[3], { x: W / 2, y: -30 });
      }
    });
    ro.observe(container);
  }
}


export function initLanyard() {
  const zone = document.getElementById('lanyardZone');
  const card = document.getElementById('lanyardCard');
  const strap = document.querySelector('.lanyard-strap');
  if (!zone || !card) return;

  let a = 0, va = 0;          /* качание rotateZ */
  let tw = 0, vtw = 0;        /* кручение rotateY */
  let flip = 0, flipT = 0;    /* переворот карточки */
  let dragging = false, lx = 0, moved = 0;

  zone.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; moved = 0; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointercancel', () => { dragging = false; });
  zone.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx;
    lx = e.clientX;
    moved += Math.abs(dx);
    va += dx * 0.0009;
    vtw += dx * 0.004;
  });
  card.addEventListener('click', () => {
    if (moved < 6) flipT = flipT ? 0 : 180;
  });

  const K = 30, D = 2.2, KT = 22, DT = 1.8;
  let last = performance.now();
  (function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 0.033);
    last = t;
    va += (-K * a - D * va) * dt;
    a += va * dt;
    vtw += (-KT * tw - DT * vtw) * dt;
    tw += vtw * dt;
    flip += (flipT - flip) * 0.12;
    const idle = Math.sin(t / 1100) * 1.5 + Math.sin(t / 4700) * 1.2;
    const deg = a * 57.29 + idle;
    const degY = tw * 57.29 + flip;
    card.style.transform = 'rotateZ(' + deg.toFixed(2) + 'deg) rotateY(' + degY.toFixed(2) + 'deg)';
    if (strap) strap.style.transform = 'translateX(-50%) rotate(' + (deg * 0.35).toFixed(2) + 'deg)';
  })(last);
}
