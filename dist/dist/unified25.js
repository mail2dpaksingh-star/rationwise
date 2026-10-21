/* RationWise v2.5: one guided interface, same validated mathematics and safety gates. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const tabs=[...document.querySelectorAll('[data-step]')];
 let current=1;
 const openStep=(n,{scroll=true}={})=>{
  n=Number(n);if(!Number.isInteger(n)||n<1||n>4)return;
  current=n;
  document.querySelectorAll('[data-step-panel]').forEach(el=>{el.hidden=Number(el.dataset.stepPanel)!==n});
  tabs.forEach(b=>{const selected=Number(b.dataset.step)===n;b.classList.toggle('active',selected);b.setAttribute('aria-selected',selected?'true':'false')});
  if(scroll)document.querySelector('.rw25-progress')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
 tabs.forEach(b=>b.addEventListener('click',()=>openStep(b.dataset.step)));
 document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>openStep(b.dataset.next)));
 document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>openStep(b.dataset.back)));
 // Open expandable account panel on navigation, even for direct hash navigation.
 const account=$('rw25AccountDetails');
 $('rw25AccountLink')?.addEventListener('click',()=>{if(account)account.open=true});
 window.addEventListener('hashchange',()=>{if(location.hash==='#rw25AccountDetails'&&account)account.open=true});
 // A calculation report is available in step four; preserve it while users move between steps.
 openStep(1,{scroll:false});
})();
