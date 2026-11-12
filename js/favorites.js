(() => {
  let cleanup = () => {};
  function init() {
    cleanup();
    const root = document.getElementById('blog-favorites');
    if (!root) return;
    const controller = new AbortController();
    cleanup = () => controller.abort();
    const on = (element, event, callback) => element.addEventListener(event, callback, { signal: controller.signal });
    const cards = [...root.querySelectorAll('.favorite-card')];
    if (!cards.length) return;
    const search = root.querySelector('input[type="search"]');
    const filters = [...root.querySelectorAll('.favorites-filter')];
    const texts = cards.map(card => card.textContent.toLocaleLowerCase());
    let type = 'all';
    function update() {
      const keywords = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      cards.forEach((card, index) => {
        const visible = (type === 'all' || card.dataset.type === type) && keywords.every(word => texts[index].includes(word));
        card.hidden = !visible;
        if (visible) count++;
      });
      filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.type === type)));
      root.querySelector('.favorites-no-results').hidden = count > 0;
      const result = root.querySelector('.favorites-result');
      result.hidden = type === 'all' && !keywords.length;
      result.textContent = `找到 ${count} 项珍藏`;
    }
    filters.forEach(filter => on(filter, 'click', () => { type = filter.dataset.type; update(); }));
    on(search, 'input', update);
    root.querySelectorAll('.favorite-cover img').forEach(image => {
      const fail = () => { image.hidden = true; };
      on(image, 'error', fail);
      if (image.complete && !image.naturalWidth) fail();
    });
    root.querySelector('.favorites-tools').hidden = false;
    update();
  }
  init();
  document.addEventListener('pjax:send', () => cleanup());
  document.addEventListener('pjax:complete', init);
})();
