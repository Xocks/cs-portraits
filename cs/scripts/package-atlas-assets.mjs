import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('src/data/catalogue.json'));const manifest=JSON.parse(fs.readFileSync('asset-bundles.json'));
const expected=[...new Set([...d.photos,...d.album].flatMap(p=>[p.localPath,p.cardPath]))];const declared=new Set(manifest.bundles.flatMap(b=>b.files));
const pending=expected.filter(f=>!declared.has(f));let chunks=[],chunk=[],bytes=0;
for(const f of pending){const size=fs.statSync('public/'+f).size;if(bytes+size>1600000&&chunk.length){chunks.push(chunk);chunk=[];bytes=0;}chunk.push(f);bytes+=size;}if(chunk.length)chunks.push(chunk);
const offset=Math.max(0,...manifest.bundles.map(b=>Number(b.archive.match(/-atlas-(\d+)\.zip$/)?.[1]||0)));
for(let i=0;i<chunks.length;i++){const archive=`photo-update-20261023-atlas-${offset+i+1}.zip`;const output=path.resolve('..',archive);fs.rmSync(output,{force:true});execFileSync('/usr/bin/zip',['-q',output,...chunks[i]],{cwd:path.resolve('public')});manifest.bundles.push({archive,files:chunks[i]});console.log({archive,files:chunks[i].length,bytes:fs.statSync(output).size});}
fs.writeFileSync('asset-bundles.json',JSON.stringify(manifest,null,2));
