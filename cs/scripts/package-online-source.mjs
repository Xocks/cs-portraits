import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve('..');
const entries=JSON.parse(execFileSync(process.execPath,['cs/scripts/stage-publish-source.mjs'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}));
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'cs-portraits-source-'));
for(const e of entries){const out=path.join(stage,e.path);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,e.path),out);fs.chmodSync(out,fs.statSync(path.join(root,e.path)).mode & 0o777);}
const bundles=JSON.parse(fs.readFileSync('asset-bundles.json')).bundles;
for(const b of bundles)fs.copyFileSync(path.join(root,b.archive),path.join(stage,b.archive));
for(const name of ['album-desktop.png','album-mobile.png','album-mobile-lightbox.png','deployment-verification.json'])if(fs.existsSync('docs/'+name)){fs.mkdirSync(path.join(stage,'cs/docs'),{recursive:true});fs.copyFileSync('docs/'+name,path.join(stage,'cs/docs',name));}
const dest=path.resolve('delivery/CS选手图鉴-在线版源码.zip');fs.rmSync(dest,{force:true});execFileSync('/usr/bin/zip',['-qr',dest,'.'],{cwd:stage});fs.rmSync(stage,{recursive:true});
const packages=['CS选手图鉴-网站部署包.zip','CS选手图鉴-在线版源码.zip'];
fs.writeFileSync('delivery/在线版SHA256SUMS.txt',packages.map(f=>crypto.createHash('sha256').update(fs.readFileSync('delivery/'+f)).digest('hex')+'  '+f).join('\n')+'\n');
console.log({sourceFiles:entries.length,bundles:bundles.length,sourceZIP:dest,bytes:fs.statSync(dest).size});
