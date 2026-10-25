// Read quality judgments without touching public catalogue data. Use --apply to
// update the editorial approval list, then run the normal processing/audit flow.
import fs from 'node:fs';
const qualityPath='research/top20-quality-ratings.json';
if(!fs.existsSync(qualityPath)){console.log('尚无用户质量评分；请先在本地审核器评分。');process.exit(0);}
const quality=JSON.parse(fs.readFileSync(qualityPath));
const reviewPath='research/top20-photo-review.json';
const review=JSON.parse(fs.readFileSync(reviewPath));
const approved=new Set(review.approved);const rejected={...review.rejected};let included=0,excluded=0,deferred=0;
for(const [key,r] of Object.entries(quality.reviews||{})){
 const id=Number(key);if(!Number.isSafeInteger(id)||id<=0)continue;
 if(r.status==='rated'&&Number.isInteger(r.score)&&r.score>=4&&r.score<=5){approved.add(id);delete rejected[id];included++;}
 else if(r.status==='identity-mismatch'||r.status==='rated'&&Number.isInteger(r.score)&&r.score>=1&&r.score<=2){approved.delete(id);rejected[id]=r.status==='identity-mismatch'?'用户标记人物不符':`用户质量评分 ${r.score}/5，未采用`;excluded++;}
 else if(r.status==='deferred'||r.status==='rated'&&r.score===3){approved.delete(id);rejected[id]='用户暂存待定，尚未决定采用';deferred++;}
}
const next={...review,approved:[...approved].sort((a,b)=>a-b),rejected,userQualityReviewedAt:quality.updatedAt,qualitySelection:'4–5 分优先纳入；1–2 分及人物不符排除；3 分和待定暂不纳入。'};
console.log({mode:process.argv.includes('--apply')?'apply':'dry-run',included,excluded,deferred,totalApproved:next.approved.length});
if(process.argv.includes('--apply'))fs.writeFileSync(reviewPath,JSON.stringify(next,null,2)+'\n');
