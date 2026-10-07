import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {serve} from '../../cloudflare/worker/index.mjs';
import {slug} from './core.mjs';
export function previewServer(nameArg) {
  const name=slug(nameArg),root='preview.invalid',release='a'.repeat(24);
  const env={ROOT_DOMAIN:root,DEMOS:{async get(key){
    if(key===`metadata/${name}.json`)return {async json(){return {slug:name,hostname:`${name}.${root}`,release,status:'active',expires_at:new Date(Date.now()+86400000).toISOString()};}};
    const prefix=`sites/${name}/${release}/`;
    if(!key.startsWith(prefix))return null;
    try {const body=await readFile(`dist/${name}/${key.slice(prefix.length)}`);return {body,httpEtag:'"preview"'};}catch{return null;}
  }}};
  return createServer(async (req,res)=>{
    try {
      const request=new Request(`http://${name}.${root}${req.url}`,{method:req.method,headers:req.headers});
      const response=await serve(request,env);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500);res.end('Preview failed');}
  });
}
