(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let dispose = () => {};
  function init() {
    dispose();
    const root = document.getElementById('home-carousel');
    if (!root) return;
    let slides = [...root.querySelectorAll('.home-carousel-slide')];
    let dots = [...root.querySelectorAll('.home-carousel-dot')];
    if (root.dataset.random === 'true') {
      const choices = slides.map((slide, i) => ({ slide, dot: dots[i] }));
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      const selected = choices.slice(0, Math.min(6, Math.max(1, Number(root.dataset.count) || 4)));
      slides = selected.map(item => item.slide);
      dots = selected.map(item => item.dot).filter(Boolean);
      root.querySelector('.home-carousel-slides').replaceChildren(...slides);
      const dotContainer = root.querySelector('.home-carousel-dots');
      if (dotContainer) dotContainer.replaceChildren(...dots);
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === 0);
        slide.inert = i !== 0;
        slide.setAttribute('aria-hidden', String(i !== 0));
        slide.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
        slide.querySelector('a').tabIndex = i === 0 ? 0 : -1;
        if (dots[i]) {
          dots[i].dataset.slide = String(i);
          dots[i].setAttribute('aria-label', `第 ${i + 1} 篇：${slide.querySelector('h2').textContent}`);
        }
      });
    }
    if (slides.length < 2) {
      const controls = root.querySelector('.home-carousel-controls');
      if (controls) controls.hidden = true;
      return;
    }
    const controller = new AbortController();
    const on = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal: controller.signal });
    const toggle = root.querySelector('.home-carousel-toggle');
    const counter = root.querySelector('.home-carousel-counter');
    const status = root.querySelector('.home-carousel-status');
    const interval = Math.max(1000, Number(root.dataset.interval) || 6000);
    let index = 0, timer = 0;
    let visible = false, hovered = false, focused = false;
    let paused = root.dataset.autoplay !== 'true' || reduced.matches;
    let touch = null, suppressClickUntil = 0;
    function schedule() {
      clearTimeout(timer);
      timer = 0;
      const running = !paused && !reduced.matches && visible && !hovered && !focused && !document.hidden;
      root.dataset.running = String(running);
      const stopped = paused || reduced.matches;
      toggle.setAttribute('aria-label', stopped ? '播放自动轮播' : '暂停自动轮播');
      toggle.querySelector('i').className = stopped ? 'fas fa-play' : 'fas fa-pause';
      toggle.disabled = reduced.matches;
      if (reduced.matches) toggle.setAttribute('aria-label', '已按系统减少动态效果设置暂停');
      if (running) timer = setTimeout(() => show(index + 1), interval);
    }
    function show(next, manual = false) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
        slide.querySelector('a').tabIndex = active ? 0 : -1;
        dots[i].setAttribute('aria-current', String(active));
      });
      counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      if (manual) {
        paused = true;
        status.textContent = `第 ${index + 1} 篇，共 ${slides.length} 篇：${slides[index].querySelector('h2').textContent}`;
      }
      schedule();
    }
    on(root.querySelector('.home-carousel-prev'), 'click', () => show(index - 1, true));
    on(root.querySelector('.home-carousel-next'), 'click', () => show(index + 1, true));
    dots.forEach((dot, i) => on(dot, 'click', () => show(i, true)));
    on(toggle, 'click', () => { paused = !paused; schedule(); });
    on(root, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
    on(root, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; schedule(); } });
    on(root, 'focusin', () => { focused = true; schedule(); });
    on(root, 'focusout', event => { focused = root.contains(event.relatedTarget); schedule(); });
    on(root, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      // Keep focus on a stable control when the current link becomes inert.
      if (event.target.closest('.home-carousel-slide')) root.querySelector('.home-carousel-next').focus();
      show(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : index + (event.key === 'ArrowLeft' ? -1 : 1), true);
    });
    const viewport = root.querySelector('.home-carousel-slides');
    on(viewport, 'touchstart', event => {
      touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      clearTimeout(timer);
    }, { passive: true });
    on(viewport, 'touchend', event => {
      if (touch && event.changedTouches.length) {
        const dx = event.changedTouches[0].clientX - touch.x;
        const dy = event.changedTouches[0].clientY - touch.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          suppressClickUntil = Date.now() + 500;
          show(index + (dx < 0 ? 1 : -1), true);
        }
      }
      touch = null;
      schedule();
    }, { passive: true });
    on(viewport, 'touchcancel', () => { touch = null; schedule(); }, { passive: true });
    on(viewport, 'click', event => {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
    }, { capture: true });
    on(document, 'visibilitychange', schedule);
    on(reduced, 'change', () => { if (reduced.matches) paused = true; schedule(); });
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .1 });
    observer.observe(root);
    root.querySelector('.home-carousel-controls').hidden = false;
    show(0);
    dispose = () => {
      clearTimeout(timer);
      observer.disconnect();
      controller.abort();
      dispose = () => {};
    };
  }
  init();
  document.addEventListener('pjax:send', () => dispose());
  document.addEventListener('pjax:complete', init);
})();
