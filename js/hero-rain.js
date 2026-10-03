(() => {
  const compact = matchMedia('(max-width: 767px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const random = (min, max) => min + Math.random() * (max - min);
  let dispose = () => {};

  function init() {
    dispose();
    const hero = document.querySelector('#page-header.full_page');
    if (!hero) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'hero-rain';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    hero.appendChild(canvas);
    let width = 0;
    let height = 0;
    let streaks = [];
    let drops = [];
    let visible = true;
    let frame = 0;
    let lastTime = 0;

    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, compact.matches ? 1.5 : 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const area = width * height;
      streaks = Array.from({ length: Math.min(compact.matches ? 45 : 100, Math.max(20, Math.round(area / 14000))) }, () => ({
        x: random(0, width), y: random(0, height),
        length: random(15, 40), speed: random(220, 440), opacity: random(.15, .4)
      }));
      drops = Array.from({ length: Math.min(compact.matches ? 16 : 36, Math.max(8, Math.round(area / 38000))) }, () => ({
        x: random(0, width), y: random(0, height),
        size: random(2, 5), speed: random(3, 15), phase: random(0, Math.PI * 2)
      }));
      canvas.dataset.particles = String(streaks.length + drops.length);
    }

    function tick(time) {
      frame = requestAnimationFrame(tick);
      if (lastTime && time - lastTime < 1000 / (compact.matches ? 20 : 30)) return;
      const dt = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
      lastTime = time;
      ctx.clearRect(0, 0, width, height);
      const dark = document.documentElement.dataset.theme === 'dark';
      canvas.dataset.mode = dark ? 'dark' : 'light';
      for (const p of streaks) {
        p.y += p.speed * dt;
        p.x -= p.speed * .12 * dt;
        if (p.y > height + p.length) { p.y = -p.length; p.x = random(0, width); }
        if (p.x < -p.length) p.x = width + p.length;
        ctx.strokeStyle = `rgba(220,239,255,${p.opacity * (dark ? 1.25 : 1)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.length * .12, p.y - p.length);
        ctx.stroke();
      }
      for (const p of drops) {
        p.y += p.speed * dt;
        if (p.y > height + p.size * 3) { p.y = -p.size * 3; p.x = random(0, width); }
        const x = p.x + Math.sin(p.y * .015 + p.phase) * 2;
        // Transparent beads with a shaded edge and a small reflection.
        ctx.fillStyle = 'rgba(13,37,58,.12)';
        ctx.strokeStyle = 'rgba(224,244,255,.5)';
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.ellipse(x, p.y, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.ellipse(x - p.size * .2, p.y - p.size * .3, p.size * .5, p.size * .8, -.2, Math.PI, Math.PI * 1.65);
        ctx.stroke();
      }
    }

    function sync() {
      const running = visible && !document.hidden && !reducedMotion.matches && !document.body.classList.contains('read-mode');
      canvas.dataset.running = String(running);
      if (running && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
      if (!running) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        ctx.clearRect(0, 0, width, height);
      }
    }

    const sizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    });
    const bodyObserver = new MutationObserver(sync);
    sizeObserver.observe(hero);
    visibilityObserver.observe(hero);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync);
    compact.addEventListener('change', resize);
    reducedMotion.addEventListener('change', sync);
    resize();
    sync();
    dispose = () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      bodyObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      compact.removeEventListener('change', resize);
      reducedMotion.removeEventListener('change', sync);
      canvas.remove();
      dispose = () => {};
    };
  }

  init();
  document.addEventListener('pjax:send', () => dispose());
  document.addEventListener('pjax:complete', init);
})();
