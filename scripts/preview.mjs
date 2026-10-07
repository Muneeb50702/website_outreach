import {previewServer} from './lib/preview.mjs';
const server=previewServer(process.argv[2]||'br-plumbing-austin');
server.listen(4173,'127.0.0.1',()=>console.log('Concept preview: http://127.0.0.1:4173'));
