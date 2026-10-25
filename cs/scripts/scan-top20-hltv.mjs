// Bounded batches: inspect observed previews before requesting photograph metadata.
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const read=async(p,f=[])=>{try{return JSON.parse(await fs.readFile(p,'utf8'));}catch{return f;}};const pause=()=>new Promise(r=>setTimeout(r,2000));
const denied=r=>[403,429].includes(r.status)||/Sorry, you have been blocked|Just a moment\.\.\.|Attention Required!/i.test(r.body||'');
export async function scan({page,root,max=1200,target=1}){
 const d=await read(path.join(root,'src/data/catalogue.json'));const judgments=await read(path.join(root,'research/top20-photo-review.json'),{rejected:{}});const indices=await read(path.join(root,'research/top20-gallery-indices.json'));
 const file=path.join(root,'research/top20-scan-candidates.json');const rows=await read(file);const old=await read(path.join(root,'research/top20-photo-candidates.json'));
 const used=new Set([...rows,...old].map(r=>r.sourceUrl));const published=new Set([...d.photos,...d.album].map(p=>p.sourceUrl));
 const directory=path.join(root,'research/top20-scan-downloads');await fs.mkdir(directory,{recursive:true});const buckets=[];
 for(let order=0;order<indices.length;order++){const e=indices[order];const groups=e.groups.filter(g=>/\b20\d{2}\b/.test(g.title+' '+g.source));const years=[...new Set(groups.map(g=>Number((g.title+' '+g.source).match(/\b20\d{2}\b/)[0])))].sort((a,b)=>a-b);
  for(let n=0;n<years.length;n++){const year=years[n];const count=d.photos.filter(p=>p.playerId===e.playerId&&p.year===year).length+[...rows,...old].filter(p=>p.playerId===e.playerId&&p.year===year&&p.downloaded&&p.faces?.length===1&&p.singleSubject&&!p.rejected&&!judgments.rejected?.[p.sourceUrl.split('/').at(-1)]).length;
   if(count>=target)continue;const candidates=groups.filter(g=>Number((g.title+' '+g.source).match(/\b20\d{2}\b/)[0])===year).slice(0,10).flatMap(g=>g.photos.map(ph=>({playerId:e.playerId,nickname:e.nickname,sourceUrl:typeof ph==='string'?ph:ph.sourceUrl,preview:typeof ph==='string'?null:ph.large||ph.preview,year,yearEvidence:g.source,event:g.title}))).filter(q=>q.preview&&!used.has(q.sourceUrl)&&!published.has(q.sourceUrl));
   buckets.push({count,order,n,candidates});
  }
 }
 buckets.sort((a,b)=>a.count-b.count||a.n-b.n||a.order-b.order);let stopped=false,attempts=0;
 for(let turn=0;turn<100&&!stopped&&attempts<max;turn++){
  const active=buckets.filter(b=>b.count<target&&b.candidates[turn]);
  for(let start=0;start<active.length&&!stopped&&attempts<max;start+=6){
   const control=await read(path.join(root,"research/top20-collection-control.json"),{});if(control.stop){stopped=true;break;}
   const batch=active.slice(start,start+Math.min(6,max-attempts));
   const toDownload=batch.map(b=>({b,q:b.candidates[turn]})).filter(x=>!used.has(x.q.sourceUrl));
   const downloaded=await page.evaluate(async urls=>await Promise.all(urls.map(async url=>{
    try {const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)return {status:r.status};
     const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
     return {status:r.status,base64:btoa(binary)};
    }catch(e){return {error:String(e)};}
   })),toDownload.map(x=>x.q.preview));
   const prepared=[];
   for(let i=0;i<toDownload.length;i++){
    const {b,q}=toDownload[i],response=downloaded[i];used.add(q.sourceUrl);attempts++;
    const row={...q,checkedAt:new Date().toISOString(),downloaded:false};
    if([403,429].includes(response.status)){stopped=true;row.imageStatus=response.status;prepared.push({b,row});continue;}
    if(!response.base64){row.error=response.error||String(response.status);prepared.push({b,row});continue;}
    const id=q.sourceUrl.split('/').at(-1);const output=path.join(directory,id+'.jpg');
    try {
     await fs.writeFile(output,Buffer.from(response.base64,'base64'));row.rawPath='research/top20-scan-downloads/'+id+'.jpg';
     row.faces=JSON.parse(execFileSync(path.join(root,'scripts/detect-faces'),[output],{encoding:'utf8'}).trim()).faces;
     if(row.faces?.length!==1)row.rejected='Preview does not contain a single clear face';
    }catch(e){row.error=String(e);}
    prepared.push({b,row});
   }
   const candidates=prepared.filter(x=>x&&!x.row.rejected&&!x.row.error&&x.row.faces?.length===1);
   if(candidates.length&&!stopped){
    const metadata=await page.evaluate(async urls=>await Promise.all(urls.map(async url=>{
     try {const r=await fetch(url,{signal:AbortSignal.timeout(8000)});const html=await r.text();
      if([403,429].includes(r.status)||/Sorry, you have been blocked|Just a moment\.\.\.|Attention Required!/i.test(html))return {denied:true,status:r.status};
      if(!r.ok)return {status:r.status};
      const doc=new DOMParser().parseFromString(html,'text/html');return {players:[...doc.querySelectorAll('.players a[href*="/player/"]')].map(a=>({id:Number(a.getAttribute('href').split('/')[2]),nickname:a.textContent.trim()})),image:[...doc.querySelectorAll('a')].find(a=>a.textContent.trim()==='Download')?.getAttribute('href'),photographer:[...doc.querySelectorAll('div,span,a')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(t=>/^Photo by .{1,90}$/.test(t)).sort((a,b)=>a.length-b.length)[0]?.replace(/^Photo by\s*/,'')};
     }catch(e){return {error:String(e)};}
    })),candidates.map(x=>x.row.sourceUrl));
    for(let i=0;i<candidates.length;i++){const {b,row}=candidates[i];Object.assign(row,metadata[i]);if(row.denied){stopped=true;continue;}
     row.singleSubject=row.players?.length===1&&'hltv-'+row.players[0].id===row.playerId;
     if(!row.singleSubject){row.rejected='Photo page does not identify exactly one target player';continue;}
     row.downloaded=true;row.downloadedUrl=row.preview;row.sha256=crypto.createHash('sha256').update(await fs.readFile(path.join(root,row.rawPath))).digest('hex');b.count++;
    }
   }
   rows.push(...prepared.filter(Boolean).map(x=>x.row));
   await fs.writeFile(file,JSON.stringify(rows,null,2));
   console.log({attempts,downloaded:rows.filter(r=>r.downloaded).length,coveredPlayerYears:buckets.filter(b=>b.count>=1).length,remaining:buckets.filter(b=>b.count<target).length,stopped});if(!stopped)await pause();
  }
 }
 console.log({finished:true,stopped,attempts,downloaded:rows.filter(r=>r.downloaded).length,remaining:buckets.filter(b=>b.count<target).length});
}
