import test from 'node:test';
import assert from 'node:assert/strict';
import {SKUS,rngFromSeed,generateHistory,estimateDemand,comparePolicies,monteCarlo,parseUserCSV,samplePoisson} from '../src/engine.js';
const sku=SKUS[0];
test('seeded history generation is deterministic',()=>{assert.deepEqual(generateHistory(sku,42),generateHistory(sku,42));assert.notDeepEqual(generateHistory(sku,42),generateHistory(sku,43));});
test('synthetic sales never exceed latent demand',()=>{const rows=generateHistory(sku);assert.equal(rows.length,90);rows.forEach(x=>{assert.ok(x.sales<=x.latentDemand);assert.ok(x.unavailableHours>=0&&x.unavailableHours<=16);});});
test('stockout adjustment never reports negative demand',()=>{const e=estimateDemand(generateHistory(sku));assert.ok(e.corrected>=e.naive);assert.ok(e.censoredDays>=0);});
test('Poisson sampler preserves nonnegative integer counts',()=>{const r=rngFromSeed(999);for(let i=0;i<50;i++){let x=samplePoisson(27,r);assert.ok(Number.isInteger(x)&&x>=0);}});
test('simulated inventory ledger is nonnegative and internally consistent',()=>{
 const run=comparePolicies(sku,{},42).policies[2];let cumulativeSales=0,cumulativeDemand=0,cumulativeWaste=0;
 run.timeline.forEach(t=>{assert.ok(t.inventory>=0&&t.order>=0&&t.arrived>=0&&t.expired>=0);assert.equal(t.sales+t.missing,t.demand);cumulativeSales+=t.sales;cumulativeDemand+=t.demand;cumulativeWaste+=t.expired;});
 assert.equal(run.metrics.unmet,cumulativeDemand-cumulativeSales);assert.equal(run.metrics.waste,cumulativeWaste);assert.equal(run.timeline.length,28);
});
test('common random demand path is identical across policies',()=>{const [a,b,c]=comparePolicies(sku,{},42).policies;assert.deepEqual(a.timeline.map(x=>x.demand),b.timeline.map(x=>x.demand));assert.deepEqual(b.timeline.map(x=>x.demand),c.timeline.map(x=>x.demand));});
test('Monte Carlo returns all models and tail risk is at least mean modeled cost',()=>{const out=monteCarlo(sku,{days:12},42,12);for(const key of ['baseline','corrected','adaptive']){assert.equal(out[key].trials,12);assert.ok(out[key].cvar90>=out[key].cost-1e-9);assert.ok(out[key].fillRate>=0&&out[key].fillRate<=1);}});
test('valid user data is parsed for selected SKU and filtered',()=>{let rows=['date,sales,stockout_hours,sku'];for(let i=1;i<=8;i++)rows.push(`2026-08-${String(i).padStart(2,'0')},${i},2,SPN-014`);rows.push('2026-08-09,5,3,OTHER');const data=parseUserCSV(rows.join('\n'),'SPN-014');assert.equal(data.length,8);assert.equal(data[0].sales,1);});
test('invalid values reject rather than silently distort the model',()=>{const rows=['date,sales,stockout_hours',...Array.from({length:8},(_,i)=>`2026-08-${String(i+1).padStart(2,'0')},${i},${i===2?19:1}`)].join('\n');assert.throws(()=>parseUserCSV(rows,sku.id),/Invalid/);});