import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configuration,validateBrief,assertReview,expired,validMetadata} from '../scripts/lib/core.mjs';
import {Cloudflare} from '../scripts/lib/cloudflare.mjs';
import {outreachEligible,localDate,composeDraft} from '../scripts/lib/outreach.mjs';
const cfg={token:'test-secret',account:'a'.repeat(32),zone:'b'.repeat(32),root:'example.com',bucket:'test-demos',worker:'demo-worker',ttl:7};
test('Config validates all seven entries without exposing token values',()=>{
  assert.throws(()=>configuration({}),/Missing GitHub configuration/);
  const env={CLOUDFLARE_API_TOKEN:'test-secret',CLOUDFLARE_ACCOUNT_ID:cfg.account,CLOUDFLARE_ZONE_ID:cfg.zone,ROOT_DOMAIN:cfg.root,R2_BUCKET_NAME:cfg.bucket,CLOUDFLARE_WORKER_NAME:cfg.worker,DEMO_TTL_DAYS:'7'};
  assert.deepEqual(configuration(env),cfg);assert.throws(()=>configuration({...env,DEMO_TTL_DAYS:'0'}));assert.throws(()=>configuration({...env,ROOT_DOMAIN:'https://example.com'}));
});
test('Brief must retain provenance and valid contacts, and cannot select www',async()=>{
  const b=JSON.parse(await readFile('leads/br-plumbing-austin.json','utf8'));assert.equal(validateBrief(b),b);
  assert.throws(()=>validateBrief({...b,slug:'www'}));assert.throws(()=>validateBrief({...b,sources:[]}));assert.throws(()=>validateBrief({...b,contact:{...b.contact,source_url:'https://unmatched.test'}}));
});
test('Changed code invalidates review, and insufficient subjective scores block deployment',()=>{
  const review={approved:true,fingerprint:'current',reviewer:'Visual reviewer',reviewed_at:'2026-10-07T00:00:00Z',scores:{visual:9,mobile:9,business_relevance:9,typography:9,conversion:9}};
  assert.doesNotThrow(()=>assertReview(review,'current'));assert.throws(()=>assertReview(review,'changed'));assert.throws(()=>assertReview({...review,approved:false},'current'));assert.throws(()=>assertReview({...review,scores:{...review.scores,mobile:8}},'current'));
});
test('Invalid metadata and dates never extend a demo lifetime',()=>{
  assert.equal(expired({status:'active',expires_at:'bad'}),true);
  assert.equal(expired({status:'active',interested:true,expires_at:'2020-01-01'}),false);
  assert.equal(validMetadata({slug:'alpha',hostname:'alpha.example.com',release:'a'.repeat(24),status:'active',expires_at:'2026-10-14'},'alpha','example.com'),true);
});
test('R2 object listing follows cursors instead of silently ignoring later pages',async()=>{
  const calls=[];const cf=new Cloudflare(cfg,async(url)=>{calls.push(url);return Response.json({success:true,result:[{key:calls.length===1?'metadata/a.json':'metadata/b.json'}],result_info:{is_truncated:calls.length===1,cursor:calls.length===1?'next-token':null}});});
  assert.equal((await cf.list('metadata/')).length,2);assert.match(calls[1],/cursor=next-token/);
});
test('Worker multipart upload binds the private bucket and domain without an API token binding',async()=>{
  let sent;
  const cf=new Cloudflare(cfg,async(url,options)=>{sent={url,...options};return Response.json({success:true,result:{}});});
  await cf.uploadWorker('export default {fetch(){return new Response("ok")}}');
  assert.equal(sent.method,'PUT');assert.match(sent.url,/workers\/scripts\/demo-worker$/);
  const metadata=JSON.parse(await sent.body.get('metadata').text());
  assert.equal(metadata.main_module,'index.mjs');assert.deepEqual(metadata.bindings.map(b=>b.name),['DEMOS','ROOT_DOMAIN']);
  assert.equal(metadata.bindings[0].bucket_name,cfg.bucket);assert.ok(!JSON.stringify(metadata).includes(cfg.token));
  assert.match(await sent.body.get('index.mjs').text(),/export default/);
});
test('Cleanup cannot delete outside a controlled demo prefix',async()=>{
  const cf=new Cloudflare(cfg,async()=>Response.json({success:true,result:[{key:'portfolio/index.html'}]}));
  await assert.rejects(cf.removePrefix(''),/Deletion must/);await assert.rejects(cf.removePrefix('sites/alpha/'),/outside prefix/);
});
test('Domain cleanup refuses another worker, account-wide ownership is not assumed',async()=>{
  const calls=[];const cf=new Cloudflare(cfg,async(url)=>{calls.push(url);return Response.json({success:true,result:[{id:'domain',hostname:'alpha.example.com',service:'portfolio',zone_id:cfg.zone}]});});
  await assert.rejects(cf.detach({hostname:'alpha.example.com'}),/another Worker/);assert.equal(calls.length,1);
});
test('Cloudflare API errors never echo response bodies or credentials',async()=>{
  const cf=new Cloudflare(cfg,async()=>Response.json({success:false,errors:[{code:10000,message:'test-secret private detail'}]},{status:403}));
  await assert.rejects(cf.call('/test'),e=>e.message.includes('403')&&!e.message.includes('test-secret')&&!e.message.includes('private detail'));
});
test('Pakistan calendar accounting counts manual, pending and bounced sends toward 20',()=>{
  const now=new Date('2026-10-07T00:00:00Z');assert.equal(localDate(new Date('2026-10-06T20:00:00Z')),'2026-10-07');
  const ledger=Array.from({length:20},(_,i)=>({recipient:`person${i}@example.com`,sent_at:'2026-10-06T20:00:00Z',status:i===0?'uncertain':i===1?'bounced':'sent'}));
  assert.equal(outreachEligible('new@example.com',ledger,[],now).eligible,false);
  assert.equal(outreachEligible('new@example.com',ledger.slice(0,5),[],now).remaining,15);
});
test('Suppression and unresolved prior sends block repeat contact; drafts do not count as sent',()=>{
  const now=new Date('2026-10-07T00:00:00Z');assert.equal(outreachEligible('A@example.com',[],['a@example.com'],now).reason,'suppressed');
  assert.equal(outreachEligible('a@example.com',[{recipient:'a@example.com',status:'uncertain',sent_at:'2026-10-05T00:00:00Z'}],[],now).eligible,false);
  assert.equal(outreachEligible('a@example.com',[{recipient:'a@example.com',status:'draft',sent_at:now.toISOString()}],[],now).remaining,20);
});
test('Individual outreach draft includes preview, disclosure and all three required profile links',async()=>{
  const b=JSON.parse(await readFile('leads/br-plumbing-austin.json','utf8'));const d=composeDraft(b,'https://br.example.com/');
  for(const url of ['https://br.example.com/','https://muhammadmuneeb.tech/','https://www.linkedin.com/in/muhammad-muneeb-yaseen','https://github.com/Muneeb50702'])assert.ok(d.body.includes(url));
  assert.match(d.body,/independent website concept/);assert.match(d.body,/no thanks/);
});
