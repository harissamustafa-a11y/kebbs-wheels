// Kebbs Wheels and Tyres v2: scroll-driven walk-in, parallax, reveals, rotating reviews.
(() => {
  document.body.classList.remove('no-js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.getElementById('nav');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const range = (p, a, b) => smooth(clamp((p - a) / (b - a)));

  // Reveal blocks as they enter the viewport.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Walk-in: progress through the tall .walk track (0 at the top, 1 when the pinned
  // stage is about to release) drives every layer. The exterior pushes in toward the
  // shop door so the car slides out of frame, then dissolves into the interior, which
  // keeps moving forward while the cinematic bars open. Transform and opacity only.
  const walk = document.querySelector('.walk');
  const q = (s) => walk.querySelector(s);
  const ext = q('.walk__ext'), int = q('.walk__int'), veil = q('.walk__veil'), start = q('.walk__start'), end = q('.walk__end');
  const barT = q('.walk__bar--top'), barB = q('.walk__bar--bot'), bar = q('.walk__progress');
  const paintWalk = () => {
    const r = walk.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp(-r.top / (r.height - vh));
    const zMax = window.innerWidth < 760 ? 2.15 : 1.8;
    ext.style.transform = `scale(${(1 + (zMax - 1) * range(p, 0, 0.62)).toFixed(4)})`;
    // Dissolve through shadow rather than a flat double exposure.
    const x = range(p, 0.5, 0.62);
    ext.style.opacity = (1 - x).toFixed(3);
    int.style.opacity = x.toFixed(3);
    veil.style.opacity = (Math.sin(Math.PI * clamp((p - 0.47) / 0.18)) * 0.72).toFixed(3);
    int.style.transform = `scale(${(1 + 0.16 * range(p, 0.5, 1)).toFixed(4)})`;
    const open = 1 - range(p, 0.5, 0.85);
    barT.style.transform = barB.style.transform = `scaleY(${open.toFixed(3)})`;
    // The opening copy lifts away faster than the photo, a third depth.
    start.style.opacity = (1 - range(p, 0, 0.18)).toFixed(3);
    start.style.transform = `translate3d(0, ${(-p * 260).toFixed(1)}px, 0)`;
    start.style.visibility = p > 0.2 ? 'hidden' : 'visible';
    const e = range(p, 0.8, 0.93);
    end.style.opacity = e.toFixed(3);
    end.style.transform = `translate3d(0, ${((1 - e) * 30).toFixed(1)}px, 0)`;
    end.style.visibility = e > 0.01 ? 'visible' : 'hidden';
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    nav.classList.toggle('is-solid', r.bottom < 80);
  };

  // Section parallax for [data-depth] layers (about and services images, rating card).
  const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({
    el, depth: parseFloat(el.dataset.depth), host: el.closest('section'),
  }));
  const paintLayers = (vh, scale) => {
    for (const l of layers) {
      if (!visible.has(l.host)) continue;
      const r = l.host.getBoundingClientRect();
      const offset = r.top + r.height / 2 - vh / 2;
      l.el.style.transform = `translate3d(0, ${(-offset * l.depth * scale).toFixed(2)}px, 0)`;
    }
  };

  // One rAF loop, running only while an animated section is on screen and only
  // writing to the DOM when the page has actually moved or resized.
  const visible = new Set();
  let running = false, lastY = null, lastW = 0, lastH = 0;
  const frame = () => {
    if (!visible.size || reduce.matches) { running = false; lastY = null; return; }
    const y = window.scrollY, w = window.innerWidth, h = window.innerHeight;
    if (y !== lastY || w !== lastW || h !== lastH) {
      lastY = y; lastW = w; lastH = h;
      if (visible.has(walk)) paintWalk(); else nav.classList.add('is-solid');
      paintLayers(h, w < 760 ? 0.6 : 1);
    }
    requestAnimationFrame(frame);
  };
  const go = () => { if (!running && !reduce.matches) { running = true; requestAnimationFrame(frame); } };
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    if (!visible.has(walk)) nav.classList.add('is-solid');
    go();
  });
  new Set([walk, ...layers.map((l) => l.host)]).forEach((h) => vio.observe(h));
  const resetMotion = () => {
    if (reduce.matches) {
      [ext, int, veil, start, end, barT, barB, bar, ...layers.map((l) => l.el)].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; el.style.visibility = ''; });
      nav.classList.toggle('is-solid', walk.getBoundingClientRect().bottom < 80);
    } else { lastY = null; go(); }
  };
  reduce.addEventListener('change', resetMotion);
  // Under reduced motion the loop is off, so an observer flips the nav once the opening shot is passed.
  new IntersectionObserver(([e]) => { if (reduce.matches) nav.classList.toggle('is-solid', !e.isIntersecting); },
    { rootMargin: '-80px 0px 0px 0px' }).observe(walk);

  // Reviews: rotate every 6s while on screen; pause on hover or keyboard focus and when
  // the tab is hidden. Dots switch directly. No auto-rotation under reduced motion.
  const stage = document.getElementById('tst-stage');
  const cards = [...stage.querySelectorAll('.tcard')];
  const dots = [...document.querySelectorAll('.tst__dot')];
  let idx = 0, timer = null, onScreen = false, held = false;
  const show = (i, user) => {
    idx = (i + cards.length) % cards.length;
    cards.forEach((c, k) => { c.classList.toggle('is-active', k === idx); c.setAttribute('aria-hidden', String(k !== idx)); });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === idx)));
    stage.setAttribute('aria-live', user ? 'polite' : 'off');
  };
  const tick = () => {
    clearInterval(timer); timer = null;
    if (!reduce.matches && onScreen && !held && !document.hidden && cards.length > 1) timer = setInterval(() => show(idx + 1, false), 6000);
  };
  dots.forEach((d, k) => d.addEventListener('click', () => { show(k, true); tick(); }));
  stage.addEventListener('pointerenter', () => { held = true; tick(); });
  stage.addEventListener('pointerleave', () => { held = false; tick(); });
  stage.parentElement.addEventListener('focusin', () => { held = true; tick(); });
  stage.parentElement.addEventListener('focusout', () => { held = false; tick(); });
  document.addEventListener('visibilitychange', tick);
  reduce.addEventListener('change', tick);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; tick(); }, { threshold: 0.3 }).observe(stage);
  show(0, false);

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
