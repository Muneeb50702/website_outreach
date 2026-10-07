import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {validateSites} from './validate.mjs';
import {fingerprint} from './lib/core.mjs';
const names=await validateSites();
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const name of names) {
  await cp(`sites/${name}`,`dist/${name}`,{recursive:true});
  await writeFile(`dist/${name}/robots.txt`,'User-agent: *\nDisallow: /\n');
}
await writeFile('dist/build.json',JSON.stringify(Object.fromEntries(await Promise.all(names.map(async n=>[n,await fingerprint(n)]))),null,2));
console.log(`Built ${names.length} static concept(s).`);
