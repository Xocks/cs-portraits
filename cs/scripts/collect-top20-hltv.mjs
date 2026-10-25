// Run through ego-browser and pass its documented Page handle. Saves after each request.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const pause=()=>new Promise(r=>setTimeout(r,2000));
const read=async(p,f=[])=>{try{return JSON.parse(await fs.readFile(p,'utf8'));}catch{return f;}};
const save=(p,d)=>fs.writeFile(p,JSON.stringify(d,null,2));
const denied=r=>[403,429].includes(r.status)||/Sorry, you have been blocked|Just a moment\.\.\.|Attention Required!/i.test(r.body||'');
export async function indices({page,root,refresh=false}){
 const d=await read(path.join(root,'src/data/catalogue.json'));
 const ids=new Set(d.teams.filter(t=>t.rank&&t.rank<=20).flatMap(t=>t.playerIds));
 const previous=[...await read(path.join(root,'research/hltv-gallery-indices.json')),...await read(path.join(root,'research/hltv-priority-gallery-indices.json'))];
 const file=path.join(root,'research/top20-gallery-indices.json');let rows=await read(file);
 if(refresh)rows=rows.filter(r=>!r.groups.some(g=>g.photos.some(p=>typeof p==='string')));
 for(const p of d.players.filter(p=>ids.has(p.id))){
  if(rows.some(r=>r.playerId===p.id))continue;
  const cached=refresh?null:previous.find(r=>r.playerId===p.id);
  if(cached){rows.push({...cached,nickname:p.nickname});await save(file,rows);continue;}
  const url='https://www.hltv.org/galleries?player='+p.hltvId;
  let r;try{r=await page.fetch(url,{timeout:15000});}catch(e){console.log({player:p.nickname,error:String(e)});await pause();continue;}
  if(denied(r)){console.log({stopped:true,status:r.status});return;}
  if(!r.ok){console.log({player:p.nickname,status:r.status});await pause();continue;}
  const groups=await page.evaluate(html=>{
   const doc=new DOMParser().parseFromString(html,'text/html');const absolute=u=>u?new URL(u,'https://www.hltv.org').href:null;
   return [...doc.querySelectorAll('.gallery-grid-con')].map(g=>({title:g.previousElementSibling?.textContent.trim(),source:absolute(g.previousElementSibling?.getAttribute('href')),photos:[...g.querySelectorAll('a[href*="/gallery/view/"]')].map(a=>({sourceUrl:absolute(a.getAttribute('href')),preview:a.querySelector('img')?.getAttribute('src'),large:a.querySelector('img')?.getAttribute('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0]}))})).filter(g=>g.source&&g.photos.length);
  },r.body);
  rows.push({playerId:p.id,nickname:p.nickname,sourceUrl:url,checkedAt:new Date().toISOString(),groups});await save(file,rows);
  console.log({indexed:rows.length,player:p.nickname,events:groups.length});await pause();
 }
 console.log({indexed:rows.length,target:ids.size});
}
export async function pictures({page,root,limit=100}){
 const d=await read(path.join(root,'src/data/catalogue.json'));const index=await read(path.join(root,'research/top20-gallery-indices.json'));
 const file=path.join(root,'research/top20-photo-candidates.json');const rows=await read(file);const used=new Set(rows.map(r=>r.sourceUrl));
 const published=new Set([...d.photos,...d.album].map(p=>p.sourceUrl));
 const directory=path.join(root,'research/top20-downloads');await fs.mkdir(directory,{recursive:true});
 const buckets=[];
 for(const entry of index){const groups=entry.groups.filter(g=>/\b20\d{2}\b/.test(g.title+' '+g.source));const years=[...new Set(groups.map(g=>Number((g.title+' '+g.source).match(/\b20\d{2}\b/)[0])))].sort((a,b)=>a-b);
  for(const year of years){const count=d.photos.filter(p=>p.playerId===entry.playerId&&p.year===year).length+rows.filter(r=>r.playerId===entry.playerId&&r.year===year&&r.downloaded&&r.singleSubject&&r.faces?.length===1).length;
   if(count>=2)continue;
   const candidates=groups.filter(g=>Number((g.title+' '+g.source).match(/\b20\d{2}\b/)[0])===year).slice(0,6).flatMap(g=>g.photos.slice(0,5).map(ph=>({playerId:entry.playerId,nickname:entry.nickname,sourceUrl:typeof ph==='string'?ph:ph.sourceUrl,preview:typeof ph==='string'?null:ph.large||ph.preview,year,yearEvidence:g.source,event:g.title})));
   buckets.push({count,candidates:candidates.filter(c=>!used.has(c.sourceUrl)&&!published.has(c.sourceUrl))});
  }
 }
 // Fill empty player-years before seeking second photographs.
 buckets.sort((a,b)=>a.count-b.count);
 let attempts=0;
 for(let turn=0;turn<30&&attempts<limit;turn++)for(const b of buckets){
  if(attempts>=limit)break;if(b.count>=2||!b.candidates[turn])continue;
  const q=b.candidates[turn];if(used.has(q.sourceUrl))continue;used.add(q.sourceUrl);attempts++;
  const row={...q,checkedAt:new Date().toISOString(),downloaded:false};
  let r;try{r=await page.fetch(q.sourceUrl,{timeout:12000});}catch(e){row.error=String(e);rows.push(row);await save(file,rows);await pause();continue;}
  if(denied(r)){console.log({stopped:true,status:r.status});return;}
  if(r.ok)Object.assign(row,await page.evaluate(html=>{const doc=new DOMParser().parseFromString(html,'text/html');return {players:[...doc.querySelectorAll('.players a[href*="/player/"]')].map(a=>({id:Number(a.getAttribute('href').split('/')[2]),nickname:a.textContent.trim()})),image:[...doc.querySelectorAll('a')].find(a=>a.textContent.trim()==='Download')?.getAttribute('href'),photographer:[...doc.querySelectorAll('div,span,a')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(t=>/^Photo by .{1,90}$/.test(t)).sort((a,b)=>a.length-b.length)[0]?.replace(/^Photo by\s*/,'')};},r.body));
  row.singleSubject=row.players?.length===1&&'hltv-'+row.players[0].id===q.playerId;
  if(row.singleSubject&&row.image){
   await pause();const id=q.sourceUrl.split('/').at(-1);const output=path.join(directory,id+'.jpg');
   // Use an actually observed 1000px image when available; no invented CDN parameters.
   const observed=q.preview||row.image;if(new URL(observed).hostname!=='img-cdn.hltv.org')throw Error('Unexpected image host');
   try{const image=await page.fetch(observed,{saveAs:output,timeout:15000});if([403,429].includes(image.status)){await fs.unlink(output).catch(()=>{});console.log({stopped:true,status:image.status});return;}
    if(image.ok){row.rawPath='research/top20-downloads/'+id+'.jpg';row.downloadedUrl=observed;row.sha256=crypto.createHash('sha256').update(await fs.readFile(output)).digest('hex');
     const detection=JSON.parse(execFileSync(path.join(root,'scripts/detect-faces'),[output],{encoding:'utf8'}).trim());row.faces=detection.faces;row.downloaded=true;
     if(row.faces?.length===1)b.count++;else row.needsFaceReview=true;
    }else row.imageStatus=image.status;
   }catch(e){row.error=String(e);}
  }else row.rejected='Photo page does not identify exactly one target player';
  rows.push(row);await save(file,rows);console.log({attempt:attempts,player:q.nickname,year:q.year,downloaded:row.downloaded,faces:row.faces?.length,subjects:row.players?.map(p=>p.nickname)});await pause();
 }
 console.log({attempts,downloaded:rows.filter(r=>r.downloaded).length,playerYears:buckets.length});
}
