/** FreshTwin v0.4: deterministic, FEFO, cost-reconciled research simulation.
 * Historical benchmark values are NOT physical inventory or verified lost demand.
 * Scenario prices, stock ages, availability and demand process are assumed.
 */
export const SKUS = [
 {id:'SPN-014',name:'Baby Spinach',category:'Leafy greens',unit:'packs',demand:27,shelfLife:4,price:4.89,cost:2.45,shortage:4.8,holding:.12,disposal:.35,hue:'#7CC4A0',icon:'🥬'},
 {id:'BER-028',name:'Strawberries',category:'Berries',unit:'punnets',demand:23,shelfLife:3,price:5.59,cost:3.05,shortage:5.4,holding:.14,disposal:.5,hue:'#ED998F',icon:'🍓'},
 {id:'AVO-039',name:'Hass Avocados',category:'Fresh fruit',unit:'pieces',demand:31,shelfLife:6,price:2.39,cost:1.17,shortage:2.5,holding:.07,disposal:.22,hue:'#B7CC84',icon:'🥑'},
 {id:'MLK-051',name:'Organic Milk',category:'Dairy',unit:'cartons',demand:19,shelfLife:7,price:6.25,cost:3.4,shortage:5.9,holding:.12,disposal:.46,hue:'#A9C6E9',icon:'🥛'},
 {id:'TOM-062',name:'Cherry Tomatoes',category:'Produce',unit:'packs',demand:25,shelfLife:5,price:3.99,cost:1.93,shortage:4,holding:.11,disposal:.30,hue:'#EEB67E',icon:'🍅'}
];
export const MODEL_VERSION='0.4.0';
export function rngFromSeed(seed=42){let a=(Math.floor(seed)>>>0)||1;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const mean = a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const sum = a=>a.reduce((s,x)=>s+x,0);
function normal(rng){return Math.sqrt(-2*Math.log(Math.max(rng(),1e-12)))*Math.cos(2*Math.PI*rng());}
export function samplePoisson(lambda,rng){
 if(!(lambda>0))return 0;
 if(lambda>45)return Math.max(0,Math.round(lambda+Math.sqrt(lambda)*normal(rng)));
 let k=0,p=1,L=Math.exp(-lambda);do{k++;p*=rng();}while(p>L);return k-1;
}
/** Independent process variability (lognormal multiplicative noise) in addition to Poisson noise. */
export function sampleDemand(lambda,rng,variability=0){
 const sigma=Math.max(0,Math.min(1.5,Number(variability)||0));
 const factor=sigma?Math.exp(sigma*normal(rng)-sigma*sigma/2):1;
 return samplePoisson(Math.max(0,lambda*factor),rng);
}
export function generateHistory(sku,seed=42,stockFactor=1){
 const r=rngFromSeed(seed+sku.id.split('').reduce((x,c)=>x+c.charCodeAt(0),0)*911);
 return Array.from({length:90},(_,i)=>{
  const seasonal=1+.13*Math.sin(i*2*Math.PI/7)+.055*Math.cos(i*2*Math.PI/30);
  const latent=sampleDemand(Math.max(0,sku.demand*seasonal),r,sku.demandVariability??0);
  const cap=Math.max(0,Math.round(sku.demand*(.75+r()*.9)*stockFactor));
  const sales=Math.min(latent,cap);
  const out=latent>cap;
  const unavailableHours=out?Math.min(16,Math.max(1,Math.round(16*(latent-sales)/Math.max(latent,1)))):0;
  return {day:i+1,date:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10),sales,unavailableHours,availableFraction:1-unavailableHours/16,latentDemand:latent,kind:'synthetic-known-latent'};
 });
}
/** Bounded availability correction. A transparent heuristic; not real lost-demand identification. */
export function estimateDemand(rows,window=35){
 const recent=rows.slice(-window).filter(x=>Number.isFinite(x.sales)&&x.sales>=0);
 if(!recent.length)return {naive:0,corrected:0,censoredDays:0,uncertainty:0};
 const naive=mean(recent.map(x=>x.sales));
 const uncensored=recent.filter(x=>(x.unavailableHours||0)===0).map(x=>x.sales);
 const anchor=uncensored.length>=3?mean(uncensored):naive;
 const adjusted=recent.map(x=>{
  if(!(x.unavailableHours>0))return x.sales;
  const fraction=Math.max(.4,1-Math.min(16,x.unavailableHours)/16);
  return Math.max(x.sales,Math.min(anchor*1.85,.5*x.sales/fraction+.5*anchor));
 });
 const corrected=mean(adjusted);
 return {naive,corrected,censoredDays:recent.length-uncensored.length,uncertainty:Math.sqrt(mean(adjusted.map(x=>(x-corrected)**2))),sampleSize:recent.length,method:'bounded-exposure-heuristic'};
}
function consumeFEFO(batches,request){
 let left=Math.max(0,request),fulfilled=0;
 batches.sort((a,b)=>a.life-b.life);
 for(const batch of batches){const n=Math.min(left,batch.qty);batch.qty-=n;left-=n;fulfilled+=n;if(!left)break;}
 return fulfilled;
}
const inventory = batches=>sum(batches.map(x=>x.qty));
function advanceDay(batches,pipeline,day,demand,sku,life,shortageWeight){
 const opening=inventory(batches);
 const arrived=sum(pipeline.filter(p=>p.day===day).map(p=>p.qty));
 const due=pipeline.filter(p=>p.day!==day);
 if(arrived)batches.push({qty:arrived,life});
 const sales=consumeFEFO(batches,demand);
 const missing=demand-sales;
 const beforeExpiry=inventory(batches);
 const holding=beforeExpiry*sku.holding;
 for(const b of batches)b.life-=1;
 const expired=sum(batches.filter(b=>b.life<=0).map(b=>b.qty));
 const disposal=expired*sku.disposal;
 const closing=batches.filter(b=>b.life>0&&b.qty>0);
 const end=inventory(closing);
 if(opening+arrived-sales-expired!==end)throw Error('Daily inventory conservation failed');
 return {batches:closing,pipeline:due,opening,arrived,sales,missing,holding,expired,disposal,ending:end,shortagePenalty:missing*sku.shortage*shortageWeight};
}
function makeOpening(sku,estimate,cfg,life){
 const qty=Number.isInteger(sku.initialInventory)?sku.initialInventory:Math.max(0,Math.round(estimate.naive*(cfg.leadTime+1)));
 if(Array.isArray(sku.initialAgeDistribution)&&sku.initialAgeDistribution.length){
  const cohorts=sku.initialAgeDistribution.map(x=>({qty:Math.round(x.qty),life:Math.round(x.remainingLife??x.life)}));
  if(cohorts.some(x=>x.life<1||x.life>life||x.qty<0)||sum(cohorts.map(x=>x.qty))!==qty)throw Error('Initial age cohorts must reconcile to opening inventory and valid shelf lives.');
  return cohorts.filter(x=>x.qty>0);
 }
 const old=Math.round(qty*(sku.ageOldPercent??0)/100);
 return [{qty:qty-old,life},{qty:old,life:Math.max(1,Math.ceil(life/2))}].filter(x=>x.qty>0);
}
export function normalizeSettings(sku,settings={}){
 const cfg={days:settings.days??28,leadTime:settings.leadTime??sku.leadTime??1,shelfLifeOffset:settings.shelfLifeOffset??0,demandMultiplier:settings.demandMultiplier??1,shortageWeight:settings.shortageWeight??1};
 if(!Number.isInteger(cfg.days)||cfg.days<1||cfg.days>365)throw Error('Simulation horizon must be between 1 and 365 days.');
 if(!Number.isInteger(cfg.leadTime)||cfg.leadTime<0||cfg.leadTime>14)throw Error('Supplier lead time must be between 0 and 14 days.');
 if(!Number.isFinite(cfg.demandMultiplier)||cfg.demandMultiplier<0||cfg.demandMultiplier>4)throw Error('Demand intensity must be between 0 and 400%.');
 if(!Number.isFinite(cfg.shortageWeight)||cfg.shortageWeight<0||cfg.shortageWeight>20)throw Error('Shortage weight must be between 0 and 20.');
 return cfg;
}
/** Candidate score is an independent, scenario-sampled short-horizon rollout.
 * Objective matches the evaluated economic accounting: acquisition + holdings +
 * expiration disposal + shortage penalty - terminal cost-basis of usable/pipeline assets.
 * We do not claim global optimality for the full multi-period problem.
 */
export function orderScore(sku,batches,pipeline,quantity,mu,day,settings,paths){
 const cfg=normalizeSettings(sku,settings),life=Math.max(1,sku.shelfLife+cfg.shelfLifeOffset);
 const lookahead=Math.min(cfg.days-day-1,Math.max(life,cfg.leadTime+2),12);
 if(lookahead<=0)return 0;
 let cost=0;
 for(const path of paths){
  let b=batches.map(x=>({...x}));let p=pipeline.map(x=>({...x}));
  if(quantity>0)p.push({qty:quantity,day:day+cfg.leadTime+1});
  let variable=quantity*sku.cost;
  for(let t=0;t<lookahead;t++){
   const f=advanceDay(b,p,day+1+t,path[t],sku,life,cfg.shortageWeight);
   b=f.batches;p=f.pipeline;
   variable+=f.holding+f.disposal+f.shortagePenalty;
  }
  const endingAssets=inventory(b)+sum(p.map(x=>x.qty));
  variable-=endingAssets*sku.cost;
  cost+=variable;
 }
 return cost/Math.max(1,paths.length);
}
export function optimizeOrder(sku,batches,pipeline,mu,day,settings={},rng=rngFromSeed(1),options={}){
 const cfg=normalizeSettings(sku,settings),life=Math.max(1,sku.shelfLife+cfg.shelfLifeOffset);
 const lookahead=Math.min(cfg.days-day-1,Math.max(life,cfg.leadTime+2),12);
 if(lookahead<=cfg.leadTime)return {quantity:0,objective:0,samples:0,optimality:'no-arrival-within-remaining-horizon'};
 const sampleN=options.samples??20;
 const paths=Array.from({length:sampleN},()=>Array.from({length:lookahead},(_,j)=>sampleDemand(mu*(1+.10*Math.sin((day+1+j)*2*Math.PI/7)),rng,sku.demandVariability??0)));
 const upper=options.maxOrder??Math.min(250,Math.max(10,Math.ceil(mu*(life+cfg.leadTime+1)*1.1)));
 const step=options.exact?1:Math.max(1,Math.floor(upper/30));
 const candidates=new Set([0,upper]);for(let q=0;q<=upper;q+=step)candidates.add(q);
 let best=0,score=Infinity,evaluated=0;
 function evaluate(q){const objective=orderScore(sku,batches,pipeline,q,mu,day,cfg,paths);evaluated++;if(objective<score-1e-9||(Math.abs(objective-score)<=1e-9&&q<best)){best=q;score=objective;}}
 for(const q of [...candidates].sort((a,b)=>a-b))evaluate(q);
 if(step>1){const center=best;for(let q=Math.max(0,center-step+1);q<Math.min(upper,center+step);q++)if(!candidates.has(q))evaluate(q);}
 return {quantity:best,objective:score,samples:sampleN,candidates:evaluated,optimality:options.exact?'exact integer enumeration of sampled one-decision objective':'bounded sampled integer-search approximation'};
}
function policyDecision(policy,sku,batches,pipeline,forecast,day,cfg,optRng){
 const position=inventory(batches)+sum(pipeline.map(x=>x.qty));
 if(policy==='baseline'||policy==='corrected')return {quantity:Math.max(0,Math.round(forecast*(cfg.leadTime+1.5)-position))};
 return optimizeOrder(sku,batches,pipeline,forecast,day,cfg,optRng);
}
export function runPolicy(sku,history,settings={},policy='adaptive',seed=42){
 const cfg=normalizeSettings(sku,settings),estimate=estimateDemand(history);
 const forecast=Math.max(0,(policy==='baseline'?estimate.naive:estimate.corrected)*cfg.demandMultiplier);
 const r=rngFromSeed(seed+137),optRng=rngFromSeed(seed+9341);
 const demandPath=settings.demandPath??Array.from({length:cfg.days},(_,t)=>sampleDemand(Math.max(0,sku.demand*cfg.demandMultiplier*(1+.10*Math.sin(t*2*Math.PI/7))),r,sku.demandVariability??0));
 if(demandPath.length!==cfg.days||demandPath.some(x=>!Number.isInteger(x)||x<0))throw Error('Demand evaluation path must have nonnegative integer units and match the horizon.');
 const life=Math.max(1,sku.shelfLife+cfg.shelfLifeOffset);
 let batches=makeOpening(sku,estimate,cfg,life),pipeline=[];
 const initialAssets=inventory(batches)*sku.cost;
 let spent=0,revenue=0,holding=0,disposal=0,lostPenalty=0,unmet=0,totalDemand=0,totalSales=0,waste=0,totalOrders=0;
 const timeline=[];
 for(let day=0;day<cfg.days;day++){
  const demand=demandPath[day];totalDemand+=demand;
  const transition=advanceDay(batches,pipeline,day,demand,sku,life,cfg.shortageWeight);
  batches=transition.batches;pipeline=transition.pipeline;
  totalSales+=transition.sales;unmet+=transition.missing;revenue+=transition.sales*sku.price;
  holding+=transition.holding;disposal+=transition.disposal;lostPenalty+=transition.shortagePenalty;waste+=transition.expired;
  const decision=policyDecision(policy,sku,batches,pipeline,forecast,day,cfg,optRng);
  const order=Math.max(0,Math.round(decision.quantity));
  // Order at the end of this day; lead=0 arrives at the beginning of the NEXT day.
  if(order){pipeline.push({qty:order,day:day+cfg.leadTime+1});spent+=order*sku.cost;totalOrders+=order;}
  timeline.push({day:day+1,openingInventory:transition.opening,demand,sales:transition.sales,missing:transition.missing,inventory:transition.ending,expired:transition.expired,arrived:transition.arrived,order,stockout:transition.missing>0,ageCohorts:batches.map(b=>({remainingLife:b.life,qty:b.qty})),pipeline:pipeline.map(p=>({dueDay:p.day+1,qty:p.qty}))});
 }
 const closingInventory=inventory(batches),pipelineEnd=sum(pipeline.map(x=>x.qty));
 const terminalCredit=(closingInventory+pipelineEnd)*sku.cost;
 // Opening inventory and all paid orders are capitalized; usable ending inventory
 // and undelivered purchase orders are carried forward at cost (not expensed).
 const acquisitionNet=initialAssets+spent-terminalCredit;
 const totalCost=acquisitionNet+holding+disposal+lostPenalty;
 return {policy,forecast,estimate,metrics:{fillRate:totalDemand?totalSales/totalDemand:1,cost:totalCost,waste,unmet,orders:totalOrders,revenue,netValue:revenue-totalCost,holding,disposal,purchases:spent,shortagePenalty:lostPenalty,initialAssets,terminalCredit,acquisitionNet,closingInventory,pipelineEnd,totalSales,totalDemand},timeline,assumptions:cfg};
}
export function comparePolicies(sku,settings={},seed=42,inputHistory=null){
 const history=inputHistory?.length?inputHistory:generateHistory(sku,seed);
 const cfg=normalizeSettings(sku,settings),r=rngFromSeed(seed+137);
 // This evaluation scenario is generated from explicit assumed SKU demand, never
 // recovered lost demand from benchmark sales. It is a simulation, not field truth.
 const demandPath=Array.from({length:cfg.days},(_,i)=>sampleDemand(Math.max(0,sku.demand*cfg.demandMultiplier*(1+.10*Math.sin(i*2*Math.PI/7))),r,sku.demandVariability??0));
 const used={...cfg,demandPath};
 return {sku,history,estimate:estimateDemand(history),policies:['baseline','corrected','adaptive'].map(p=>runPolicy(sku,history,used,p,seed)),dataSource:inputHistory?.length?'supplied observation history':'synthetic illustrative data',seed,evaluation:'independent seeded assumed latent-demand scenario; observed benchmark lost sales unknown'};
}
export function monteCarlo(sku,settings={},seed=42,trials=24,inputHistory=null){
 if(!Number.isInteger(trials)||trials<2||trials>500)throw Error('Monte Carlo trials must be between 2 and 500');
 const history=inputHistory?.length?inputHistory:generateHistory(sku,seed),out={baseline:[],corrected:[],adaptive:[]};
 for(let i=0;i<trials;i++){
  const runs=comparePolicies(sku,settings,seed+1000+i*71,history).policies;
  for(const p of runs)out[p.policy].push(p.metrics);
 }
 const sampleCI=values=>{const m=mean(values),n=values.length,variance=n>1?sum(values.map(x=>(x-m)**2))/(n-1):0;return [m-1.96*Math.sqrt(variance/n),m+1.96*Math.sqrt(variance/n)];};
 const pairedBenefits=out.baseline.map((b,i)=>b.cost-out.adaptive[i].cost),pairedCI=sampleCI(pairedBenefits);
 return Object.fromEntries(Object.entries(out).map(([policy,values])=>{
  const costs=values.map(x=>x.cost).sort((a,b)=>a-b),tail=costs.slice(Math.floor(costs.length*.9));
  const cost=mean(costs),stdCost=Math.sqrt(sum(costs.map(x=>(x-cost)**2))/(costs.length-1));
  const costComponents={acquisitionNet:mean(values.map(x=>x.acquisitionNet)),holding:mean(values.map(x=>x.holding)),disposal:mean(values.map(x=>x.disposal)),shortagePenalty:mean(values.map(x=>x.shortagePenalty))};
  const orderedCosts=values.map(x=>x.cost);
  const checkpoints=[8,16,32,64,128,256,500,orderedCosts.length].filter((n,i,arr)=>n<=orderedCosts.length&&arr.indexOf(n)===i).sort((a,b)=>a-b);
  const convergence=checkpoints.map(n=>({trials:n,meanCost:mean(orderedCosts.slice(0,n))}));
  return [policy,{cost,fillRate:mean(values.map(x=>x.fillRate)),waste:mean(values.map(x=>x.waste)),cvar90:mean(tail),trials:values.length,stdCost,costComponents,convergence,costCI95:sampleCI(costs),pairedCostBenefit:policy==='adaptive'?{mean:mean(pairedBenefits),ci95:pairedCI}:null}];
 }));
}
/** Known-truth synthetic evaluation, entirely separate from the genuine benchmark. */
export function syntheticDemandValidation(sku,seed=42,scenarios=[.55,.85,1.15],repetitions=12){
 return scenarios.map(stockFactor=>{
  const errors=[];let censored=0;
  for(let trial=0;trial<repetitions;trial++){
   const hist=generateHistory(sku,seed+trial*101,stockFactor);
   const truth=mean(hist.map(x=>x.latentDemand));const estimate=estimateDemand(hist,90);
   errors.push({naive:Math.abs(estimate.naive-truth),corrected:Math.abs(estimate.corrected-truth)});
   censored+=estimate.censoredDays/90;
  }
  return {stockFactor,stockoutRate:censored/repetitions,naiveMAE:mean(errors.map(x=>x.naive)),correctedMAE:mean(errors.map(x=>x.corrected)),repetitions,scope:'synthetic known latent demand only'};
 });
}
export function parseUserCSV(csv,skuId){
 const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<9)throw Error('At least eight daily records are required.');
 const cols=lines[0].split(',').map(x=>x.trim().toLowerCase());const idx=k=>cols.indexOf(k);
 if(idx('date')<0||idx('sales')<0||idx('stockout_hours')<0)throw Error('Required headers: date,sales,stockout_hours (optional sku).');
 const arr=[];
 for(const [i,line] of lines.slice(1).entries()){
  if(!line.trim())continue;const cells=line.split(',').map(x=>x.trim());
  if(idx('sku')>=0&&cells[idx('sku')]!==skuId)continue;
  const date=cells[idx('date')],sales=Number(cells[idx('sales')]),stock=Number(cells[idx('stockout_hours')]);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(sales)||sales<0||!Number.isFinite(stock)||stock<0||stock>16)throw Error(`Invalid sales or stockout_hours in input row ${i+2}.`);
  arr.push({day:arr.length+1,date,sales,unavailableHours:stock,availableFraction:1-stock/16,kind:'user-supplied'});
 }
 if(arr.length<8)throw Error('Selected SKU needs at least eight valid daily records.');
 return arr.sort((a,b)=>a.date.localeCompare(b.date));
}