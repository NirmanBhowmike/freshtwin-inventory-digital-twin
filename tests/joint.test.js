import test from 'node:test';
import assert from 'node:assert/strict';
import {VEGETABLES} from '../src/vegetables.js';
import {jointConfig,prepareJointScenario,projectRequestedOrders,allocateJoint,simulateJoint,compareJoint,jointMonteCarlo,exhaustiveSmallAllocation} from '../src/joint.js';
const skus=VEGETABLES;
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} not within ${tol} of ${b}`);
const config={days:12,budget:2700,capacity:270,scenarioSamples:5,searchSteps:7};
test('all 10 products have unique identities and share an actual synthetic-store capacity',()=>{
 assert.equal(skus.length,10);assert.equal(new Set(skus.map(x=>x.id)).size,10);
 const cfg=jointConfig(skus,config);assert.ok(cfg.initialSpace>0);assert.ok(cfg.initialSpace<cfg.capacity);
 assert.match(prepareJointScenario(skus,config).scope,/ONE hypothetical store/);
});
test('unsafe opening capacity or negative budget is rejected before simulation',()=>{
 assert.throws(()=>jointConfig(skus,{capacity:200}),/cover/);
 assert.throws(()=>jointConfig(skus,{budget:-1}),/nonnegative/);
 assert.throws(()=>jointConfig([skus[0],skus[0]],{}),/unique/);
 assert.throws(()=>jointConfig([{...skus[0],storage:-1}],{}),/storage/);
});
test('same scenario truth path shared exactly across all policies',()=>{
 const x=compareJoint(skus,config,123);
 assert.equal(x.policies.length,3);
 const demand=x.policies.map(p=>p.timeline.map(t=>t.products.map(z=>z.demand)));
 assert.deepEqual(demand[0],demand[1]);assert.deepEqual(demand[1],demand[2]);
});
test('every product-day fulfills exact FEFO mass conservation under common constraints',()=>{
 for(const seed of [2,31,112,789])for(const p of compareJoint(skus,config,seed).policies){
  for(const t of p.timeline)for(const product of t.products){
   assert.equal(product.opening+product.arrived-product.sold-product.expired,product.closing);
   assert.equal(product.demand,product.sold+product.lost);
   for(const field of ['closing','ordered','expired','sold','lost'])assert.ok(product[field]>=0);
  }
 }
});
test('conservative capacity reservation and lifetime procurement budget never breached',()=>{
 for(const seed of [11,38,100,2026])for(const p of compareJoint(skus,config,seed).policies){
  near(p.timeline.reduce((s,t)=>s+t.orderCost,0),p.metrics.purchases);
  assert.ok(p.metrics.purchases<=config.budget+1e-7);
  assert.ok(p.metrics.peakCapacity<=config.capacity+1e-7);
  for(const t of p.timeline){
   assert.ok(t.reservedCapacity<=config.capacity+1e-7);
   assert.ok(t.onHandCapacity<=t.reservedCapacity+1e-7);
   assert.ok(t.remainingBudget>=-1e-7);
   assert.ok(t.availableCapacity>=-1e-7);
  }
 }
});
test('zero purchase budget forbids any orders and does not generate NaN metrics',()=>{
 const x=compareJoint(skus,{days:8,budget:0,capacity:260,scenarioSamples:4},33);
 for(const p of x.policies){assert.equal(p.metrics.purchases,0);assert.equal(p.metrics.orders,0);assert.ok(Number.isFinite(p.metrics.cost));assert.ok(Number.isFinite(p.metrics.capitalBudgetUsed));}
});
test('full opening capacity forbids orders until reservations free up, without overflow',()=>{
 const exact=jointConfig(skus,config).initialSpace;
 const x=compareJoint(skus,{...config,capacity:exact},9);
 for(const p of x.policies){assert.ok(p.metrics.peakCapacity<=exact+1e-7);assert.equal(p.timeline[0].reservedCapacity<=exact+1e-7,true);}
});
test('baseline projection resolves joint hard constraints proportionally and deterministically',()=>{
 const selected=skus.slice(0,3), states=selected.map(()=>({batches:[],pipeline:[]})),req=[40,30,20];
 const a=projectRequestedOrders(selected,states,req,30,8);
 const b=projectRequestedOrders(selected,states,req,30,8);
 assert.deepEqual(a,b);
 assert.ok(a.orders.every((q,i)=>Number.isInteger(q)&&q>=0&&q<=req[i]));
 assert.ok(a.budgetUsed<=30+1e-7&&a.capacityUsed<=8+1e-7);
});
test('terminal cost matches stock assets and modeled costs for all three policies',()=>{
 for(const p of compareJoint(skus,config,4).policies){
  const m=p.metrics;
  near(m.acquisitionNet,m.initialAssets+m.purchases-m.terminalCredit);
  near(m.terminalCredit,m.endingInventory+m.endingPipeline);
  near(m.cost,m.acquisitionNet+m.holding+m.disposal+m.shortagePenalty);
  near(m.fillRate,m.demand?m.sales/m.demand:1);
 }
});
test('single-store policy comparison repeats bit-for-bit with the same seed',()=>{
 const x=compareJoint(skus,config,197),y=compareJoint(skus,config,197);
 assert.deepEqual(x,y);
});
test('Monte Carlo policy comparisons are paired, finite and transparently uncertain',()=>{
 const m=jointMonteCarlo(skus,{...config,days:9},12,8);
 assert.equal(m.trials,8);assert.equal(Object.keys(m.byPolicy).length,3);
 for(const p of Object.values(m.byPolicy)){assert.ok(Number.isFinite(p.cost));assert.ok(p.cvar90>=p.cost-1e-6);assert.ok(p.ci95[0]<=p.cost&&p.ci95[1]>=p.cost);}
 assert.ok(Number.isFinite(m.pairedSavings.mean));assert.ok(m.pairedSavings.ci95[0]<=m.pairedSavings.mean);
});
test('independent exhaustive small knapsack oracle chooses globally minimal finite two-resource cost',()=>{
 const curves=[[10,5,4],[9,6,0]],costs=[3,4],volumes=[2,1];
 const r=exhaustiveSmallAllocation(curves,costs,volumes,7,4);
 let best=Infinity;
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(3*a+4*b<=7&&2*a+b<=4)best=Math.min(best,curves[0][a]+curves[1][b]);
 assert.equal(r.objective,best);assert.ok(r.evaluated>=3);
});
test('small exhaustive oracle refuses infeasible scalability claims',()=>{
 assert.throws(()=>exhaustiveSmallAllocation(Array(6).fill([0,1]),[],[],10,10),/only supports/);
});
test('end-of-horizon orders are not invented when no arrival is possible',()=>{
 const out=simulateJoint(skus,{days:1,budget:2000,capacity:310},'joint',42);
 assert.equal(out.metrics.orders,0);
});