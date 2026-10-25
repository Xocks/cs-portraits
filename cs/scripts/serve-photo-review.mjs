import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=process.env.PHOTO_REVIEW_ROOT ? path.resolve(process.env.PHOTO_REVIEW_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PHOTO_REVIEW_PORT||4180);
const reviewFile=process.env.PHOTO_REVIEW_DATA||path.join(root,'research/top20-quality-ratings.json');
const read=async(p,f)=>{try{return JSON.parse(await fs.readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return f;throw e;}};
const catalogue=await read(path.join(root,'src/data/catalogue.json'),{});
const oldReview=await read(path.join(root,'research/top20-photo-review.json'),{approved:[],rejected:{}});
const rows=(await Promise.all(['top20-photo-candidates','top20-scan-candidates'].map(n=>read(path.join(root,'research/'+n+'.json'),[])))).flat();
const candidates=new Map();
for(const c of rows){
 const id=c.sourceUrl?.split('/').at(-1),player=catalogue.players.find(p=>p.id===c.playerId);
 if(!/^\d+$/.test(id||'')||!player||!c.downloaded||!c.singleSubject||c.faces?.length!==1||c.rejected||c.players?.length!==1||c.players[0].id!==player.hltvId)continue;
 const file=path.resolve(root,c.rawPath||'');if(!file.startsWith(path.join(root,'research')+path.sep))continue;
 try{await fs.access(file);}catch{continue;}
 const team=catalogue.teams.find(t=>t.playerIds.includes(player.id)&&t.rank&&t.rank<=20);if(!team)continue;
 candidates.set(id,{id,nickname:player.nickname,realName:player.realName,playerId:player.id,team:team.name,rank:team.rank,year:c.year,event:c.event,sourceUrl:c.sourceUrl,yearEvidence:c.yearEvidence,photographer:c.photographer||'HLTV',previousStatus:oldReview.approved.includes(Number(id))?'approved':oldReview.rejected[id]?'rejected':'pending',previousReason:oldReview.rejected[id]||'',file,face:c.faces[0],reference:path.join(root,'research/hltv-downloads/'+player.id+'.png')});
}
const publicRow=({file,face,reference,...row})=>({...row,portraitUrl:'/media/portrait/'+row.id,originalUrl:'/media/original/'+row.id,referenceUrl:'/media/reference/'+row.id});
const sorted=[...candidates.values()].sort((a,b)=>a.rank-b.rank||a.nickname.localeCompare(b.nickname)||a.year-b.year||Number(a.id)-Number(b.id));
let writes=Promise.resolve();const cache=new Map();
async function state(){return await read(reviewFile,{version:1,reviews:{}});}
async function change(id,value){const task=writes.then(async()=>{const data=await state();if(value===null)delete data.reviews[id];else data.reviews[id]=value;data.updatedAt=new Date().toISOString();await fs.mkdir(path.dirname(reviewFile),{recursive:true});const temp=reviewFile+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n');await fs.rename(temp,reviewFile);return data;});writes=task.catch(()=>{});return task;}
function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const b of req){text+=b;if(text.length>16000)throw Error('请求内容过长');}return JSON.parse(text);}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port),pathname=url.pathname;
  if(req.method==='GET'&&pathname==='/api/state')return json(res,200,{candidates:sorted.map(publicRow),...(await state()),storagePath:reviewFile});
  if(req.method==='GET'&&pathname==='/api/export'){
   const data=await state();res.writeHead(200,{'content-type':'application/json; charset=utf-8','content-disposition':'attachment; filename="top20-photo-quality-reviews.json"','cache-control':'no-store'});return res.end(JSON.stringify({...data,candidates:sorted.map(publicRow)},null,2));
  }
  if(pathname.startsWith('/api/reviews/')&&['PUT','DELETE'].includes(req.method)){
   const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin))return json(res,403,{error:'仅支持本机审核页面保存'});
   const id=pathname.split('/').at(-1);if(!candidates.has(id))return json(res,404,{error:'照片不存在'});
   if(req.method==='DELETE')return json(res,200,await change(id,null));
   const value=await body(req);const status=value.status;
   if(!['rated','deferred','identity-mismatch'].includes(status)||status==='rated'&&(!Number.isInteger(value.score)||value.score<1||value.score>5)||typeof(value.notes??'')!=='string'||(value.notes||'').length>1000)return json(res,400,{error:'评分须为 1～5，备注不超过 1000 字'});
   return json(res,200,await change(id,{score:status==='rated'?value.score:null,status,notes:value.notes||'',updatedAt:new Date().toISOString()}));
  }
  if(req.method==='GET'&&pathname.startsWith('/media/')){
   const [, ,kind,id]=pathname.split('/');const c=candidates.get(id);if(!c||!['portrait','original','reference'].includes(kind))return json(res,404,{error:'照片不存在'});
   let buffer,type;
   if(kind==='original'){buffer=await fs.readFile(c.file);type='image/jpeg';}
   else if(kind==='reference'){buffer=await fs.readFile(c.reference);type='image/png';}
   else{buffer=cache.get(id);type='image/webp';if(!buffer){const m=await sharp(c.file).metadata(),f=c.face,fh=f.height*m.height,fw=f.width*m.width;let h=Math.min(m.height,fh*2.85),w=h*.8;if(w>m.width){w=m.width;h=w/.8;}const crop={left:Math.round(Math.max(0,Math.min(m.width-w,f.x*m.width+fw/2-w/2))),top:Math.round(Math.max(0,Math.min(m.height-h,f.y*m.height-fh*.55))),width:Math.floor(w),height:Math.floor(h)};buffer=await sharp(c.file).extract(crop).resize({width:640,withoutEnlargement:true}).webp({quality:88}).toBuffer();if(cache.size>120)cache.delete(cache.keys().next().value);cache.set(id,buffer);}}
   res.writeHead(200,{'content-type':type,'cache-control':'private, max-age=3600'});return res.end(buffer);
  }
  if(req.method==='GET'&&['/','/review.js','/review.css'].includes(pathname)){
   const file=pathname==='/'?'index.html':pathname.slice(1);const buffer=await fs.readFile(path.join(root,'scripts/photo-review',file));res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','cache-control':'no-cache'});return res.end(buffer);
  }
  json(res,404,{error:'页面不存在'});
 }catch(e){console.error(e.message);if(!res.headersSent)json(res,500,{error:e.message});else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port,candidates:candidates.size,storage:reviewFile})));
