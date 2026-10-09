import {readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {slug} from './lib/core.mjs';

// The lifecycle job remains serialized. The existing single-site scripts retain
// all review, provenance, routing and HTTPS checks for every requested concept.
const names=JSON.parse(process.env.REQUESTED_SLUGS||'[]');
if(!Array.isArray(names)||!names.length||names.length>10||new Set(names).size!==names.length)throw new Error('Request needs 1–10 distinct demo slugs');
names.forEach(slug);
const run=(script,name)=>{const result=spawnSync(process.execPath,[script,name],{stdio:'inherit',env:process.env});if(result.status!==0)throw new Error(`${script} failed for ${name}`);};
await mkdir('reports/batch-deployments',{recursive:true});
const completed=[];
for(const name of names){
  run('scripts/browser-qa.mjs',name);
  run('scripts/deploy.mjs',name);
  await copyFile('reports/deployment.json',`reports/batch-deployments/${name}.json`);
  run('scripts/draft.mjs',name);
  completed.push({slug:name,deployment:`batch-deployments/${name}.json`,outbox:`outbox/${name}.json`});
  await writeFile('reports/batch-summary.json',JSON.stringify({completed,checked_at:new Date().toISOString()},null,2));
}
console.log(`Published and HTTPS-verified ${completed.length} reviewed concepts. No email sent.`);
