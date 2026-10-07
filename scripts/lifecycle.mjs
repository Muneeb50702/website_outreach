import {configuration,slug,validMetadata} from './lib/core.mjs';
import {Cloudflare} from './lib/cloudflare.mjs';
const [nameArg,action]=process.argv.slice(2),name=slug(nameArg);
if(!['interested','expire'].includes(action))throw new Error('Usage: lifecycle.mjs SLUG interested|expire');
const config=configuration(),cf=new Cloudflare(config),meta=await cf.getMeta(name);
if(!validMetadata(meta,name,config.root) || meta.status!=='active')throw new Error('Only valid active demos can change lifecycle');
if(action==='interested')await cf.putMeta(name,{...meta,interested:true,interested_at:new Date().toISOString()});
else await cf.putMeta(name,{...meta,interested:false,status:'expired'});
console.log(`Lifecycle updated: ${name} -> ${action}.`);
