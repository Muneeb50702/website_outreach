import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {configuration,slug,loadBrief,validMetadata,expired,fingerprint} from './lib/core.mjs';
import {Cloudflare} from './lib/cloudflare.mjs';
import {outreachEligible,composeDraft} from './lib/outreach.mjs';
const name=slug(process.argv[2]||'br-plumbing-austin'),brief=await loadBrief(name),config=configuration();
const cf=new Cloudflare(config),meta=await cf.getMeta(name);
if(!validMetadata(meta,name,config.root) || expired(meta) || meta.fingerprint!==await fingerprint(name))throw new Error('A current active deployment must exist before preparing outreach');
const ledger=JSON.parse(await readFile('state/outreach-ledger.json','utf8'));
const suppression=JSON.parse(await readFile('state/suppression.json','utf8'));
const eligible=outreachEligible(brief.contact.email,ledger,suppression);
if(!eligible.eligible)throw new Error(`Draft withheld: ${eligible.reason}`);
const url=`https://${meta.hostname}/`,expected=createHash('sha256').update(await readFile(`dist/${name}/index.html`)).digest('hex');
let verified=false,lastIssue='not yet checked';
for(let attempt=0;attempt<12;attempt++) {
  try {
    const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Cache-Control':'no-cache'}});
    const body=await r.text();
    if(r.status!==200 || !r.headers.get('X-Robots-Tag')?.includes('noindex') || createHash('sha256').update(body).digest('hex')!==expected)throw new Error('Live HTML/status/noindex does not match deployment');
    // Verify every locally referenced asset over HTTPS before producing a usable preview link.
    for(const m of body.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
      if(/^(#|tel:|mailto:|https:)/.test(m[1]))continue;
      const asset=await fetch(new URL(m[1],url),{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(10000)});
      if(asset.status!==200)throw new Error('A live site asset is missing');
    }
    verified=true;break;
  }catch(e){lastIssue=e.message;}
  if(attempt<11)await new Promise(r=>setTimeout(r,5000));
}
if(!verified)throw new Error(`HTTPS verification pending/failed: ${lastIssue}. Do not email this URL yet; retry the deployment workflow after certificate/DNS propagation.`);
const draft={schema_version:1,id:`${name}-${meta.release}`,slug:name,fingerprint:meta.fingerprint,status:'needs_gmail_review',created_at:new Date().toISOString(),expires_at:meta.expires_at,preview_url:url,live_verified_at:new Date().toISOString(),recipient_source:brief.contact.source_url,checks_required:['Reconcile Gmail Sent for current Asia/Karachi date, across manual and automated outreach','Confirm public business recipient, prior contact, opt-outs and bounces in Gmail','Qualify this prospect using a current website comparison','Recheck demo URL and remaining shared daily quota before sending'],...composeDraft(brief,url)};
await mkdir('reports/outbox',{recursive:true});await writeFile(`reports/outbox/${name}.json`,JSON.stringify(draft,null,2));
await writeFile(`reports/outbox/${name}.txt`,draft.body);
console.log('HTTPS and exact live build verified. Outreach draft prepared; Gmail review remains required. No email sent.');
