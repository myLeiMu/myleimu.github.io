(() => {
  let cleanup = () => {};
  function init() {
    cleanup();
    const avatar = document.querySelector('.editorial-avatar');
    if (!document.getElementById('home-editorial')) return;
    const glass = avatar?.querySelector('.editorial-avatar-glass');
    const controller = new AbortController();
    cleanup = () => controller.abort();
    const on = (node, name, fn) => node.addEventListener(name, fn, { signal: controller.signal });

    document.querySelectorAll('.editorial-excerpt-toggle').forEach(button => {
      const card = button.closest('.editorial-post');
      const setOpen = open => {
        card.classList.toggle('is-excerpt-open', open);
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? window.BLOG_CONFIG.texts.excerpt_close : window.BLOG_CONFIG.texts.excerpt_button;
      };
      on(button, 'click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
      on(card, 'keydown', event => { if (event.key === 'Escape') setOpen(false); });
    });

    if (!avatar) return;
    let hovered = false;
    function reveal(open) {
      avatar.classList.toggle('is-revealed', open);
      avatar.setAttribute('aria-expanded', String(open));
      glass.setAttribute('aria-hidden', String(!open));
    }
    on(avatar, 'pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovered = true; reveal(true); }
    });
    on(avatar, 'pointerleave', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') { hovered = false; reveal(false); }
    });
    on(avatar, 'focus', () => { if (avatar.matches(':focus-visible')) reveal(true); });
    on(avatar, 'blur', () => reveal(false));
    on(avatar, 'click', event => {
      if (hovered || event.detail === 0) reveal(true);
      else reveal(!avatar.classList.contains('is-revealed'));
    });
    on(avatar, 'keydown', event => {
      if (event.key === 'Escape') { reveal(false); event.preventDefault(); }
    });
    on(document, 'pointerdown', event => { if (!avatar.contains(event.target)) reveal(false); });
  }
  init();
  document.addEventListener('pjax:send', () => cleanup());
  document.addEventListener('pjax:complete', init);
})();
