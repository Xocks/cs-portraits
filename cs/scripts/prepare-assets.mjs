import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('src/data/catalogue.json','utf8'));
const photos=[...d.photos,...(d.album||[])];
const expected=new Set(photos.flatMap(p=>[p.localPath,p.cardPath]));
const manifest=JSON.parse(fs.readFileSync('asset-bundles.json','utf8'));
const declared=manifest.bundles.flatMap(b=>b.files);
// Older bundles retain prior crops for reproducibility; only catalogue references are published.
if(new Set(declared).size!==declared.length||[...expected].some(f=>!declared.includes(f))||declared.some(f=>!/^photos\/[A-Za-z0-9._-]+\.webp$/.test(f)))throw Error('Asset manifest does not cover catalogue safely');
for(const bundle of manifest.bundles){
 if(bundle.files.every(f=>fs.existsSync('public/'+f)))continue;
 const archive=fs.existsSync(bundle.archive)?bundle.archive:'../'+bundle.archive;
 if(!fs.existsSync(archive))throw Error('Missing '+bundle.archive);
 const files=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n').filter(f=>!f.endsWith('/'));
 const allowed=new Set(bundle.files);
 if(files.length!==allowed.size||files.some(f=>!allowed.has(f)))throw Error('Archive does not match manifest: '+archive);
 fs.mkdirSync('public',{recursive:true});execFileSync('unzip',['-oq',archive,'-d','public']);
}
for(const p of photos){
 if(![p.localPath,p.cardPath].every(f=>fs.existsSync('public/'+f)))throw Error('Missing photograph '+p.id);
 const digest=crypto.createHash('sha256').update(fs.readFileSync('public/'+p.localPath)).digest('hex');
 if(digest!==p.sha256)throw Error('Photograph checksum mismatch '+p.id);
}
console.log({photoAssets:expected.size,verified:true,bundles:manifest.bundles.length});
