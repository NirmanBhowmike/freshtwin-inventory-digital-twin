import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await cp('public', 'dist', {recursive:true});
await cp('src/engine.js', 'dist/engine.js');
await cp('src/empirical.js', 'dist/empirical.js');
console.log('FreshTwin static build ready in dist/.');