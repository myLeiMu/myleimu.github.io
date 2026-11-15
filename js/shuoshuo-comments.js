(() => {
  const root = document.querySelector('.public-shuoshuo');
  const configElement = root && root.querySelector('.shuoshuo-comment-config');
  if (!configElement || root.dataset.commentsReady) return;
  root.dataset.commentsReady = 'true';
  const config = JSON.parse(configElement.textContent);
  const buttons = [...root.querySelectorAll('.shuoshuo-comment-toggle')];
  // Twikoo uses global element IDs: keep only one mounted comment area per page.
  const mount = document.createElement('div');
  mount.id = 'shuoshuo-twikoo';
  let active = null;
  let busy = false;
  let initializedPath = null;

  const loadTwikoo = () => {
    if (window.twikoo) return Promise.resolve();
    if (!window.shuoshuoTwikooScript) {
      window.shuoshuoTwikooScript = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = config.script;
        script.onload = () => {
          if (window.twikoo) resolve();
          else { script.remove(); reject(new Error('Twikoo unavailable')); }
        };
        script.onerror = () => { script.remove(); reject(new Error('Twikoo failed to load')); };
        document.head.appendChild(script);
      }).catch(error => { window.shuoshuoTwikooScript = null; throw error; });
    }
    return window.shuoshuoTwikooScript;
  };

  const setExpanded = (button, expanded) => {
    button.setAttribute('aria-expanded', String(expanded));
    button.querySelector('span').textContent = expanded ? '收起评论' : '评论';
    document.getElementById(button.getAttribute('aria-controls')).hidden = !expanded;
  };

  root.addEventListener('click', async event => {
    const button = event.target.closest('.shuoshuo-comment-toggle');
    if (!button || !root.contains(button) || busy) return;
    if (active === button) {
      setExpanded(button, false);
      active = null;
      return;
    }
    if (active) setExpanded(active, false);
    active = button;
    setExpanded(button, true);
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    panel.replaceChildren(mount);
    const path = button.dataset.commentPath;
    if (initializedPath === path) return;
    busy = true;
    buttons.forEach(item => { item.disabled = true; });
    panel.setAttribute('aria-busy', 'true');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = '正在加载评论…';
    panel.prepend(status);
    try {
      await loadTwikoo();
      if (!root.isConnected) return;
      mount.replaceChildren();
      await window.twikoo.init({
        ...(config.option || {}),
        envId: config.envId,
        region: config.region || undefined,
        el: mount,
        path
      });
      initializedPath = path;
      status.remove();
    } catch (error) {
      initializedPath = null;
      status.textContent = '评论暂时无法加载，请收起后重试。';
      console.error('说说评论加载失败', error);
    } finally {
      busy = false;
      buttons.forEach(item => { item.disabled = false; });
      panel.removeAttribute('aria-busy');
    }
  });

  // Links from Twikoo notifications can locate and open the correct memo.
  const memo = new URLSearchParams(location.search).get('memo');
  const linked = buttons.find(button => new URL(button.dataset.commentPath, location.href).searchParams.get('memo') === memo);
  if (memo && linked) {
    const card = linked.closest('article');
    const cards = [...root.querySelectorAll('article.shuoshuo-item')];
    const more = root.querySelector('.shuoshuo-more');
    while (card.hidden && more && !more.hidden) more.click();
    linked.click();
    card.scrollIntoView({ block: 'start' });
  }
})();
