import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';

export const RESERVED = new Set(['www', 'mail', 'smtp', 'api', 'admin', 'app', 'demo', 'autodiscover', 'ftp', 'cpanel', 'webmail', 'instagram-auth']);
export function slug(value) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value || '') || RESERVED.has(value)) throw new Error('Invalid or reserved demo slug');
  return value;
}
export function domain(value) {
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value || '')) throw new Error('ROOT_DOMAIN must be a bare domain');
  return value;
}
export function configuration(env = process.env) {
  const required = ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_ZONE_ID','ROOT_DOMAIN','R2_BUCKET_NAME','CLOUDFLARE_WORKER_NAME','DEMO_TTL_DAYS'];
  const missing = required.filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing GitHub configuration: ${missing.join(', ')}`);
  for (const key of ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_ZONE_ID']) if (!/^[a-f0-9]{32}$/i.test(env[key])) throw new Error(`Invalid ${key}`);
  domain(env.ROOT_DOMAIN);
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET_NAME)) throw new Error('Invalid R2_BUCKET_NAME');
  if (!/^[a-z0-9-]{1,63}$/.test(env.CLOUDFLARE_WORKER_NAME)) throw new Error('Invalid CLOUDFLARE_WORKER_NAME');
  const ttl = Number(env.DEMO_TTL_DAYS);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 30) throw new Error('DEMO_TTL_DAYS must be 1–30');
  return {token:env.CLOUDFLARE_API_TOKEN,account:env.CLOUDFLARE_ACCOUNT_ID,zone:env.CLOUDFLARE_ZONE_ID,root:env.ROOT_DOMAIN,bucket:env.R2_BUCKET_NAME,worker:env.CLOUDFLARE_WORKER_NAME,ttl};
}
export function validateBrief(brief) {
  slug(brief.slug);
  for (const key of ['business_name','industry','location','design_direction','primary_conversion']) if (typeof brief[key] !== 'string' || !brief[key].trim()) throw new Error(`Brief missing ${key}`);
  if (!Array.isArray(brief.services) || !brief.services.length || brief.services.some(v => typeof v !== 'string' || !v.trim())) throw new Error('Brief needs verified services');
  if (!Array.isArray(brief.sources) || !brief.sources.length) throw new Error('Brief needs research sources');
  for (const source of brief.sources) {
    if (!/^https:\/\//.test(source.url) || !Array.isArray(source.facts) || !source.facts.length || !Number.isFinite(Date.parse(source.checked_at))) throw new Error('Each source needs HTTPS URL, checked_at and supported facts');
  }
  if (!brief.contact?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.contact.email) || !brief.contact.source_url || !brief.sources.some(s=>s.url===brief.contact.source_url)) throw new Error('Brief needs a public email and matching source');
  if (!brief.contact.phone || !/^\+\d{8,15}$/.test(brief.contact.phone)) throw new Error('Brief needs an E.164 phone');
  if (!brief.opportunity?.observation || !brief.opportunity.source_url || !brief.sources.some(s=>s.url===brief.opportunity.source_url)) throw new Error('Document a grounded opportunity; do not assume no website');
  return brief;
}
export async function loadBrief(name) { return validateBrief(JSON.parse(await readFile(`leads/${slug(name)}.json`, 'utf8'))); }
export async function filesIn(dir, prefix = '') {
  const files=[];
  for (const name of (await readdir(path.join(dir,prefix))).sort()) {
    const rel=path.posix.join(prefix,name), info=await lstat(path.join(dir,rel));
    if (info.isSymbolicLink()) throw new Error(`Symlinks are forbidden: ${rel}`);
    if (info.isDirectory()) files.push(...await filesIn(dir,rel));
    else if (info.isFile()) files.push(rel);
  }
  return files;
}
export async function fingerprint(name) {
  const h=createHash('sha256');
  const briefPath=`leads/${slug(name)}.json`;
  h.update(briefPath+'\0');h.update(await readFile(briefPath));
  for (const f of await filesIn(`sites/${name}`)) { h.update(f+'\0');h.update(await readFile(`sites/${name}/${f}`));h.update('\0'); }
  return h.digest('hex');
}
export function expired(meta, now=Date.now()) {
  return meta.status === 'expired' || (meta.interested !== true && (!Number.isFinite(Date.parse(meta.expires_at)) || Date.parse(meta.expires_at)<=now));
}
export function validMetadata(meta, name, root) {
  return meta?.slug===name && meta.hostname===`${name}.${root}` && /^[a-f0-9]{24}$/.test(meta.release||'') && ['active','expired'].includes(meta.status) && Number.isFinite(Date.parse(meta.expires_at));
}
export const mime = file => ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'})[path.extname(file).toLowerCase()] || 'application/octet-stream';
export function assertReview(review, digest) {
  if (review?.fingerprint !== digest || review?.approved !== true || !review.reviewer || !Number.isFinite(Date.parse(review.reviewed_at))) throw new Error('Missing, unapproved or stale visual review');
  for (const key of ['visual','mobile','business_relevance','typography','conversion']) if (typeof review.scores?.[key]!=='number' || review.scores[key]<8.5 || review.scores[key]>10) throw new Error(`Visual review failed: ${key}`);
}
