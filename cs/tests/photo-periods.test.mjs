import test from 'node:test';import assert from 'node:assert/strict';import {classifyEventYear} from '../scripts/photo-periods.mjs';
test('event years classify only age intervals contained in a single group',()=>{
 for(const [year,period,range] of [[2019,'debut',[18,19]],[2020,'undated',[19,20]],[2022,'young',[21,22]],[2024,'undated',[23,24]],[2026,'prime',[25,26]]]){
  const row=classifyEventYear(year,'2000-11-09');assert.equal(row.period,period);assert.deepEqual(row.ageRange,range);assert.equal(row.capturedAt,undefined);assert.equal(row.age,undefined);
 }
});
test('unknown birth dates and implausible event years do not produce age groups',()=>{
 for(const pair of [[2024,null],[2027,'2000-01-01'],[2005,'2000-01-01'],[2023,'unknown']])assert.equal(classifyEventYear(...pair),null);
});
