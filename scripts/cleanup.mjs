import {configuration,expired,validMetadata,slug} from './lib/core.mjs';
import {Cloudflare} from './lib/cloudflare.mjs';
const config=configuration(),cf=new Cloudflare(config);
const apply=process.argv.includes('--apply');
for(const item of await cf.list('metadata/')) {
  if(!/^metadata\/[a-z0-9-]+\.json$/.test(item.key||''))continue;
  const name=slug(item.key.slice(9,-5)),meta=await cf.getMeta(name);
  if(!validMetadata(meta,name,config.root))throw new Error(`Invalid metadata; cleanup stopped for ${name}`);
  if(!expired(meta))continue;
  console.log(`${apply?'Expiring':'Would expire'} ${name}`);
  if(!apply)continue;
  // Tombstone first: stop serving immediately even if domain/object cleanup subsequently fails.
  await cf.putMeta(name,{...meta,status:'expired',expired_at:meta.expired_at||new Date().toISOString()});
  await cf.detach(meta);
  const count=await cf.removePrefix(`sites/${name}/`);
  console.log(`Removed ${count} demo asset(s); retained private tombstone.`);
}
