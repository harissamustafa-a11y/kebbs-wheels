// Kebbs Wheels and Tyres: parallax, scroll-turned wheel, reveal-on-enter, nav state, hero video.
(() => {
  document.body.classList.remove('no-js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const video = document.getElementById('hero-video');
  const nav = document.getElementById('nav');

  // Hero video loops muted. Reduced motion holds the poster frame instead.
  if (reduce.matches) video.pause();

  // Pause the video whenever the hero is off screen; solid nav once past it.
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([e]) => {
    nav.classList.toggle('is-solid', !e.isIntersecting || e.intersectionRatio < 0.9);
    if (reduce.matches) return;
    if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
  }, { threshold: [0, 0.9] }).observe(hero);

  // Reveal blocks as they enter the viewport.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Parallax: each [data-depth] layer shifts by depth x its section's distance from the
  // viewport centre; [data-spin] layers also turn with scroll, like a wheel rolling.
  // Transform-only; the rAF loop runs only while a layered section is on screen and
  // only writes when the page moved. Reduced motion leaves every layer static.
  const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({
    el, depth: parseFloat(el.dataset.depth), spin: parseFloat(el.dataset.spin || 0), host: el.closest('section'),
  }));
  const visible = new Set();
  let running = false;
  let lastY = null, lastW = 0;
  const frame = () => {
    if (!visible.size || reduce.matches) { running = false; lastY = null; return; }
    if (window.scrollY === lastY && window.innerWidth === lastW) { requestAnimationFrame(frame); return; }
    lastY = window.scrollY; lastW = window.innerWidth;
    const vh = window.innerHeight;
    // Gentler depth on small screens keeps mobile motion comfortable.
    const scale = window.innerWidth < 760 ? 0.6 : 1;
    for (const l of layers) {
      if (!visible.has(l.host)) continue;
      const r = l.host.getBoundingClientRect();
      const offset = r.top + r.height / 2 - vh / 2;
      const y = (-offset * l.depth * scale).toFixed(2);
      const turn = l.spin ? ` rotate(${(lastY * l.spin).toFixed(2)}deg)` : '';
      l.el.style.transform = `translate3d(0, ${y}px, 0)${turn}`;
    }
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running && !reduce.matches) { running = true; requestAnimationFrame(frame); } };
  const hosts = new Set(layers.map((l) => l.host));
  const pio = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    start();
  });
  hosts.forEach((h) => pio.observe(h));
  reduce.addEventListener('change', () => {
    if (reduce.matches) { layers.forEach((l) => (l.el.style.transform = '')); video.pause(); }
    else { video.play().catch(() => {}); start(); }
  });

  document.getElementById('yr').textContent = new Date().getFullYear();
})();
