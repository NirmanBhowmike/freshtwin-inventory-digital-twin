/* Reproducible, synthetic numerical benchmarks — not field-performance claims. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {VEGETABLES} from '../src/vegetables.js';
import {compareJoint,exhaustiveSmallAllocation,JOINT_POLICIES} from '../src/joint.js';

const seeds=[19,42,211];
const cases=[
 {id:'capital-limited',title:'Restricted purchasing capital',budget:800,capacity:310,days:12},
 {id:'cold-storage-limited',title:'Restricted refrigerated space',budget:5500,capacity:260,days:12},
 {id:'balanced',title:'Moderate competing constraints',budget:2700,capacity:310,days:12},
 {id:'demand-shock',title:'40% demand intensity increase',budget:2700,capacity:310,days:12,demandMultiplier:1.4}
];
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
const mean=xs=>xs.reduce((s,n)=>s+n,0)/xs.length;
const findings=[];
for(const config of cases){
 const observed=Object.fromEntries(JOINT_POLICIES.map(p=>[p,[]]));
 const start=performance.now();
 for(const seed of seeds){
  const result=compareJoint(VEGETABLES,{...config,scenarioSamples:5,searchSteps:7},seed);
  const replay=compareJoint(VEGETABLES,{...config,scenarioSamples:5,searchSteps:7},seed);
  assert.deepEqual(result.policies.map(p=>p.metrics),replay.policies.map(p=>p.metrics),'Seeded policy metrics must be reproducible');
  const truth=result.policies.map(p=>p.timeline.map(t=>t.products.map(x=>x.demand)));
  assert.deepEqual(truth[0],truth[1]);assert.deepEqual(truth[1],truth[2]);
  for(const policy of result.policies){
   const m=policy.metrics;
   for(const field of ['cost','fillRate','expired','purchases','peakCapacity'])assert.ok(Number.isFinite(m[field]),'Nonfinite '+field);
   assert.ok(m.purchases<=config.budget+1e-6,'Budget exceeded');
   assert.ok(m.peakCapacity<=config.capacity+1e-6,'Shared capacity exceeded');
   close(m.acquisitionNet,m.initialAssets+m.purchases-m.terminalCredit);
   close(m.cost,m.acquisitionNet+m.holding+m.disposal+m.shortagePenalty);
   for(const day of policy.timeline){
    assert.ok(day.reservedCapacity<=config.capacity+1e-6);
    assert.ok(day.remainingBudget>=-1e-6);
    for(const item of day.products)assert.equal(item.opening+item.arrived-item.sold-item.expired,item.closing);
   }
   observed[policy.policy].push({cost:m.cost,fillRate:m.fillRate,expired:m.expired,purchases:m.purchases,capacity:m.peakCapacity});
  }
 }
 const policies=Object.fromEntries(Object.entries(observed).map(([name,rows])=>[name,{
  meanCost:mean(rows.map(x=>x.cost)),
  meanFillRate:mean(rows.map(x=>x.fillRate)),
  meanExpiredUnits:mean(rows.map(x=>x.expired)),
  meanPurchaseCommitment:mean(rows.map(x=>x.purchases)),
  maximumReservedCapacity:Math.max(...rows.map(x=>x.capacity))
 }]));
 const winners={lowestMeanCost:Object.keys(policies).sort((a,b)=>policies[a].meanCost-policies[b].meanCost)[0],highestMeanFill:Object.keys(policies).sort((a,b)=>policies[b].meanFillRate-policies[a].meanFillRate)[0]};
 findings.push({scenario:config,seedCount:seeds.length,seeds,policies,winners,elapsedMs:Math.round(performance.now()-start)});
}

// Reduced one-period separable integer example ONLY: an independent brute-force
// check of the static oracle, NOT an optimality guarantee for the dynamic policy.
const curves=[[15,8,7],[12,9,6],[14,8,5]];
const dollars=[2,3,4],space=[1,2,3],budget=8,capacity=6;
const exact=exhaustiveSmallAllocation(curves,dollars,space,budget,capacity);
let independent=Infinity,independentOrders=null,feasible=0;
for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
 const orders=[a,b,c];
 const committed=orders.reduce((n,q,i)=>n+q*dollars[i],0);
 const reserved=orders.reduce((n,q,i)=>n+q*space[i],0);
 if(committed>budget||reserved>capacity)continue;
 feasible++;const score=orders.reduce((n,q,i)=>n+curves[i][q],0);
 if(score<independent){independent=score;independentOrders=orders;}
}
close(exact.objective,independent);
assert.equal(exact.evaluated,feasible);
assert.deepEqual(exact.orders,independentOrders);
const report={
 title:'FreshTwin v0.5 numerical scenario benchmarking',
 generatedAt:new Date().toISOString(),
 source:'Ten separately specified hypothetical vegetables; seeded synthetic demand and assumed economics',
 benchmarkType:'Paired constrained-policy sensitivity plus independent finite single-period oracle',
 seeds,scenarios:findings,
 finiteStaticOracle:{orders:exact.orders,objective:exact.objective,feasibleCombinations:feasible,verifiedByIndependentEnumeration:true},
 limitations:['Not physical retailer data','Not out-of-sample real-world economic validation','Not a global optimality certificate for the coupled dynamic heuristic','Timing is runner-specific','Only three paired seeds per sensitivity case']
};
await mkdir('benchmark-results',{recursive:true});
await writeFile('benchmark-results/joint-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('Four controlled sensitivity settings across '+seeds.length+' paired seeds each.');
for(const x of findings){console.log([x.scenario.id,'mean cost winner:',x.winners.lowestMeanCost,'service winner:',x.winners.highestMeanFill,'elapsed ms:',x.elapsedMs].join(' '));}
console.log('Independent static oracle verified on '+feasible+' feasible integer combinations.');
console.log('Machine-readable output: benchmark-results/joint-summary.json');
