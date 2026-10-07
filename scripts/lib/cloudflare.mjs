export class Cloudflare {
  constructor(config, request=fetch) { this.config=config; this.request=request; }
  async call(endpoint, {method='GET',body,raw=false,allowMissing=false,headers={}}={}) {
    const res=await this.request(`https://api.cloudflare.com/client/v4${endpoint}`, {
      method,headers:{Authorization:`Bearer ${this.config.token}`,...headers},body,
      signal:AbortSignal.timeout(60000)
    });
    if (res.status===404 && allowMissing) return null;
    if (raw && res.ok) return res;
    const data=await res.json().catch(()=>null);
    if (!res.ok || data?.success===false || !data) {
      const codes=(data?.errors||[]).map(e=>e.code).join(',');
      throw new Error(`Cloudflare ${method} ${endpoint.split('?')[0]} failed (${res.status}${codes?`, code ${codes}`:''}). Check token scopes, zone and bucket. No response body logged.`);
    }
    return data;
  }
  accountPath(p) { return `/accounts/${this.config.account}${p}`; }
  objectPath(key) { return this.accountPath(`/r2/buckets/${this.config.bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`); }
  async getMeta(name) {
    const r=await this.call(this.objectPath(`metadata/${name}.json`),{raw:true,allowMissing:true});
    return r ? r.json() : null;
  }
  async put(key,body,type) { return this.call(this.objectPath(key),{method:'PUT',body,headers:{'Content-Type':type}}); }
  async putMeta(name,meta) { return this.put(`metadata/${name}.json`,JSON.stringify(meta),'application/json'); }
  async list(prefix) {
    const all=[];let cursor;
    do {
      const q=new URLSearchParams({prefix,per_page:'1000'}); if(cursor)q.set('cursor',cursor);
      const data=await this.call(this.accountPath(`/r2/buckets/${this.config.bucket}/objects?${q}`));
      all.push(...(data.result||[]));
      cursor=data.result_info?.is_truncated ? data.result_info.cursor : null;
      if(data.result_info?.is_truncated && !cursor) throw new Error('Truncated R2 list without cursor');
    } while(cursor);
    return all;
  }
  async removePrefix(prefix) {
    if (!/^sites\/[a-z0-9-]+\//.test(prefix)) throw new Error('Deletion must stay within a demo prefix');
    const items=await this.list(prefix);
    for(const item of items) {
      if(!item.key?.startsWith(prefix))throw new Error('R2 returned object outside prefix');
      await this.call(this.objectPath(item.key),{method:'DELETE',allowMissing:true});
    }
    return items.length;
  }
  async domains() {
    const all=[];
    for(let page=1;;page++) {
      const data=await this.call(this.accountPath(`/workers/domains?page=${page}&per_page=100`));
      all.push(...(data.result||[]));
      if(page >= (data.result_info?.total_pages || 1))return all;
    }
  }
  async attach(hostname) {
    const current=(await this.domains()).find(d=>d.hostname===hostname);
    if(current && (current.service!==this.config.worker || current.zone_id!==this.config.zone)) throw new Error('Hostname already belongs to another Worker/zone');
    return this.call(this.accountPath('/workers/domains'),{method:'PUT',body:JSON.stringify({hostname,service:this.config.worker,zone_id:this.config.zone}),headers:{'Content-Type':'application/json'}});
  }
  async detach(meta) {
    const d=(await this.domains()).find(d=>d.hostname===meta.hostname);
    if(!d)return;
    if(d.service!==this.config.worker || d.zone_id!==this.config.zone)throw new Error('Refusing to remove a domain owned by another Worker/zone');
    await this.call(this.accountPath(`/workers/domains/${d.id}`),{method:'DELETE',allowMissing:true});
  }
}
