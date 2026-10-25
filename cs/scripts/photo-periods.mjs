const atAge = age => age < 20 ? 'debut' : age < 24 ? 'young' : age < 28 ? 'prime' : age < 32 ? 'veteran' : 'legend';
export function classifyEventYear(year, birthDate) {
 if (!Number.isInteger(year) || year > 2026 || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate || '')) return null;
 const upper=year-Number(birthDate.slice(0,4)),lower=upper-1;if(lower<12||upper>65)return null;
 const period=atAge(lower)===atAge(upper)?atAge(lower):'undated';
 return {ageRange:[lower,upper],periodBasis:'year-range',period,periodEvidence:`出生日期 ${birthDate} 与赛事年份 ${year} 对应 ${lower}–${upper} 岁；${period==='undated'?'区间跨越年龄段边界，未指定时期':'整个区间属于同一年龄段'}。未推断具体生日先后或拍摄日期。`};
}
