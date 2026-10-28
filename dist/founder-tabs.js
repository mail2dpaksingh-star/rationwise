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
