const toggle=document.querySelector('[data-menu-toggle]');
const nav=document.getElementById('site-nav');
function closeMenu(){toggle.setAttribute('aria-expanded','false');nav.removeAttribute('data-open');}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.toggleAttribute('data-open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
matchMedia('(min-width:768px)').addEventListener('change',closeMenu);
