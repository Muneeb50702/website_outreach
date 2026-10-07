import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{serve,resolveTenant,resolveAsset} from '../cloudflare/worker/index.mjs';
const root='example.com',release='a'.repeat(24);
function environment(overrides={}) {
  const requested=[];
  const meta={slug:'alpha',hostname:'alpha.example.com',release,status:'active',expires_at:'2026-10-14T00:00:00Z',...overrides};
  const env={ROOT_DOMAIN:root,DEMOS:{async get(key){requested.push(key);if(key==='metadata/alpha.json')return {json:async()=>meta};if(key===`sites/alpha/${release}/index.html`)return {body:'Alpha homepage',httpEtag:'"alpha"'};if(key===`sites/alpha/${release}/assets/style.css`)return {body:'body{}',httpEtag:'"css"'};return null;}}};
  return {env,requested};
}
const request=(p='/',options={})=>new Request(`https://alpha.example.com${p}`,options);
const now=Date.parse('2026-10-07T00:00:00Z');
test('Only first-level nonreserved tenants resolve; apex and portfolio stay outside router',()=>{
  assert.equal(resolveTenant('alpha.example.com',root),'alpha');
  for(const h of ['example.com','www.example.com','api.example.com','instagram-auth.example.com','alpha.demo.example.com','alpha.example.com.evil.test'])assert.equal(resolveTenant(h,root),null);
});
test('Reject encoded traversal, hidden files, double encoding and backslashes',()=>{
  for(const p of ['/%2e%2e/alpha','/.env','/%252e%252e/x','/assets%5cother','/%00x'])assert.equal(resolveAsset(p),null);
  assert.equal(resolveAsset('/'),'index.html');assert.equal(resolveAsset('/about/'),'about/index.html');
});
test('Router isolates release assets and emits disclosure/security headers',async()=>{
  const {env,requested}=environment();const r=await serve(request(),env,now);
  assert.equal(r.status,200);assert.equal(await r.text(),'Alpha homepage');
  assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
  assert.match(r.headers.get('Content-Security-Policy'),/form-action 'none'/);
  assert.deepEqual(requested,['metadata/alpha.json',`sites/alpha/${release}/index.html`]);
});
test('Metadata cannot redirect one tenant into another tenant or release path',async()=>{
  for(const override of [{slug:'beta'},{hostname:'beta.example.com'},{release:'../../beta'},{status:'unknown'},{expires_at:'garbage'}]){
    const {env,requested}=environment(override);assert.equal((await serve(request(),env,now)).status,503);assert.equal(requested.length,1);
  }
});
test('Expiration is enforced at request time, including assets, before cron cleanup',async()=>{
  const {env,requested}=environment({expires_at:'2026-10-07T00:00:00Z'});
  assert.equal((await serve(request('/assets/style.css'),env,now)).status,410);assert.equal(requested.length,1);
});
test('Interested demos survive date expiry; explicit expired status takes precedence',async()=>{
  const {env}=environment({expires_at:'2026-09-01T00:00:00Z',interested:true});assert.equal((await serve(request(),env,now)).status,200);
  const e=environment({status:'expired',interested:true});assert.equal((await serve(request(),e.env,now)).status,410);
});
test('Unknown tenant/assets are true 404s, POST is blocked, HEAD has no body',async()=>{
  const {env}=environment();assert.equal((await serve(request('/missing.js'),env,now)).status,404);
  assert.equal((await serve(new Request('https://beta.example.com/'),env,now)).status,404);
  assert.equal((await serve(request('/',{method:'POST'}),env,now)).status,405);
  const head=await serve(request('/',{method:'HEAD'}),env,now);assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('ETag supports conditional reads; CSS MIME remains correct',async()=>{
  const {env}=environment();const r=await serve(request('/assets/style.css'),env,now);assert.match(r.headers.get('Content-Type'),/text\/css/);
  assert.equal((await serve(request('/',{headers:{'If-None-Match':'"alpha"'}}),env,now)).status,304);
});
test('Storage exceptions fail closed without revealing internal error',async()=>{
  const env={ROOT_DOMAIN:root,DEMOS:{get(){throw new Error('private detail');}}};
  const r=await worker.fetch(request(),env);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private detail/);
});
