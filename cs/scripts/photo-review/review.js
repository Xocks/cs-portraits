const $=id=>document.getElementById(id);
let candidates=[],reviews={},current=null,view='portrait',saving=false,history=[];
const controls=['status-filter','team-filter','year-filter','search'];
const text=(id,value)=>{$(id).textContent=value??'';};
function matches(c){
 const r=reviews[c.id],status=$('status-filter').value;
 const statusOK=status==='all'||status==='pending'&&c.previousStatus==='pending'&&!r||status==='unrated'&&!r||status==='rated'&&r?.status==='rated'||status==='usable'&&r?.score>=4||status==='poor'&&r?.score<=2&&r?.status==='rated'||status==='borderline'&&r?.status==='rated'&&r?.score===3||status==='deferred'&&r?.status==='deferred'||status==='identity-mismatch'&&r?.status==='identity-mismatch';
 return statusOK&&($('team-filter').value==='all'||c.team===$('team-filter').value)&&($('year-filter').value==='all'||String(c.year)===$('year-filter').value)&&(!selector()||[c.nickname,c.realName,c.team,c.event].join(' ').toLowerCase().includes(selector()));
}
function selector(){return $('search').value.trim().toLowerCase();}
function queue(){return candidates.filter(matches);}
function progress(){const values=Object.values(reviews),rated=values.filter(r=>r.status==='rated').length;const pending=candidates.filter(c=>c.previousStatus==='pending'&&!reviews[c.id]).length;text('done',rated);text('remaining',pending);text('usable',values.filter(r=>r.score>=4).length);$('progress-fill').style.width=(candidates.length?rated/candidates.length*100:0)+'%';text('progress-text',`${candidates.length} 张候选照片`);}
function display(){
 progress();const q=queue(),c=candidates.find(c=>c.id===current);$('workspace').hidden=!c;$('empty').hidden=!!c;if(!c)return;
 const r=reviews[c.id],index=q.findIndex(x=>x.id===c.id);text('position',index<0?'回看已评分照片':`${index+1} / ${q.length} · 当前筛选`);text('team',`#${c.rank} ${c.team}`);text('nickname',c.nickname);text('real-name',c.realName);text('year',`${c.year} 年`);text('event',c.event);text('previous-status',c.previousStatus==='approved'?'此前人工核对：可用':c.previousStatus==='rejected'?'此前排除：'+c.previousReason:'待核对候选 · 来源人物 ID 已匹配');$('source').href=c.sourceUrl;$('year-source').href=c.yearEvidence;
 $('loading-image').hidden=false;$('photo').src=view==='portrait'?c.portraitUrl:c.originalUrl;$('photo').alt=`${c.nickname} ${c.year} 年候选照片`;$('reference').src=c.referenceUrl;$('reference').alt=`${c.nickname} 官方档案参考头像`;$('notes').value=r?.notes||'';
 document.querySelectorAll('[data-score]').forEach(b=>{b.classList.toggle('selected',r?.score===Number(b.dataset.score));b.setAttribute('aria-pressed',String(r?.score===Number(b.dataset.score)));});
 text('current-score',r?.status==='rated'?`已保存：${r.score} / 5 分`:r?.status==='deferred'?'已暂存待定':r?.status==='identity-mismatch'?'已标记：人物不符':'按 1–5 即可评分');$('clear').disabled=!r;
 $('portrait-view').classList.toggle('active',view==='portrait');$('original-view').classList.toggle('active',view==='original');$('portrait-view').setAttribute('aria-pressed',String(view==='portrait'));$('original-view').setAttribute('aria-pressed',String(view==='original'));
 const next=q[index>=0?index+1:0];if(next){const im=new Image();im.src=view==='portrait'?next.portraitUrl:next.originalUrl;}
}
function choose(id,remember=true){if(remember&&current&&current!==id)history.push(current);current=id;display();}
function filtered(){history=[];choose(queue()[0]?.id||null,false);}
function next(){const q=queue(),i=q.findIndex(c=>c.id===current);if(q.length)choose(q[(i+1+q.length)%q.length].id);}
function previous(){const past=history.pop();if(past){choose(past,false);return;}const q=queue(),i=q.findIndex(c=>c.id===current);if(q.length)choose(q[(i-1+q.length)%q.length].id,false);}
async function save(status,score=null){if(!current||saving)return;const id=current,notes=$('notes').value,q=queue(),i=q.findIndex(c=>c.id===id),upcoming=q[i+1]?.id||q.find(c=>c.id!==id)?.id;setSaving(true);try{const response=await fetch('/api/reviews/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status,score,notes})});const data=await response.json();if(!response.ok)throw Error(data.error);reviews=data.reviews;text('save-status','已自动保存');if($('auto-next').checked){if(upcoming)choose(upcoming);else{history.push(current);current=null;display();}}else display();}catch(e){text('save-status','保存失败：'+e.message);}finally{setSaving(false);}}
function setSaving(value){saving=value;document.querySelectorAll('[data-score],#defer,#mismatch,#save-note').forEach(b=>b.disabled=value);if(value)text('save-status','保存中…');}
$('photo').onload=()=>{$('loading-image').hidden=true;};$('photo').onerror=()=>{text('loading-image','照片读取失败，请切换下一张');};
$('reference').onerror=()=>{$('reference').style.opacity='.2';};$('reference').onload=()=>{$('reference').style.opacity='1';};
controls.forEach(id=>$(id).addEventListener(id==='search'?'input':'change',filtered));
$('next').onclick=next;$('previous').onclick=previous;
$('portrait-view').onclick=()=>{view='portrait';display();};$('original-view').onclick=()=>{view='original';display();};
document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>save('rated',Number(b.dataset.score)));
$('defer').onclick=()=>save('deferred');$('mismatch').onclick=()=>save('identity-mismatch');
$('save-note').onclick=async()=>{if(!current||saving)return;const old=reviews[current];const auto=$('auto-next').checked;$('auto-next').checked=false;if(old)await save(old.status,old.score);else{text('save-status','请先评分或暂存待定，备注会一并保存');}$('auto-next').checked=auto;};
$('clear').onclick=async()=>{if(!current||saving)return;setSaving(true);try{const r=await fetch('/api/reviews/'+current,{method:'DELETE'});const data=await r.json();if(!r.ok)throw Error(data.error);reviews=data.reviews;text('save-status','本张评分已清除');display();}catch(e){text('save-status',e.message);}finally{setSaving(false);}};
$('show-all').onclick=()=>{$('status-filter').value='all';filtered();};
$('export-csv').onclick=()=>{const rows=[['选手','战队','年份','照片来源 ID','质量分','状态','备注','来源'],...candidates.filter(c=>reviews[c.id]).map(c=>{const r=reviews[c.id];return[c.nickname,c.team,c.year,c.id,r.score??'',r.status,r.notes||'',c.sourceUrl];})];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Top20照片质量评分.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(/^[1-5]$/.test(e.key)){e.preventDefault();save('rated',Number(e.key));}else if(e.key==='ArrowRight'){e.preventDefault();next();}else if(e.key==='ArrowLeft'){e.preventDefault();previous();}else if(e.code==='Space'){e.preventDefault();save('deferred');}});
try{const r=await fetch('/api/state');const data=await r.json();if(!r.ok)throw Error(data.error);candidates=data.candidates;reviews=data.reviews||{};text('storage',data.storagePath);for(const [id,values]of[['team-filter',[...new Set(candidates.map(c=>c.team))]],['year-filter',[...new Set(candidates.map(c=>c.year))].sort((a,b)=>b-a)]])for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=String(value);$(id).append(option);}text('save-status','本机自动保存已开启');filtered();}catch(e){text('save-status','加载失败：'+e.message);}
