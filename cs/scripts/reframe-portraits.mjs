// Reframe approved photographs from saved originals. Identity approvals do not change.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';import {execFileSync} from 'node:child_process';
const read=(p,f=[])=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):f;
const d=read('src/data/catalogue.json');
const candidates=[...read('research/hltv-gallery-candidates.json'),...read('research/hltv-priority-photo-candidates.json'),...read('research/top20-photo-candidates.json')];
const review=read('research/hltv-priority-review.json',{});
const inputs=d.photos.map(ph=>{
 let input=ph.id.startsWith('hltv-profile-')?'research/hltv-downloads/'+ph.playerId+'.png':ph.id.startsWith('commons-')?'research/downloads/'+ph.id.replace('commons-','')+'.jpg':candidates.find(c=>c.sourceUrl===ph.sourceUrl)?.rawPath;
 return {ph,input};
}).filter(x=>x.input&&fs.existsSync(x.input));
const detections=execFileSync(path.resolve('scripts/detect-faces'),[...new Set(inputs.map(x=>path.resolve(x.input)))],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n').map(x=>JSON.parse(x));const faces=new Map(detections.map(x=>[x.path,x.faces]));
const out=[];
for(const {ph,input} of inputs){
 const found=faces.get(path.resolve(input))||[];const sourceId=ph.sourceUrl.split('/').at(-1);const faceIndex=review.faceIndices?.[sourceId];
 if(found.length!==1&&faceIndex===undefined)continue;const f=found[faceIndex??0];if(!f)continue;
 const m=await sharp(input).metadata();const fh=f.height*m.height,fw=f.width*m.width,fx=f.x*m.width,fy=f.y*m.height;
 let h=Math.min(m.height,fh*2.85),w=h*.8;if(w>m.width){w=m.width;h=w/.8;}
 const crop={left:Math.round(Math.max(0,Math.min(m.width-w,fx+fw/2-w/2))),top:Math.round(Math.max(0,Math.min(m.height-h,fy-fh*.55))),width:Math.floor(w),height:Math.floor(h)};
 const base='photos/'+ph.id+'-v2';
 for(const [size,width,quality] of [['large',800,87],['card',400,82]])await sharp(input).extract(crop).resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toFile('public/'+base+'-'+size+'.webp');
 const meta=await sharp('public/'+base+'-large.webp').metadata();
 out.push({id:ph.id,localPath:base+'-large.webp',cardPath:base+'-card.webp',width:meta.width,height:meta.height,sha256:crypto.createHash('sha256').update(fs.readFileSync('public/'+base+'-large.webp')).digest('hex'),alterations:'从已审核原片重新制作宽松人像裁切，保留头顶和肩部空间；仅裁切、缩放与 WebP 转换。裁切框 '+JSON.stringify(crop)});
}
fs.writeFileSync('research/reframed-photos.json',JSON.stringify(out,null,2));console.log({reframed:out.length,total:d.photos.length});
