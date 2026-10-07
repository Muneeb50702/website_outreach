import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {configuration,loadBrief,filesIn,fingerprint,assertReview,mime,validMetadata,slug,expired} from './lib/core.mjs';
import {Cloudflare} from './lib/cloudflare.mjs';
import {preflight} from './check-config.mjs';
const config=configuration(),cf=new Cloudflare(config);
const name=slug(process.argv[2]||'br-plumbing-austin');
const brief=await loadBrief(name),digest=await fingerprint(name);
assertReview(JSON.parse(await readFile(`state/${name}.review.json`,'utf8')),digest);
const qa=JSON.parse(await readFile(`reports/${name}/browser.json`,'utf8'));
if(qa.fingerprint!==digest || qa.passed!==true)throw new Error('Fresh browser QA is required before deployment');
const build=JSON.parse(await readFile('dist/build.json','utf8'));
if(build[name]!==digest)throw new Error('Build is stale; run npm run build');
await preflight(config,cf);
const existing=await cf.getMeta(name);
if(existing && !validMetadata(existing,name,config.root))throw new Error('Existing metadata belongs to another domain or is invalid');
if(existing && expired(existing))throw new Error('Expired demos require an explicit new campaign/slug; deployment does not reset expiry automatically');
if(existing && !expired(existing) && existing.fingerprint===digest) {
  console.log(`Already deployed: https://${existing.hostname}/ (original expiry retained).`);
  await mkdir('reports',{recursive:true});await writeFile('reports/deployment.json',JSON.stringify(existing,null,2));
  process.exit(0);
}
// Reserve only exact demo hostnames. Never attach the apex, www or a wildcard.
const hostname=`${name}.${config.root}`;
const zoneDns=await cf.call(`/zones/${config.zone}/dns_records?name=${encodeURIComponent(hostname)}`);
const knownDomain=(await cf.domains()).find(d=>d.hostname===hostname);
if(zoneDns.result?.length && (!knownDomain || knownDomain.service!==config.worker))throw new Error('Demo hostname already has DNS records; choose another slug');
const form=new FormData();
form.set('metadata',new Blob([JSON.stringify({main_module:'index.mjs',compatibility_date:'2026-10-01',bindings:[{type:'r2_bucket',name:'DEMOS',bucket_name:config.bucket},{type:'plain_text',name:'ROOT_DOMAIN',text:config.root}]})],{type:'application/json'}));
form.set('index.mjs',new Blob([await readFile('cloudflare/worker/index.mjs')],{type:'application/javascript+module'}),'index.mjs');
await cf.call(cf.accountPath(`/workers/scripts/${config.worker}`),{method:'PUT',body:form});
const release=randomBytes(12).toString('hex');
for(const file of await filesIn(`dist/${name}`))await cf.put(`sites/${name}/${release}/${file}`,await readFile(`dist/${name}/${file}`),mime(file));
// New files are invisible until this single metadata write. Old release stays available on upload failure.
await cf.attach(hostname);
const created=existing?.created_at||new Date().toISOString();
const meta={schema_version:1,slug:name,hostname,business_name:brief.business_name,status:'active',release,fingerprint:digest,created_at:created,deployed_at:new Date().toISOString(),expires_at:existing?.expires_at||new Date(Date.now()+config.ttl*86400000).toISOString(),interested:existing?.interested===true};
await cf.putMeta(name,meta);
await mkdir('reports',{recursive:true});await writeFile('reports/deployment.json',JSON.stringify(meta,null,2));
console.log(`Deployed concept: https://${hostname}/. HTTPS still requires live verification before outreach.`);
