(() => {
  const settings = window.BLOG_CONFIG.effects.ambient;
  if (!settings.enabled || document.querySelector('.inner-post')) return;
  const density = { low: .55, medium: 1, high: 1.6 }[settings.intensity];
  if (document.body.classList.contains('gallery-view')) return;
  if (document.getElementById('ambient-background')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'ambient-background';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.appendChild(canvas);

  const compact = matchMedia('(max-width: 767px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const random = (min, max) => min + Math.random() * (max - min);
  let width = 0;
  let height = 0;
  let mode;
  let particles = [];
  let meteor = null;
  let meteorWait = 0;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;

  function nextMeteor() {
    return compact.matches ? random(10, 18) : random(6, 12);
  }

  function resetParticles() {
    const area = width * height;
    const count = mode === 'dark'
      ? Math.min(compact.matches ? 48 : 125, Math.max(24, Math.round(area / 11000)))
      : Math.min(compact.matches ? 18 : 45, Math.max(12, Math.round(area / 30000)));
    particles = Array.from({ length: Math.round(count * density) }, () => ({
      x: random(0, width), y: random(0, height),
      size: mode === 'dark' ? random(1, 2.4) : random(5, 10),
      speed: random(24, 46), drift: random(-10, 16),
      phase: random(0, Math.PI * 2), turn: random(-1.1, 1.1),
      angle: random(0, Math.PI * 2), opacity: random(.55, .9),
      color: Math.random() < .7 ? '#f39cbd' : '#fff2f6'
    }));
    meteor = null;
    meteorWait = nextMeteor();
    canvas.dataset.mode = mode;
    canvas.dataset.particles = String(particles.length);
  }

  function resize() {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, compact.matches ? 1.5 : 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    resetParticles();
  }

  function drawPetals(dt) {
    for (const p of particles) {
      p.y += p.speed * dt;
      p.x += (p.drift + Math.sin(elapsed + p.phase) * 18) * dt;
      p.angle += p.turn * dt;
      if (p.y > height + 15) { p.y = -15; p.x = random(0, width); }
      if (p.x < -15) p.x = width + 15;
      if (p.x > width + 15) p.x = -15;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(1, .55 + Math.abs(Math.sin(elapsed * .6 + p.phase)) * .4);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 1.1, -p.size * .5, p.size, p.size * .6, 0, p.size);
      ctx.bezierCurveTo(-p.size, p.size * .6, -p.size * .7, -p.size * .6, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStars(dt) {
    for (const p of particles) {
      const alpha = p.opacity * (.6 + .4 * Math.sin(elapsed * 1.3 + p.phase));
      ctx.fillStyle = `rgba(201,225,255,${alpha * .25})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(221,237,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      if (p.size > 1.9) {
        ctx.strokeStyle = `rgba(221,237,255,${alpha * .65})`;
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size * 2.5, p.y);
        ctx.lineTo(p.x + p.size * 2.5, p.y);
        ctx.moveTo(p.x, p.y - p.size * 2.5);
        ctx.lineTo(p.x, p.y + p.size * 2.5);
        ctx.stroke();
      }
    }
    meteorWait -= dt;
    if (settings.meteors && !meteor && meteorWait <= 0) {
      meteor = { x: random(width * .25, width * .9), y: random(0, height * .3), age: 0 };
      meteorWait = nextMeteor();
    }
    if (meteor) {
      meteor.age += dt;
      meteor.x -= dt * 320;
      meteor.y += dt * 205;
      const alpha = Math.sin(Math.min(meteor.age / 1.4, 1) * Math.PI) * .9;
      const trail = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x + 150, meteor.y - 96);
      trail.addColorStop(0, `rgba(220,238,255,${alpha})`);
      trail.addColorStop(1, 'rgba(220,238,255,0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(meteor.x + 150, meteor.y - 96);
      ctx.stroke();
      if (meteor.age >= 1.4) meteor = null;
    }
  }

  function tick(time) {
    frame = requestAnimationFrame(tick);
    const interval = 1000 / (compact.matches ? 20 : 30);
    if (lastTime && time - lastTime < interval) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
    lastTime = time;
    elapsed += dt;
    ctx.clearRect(0, 0, width, height);
    if (mode === 'dark') drawStars(dt);
    else drawPetals(dt);
  }

  function sync() {
    const nextMode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    if (nextMode !== mode) { mode = nextMode; resetParticles(); }
    const modeEnabled = mode === 'dark' ? settings.night : settings.day;
    const running = modeEnabled && !document.hidden && !reducedMotion.matches && !document.body.classList.contains('read-mode');
    canvas.dataset.running = String(running);
    if (running && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
    if (!running) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      ctx.clearRect(0, 0, width, height);
    }
  }

  mode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  resize();
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  compact.addEventListener('change', resize);
  reducedMotion.addEventListener('change', sync);
  sync();
})();
