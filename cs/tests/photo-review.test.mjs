import sharp from 'sharp';
import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
async function start(file,root){const child=spawn(process.execPath,['scripts/serve-photo-review.mjs'],{env:{...process.env,PHOTO_REVIEW_PORT:'4191',PHOTO_REVIEW_DATA:file,PHOTO_REVIEW_ROOT:root},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('"url"')){clearTimeout(timer);resolve();}});child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});});return child;}
async function stop(child){const closed=new Promise(resolve=>child.once('exit',resolve));child.kill();await closed;}
test('photo quality scores survive server restart, reject invalid values, and support clearing',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cs-photo-review-')),file=path.join(dir,'ratings.json');await fs.mkdir(path.join(dir,'src/data'),{recursive:true});await fs.mkdir(path.join(dir,'research/hltv-downloads'),{recursive:true});
 await fs.writeFile(path.join(dir,'src/data/catalogue.json'),JSON.stringify({players:[{id:'hltv-1',hltvId:1,nickname:'Test player',realName:'Test reference'}],teams:[{rank:1,name:'Test team',playerIds:['hltv-1']}]}));
 await sharp({create:{width:600,height:800,channels:3,background:'#769c65'}}).jpeg().toFile(path.join(dir,'research/candidate.jpg'));
 await sharp({create:{width:300,height:300,channels:3,background:'#7d926d'}}).png().toFile(path.join(dir,'research/hltv-downloads/hltv-1.png'));
 await fs.writeFile(path.join(dir,'research/top20-photo-candidates.json'),JSON.stringify([{playerId:'hltv-1',sourceUrl:'https://www.hltv.org/gallery/view/123',downloaded:true,singleSubject:true,faces:[{x:.2,y:.2,width:.3,height:.3}],players:[{id:1}],rawPath:'research/candidate.jpg',year:2024,event:'Test event',yearEvidence:'https://www.hltv.org/gallery/123/test-2024'}]));
 let child=await start(file,dir);
 try{const base='http://127.0.0.1:4191';let state=await(await fetch(base+'/api/state')).json();assert.equal(state.candidates.length,1);const id=state.candidates[0].id;
  assert.equal((await fetch(base+'/api/reviews/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status:'rated',score:9})})).status,400);
  assert.equal((await fetch(base+'/api/reviews/'+id,{method:'PUT',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({status:'rated',score:4})})).status,403);
  const saved=await(await fetch(base+'/api/reviews/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status:'rated',score:4,notes:'清晰，保留'})})).json();assert.equal(saved.reviews[id].score,4);
  const image=await fetch(base+'/media/portrait/'+id);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);assert.ok((await image.arrayBuffer()).byteLength>100);
  await stop(child);child=await start(file,dir);state=await(await fetch(base+'/api/state')).json();assert.equal(state.reviews[id].score,4);assert.equal(state.reviews[id].notes,'清晰，保留');
  const cleared=await(await fetch(base+'/api/reviews/'+id,{method:'DELETE'})).json();assert.equal(cleared.reviews[id],undefined);
 }finally{await stop(child);await fs.rm(dir,{recursive:true,force:true});}
});
