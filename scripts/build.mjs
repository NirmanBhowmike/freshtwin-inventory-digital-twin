import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
await cp('public', 'dist', {recursive:true});
await cp('src/engine.js', 'dist/engine.js');
await cp('src/empirical.js', 'dist/empirical.js');
await cp('src/vegetables.js', 'dist/vegetables.js');
await cp('src/joint.js', 'dist/joint.js');
console.log('FreshTwin static build ready in dist/.');