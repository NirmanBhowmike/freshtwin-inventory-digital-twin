import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const port=Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');let rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
 const allowedSrc=new Set(['engine.js','empirical.js','vegetables.js','joint.js']);
 const target=allowedSrc.has(rel)?path.resolve(root,'../src',rel):path.resolve(root,rel);
 if(!(target===root||target.startsWith(root+path.sep)||(allowedSrc.has(rel)&&target===path.resolve(root,'../src',rel)))){res.writeHead(403);res.end('Forbidden');return;}
 try{if(!(await stat(target)).isFile())throw Error('Not a file');const data=await readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,()=>console.log(`FreshTwin local preview at http://127.0.0.1:${port}`));