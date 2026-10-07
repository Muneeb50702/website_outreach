const RESERVED = new Set(['www','mail','smtp','api','admin','app','demo','autodiscover','ftp','cpanel','webmail','instagram-auth']);
const TYPES={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',woff2:'font/woff2',json:'application/json',txt:'text/plain; charset=utf-8',ico:'image/x-icon'};
function headers(extra={}) {
  return new Headers({'X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'",...extra});
}
function message(text,status=404,method='GET') { return new Response(method==='HEAD'?null:text,{status,headers:headers({'Content-Type':'text/plain; charset=utf-8'})}); }
export function resolveTenant(hostname,root) {
  if(!root || !hostname.endsWith(`.${root}`))return null;
  const name=hostname.slice(0,-root.length-1);
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) || RESERVED.has(name))return null;
  return name;
}
export function resolveAsset(pathname) {
  let decoded;try { decoded=decodeURIComponent(pathname); } catch { return null; }
  if(decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(s=>s.startsWith('.') || s==='..') || /%[0-9a-f]{2}/i.test(decoded))return null;
  const parts=decoded.split('/').filter(Boolean);
  if(!parts.length)return 'index.html';
  const p=parts.join('/');
  return decoded.endsWith('/') ? `${p}/index.html` : p;
}
export async function serve(request,env,now=Date.now()) {
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:headers({Allow:'GET, HEAD'})});
  const url=new URL(request.url), name=resolveTenant(url.hostname,env.ROOT_DOMAIN);
  if(!name)return message('Demo not found.',404,request.method);
  const asset=resolveAsset(url.pathname);
  if(!asset)return message('Invalid path.',400,request.method);
  const metaObject=await env.DEMOS.get(`metadata/${name}.json`);
  if(!metaObject)return message('Demo not found.',404,request.method);
  let meta;try { meta=await metaObject.json(); } catch { return message('Demo unavailable.',503,request.method); }
  if(meta.slug!==name || meta.hostname!==url.hostname || !/^[a-f0-9]{24}$/.test(meta.release||'') || !['active','expired'].includes(meta.status) || !Number.isFinite(Date.parse(meta.expires_at)))return message('Demo unavailable.',503,request.method);
  if(meta.status==='expired' || (meta.interested!==true && Date.parse(meta.expires_at)<=now))return message('This independent website concept has expired.',410,request.method);
  if(asset==='robots.txt')return new Response(request.method==='HEAD'?null:'User-agent: *\nDisallow: /\n',{headers:headers({'Content-Type':'text/plain; charset=utf-8'})});
  let object=await env.DEMOS.get(`sites/${name}/${meta.release}/${asset}`);
  if(!object && !asset.split('/').at(-1).includes('.'))object=await env.DEMOS.get(`sites/${name}/${meta.release}/${asset}/index.html`);
  if(!object)return message('Page not found.',404,request.method);
  const type=TYPES[asset.split('.').at(-1)] || (!asset.split('/').at(-1).includes('.')?'text/html; charset=utf-8':'application/octet-stream');
  const h=headers({'Content-Type':type,ETag:object.httpEtag||`"${object.etag}"`});
  if(request.headers.get('If-None-Match')===h.get('ETag'))return new Response(null,{status:304,headers:h});
  return new Response(request.method==='HEAD'?null:object.body,{headers:h});
}
export default {async fetch(request,env) {try {return await serve(request,env);}catch{return message('Demo temporarily unavailable.',503,request.method);}}};
