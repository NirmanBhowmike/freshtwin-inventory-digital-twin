import test from 'node:test';
import assert from 'node:assert/strict';
import {VEGETABLES,validateVegetable,ageCohortsFor} from '../src/vegetables.js';
import {SKUS,generateHistory,estimateDemand,runPolicy,comparePolicies,monteCarlo,orderScore,optimizeOrder,rngFromSeed,syntheticDemandValidation} from '../src/engine.js';
const veg=VEGETABLES[0],hist=generateHistory(veg,12);
test('ten named vegetables have distinct SKUs and meaningful validated parameters',()=>{assert.equal(VEGETABLES.length,10);assert.equal(new Set(VEGETABLES.map(v=>v.id)).size,10);for(const v of VEGETABLES){validateVegetable(v);assert.equal(ageCohortsFor(v).reduce((s,b)=>s+b.qty,0),v.initialInventory);}});
test('age-structured ledger conserves physical units',()=>{for(const v of [veg,VEGETABLES[1],SKUS[0]])for(const pol of ['baseline','corrected','adaptive']){const r=runPolicy(v,generateHistory(v,7),{days:18,leadTime:v.leadTime??1},pol,7);for(const x of r.timeline){assert.equal(x.openingInventory+x.arrived-x.sales-x.expired,x.inventory);assert.equal(x.sales+x.missing,x.demand);assert.equal(x.ageCohorts.reduce((s,b)=>s+b.qty,0),x.inventory);assert.ok(x.inventory>=0&&x.order>=0&&x.expired>=0);}}});
test('terminal accounting values usable stock and outstanding orders at cost',()=>{const sku={...veg,demand:0,initialInventory:10,ageOldPercent:0,shelfLife:8,leadTime:5,cost:2,holding:0,shortage:0,disposal:0};const h=Array.from({length:40},(_,i)=>({date:`2026-01-${String(i%28+1).padStart(2,'0')}`,sales:0,unavailableHours:0}));const run=runPolicy(sku,h,{days:2,leadTime:5},'baseline',42);assert.equal(run.metrics.initialAssets,20);assert.equal(run.metrics.terminalCredit,20);assert.equal(run.metrics.cost,0);assert.equal(run.metrics.closingInventory,10);});
test('end horizon orders do not get unearned expense or unfair negative cost',()=>{const s={...veg,initialInventory:0,ageOldPercent:0,shortage:0,holding:0,disposal:0};const h=generateHistory(s,3);const r=runPolicy(s,h,{days:1,leadTime:4,demandPath:[0]},'corrected',42);assert.equal(r.metrics.cost,0);assert.ok(r.metrics.pipelineEnd>0);assert.equal(r.metrics.purchases,r.metrics.terminalCredit);});
test('same SKU, history, parameters, and seed reproduce all policies exactly',()=>{const settings={days:12,leadTime:1,demandMultiplier:1.3,shortageWeight:1.1};assert.deepEqual(comparePolicies(veg,settings,21,hist),comparePolicies(veg,settings,21,hist));});
test('known latent demand validation is deterministic and does not pretend to use genuine field truth',()=>{const a=syntheticDemandValidation(veg,88,[.6,1],5);assert.deepEqual(a,syntheticDemandValidation(veg,88,[.6,1],5));assert.ok(a.every(x=>x.scope.includes('synthetic')&&x.naiveMAE>=0&&x.correctedMAE>=0));});
test('bounded order search matches exhaustive enumeration of its sampled single-order objective on small instance',()=>{const s={...veg,demand:8,shortage:8,cost:2,shelfLife:5};const b=[{qty:3,life:3}],p=[];const cfg={days:10,leadTime:0,shortageWeight:1};const rng1=rngFromSeed(222),rng2=rngFromSeed(222);const a=optimizeOrder(s,b,p,8,0,cfg,rng1,{samples:8,maxOrder:15,exact:true});const c=optimizeOrder(s,b,p,8,0,cfg,rng2,{samples:8,maxOrder:15,exact:false});assert.equal(a.quantity,c.quantity);assert.equal(a.objective,c.objective);});
test('no arriving replenishment after last feasible day is rationally ordered',()=>{const r=optimizeOrder(veg,[],[],12,20,{days:21,leadTime:2},rngFromSeed(11));assert.equal(r.quantity,0);});
test('cost reconciliation equals acquisition less terminal assets plus other costs',()=>{const r=runPolicy(veg,hist,{days:22},'adaptive',17).metrics;assert.ok(Math.abs(r.cost-(r.initialAssets+r.purchases-r.terminalCredit+r.holding+r.disposal+r.shortagePenalty))<1e-8);});
test('mean costs and paired intervals agree with seeded Monte Carlo output',()=>{const x=monteCarlo(veg,{days:10},52,16,hist),y=monteCarlo(veg,{days:10},52,16,hist);assert.deepEqual(x,y);for(const p of Object.values(x)){assert.ok(p.stdCost>=0);assert.ok(Number.isFinite(p.cost));assert.equal(p.trials,16);}});
test('short shelf life and demand collapse can generate genuine inventory expiration',()=>{const s={...veg,shelfLife:2,initialInventory:100,demand:0,ageOldPercent:0,holding:0};const h=generateHistory(s,19);const r=runPolicy(s,h,{days:7,demandPath:Array(7).fill(0)},'baseline',19);assert.ok(r.metrics.waste>=100);});
test('Monte Carlo cost components reconcile to means and cumulative sample-size diagnostics',()=>{
 const m=monteCarlo(veg,{days:12},41,24,hist);
 for(const x of Object.values(m)){
  const parts=Object.values(x.costComponents).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(parts-x.cost)<1e-7);
  assert.deepEqual(x.convergence.map(v=>v.trials),[8,16,24]);
  assert.ok(Math.abs(x.convergence.at(-1).meanCost-x.cost)<1e-7);
 }
});
