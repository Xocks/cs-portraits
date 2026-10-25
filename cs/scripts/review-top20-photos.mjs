import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[];const d=read('src/data/catalogue.json');const rows=[...read('research/top20-photo-candidates.json'),...read('research/top20-scan-candidates.json')];const seen=new Set();
const review=read('research/top20-photo-review.json');
const round=process.argv[2];const folder=round?'research/top20-review/round-'+round:'research/top20-review';
const candidates=rows.filter(c=>c.downloaded&&c.singleSubject&&c.faces?.length===1&&!c.rejected&&!seen.has(c.sourceUrl)&&seen.add(c.sourceUrl)&&(!round||(!review.approved?.includes(Number(c.sourceUrl.split('/').at(-1)))&&!review.rejected?.[c.sourceUrl.split('/').at(-1)])));
fs.mkdirSync(folder,{recursive:true});const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
for(let start=0;start<candidates.length;start+=16){const batch=candidates.slice(start,start+16),layers=[];
 for(let i=0;i<batch.length;i++){const c=batch[i],id=c.sourceUrl.split('/').at(-1),m=await sharp(c.rawPath).metadata(),f=c.faces[0];const face={x:f.x*m.width,y:f.y*m.height,w:f.width*m.width,h:f.height*m.height};let h=Math.min(m.height,face.h*2.85),w=h*.8;if(w>m.width){w=m.width;h=w/.8;}const crop={left:Math.round(Math.max(0,Math.min(m.width-w,face.x+face.w/2-w/2))),top:Math.round(Math.max(0,Math.min(m.height-h,face.y-face.h*.55))),width:Math.floor(w),height:Math.floor(h)};
 const x=i%4*360,y=Math.floor(i/4)*250;
 layers.push({input:await sharp(c.rawPath).extract(crop).resize(175,210,{fit:'contain',background:'white'}).toBuffer(),left:x,top:y});
 const reference='research/hltv-downloads/'+c.playerId+'.png';if(fs.existsSync(reference))layers.push({input:await sharp(reference).resize(95,100,{fit:'contain',background:'white'}).toBuffer(),left:x+200,top:y});
 layers.push({input:await sharp(c.rawPath).resize(160,100,{fit:'contain',background:'white'}).toBuffer(),left:x+185,top:y+110});
 layers.push({input:Buffer.from(`<svg width="360" height="40"><rect width="360" height="40" fill="white"/><text x="5" y="16" font-size="13">${xml(c.nickname)} ${c.year} / ${id}</text><text x="5" y="33" font-size="10">L: candidate | R: official reference + full frame</text></svg>`),left:x,top:y+210});
 }
 await sharp({create:{width:1440,height:Math.ceil(batch.length/4)*250,channels:3,background:'white'}}).composite(layers).png().toFile(`${folder}/sheet-${Math.floor(start/16)+1}.png`);
}
fs.writeFileSync(folder+'/index.json',JSON.stringify(candidates.map(c=>({id:Number(c.sourceUrl.split('/').at(-1)),nickname:c.nickname,year:c.year})),null,2));console.log({candidatePortraits:candidates.length,sheets:Math.ceil(candidates.length/16)});
