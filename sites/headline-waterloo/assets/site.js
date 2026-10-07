const toggle=document.querySelector('[data-menu-toggle]');
const nav=document.getElementById('navigation');
function setMenu(open){toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);}
toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
