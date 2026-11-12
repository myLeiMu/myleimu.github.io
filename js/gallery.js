(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = () => {};
  const shuffled = values => {
    const items = [...values];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  function init() {
    cleanup();
    const controller = new AbortController();
    const on = (node, event, fn, options = {}) => node.addEventListener(event, fn, { ...options, signal: controller.signal });
    const disposers = [() => controller.abort()];
    const gallery = document.getElementById('blog-gallery');
    if (gallery) {
      const sections = [...gallery.querySelectorAll('.gallery-album')];
      const links = [...gallery.querySelectorAll('.gallery-photo-link')];
      const filters = [...gallery.querySelectorAll('.gallery-filter')];
      function selectAlbum(id) {
        const selected = filters.find(filter => filter.dataset.album === id) || filters[0];
        if (!selected) return;
        sections.forEach(section => { section.hidden = selected.dataset.album !== 'all' && selected.dataset.album !== section.dataset.album; });
        filters.forEach(filter => filter.setAttribute('aria-current', String(filter === selected)));
      }
      function readAlbum() {
        selectAlbum(location.hash.startsWith('#album-') ? location.hash.slice(7) : 'all');
      }
      filters.forEach(filter => on(filter, 'click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        selectAlbum(filter.dataset.album);
        if (location.hash !== filter.hash) history.pushState(null, '', filter.hash);
      }));
      on(window, 'hashchange', readAlbum);
      on(window, 'popstate', readAlbum);
      readAlbum();
      links.forEach(link => {
        const img = link.querySelector('img');
        const showError = () => { img.hidden = true; link.querySelector('.gallery-photo-fallback').hidden = false; };
        on(img, 'error', showError);
        if (img.complete && !img.naturalWidth) showError();
      });
      const dialog = document.getElementById('gallery-lightbox');
      if (dialog && typeof dialog.showModal === 'function') {
        const image = dialog.querySelector('.gallery-lightbox-image');
        const error = dialog.querySelector('.gallery-lightbox-error');
        let selection = [], current = 0, savedOverflow = '';
        function show(next) {
          current = (next + selection.length) % selection.length;
          const link = selection[current];
          const caption = link.dataset.caption;
          image.hidden = true;
          error.hidden = true;
          image.alt = caption;
          dialog.querySelector('#gallery-lightbox-title').textContent = caption;
          dialog.querySelector('.gallery-lightbox-count').textContent = `${current + 1} / ${selection.length}`;
          dialog.querySelector('.gallery-lightbox-original').href = link.href;
          image.src = link.href;
          dialog.querySelector('.gallery-lightbox-prev').disabled = selection.length < 2;
          dialog.querySelector('.gallery-lightbox-next').disabled = selection.length < 2;
        }
        on(image, 'load', () => { image.hidden = false; });
        on(image, 'error', () => { image.hidden = true; error.hidden = false; });
        links.forEach(link => on(link, 'click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          selection = links.filter(item => !item.closest('.gallery-album').hidden);
          show(selection.indexOf(link));
          savedOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          dialog.showModal();
        }));
        on(dialog.querySelector('.gallery-lightbox-close'), 'click', () => dialog.close());
        on(dialog.querySelector('.gallery-lightbox-prev'), 'click', () => show(current - 1));
        on(dialog.querySelector('.gallery-lightbox-next'), 'click', () => show(current + 1));
        // Single-finger horizontal swipes change photos; leave pinch zoom alone.
        let touchStart = null;
        const stage = dialog.querySelector('.gallery-lightbox-stage');
        on(stage, 'touchstart', event => {
          touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }, { passive: true });
        on(stage, 'touchcancel', () => { touchStart = null; });
        on(stage, 'touchend', event => {
          const start = touchStart;
          touchStart = null;
          if (!start || event.touches.length || !event.changedTouches.length || (window.visualViewport?.scale || 1) > 1) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
        }, { passive: true });
        on(dialog, 'keydown', event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            show(current + (event.key === 'ArrowLeft' ? -1 : 1));
          }
        });
        on(dialog, 'click', event => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        });
        on(dialog, 'close', () => { document.body.style.overflow = savedOverflow; image.removeAttribute('src'); });
        disposers.push(() => { if (dialog.open) { dialog.close(); document.body.style.overflow = savedOverflow; } });
      }
    }
    document.querySelectorAll('.card-gallery').forEach(card => {
      let pool = JSON.parse(card.querySelector('.card-gallery-data').textContent);
      const configuredInterval = Number(card.dataset.interval);
      const interval = Number.isFinite(configuredInterval) && configuredInterval >= 1000 && configuredInterval <= 3600000 ? configuredInterval : 3500;
      const random = card.dataset.order !== 'sequential';
      const pauseOnHover = card.dataset.pauseOnHover !== 'false';
      const img = card.querySelector('.card-gallery-image');
      const caption = card.querySelector('.card-gallery-caption');
      const fallback = card.querySelector('.card-gallery-fallback');
      const toggle = card.querySelector('.card-gallery-toggle');
      const nextButton = card.querySelector('.card-gallery-next');
      let queue = [], lastUrl = '', timer = 0, pending = null;
      let visible = false, hovered = false, focused = false, paused = card.dataset.autoplay === 'false', alive = true;
      function schedule() {
        clearTimeout(timer);
        timer = 0;
        const running = pool.length > 1 && !paused && !reduced.matches && visible && !hovered && !focused && !document.hidden;
        card.dataset.running = String(running);
        if (toggle) {
          const stopped = paused || reduced.matches;
          toggle.setAttribute('aria-label', reduced.matches ? '已按系统减少动态效果设置暂停' : stopped ? '播放图片轮播' : '暂停图片轮播');
          toggle.querySelector('i').className = stopped ? 'fas fa-play' : 'fas fa-pause';
          toggle.disabled = reduced.matches || pool.length < 2;
        }
        if (running) timer = setTimeout(next, interval);
      }
      function next() {
        if (pending || !pool.length) return;
        clearTimeout(timer);
        if (!queue.length) {
          queue = random ? shuffled(pool) : [...pool].reverse();
          if (random && queue.length > 1 && queue[queue.length - 1].url === lastUrl) [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
        }
        const photo = queue.pop();
        // The Live2D widget replaces window.Image and forces CORS; display-only
        // gallery photos should work with image hosts that do not send CORS headers.
        const candidate = document.createElement('img');
        pending = candidate;
        if (nextButton) nextButton.disabled = true;
        candidate.onload = () => {
          if (!alive) return;
          pending = null;
          lastUrl = photo.url;
          img.src = photo.url;
          img.alt = photo.caption || photo.albumTitle;
          img.hidden = false;
          fallback.hidden = true;
          caption.textContent = photo.caption || photo.albumTitle;
          card.querySelector('.card-gallery-link').href = `/gallery/#album-${photo.albumId}`;
          if (nextButton) nextButton.disabled = pool.length < 2;
          if (!reduced.matches) img.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 450 });
          schedule();
        };
        candidate.onerror = () => {
          if (!alive) return;
          pending = null;
          pool = pool.filter(item => item.url !== photo.url);
          queue = queue.filter(item => item.url !== photo.url);
          if (pool.length) next();
          else {
            img.hidden = true;
            fallback.hidden = false;
            caption.textContent = '更多画面在图库里';
            if (nextButton) nextButton.disabled = true;
            schedule();
          }
        };
        candidate.src = photo.url;
      }
      if (toggle) {
        card.querySelector('.card-gallery-controls').hidden = false;
        on(toggle, 'click', () => { paused = !paused; schedule(); });
        on(nextButton, 'click', next);
      }
      on(card, 'pointerenter', event => { if (pauseOnHover && event.pointerType === 'mouse') { hovered = true; schedule(); } });
      on(card, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; schedule(); } });
      // Touch and mouse clicks also leave buttons focused. Only keyboard focus
      // should suspend autoplay; choosing another photo keeps the play state.
      on(card, 'focusin', event => { focused = event.target.matches(':focus-visible'); schedule(); });
      on(card, 'focusout', event => {
        focused = card.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible');
        schedule();
      });
      on(document, 'visibilitychange', schedule);
      on(reduced, 'change', schedule);
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .1 });
      observer.observe(card);
      next();
      disposers.push(() => {
        alive = false;
        clearTimeout(timer);
        observer.disconnect();
        if (pending) { pending.onload = null; pending.onerror = null; pending.removeAttribute('src'); }
      });
    });
    cleanup = () => { disposers.forEach(fn => fn()); cleanup = () => {}; };
  }
  init();
  document.addEventListener('pjax:send', () => cleanup());
  document.addEventListener('pjax:complete', init);
})();
