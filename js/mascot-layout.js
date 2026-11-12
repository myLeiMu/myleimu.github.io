(() => {
  const settings = window.BLOG_CONFIG?.effects.live2d;
  if (!settings?.enabled) return;
  const doc = document;
  const compact = matchMedia('(max-width:767px), (pointer:coarse) and (max-width:1024px) and (max-height:500px)');
  const labels = {hitokoto:'每日一言',asteroids:'小游戏','switch-model':'切换角色','switch-texture':'切换服装',photo:'保存角色截图',info:'查看组件信息',quit:'关闭看板娘'};
  let starter, started = false, launching = false, entry, focusOnOpen = false, returnFocus = false;
  let observedWaifu, observedToggle;
  const root = doc.documentElement;

  function close() {
    const quit = doc.getElementById('waifu-tool-quit');
    if (!quit) return;
    returnFocus = true;
    quit.click(); // Keep the original close animation, saved preference, and restore action.
  }
  function sync() {
    const waifu = doc.getElementById('waifu');
    const active = !!waifu?.classList.contains('waifu-active') && !waifu.classList.contains('waifu-hidden');
    root.classList.toggle('mascot-open',active);
    root.classList.toggle('mascot-compact',compact.matches);
    if (active && entry) {entry.remove();entry=null;}
    if (waifu) {
      waifu.inert = !active;
      waifu.setAttribute('aria-hidden',String(!active));
      if (active && focusOnOpen && waifu.querySelector('#waifu-tool-quit')) {
        focusOnOpen=false;
        waifu.querySelector('#waifu-tool-quit').focus({preventScroll:true});
      }
    }
    const toggle = doc.getElementById('waifu-toggle');
    if (toggle) {
      if(active && toggle.classList.contains('waifu-toggle-active')) toggle.classList.remove('waifu-toggle-active');
      const shown=toggle.classList.contains('waifu-toggle-active');
      toggle.tabIndex=shown?0:-1;
      toggle.setAttribute('aria-hidden',String(!shown));
      if (shown && returnFocus) {returnFocus=false;toggle.focus({preventScroll:true});}
    }
  }
  function decorate() {
    const waifu = doc.getElementById('waifu');
    if (waifu && observedWaifu!==waifu) {
      observedWaifu=waifu;
      waifu.classList.toggle('blog-no-tips',!settings.show_tips);
      waifu.addEventListener('keydown',event=>{
        if(event.key!=='Escape') return;
        event.preventDefault();event.stopPropagation();
        close();
      });
      new MutationObserver(decorate).observe(waifu,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    const tools=doc.getElementById('waifu-tool');
    if(tools) {
      tools.inert=false;
      tools.querySelectorAll('span[id^="waifu-tool-"]').forEach(tool=>{
        if(tool.dataset.blogReady) return;
        tool.dataset.blogReady='true';tool.tabIndex=0;tool.setAttribute('role','button');
        const label=labels[tool.id.slice('waifu-tool-'.length)]||'看板娘工具';
        tool.setAttribute('aria-label',label);tool.title=label;
        tool.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tool.click();}});
        if(tool.id==='waifu-tool-quit')tool.addEventListener('click',()=>{returnFocus=true;});
      });
    }
    const toggle=doc.getElementById('waifu-toggle');
    if(toggle && observedToggle!==toggle) {
      observedToggle=toggle;toggle.setAttribute('role','button');toggle.setAttribute('aria-label','打开看板娘');toggle.title='打开看板娘';
      toggle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusOnOpen=true;toggle.click();}});
      toggle.addEventListener('click',()=>{focusOnOpen=focusOnOpen||compact.matches;});
      const image=doc.createElement('img');image.alt='';image.src=window.BLOG_CONFIG.avatar||'/img/favicon.png';
      image.onerror=()=>{image.onerror=null;image.src='/img/favicon.png';};toggle.replaceChildren(image);
      new MutationObserver(sync).observe(toggle,{attributes:true,attributeFilter:['class']});
    }
    sync();
  }
  new MutationObserver(decorate).observe(doc.body,{childList:true});
  function showEntry() {
    if(entry) return;
    entry=doc.createElement('button');entry.type='button';entry.className='blog-mascot-launch';
    entry.setAttribute('aria-label','打开看板娘');entry.title='打开看板娘';
    const image=doc.createElement('img');image.alt='';image.src=window.BLOG_CONFIG.avatar||'/img/favicon.png';
    image.onerror=()=>{image.onerror=null;image.src='/img/favicon.png';};entry.appendChild(image);
    entry.addEventListener('click',()=>start(true));doc.body.appendChild(entry);
  }
  async function start(userInitiated=false) {
    if(started||launching||!starter) return;
    launching=true;focusOnOpen=userInitiated;
    if(entry) {entry.disabled=true;entry.setAttribute('aria-busy','true');entry.setAttribute('aria-label','正在加载看板娘');}
    try {
      await starter();started=true;decorate();
      // An explicit tap reopens a widget the visitor closed on a previous route.
      if(userInitiated) {
        const toggle=doc.getElementById('waifu-toggle');
        if(toggle?.hasAttribute('first-time')) {
          await new Promise(resolve=>setTimeout(resolve,0));
          toggle.click();
        }
      } else if(doc.getElementById('waifu-toggle')?.hasAttribute('first-time')) {entry?.remove();entry=null;}
    } catch(error) {
      focusOnOpen=false;
      if(entry){entry.disabled=false;entry.removeAttribute('aria-busy');entry.setAttribute('aria-label','打开看板娘');entry.title='加载失败，点击重试';}
      console.warn('看板娘加载失败，可重试。',error);
    } finally {launching=false;}
  }
  window.blogMascotMount=startWidget=>{
    starter=startWidget;
    if(compact.matches && settings.mobile_behavior==='collapsed') showEntry();
    else start();
  };
  compact.addEventListener('change',()=>{if(!compact.matches&&!started)start();sync();});
  decorate();
})();
