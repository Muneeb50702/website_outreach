const toggle=document.querySelector('[data-menu-toggle]'),nav=document.getElementById('navigation');
function setMenu(open){toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);}
toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
const surfaces={fresh:{label:'Fresh',alt:'Illustrated clean paving tiles with a leaf and water droplets'},weathered:{label:'Weathered',alt:'Illustrated weathered paving tiles with simulated dirt marks'}};
document.querySelectorAll('[data-surface]').forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.surface,surface=surfaces[key];if(!surface)return;
 document.querySelectorAll('[data-surface]').forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
 const image=document.getElementById('surface-image');image.src=`assets/surface-${key}.svg`;image.alt=surface.alt;
 document.querySelector('.surface-status').textContent=`${surface.label} surface illustration selected.`;
}));
