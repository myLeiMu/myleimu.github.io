(() => {
  const config = document.getElementById('theme-transition-config');
  if (!config || window.blogThemeTransition) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pictureMode = config.dataset.mode === 'picture';
  const seconds = Number(config.dataset.duration);
  const duration = Number.isFinite(seconds) && seconds >= .6 && seconds <= 5 ? seconds : 3;
  let gifUrl;
  try {
    gifUrl = new URL(config.dataset.gif || '', location.href);
    if (!config.dataset.gif || gifUrl.username || gifUrl.password ||
      (gifUrl.protocol !== 'https:' && gifUrl.origin !== location.origin)) return;
  } catch { return; }
  const supported = () => config.dataset.enabled === 'true' && !reduced.matches &&
    typeof document.startViewTransition === 'function' && CSS.supports('mask-image', 'url("")');
  let mask = '', loading = null, busy = false, active = null, gifImage = null;
  // Fetch with CORS before using an image as a CSS mask. A displayable <img>
  // alone does not prove that an external host allows mask usage.
  function preload() {
    if (!supported() || loading || mask) return;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10000);
    loading = (async () => {
      let objectUrl = '';
      try {
        const response = await fetch(gifUrl.href, { mode: 'cors', credentials: 'omit', signal: abort.signal });
        if (!response.ok) throw new Error('GIF unavailable');
        const blob = await response.blob();
        if (blob.type !== 'image/gif') throw new Error('Expected a GIF');
        objectUrl = URL.createObjectURL(blob);
        const image = document.createElement('img');
        image.src = objectUrl;
        await image.decode();
        gifImage = image;
        mask = objectUrl;
        root.style.setProperty('--theme-gif-mask', `url("${mask}")`);
      } catch {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      } finally { clearTimeout(timeout); loading = null; }
    })();
  }
  window.blogThemeTransition = changeTheme => {
    if (busy) return;
    if (!supported() || !mask || document.hidden) {
      preload();
      changeTheme();
      return;
    }
    busy = true;
    let applied = false;
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      changeTheme();
      if (pictureMode && gifImage) {
        gifImage.id = 'theme-gif-character';
        gifImage.alt = '';
        gifImage.setAttribute('aria-hidden', 'true');
        document.body.appendChild(gifImage);
      }
    };
    const clean = () => {
      if (pictureMode) gifImage?.remove();
      root.classList.remove('theme-gif-transition', 'theme-gif-picture');
      busy = false; active = null;
    };
    if (!pictureMode && gifImage) {
      // Fit the complete GIF, including portrait assets, inside the viewport.
      // Recalculate on each click so rotating a phone keeps the same margins.
      const ratio = gifImage.naturalWidth / gifImage.naturalHeight || 1;
      const width = Math.min(240, innerWidth * .55, Math.min(320, innerHeight * .55) * ratio);
      root.style.setProperty('--theme-gif-start-width', `${width}px`);
    }
    if (pictureMode && gifImage) {
      const ratio = gifImage.naturalWidth / gifImage.naturalHeight || 16 / 9;
      const width = Math.min(innerWidth * .8, 420, innerHeight * .5 * ratio);
      root.style.setProperty('--theme-gif-width', `${width}px`);
      root.style.setProperty('--theme-gif-height', `${width / ratio}px`);
      root.classList.add('theme-gif-picture');
    }
    root.style.setProperty('--theme-gif-duration', `${duration}s`);
    root.classList.add('theme-gif-transition');
    try {
      active = document.startViewTransition(applyOnce);
      active.ready.catch(() => {});
      active.finished.then(clean, () => { applyOnce(); clean(); });
    } catch { applyOnce(); clean(); }
  };
  reduced.addEventListener('change', () => {
    if (reduced.matches) active?.skipTransition();
    else preload();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) active?.skipTransition(); });
  preload();
})();
