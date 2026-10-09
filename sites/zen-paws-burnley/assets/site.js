
const toggle=document.querySelector('[data-menu-toggle]');const nav=document.querySelector('[data-nav]');
function closeMenu(){if(toggle&&nav){toggle.setAttribute('aria-expanded','false');nav.classList.remove('open')}}
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const active=toggle?.getAttribute('aria-expanded')==='true';closeMenu();if(active)toggle.focus()}});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{const filter=btn.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));let count=0;document.querySelectorAll('[data-category]').forEach(card=>{const show=filter==='all'||card.dataset.category===filter;card.hidden=!show;if(show)count++});document.querySelector('[data-count]').textContent=count+' '+(count===1?'service':'services')+' shown';}));
