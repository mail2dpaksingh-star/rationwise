/* RationWise homepage expertise tabs. Presentation only; formulation logic unchanged. */
(()=>{
  'use strict';
  const tabs = Array.from(document.querySelectorAll('.rw-expertise-tab'));
  if (!tabs.length) return;
  const select = (tab, focus = false) => {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? index + 1 :
        event.key === 'ArrowLeft' ? index - 1 :
        event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
  document.querySelectorAll('[data-expertise-step]').forEach(link => {
    link.addEventListener('click', () => {
      const step = link.getAttribute('data-expertise-step');
      document.querySelector(`.rw25-progress-button[data-step="${step}"]`)?.click();
    });
  });
})();


/* Expert profile: hidden on the homepage; open only via the Expert link. */
(()=>{
  'use strict';
  const section=document.getElementById('about-founder');
  const nav=document.querySelector('nav[aria-label="Main navigation"] a[href="#about-founder"]');
  const closeBtn=document.getElementById('rwFounderClose');
  if(!section||!nav)return;
  const show=(scroll=true)=>{
    section.hidden=false;
    nav.setAttribute('aria-expanded','true');
    if(scroll)requestAnimationFrame(()=>section.scrollIntoView({block:'start',behavior:'auto'}));
  };
  const hide=()=>{
    section.hidden=true;
    nav.setAttribute('aria-expanded','false');
  };
  document.querySelectorAll('a[href="#about-founder"]').forEach(link=>{
    link.addEventListener('click',event=>{
      event.preventDefault();
      show(true);
      if(location.hash!=='#about-founder')location.hash='about-founder';
    });
  });
  closeBtn?.addEventListener('click',()=>{
    if(location.hash==='#about-founder'){
      try { history.replaceState(null,'',location.pathname+location.search); }
      catch (_err) { location.hash='top'; /* Embedded previews may disallow history edits. */ }
    }
    hide();
    nav.focus();
    document.querySelector('.rw25-header')?.scrollIntoView({block:'start',behavior:'auto'});
  });
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#about-founder')show(true);
    else hide();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!section.hidden)closeBtn?.click();
  });
  if(location.hash==='#about-founder')show(true);
})();
