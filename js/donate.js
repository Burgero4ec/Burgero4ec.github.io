/**
 * donate.js - Донат-магазин с интерактивной физикой падающих слов Matter.js
 */
export function initDonatePhysics() {
  const container = document.getElementById('donateFalling');
  const textEl = document.getElementById('fallingText');
  const resetBtn = document.getElementById('fallingReset');
  if (!container || !textEl || typeof window.Matter === 'undefined') return;

  const Matter = window.Matter;
  const TEXT = 'Выбирай свою награду и улучшай игру';
  const HIGHLIGHT = ['Выбирай', 'награду', 'улучшай', 'игру'];
  const words = TEXT.split(' ');

  textEl.innerHTML = words
    .map(w => {
      const hl = HIGHLIGHT.some(h => w.toLowerCase().startsWith(h.toLowerCase()));
      return `<span class="word ${hl ? 'highlighted' : ''}">${w}</span>`;
    })
    .join(' ');

  // Подсказка для пользователя
  const canHover = window.matchMedia('(hover: hover)').matches;
  let hint = container.querySelector('.falling-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'falling-hint';
    container.appendChild(hint);
  }
  hint.textContent = canHover ? 'наведи курсор — слова упадут' : 'тапни — слова упадут';

  let engine = null;
  let runner = null;
  let wordBodies = [];
  let active = false;

  const mouse = Matter.Mouse.create(container);

  function startPhysics() {
    if (active) return;
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W <= 0 || H <= 0) return;

    engine = Matter.Engine.create();
    engine.world.gravity.y = 0.6;

    const walls = { isStatic: true, render: { visible: false } };
    Matter.World.add(engine.world, [
      Matter.Bodies.rectangle(W / 2, H + 25, W, 50, walls),
      Matter.Bodies.rectangle(-25, H / 2, 50, H, walls),
      Matter.Bodies.rectangle(W + 25, H / 2, 50, H, walls),
      Matter.Bodies.rectangle(W / 2, -25, W, 50, walls)
    ]);

    const spans = textEl.querySelectorAll('.word');
    wordBodies = [...spans].map((span, i) => {
      const sr = span.getBoundingClientRect();
      const cols = Math.min(words.length, 4);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const startX = (W / cols) * col + (W / cols) / 2;
      const startY = H / 2 - 20 + row * 40;

      const body = Matter.Bodies.rectangle(startX, startY, sr.width, sr.height, {
        restitution: 0.55,
        frictionAir: 0.02,
        friction: 0.3,
        angle: (Math.random() - 0.5) * 0.4
      });
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: Math.random() * -4
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);

      span.style.position = 'absolute';
      span.style.left = '0px';
      span.style.top = '0px';
      span.style.margin = '0';
      span.style.pointerEvents = 'none';

      Matter.World.add(engine.world, body);
      return { elem: span, body };
    });

    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.8, render: { visible: false } }
    });
    Matter.World.add(engine.world, mouseConstraint);

    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    active = true;
    container.classList.add('falling');

    (function loop() {
      if (!active) return;
      requestAnimationFrame(loop);
      wordBodies.forEach(({ elem, body }) => {
        elem.style.transform = `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
    })();
  }

  function stopPhysics() {
    if (!active) return;
    active = false;
    if (runner) Matter.Runner.stop(runner);
    if (engine) {
      Matter.World.clear(engine.world);
      Matter.Engine.clear(engine);
    }
    wordBodies.forEach(({ elem }) => {
      elem.style.position = '';
      elem.style.left = '';
      elem.style.top = '';
      elem.style.margin = '';
      elem.style.transform = '';
      elem.style.pointerEvents = '';
    });
    wordBodies = [];
    runner = null;
    engine = null;
    container.classList.remove('falling');
  }

  if (canHover) {
    container.addEventListener('mouseenter', startPhysics);
  } else {
    const startOnTap = () => { if (!active) startPhysics(); };
    container.addEventListener('click', startOnTap);
    container.addEventListener('touchstart', startOnTap, { passive: true });
  }

  if (resetBtn) {
    ['pointerdown', 'touchstart', 'mousedown'].forEach(ev =>
      resetBtn.addEventListener(ev, e => e.stopPropagation())
    );
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      stopPhysics();
    });
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
