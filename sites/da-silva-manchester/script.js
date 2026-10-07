const toggle=document.querySelector('[data-menu-toggle]');
const nav=document.getElementById('site-nav');
function closeMenu(){toggle.setAttribute('aria-expanded','false');nav.removeAttribute('data-open');}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.toggleAttribute('data-open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
matchMedia('(min-width:768px)').addEventListener('change',closeMenu);
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab,focus=false){for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}if(focus)tab.focus();}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];if(event.key==='ArrowLeft')next=tabs[(index+tabs.length-1)%tabs.length];if(event.key==='Home')next=tabs[0];if(event.key==='End')next=tabs.at(-1);if(next){event.preventDefault();selectTab(next,true);}});});
