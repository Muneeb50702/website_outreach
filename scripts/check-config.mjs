import {configuration} from './lib/core.mjs';
import {Cloudflare} from './lib/cloudflare.mjs';
export async function preflight(config, cf=new Cloudflare(config)) {
  const zone=await cf.call(`/zones/${config.zone}`);
  if(zone.result?.name!==config.root || zone.result?.account?.id!==config.account)throw new Error('Cloudflare zone does not match ROOT_DOMAIN/account');
  const bucket=await cf.call(cf.accountPath(`/r2/buckets/${config.bucket}`));
  if(bucket.result?.name!==config.bucket)throw new Error('R2 bucket not found');
  await cf.domains();
  // Prove object write/read/delete access with a private short-lived sentinel.
  const key=`checks/${crypto.randomUUID()}.txt`;
  try {
    await cf.put(key,'website-outreach-config-check','text/plain');
    const read=await cf.call(cf.objectPath(key),{raw:true});
    if(await read.text()!=='website-outreach-config-check')throw new Error('R2 object read check failed');
  } finally { await cf.call(cf.objectPath(key),{method:'DELETE',allowMissing:true}); }
  console.log('Cloudflare account/zone, bucket, domain list and R2 object permissions verified. Worker upload/custom-domain writes are verified during deployment.');
}
if(import.meta.url===`file://${process.argv[1]}`)await preflight(configuration());
