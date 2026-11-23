/** FreshTwin v0.5 — one synthetic store, ten vegetable SKUs, one finite purchasing
 * budget and one conservative refrigerated volume limit. NOT real retailer records.
 *
 * Independent-policy baselines are projected onto the SAME feasibility region.
 * Shared decisions use a deterministic marginal-value heuristic built from the
 * v0.4 FEFO scenario cost evaluator. No global-optimality claim is made.
 */
import {estimateDemand,generateHistory,orderScore,rngFromSeed,sampleDemand} from './engine.js';
import {ageCohortsFor,validateVegetable} from './vegetables.js';

const EPS=1e-7;
const sum=a=>a.reduce((s,n)=>s+n,0);
const mean=a=>a.length?sum(a)/a.length:0;
const copy=x=>x.map(r=>({...r}));
const quantity=a=>sum(a.map(x=>x.qty));
const storeSpace=(skus,states)=>sum(skus.map((sku,i)=>sku.storage*(quantity(states[i].batches)+quantity(states[i].pipeline))));
export const JOINT_POLICIES=['sales','corrected','joint'];
export const JOINT_LABELS={sales:'Recorded-sales constrained',corrected:'Stockout-aware constrained',joint:'Coupled marginal-value search'};
export function jointConfig(skus,options={}){
 if(!Array.isArray(skus)||!skus.length||skus.length>20)throw Error('Choose between 1 and 20 coherent synthetic-store SKUs.');
 const ids=new Set();
 for(const sku of skus){validateVegetable(sku);if(ids.has(sku.id))throw Error('Each SKU must be unique.');ids.add(sku.id);}
 const initialSpace=sum(skus.map(x=>x.initialInventory*x.storage));
 const defaults={days:21,capacity:310,budget:5500,demandMultiplier:1,stockFactor:.88,scenarioSamples:10,maxOrder:120,searchSteps:12};
 const cfg={...defaults,...options};
 if(!Number.isInteger(cfg.days)||cfg.days<1||cfg.days>90)throw Error('Horizon must contain 1–90 whole days.');
 if(!Number.isFinite(cfg.capacity)||cfg.capacity+EPS<initialSpace)throw Error(`Shared capacity must cover ${initialSpace.toFixed(2)} occupied units at opening.`);
 if(!Number.isFinite(cfg.budget)||cfg.budget<0||cfg.budget>1e9)throw Error('Shared purchasing budget must be nonnegative and finite.');
 if(!Number.isFinite(cfg.demandMultiplier)||cfg.demandMultiplier<0||cfg.demandMultiplier>4)throw Error('Demand multiplier must be within 0–400%.');
 if(!Number.isFinite(cfg.stockFactor)||cfg.stockFactor<=0||cfg.stockFactor>5)throw Error('Historical stockout factor must be within (0,5].');
 if(!Number.isInteger(cfg.scenarioSamples)||cfg.scenarioSamples<2||cfg.scenarioSamples>100)throw Error('Scenario count must be 2–100.');
 if(!Number.isInteger(cfg.maxOrder)||cfg.maxOrder<1||cfg.maxOrder>1000)throw Error('Maximum candidate quantity must be 1–1000.');
 if(!Number.isInteger(cfg.searchSteps)||cfg.searchSteps<2||cfg.searchSteps>100)throw Error('Search grid must have 2–100 steps.');
 return {...cfg,initialSpace};
}
export function prepareJointScenario(skus,config={},seed=42,scenarioIndex=0){
 const cfg=jointConfig(skus,config);
 const histories=skus.map((sku,i)=>generateHistory(sku,seed+i*31,cfg.stockFactor));
 const forecasts=histories.map(history=>estimateDemand(history));
 const paths=skus.map((sku,i)=>{
  const rng=rngFromSeed(seed+20003+scenarioIndex*1019+i*137);
  return Array.from({length:cfg.days},(_,day)=>sampleDemand(
   Math.max(0,sku.demand*cfg.demandMultiplier*(1+.10*Math.sin(day*2*Math.PI/7))),rng,sku.demandVariability));
 });
 return {cfg,histories,forecasts,paths,seed,scenarioIndex,scope:'All ten synthetic vegetables represent ONE hypothetical store; not selected from different real retailer stores.'};
}
function dailyTransition(sku,state,day,demand){
 const opening=quantity(state.batches);
 const arrived=sum(state.pipeline.filter(p=>p.day===day).map(p=>p.qty));
 state.pipeline=state.pipeline.filter(p=>p.day!==day);
 if(arrived)state.batches.push({qty:arrived,life:sku.shelfLife});
 let toServe=demand,sold=0;
 state.batches.sort((a,b)=>a.life-b.life);
 for(const batch of state.batches){const taken=Math.min(batch.qty,toServe);batch.qty-=taken;toServe-=taken;sold+=taken;}
 const holding=quantity(state.batches)*sku.holding;
 for(const batch of state.batches)batch.life--;
 const expired=sum(state.batches.filter(x=>x.life<=0).map(x=>x.qty));
 state.batches=state.batches.filter(x=>x.life>0&&x.qty>0);
 const closing=quantity(state.batches);
 if(opening+arrived-sold-expired!==closing)throw Error(`Stock balance failed for ${sku.id} on day ${day+1}.`);
 return {opening,arrived,sold,lost:demand-sold,holding,expired,disposal:expired*sku.disposal,shortage:(demand-sold)*sku.shortage,closing};
}
/** Fair constraint projection for both standalone baseline policies. */
export function projectRequestedOrders(skus,states,requests,budgetLeft,capacityLeft){
 if(skus.length!==requests.length||requests.some(x=>!Number.isInteger(x)||x<0))throw Error('Requested quantities must be nonnegative integers and match the SKU list.');
 const totalCost=sum(requests.map((q,i)=>q*skus[i].cost));
 const totalVolume=sum(requests.map((q,i)=>q*skus[i].storage));
 const factor=Math.min(1,totalCost>EPS?budgetLeft/totalCost:1,totalVolume>EPS?capacityLeft/totalVolume:1);
 const orders=requests.map(q=>Math.max(0,Math.floor(q*Math.max(0,factor)+EPS)));
 let spent=sum(orders.map((q,i)=>q*skus[i].cost)),space=sum(orders.map((q,i)=>q*skus[i].storage));
 // Deterministic proportional largest-remainder method, with feasible single-unit top-up.
 const ranks=requests.map((q,i)=>({i,remainder:q*Math.max(0,factor)-orders[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
 for(const {i} of ranks){
  if(orders[i]>=requests[i])continue;
  if(spent+skus[i].cost<=budgetLeft+EPS&&space+skus[i].storage<=capacityLeft+EPS){orders[i]++;spent+=skus[i].cost;space+=skus[i].storage;}
 }
 return {orders,objective:null,requested:requests,budgetUsed:spent,capacityUsed:space,algorithm:'deterministic proportional constraint projection'};
}
/** The approximate coupled allocator evaluates the same FEFO scenario objective used
 * in the single-SKU engine, then greedily selects profitable integer order bundles
 * under BOTH shared finite resources. Fixed paths for each candidate prevent
 * comparison noise. Returning order=0 is always feasible.
 */
export function allocateJoint(skus,states,forecasts,day,cfg,budgetLeft,capacityLeft,decisionSeed){
 const options=skus.map((sku,i)=>{
  const available=quantity(states[i].batches)+quantity(states[i].pipeline);
  const mu=forecasts[i].corrected*cfg.demandMultiplier;
  const remaining=cfg.days-day-1;
  if(remaining<=sku.leadTime||mu<=0)return {steps:[],scores:new Map([[0,0]]),step:1,upper:0};
  const upper=Math.max(1,Math.min(cfg.maxOrder,Math.ceil(Math.max(mu*2,mu*(sku.leadTime+1.5)-available+mu*1.5))));
  const step=Math.max(1,Math.ceil(upper/cfg.searchSteps));
  const days=Math.min(remaining,Math.max(sku.shelfLife,sku.leadTime+2),12);
  const rnd=rngFromSeed(decisionSeed+i*773+17);
  const paths=Array.from({length:cfg.scenarioSamples},()=>Array.from({length:days},(_,j)=>sampleDemand(
   Math.max(0,mu*(1+.10*Math.sin((day+1+j)*2*Math.PI/7))),rnd,sku.demandVariability)));
  const lcfg={days:cfg.days,leadTime:sku.leadTime,demandMultiplier:cfg.demandMultiplier,shortageWeight:1};
  const scores=new Map();
  const score=q=>{if(!scores.has(q))scores.set(q,orderScore(sku,states[i].batches,states[i].pipeline,q,mu,day,lcfg,paths));return scores.get(q);};
  score(0);
  const steps=[];
  for(let to=Math.min(step,upper),from=0;from<upper;from=to,to=Math.min(upper,to+step)){
   const gain=score(from)-score(to);
   steps.push({from,to,quantity:to-from,gain});
  }
  return {steps,scores,step,upper,score};
 });
 const orders=Array(skus.length).fill(0);
 let spent=0,used=0,improvement=0;
 // Greedy resource-aware marginal bundle selection. Small bundles are exact integers.
 const attempted=[];
 for(let k=0;k<skus.length*cfg.searchSteps+skus.length;k++){
  let selected=null;
  for(let i=0;i<skus.length;i++){
   const op=options[i],bundle=op.steps.find(x=>x.from===orders[i]);
   if(!bundle||bundle.gain<=EPS)continue;
   const dollars=bundle.quantity*skus[i].cost,volume=bundle.quantity*skus[i].storage;
   if(dollars+spent>budgetLeft+EPS||volume+used>capacityLeft+EPS){attempted.push({i,dollars,volume,gain:bundle.gain});continue;}
   const denominator=Math.max(EPS,.5*dollars/Math.max(EPS,budgetLeft)+.5*volume/Math.max(EPS,capacityLeft));
   const rank=bundle.gain/denominator;
   if(!selected||rank>selected.rank+EPS||Math.abs(rank-selected.rank)<=EPS&&i<selected.i)selected={i,rank,bundle,dollars,volume};
  }
  if(!selected)break;
  orders[selected.i]+=selected.bundle.quantity;
  spent+=selected.dollars;used+=selected.volume;improvement+=selected.bundle.gain;
 }
 // Exact single-unit polish for otherwise stranded capital/space, reusing fixed paths.
 for(let j=0;j<Math.min(50,skus.length*6);j++){
  let best=null;
  for(let i=0;i<skus.length;i++){
   const op=options[i],sku=skus[i],q=orders[i];
   if(!op.score||q>=op.upper||spent+sku.cost>budgetLeft+EPS||used+sku.storage>capacityLeft+EPS)continue;
   const gain=op.score(q)-op.score(q+1);
   if(gain<=EPS)continue;
   const rank=gain/Math.max(EPS,.5*sku.cost/Math.max(EPS,budgetLeft)+.5*sku.storage/Math.max(EPS,capacityLeft));
   if(!best||rank>best.rank+EPS)best={i,rank,gain};
  }
  if(!best)break;
  orders[best.i]++;spent+=skus[best.i].cost;used+=skus[best.i].storage;improvement+=best.gain;
 }
 return {orders,objectiveImprovement:improvement,budgetUsed:spent,capacityUsed:used,
  bindingBudget:attempted.some(x=>x.dollars+spent>budgetLeft+EPS),bindingCapacity:attempted.some(x=>x.volume+used>capacityLeft+EPS),
  algorithm:'sampled marginal FEFO score + constrained greedy integer bundles + single-unit polish (approximate)'};
}
function settingsForPolicy(skus,scenario,policy){
 const {cfg,forecasts,paths,seed,scenarioIndex}=scenario;
 const states=skus.map(x=>({batches:ageCohortsFor(x),pipeline:[]}));
 const initialAssets=sum(skus.map(x=>x.initialInventory*x.cost));
 const openingSpace=storeSpace(skus,states);
 if(openingSpace>cfg.capacity+EPS)throw Error('Opening store inventory exceeds shared capacity.');
 let purchases=0,holding=0,disposal=0,shortagePenalty=0,sales=0,demand=0,expired=0,unitsOrdered=0;
 let maxReserved=openingSpace,daysCapacityBinding=0,daysBudgetBinding=0;
 const timeline=[];
 for(let day=0;day<cfg.days;day++){
  let arrived=0,dayDemand=0,daySales=0,dayExpired=0;
  const dayRecords=[];
  for(let i=0;i<skus.length;i++){
   const d=paths[i][day],v=dailyTransition(skus[i],states[i],day,d);
   arrived+=v.arrived;dayDemand+=d;daySales+=v.sold;dayExpired+=v.expired;
   holding+=v.holding;disposal+=v.disposal;shortagePenalty+=v.shortage;sales+=v.sold;demand+=d;expired+=v.expired;
   dayRecords.push({id:skus[i].id,name:skus[i].name,demand:d,...v});
  }
  const occupied=storeSpace(skus,states),budgetLeft=Math.max(0,cfg.budget-purchases),capacityLeft=Math.max(0,cfg.capacity-occupied);
  let decision;
  if(policy==='joint')decision=allocateJoint(skus,states,forecasts,day,cfg,budgetLeft,capacityLeft,seed+scenarioIndex*100000+day*311);
  else{
   const requests=skus.map((sku,i)=>{
    if(day+sku.leadTime+1>=cfg.days)return 0; // no speculative end-horizon purchases for any policy
    const forecast=(policy==='sales'?forecasts[i].naive:forecasts[i].corrected)*cfg.demandMultiplier;
    const position=quantity(states[i].batches)+quantity(states[i].pipeline);
    return Math.max(0,Math.min(1000,Math.round(forecast*(sku.leadTime+1.5)-position)));
   });
   decision=projectRequestedOrders(skus,states,requests,budgetLeft,capacityLeft);
  }
  const {orders}=decision;
  const orderedCost=sum(orders.map((q,i)=>q*skus[i].cost)),orderedSpace=sum(orders.map((q,i)=>q*skus[i].storage));
  if(purchases+orderedCost>cfg.budget+EPS||occupied+orderedSpace>cfg.capacity+EPS)throw Error(`Shared constraints violated at day ${day+1}.`);
  for(let i=0;i<skus.length;i++){
   const q=orders[i];if(q){states[i].pipeline.push({qty:q,day:day+skus[i].leadTime+1});unitsOrdered+=q;}
   dayRecords[i].ordered=q;
  }
  purchases+=orderedCost;
  const reserved=storeSpace(skus,states);
  if(reserved>cfg.capacity+EPS)throw Error('Conservative storage reservation invariant violated.');
  maxReserved=Math.max(reserved,maxReserved);
  const bindBudget=policy==='joint'?decision.bindingBudget:decision.requested.some((q,i)=>q>orders[i])&&budgetLeft<sum(decision.requested.map((q,i)=>q*skus[i].cost));
  const bindCapacity=policy==='joint'?decision.bindingCapacity:decision.requested.some((q,i)=>q>orders[i])&&capacityLeft<sum(decision.requested.map((q,i)=>q*skus[i].storage));
  daysBudgetBinding+=Number(bindBudget);daysCapacityBinding+=Number(bindCapacity);
  timeline.push({day:day+1,demand:dayDemand,sales:daySales,lost:dayDemand-daySales,expired:dayExpired,arrived,orders:sum(orders),orderCost:orderedCost,totalCommittedPurchases:purchases,reservedCapacity:reserved,onHandCapacity:sum(skus.map((x,i)=>quantity(states[i].batches)*x.storage)),remainingBudget:cfg.budget-purchases,availableCapacity:cfg.capacity-reserved,bindBudget,bindCapacity,products:dayRecords});
 }
 const endingInventory=sum(skus.map((x,i)=>quantity(states[i].batches)*x.cost)),endingPipeline=sum(skus.map((x,i)=>quantity(states[i].pipeline)*x.cost));
 const terminalCredit=endingInventory+endingPipeline;
 const acquisitionNet=initialAssets+purchases-terminalCredit;
 const cost=acquisitionNet+holding+disposal+shortagePenalty;
 return {policy,metrics:{cost,fillRate:demand?sales/demand:1,expired,lost:demand-sales,orders:unitsOrdered,purchases,holding,disposal,shortagePenalty,initialAssets,endingInventory,endingPipeline,terminalCredit,acquisitionNet,peakCapacity:maxReserved,daysCapacityBinding,daysBudgetBinding,demand,sales,capitalBudgetUsed:cfg.budget>0?purchases/cfg.budget:0},timeline,config:cfg,seed,scenarioIndex,scopedStore:'single synthetic store; ten illustrative vegetables'};
}
export function simulateJoint(skus,config={},policy='joint',seed=42,scenarioIndex=0,provided=null){
 if(!JOINT_POLICIES.includes(policy))throw Error('Unrecognized multi-product inventory policy.');
 const scenario=provided??prepareJointScenario(skus,config,seed,scenarioIndex);
 if(scenario.paths.length!==skus.length)throw Error('Scenario product dimension mismatch.');
 return settingsForPolicy(skus,scenario,policy);
}
export function compareJoint(skus,config={},seed=42,scenarioIndex=0){
 const scenario=prepareJointScenario(skus,config,seed,scenarioIndex);
 return {config:scenario.cfg,seed,scenarioIndex,scope:scenario.scope,
  policies:JOINT_POLICIES.map(policy=>simulateJoint(skus,scenario.cfg,policy,seed,scenarioIndex,scenario))};
}
function ci(a){const n=a.length,m=mean(a),variance=n>1?sum(a.map(v=>(v-m)**2))/(n-1):0;const h=1.96*Math.sqrt(variance/Math.max(1,n));return [m-h,m+h];}
export function jointMonteCarlo(skus,config={},seed=42,trials=8){
 if(!Number.isInteger(trials)||trials<2||trials>100)throw Error('Paired Monte Carlo repetitions must be 2–100.');
 const grouped={sales:[],corrected:[],joint:[]};
 for(let k=0;k<trials;k++){
  for(const run of compareJoint(skus,config,seed,k).policies)grouped[run.policy].push(run.metrics);
 }
 const differences=grouped.sales.map((m,i)=>m.cost-grouped.joint[i].cost);
 return {trials,seed,model:'paired synthetic-demand trials; same stochastic path per policy in every trial',
  byPolicy:Object.fromEntries(JOINT_POLICIES.map(policy=>{
   const m=grouped[policy],costs=m.map(x=>x.cost),s=[...costs].sort((a,b)=>a-b);
   return [policy,{cost:mean(costs),fillRate:mean(m.map(x=>x.fillRate)),expired:mean(m.map(x=>x.expired)),lost:mean(m.map(x=>x.lost)),purchases:mean(m.map(x=>x.purchases)),daysCapacityBinding:mean(m.map(x=>x.daysCapacityBinding)),daysBudgetBinding:mean(m.map(x=>x.daysBudgetBinding)),cvar90:mean(s.slice(Math.floor(s.length*.9))),ci95:ci(costs)}];
  })),pairedSavings:{mean:mean(differences),ci95:ci(differences)},limitations:'Approximate 95% normal CI; sample CVaR90 unstable with limited trials; no actual field savings.'};
}
/** Oracle for a SMALL static separable one-period instance; bounded enumeration
 * verifies two-resource feasibility and permits measuring heuristic regret.
 */
export function exhaustiveSmallAllocation(costCurves,unitCosts,unitStorage,budget,capacity){
 if(costCurves.length>5||costCurves.some(x=>x.length>12))throw Error('Exhaustive oracle only supports <=5 products, <=11 quantity choices per product.');
 let best=null,evaluated=0;
 function go(i,remainingBudget,remainingVolume,orders,objective){
  if(i===costCurves.length){evaluated++;if(!best||objective<best.objective-EPS)best={orders:[...orders],objective};return;}
  for(let q=0;q<costCurves[i].length;q++)if(q*unitCosts[i]<=remainingBudget+EPS&&q*unitStorage[i]<=remainingVolume+EPS){orders.push(q);go(i+1,remainingBudget-q*unitCosts[i],remainingVolume-q*unitStorage[i],orders,objective+costCurves[i][q]);orders.pop();}
 }
 go(0,budget,capacity,[],0);
 return {...best,evaluated,optimality:'global for the supplied one-period finite candidate curves only'};
}