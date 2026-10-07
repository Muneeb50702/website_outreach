const toggle=document.querySelector('[data-menu-toggle]'),nav=document.getElementById('navigation');
function setMenu(open){toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);}
toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setMenu(false);toggle.focus();}});
const palettes={sage:{name:'Sage',description:'sage green'},clay:{name:'Clay',description:'warm clay'},stone:{name:'Stone',description:'soft stone'}};
document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.palette,palette=palettes[key];if(!palette)return;
 document.querySelectorAll('[data-palette]').forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
 const image=document.getElementById('room-image');image.src=`assets/room-${key}.svg`;image.alt=`Original room illustration with a ${palette.description} wall, window and armchair`;
 document.getElementById('large-swatch').className=`large-swatch ${key}`;
 document.querySelector('.palette-status').textContent=`${palette.name} colour study selected.`;
}));
