import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {previewServer} from './lib/preview.mjs';
import {fingerprint} from './lib/core.mjs';
const require=createRequire(import.meta.url);
let chromium;
try {({chromium}=require('playwright'));}
catch {if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw new Error('Install playwright@1.62.1 and run npx playwright install chromium');({chromium}=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const names=process.argv[2]?[process.argv[2]]:(await readdir('leads')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
  for(const name of names) {
    const server=previewServer(name);await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const dir=`reports/${name}`;await mkdir(dir,{recursive:true});
    const results=[],errors=[];
    try {
      for(const width of [320,390,768,1440]) {
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        page.on('requestfailed',r=>errors.push(`Request failed: ${r.url()}`));
        page.on('response',r=>{if(r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()}`);});
        await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
        const checks=await page.evaluate(()=>({
          overflow:document.documentElement.scrollWidth>innerWidth+1,
          h1Count:document.querySelectorAll('h1').length,
          missingAlts:[...document.images].filter(i=>!i.hasAttribute('alt')).length,
          brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,
          emptyLinks:[...document.querySelectorAll('a')].filter(a=>!a.textContent.trim()&&!a.getAttribute('aria-label')).length,
          badAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
          disclosure:document.body.innerText.includes('Independent concept')&&document.body.innerText.includes('not the official'),
          primaryCTA:!!document.querySelector('a[href^="tel:"]'),
          robots:document.querySelector('meta[name="robots"]')?.content.includes('noindex'),
          externalResources:performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin!==location.origin).map(r=>r.name)
        }));
        if(width<768 && await page.locator('[data-menu-toggle]').count()) {
          const menu=page.locator('[data-menu-toggle]');await menu.click();
          if(await menu.getAttribute('aria-expanded')!=='true')errors.push('Mobile menu did not open');
          await page.keyboard.press('Escape');
          if(await menu.getAttribute('aria-expanded')!=='false')errors.push('Mobile menu did not close on Escape');
        }
        await page.screenshot({path:`${dir}/${width}.png`,fullPage:true});
        const passed=!checks.overflow&&checks.h1Count===1&&!checks.missingAlts&&!checks.brokenImages&&!checks.emptyLinks&&!checks.badAnchors.length&&checks.disclosure&&checks.primaryCTA&&checks.robots&&!checks.externalResources.length;
        results.push({width,passed,...checks});await page.close();
      }
    }finally{await new Promise(r=>server.close(r));}
    const report={slug:name,fingerprint:await fingerprint(name),checked_at:new Date().toISOString(),passed:results.every(r=>r.passed)&&!errors.length,viewports:results,errors};
    await writeFile(`${dir}/browser.json`,JSON.stringify(report,null,2));
    console.log(`${name}: ${report.passed?'PASS':'FAIL'} browser QA (320, 390, 768, 1440px)`);
    if(!report.passed)throw new Error(JSON.stringify(report));
  }
}finally{await browser.close();}
