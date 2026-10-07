import {readdir,readFile} from 'node:fs/promises';
import {loadBrief,filesIn,validateBrief} from './lib/core.mjs';
export async function validateSites() {
  const intake=(await readdir('intake')).filter(f=>f.endsWith('.json'));
  for(const file of intake) {
    const brief=validateBrief(JSON.parse(await readFile(`intake/${file}`,'utf8')));
    if(`${brief.slug}.json`!==file)throw new Error('Intake filename must match brief slug');
  }
  const names=(await readdir('leads')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
  for(const name of names) {
    await loadBrief(name);
    const files=await filesIn(`sites/${name}`);
    if(!files.includes('index.html'))throw new Error(`${name}: missing index.html`);
    for(const file of files) {
      if(!/\.(html|css|js|mjs|svg|png|jpg|jpeg|webp|avif|woff2|txt|ico)$/i.test(file) || file.split('/').some(p=>p.startsWith('.')))throw new Error(`Not a public asset: ${file}`);
      if(file.endsWith('.html')) {
        const html=await readFile(`sites/${name}/${file}`,'utf8');
        if(!/<html[^>]+lang=/i.test(html) || !/<meta[^>]+name=["']viewport["']/i.test(html) || !/<title>[^<]+<\/title>/i.test(html))throw new Error(`${name}: missing HTML basics`);
        if(!/Independent concept/i.test(html) || !/not the official/i.test(html))throw new Error(`${name}: missing independent concept disclosure`);
        if(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html))throw new Error(`${name}: missing noindex meta`);
        if(/<form\b|<script(?![^>]*\bsrc=)|\son[a-z]+\s*=|\sstyle\s*=/i.test(html))throw new Error(`${name}: use external scripts/styles; demos have no live forms`);
        for(const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
          const link=m[1];
          if(/^(#|tel:|mailto:|https:\/\/)/.test(link))continue;
          const filePath=link.replace(/^\//,'').split(/[?#]/)[0];
          if(!files.includes(filePath))throw new Error(`${name}: missing local asset ${link}`);
        }
      }
    }
  }
  console.log(`Validated ${names.length} built concept(s) and ${intake.length} intake brief(s).`);
  return names;
}
if(import.meta.url===`file://${process.argv[1]}`)await validateSites();
