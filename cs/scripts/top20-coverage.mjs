import fs from 'node:fs';
export function top20Coverage(d,indices=[],attempts=[]){
 const sourceByPlayer=new Map(indices.map(x=>[x.playerId,x]));
 const players=d.teams.filter(t=>t.rank&&t.rank<=20).sort((a,b)=>a.rank-b.rank).flatMap(t=>t.playerIds.map(id=>{
  const p=d.players.find(p=>p.id===id);const photos=d.photos.filter(ph=>ph.playerId===id&&ph.year!==null);
  const observed=[...new Set([...(sourceByPlayer.get(id)?.groups||[]).flatMap(g=>(g.title+' '+g.source).match(/\b20\d{2}\b/)?.slice(0,1).map(Number)||[]),...photos.map(ph=>ph.year)])].sort((a,b)=>a-b);
  const years=observed.length?Array.from({length:observed.at(-1)-observed[0]+1},(_,i)=>observed[0]+i):[];
  const cells=years.map(year=>{const images=photos.filter(ph=>ph.year===year);const count=new Set(images.map(ph=>ph.originalSha1||ph.sourceUrl)).size;const tried=attempts.filter(r=>r.playerId===id&&r.year===year).length;return {year,photos:count,targetMinimum:1,targetPreferred:2,sourceObserved:observed.includes(year),checkedCandidates:tried,status:count>=2?'2+ 张':count===1?'1 张':tried?'已检查候选，尚待可用照片':observed.includes(year)?'待补充':'暂无该年来源证据'};});
  return {playerId:id,nickname:p.nickname,team:t.name,rank:t.rank,firstObservedYear:observed[0]??null,lastObservedYear:observed.at(-1)??null,years:cells,coveredYears:cells.filter(c=>c.photos>=1).length,complete:cells.length>0&&cells.every(c=>c.photos>=1)};
 }));
 const cells=players.flatMap(p=>p.years);
 return {generatedAt:new Date().toISOString(),scope:'2026-10-19 HLTV Top20 阵容快照的 100 位首发；以已观察到的首末赛事年份为范围，非宣称已核实职业生涯起止时间。',minimumPerYear:1,preferredPerYear:2,players:players.length,playersWithDatedPhotos:players.filter(p=>p.coveredYears>0).length,playersWithAllTargetYears:players.filter(p=>p.complete).length,targetPlayerYears:cells.length,coveredPlayerYears:cells.filter(c=>c.photos>=1).length,playerYearsWithTwoPhotos:cells.filter(c=>c.photos>=2).length,missingPlayerYears:cells.filter(c=>!c.photos).length,targetMet:players.length===100&&players.every(p=>p.complete),details:players};
}
if(process.argv[1]?.endsWith('top20-coverage.mjs')){
 const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[];
 const report=top20Coverage(read('src/data/catalogue.json'),read(fs.existsSync('research/top20-gallery-indices.json')?'research/top20-gallery-indices.json':'research/top20-year-sources.json'),[...read('research/top20-photo-candidates.json'),...read('research/top20-scan-candidates.json')]);
 fs.writeFileSync('docs/top20-photo-coverage.json',JSON.stringify(report,null,2));
 const csv=[['排名','战队','选手','年份','不同个人照片数','状态'],...report.details.flatMap(p=>p.years.map(y=>[p.rank,p.team,p.nickname,y.year,y.photos,y.status]))].map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
 fs.writeFileSync('docs/Top20逐年照片覆盖.csv','\uFEFF'+csv+'\r\n');
 fs.writeFileSync('docs/Top20照片补充进展.md',`# Top20 逐年照片覆盖\n\n${report.scope}\n\n目标：每人每年 1–2 张不同原片的个人照。当前 ${report.playersWithDatedPhotos}/100 人有已知年份照片，${report.coveredPlayerYears}/${report.targetPlayerYears} 个选手年份达到至少 1 张，${report.playerYearsWithTwoPhotos} 个达到至少 2 张。${report.missingPlayerYears} 个仍有缺口，${report.targetMet?'目标已达到':'尚未全部达到目标'}。\n\n只统计审核通过且已写入发布目录的个人照片；头像、相册合照、裁切版本不重复充数。完整矩阵见 Top20逐年照片覆盖.csv。\n`);
 const {details,...summary}=report;console.log(summary);
}
