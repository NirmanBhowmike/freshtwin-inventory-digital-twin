/* FreshTwin deterministic inventory research engine. No external dependencies.
 * All demonstration observations, inventory and costs are synthetic by default.
 */
export const SKUS = [
  { id:'SPN-014', name:'Baby Spinach', category:'Leafy greens', unit:'packs', demand:27, shelfLife:4, price:4.89, cost:2.45, shortage:4.8, holding:.12, disposal:.35, hue:'#7CC4A0', icon:'🥬' },
  { id:'BER-028', name:'Strawberries', category:'Berries', unit:'punnets', demand:23, shelfLife:3, price:5.59, cost:3.05, shortage:5.4, holding:.14, disposal:.5, hue:'#ED998F', icon:'🍓' },
  { id:'AVO-039', name:'Hass Avocados', category:'Fresh fruit', unit:'pieces', demand:31, shelfLife:6, price:2.39, cost:1.17, shortage:2.5, holding:.07, disposal:.22, hue:'#B7CC84', icon:'🥑' },
  { id:'MLK-051', name:'Organic Milk', category:'Dairy', unit:'cartons', demand:19, shelfLife:7, price:6.25, cost:3.4, shortage:5.9, holding:.12, disposal:.46, hue:'#A9C6E9', icon:'🥛' },
  { id:'TOM-062', name:'Cherry Tomatoes', category:'Produce', unit:'packs', demand:25, shelfLife:5, price:3.99, cost:1.93, shortage:4.0, holding:.11, disposal:.3, hue:'#EEB67E', icon:'🍅' },
];
export function rngFromSeed(seed=42){let a=(Math.floor(seed)>>>0)||1;return function(){a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function samplePoisson(lambda,rng){
  if(!(lambda>0))return 0;
  if(lambda>45){ const u1=Math.max(rng(),1e-12),u2=rng();const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);return Math.max(0,Math.round(lambda+Math.sqrt(lambda)*z)); }
  let k=0,p=1,L=Math.exp(-lambda);do{k++;p*=rng();}while(p>L);return k-1;
}
const mean = a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export function generateHistory(sku, seed=42){
 const r=rngFromSeed(seed+sku.id.split('').reduce((x,c)=>x+c.charCodeAt(0),0)*911);
 return Array.from({length:90},(_,i)=>{
  const seasonal=1+.13*Math.sin(i*2*Math.PI/7)+.055*Math.cos(i*2*Math.PI/30);
  const latent=samplePoisson(Math.max(1,sku.demand*seasonal),r);
  const stockCap=Math.max(1,Math.round(sku.demand*(.75+r()*.9)));
  const sales=Math.min(latent,stockCap);
  const stockout=latent>stockCap;
  const unavailableHours=stockout? Math.min(16,Math.max(1,Math.round(16*(latent-sales)/Math.max(latent,1)))):0;
  return {day:i+1,date:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10),sales, unavailableHours,availableFraction:1-unavailableHours/16,latentDemand:latent,kind:'synthetic'};
 });
}
/** Availability-adjustment estimator. Heuristic, not identified causal recovery. */
export function estimateDemand(rows, window=35){
 const recent=rows.slice(-window).filter(x=>Number.isFinite(x.sales)&&x.sales>=0);
 if(!recent.length)return {naive:0,corrected:0,censoredDays:0,uncertainty:0};
 const naive=mean(recent.map(r=>r.sales));
 const uncensored=recent.filter(r=>(r.unavailableHours||0)===0).map(r=>r.sales);
 const anchor=uncensored.length>=3?mean(uncensored):naive;
 const adjusted=recent.map(r=>{
  if(!(r.unavailableHours>0))return r.sales;
  const exposed=Math.max(.40,1-Math.min(16,r.unavailableHours)/16);
  return Math.max(r.sales,Math.min(anchor*1.85, .5*(r.sales/exposed)+.5*anchor));
 });
 return {naive,corrected:mean(adjusted),censoredDays:recent.filter(r=>r.unavailableHours>0).length, uncertainty:Math.sqrt(mean(adjusted.map(v=>(v-mean(adjusted))**2)))};
}
function takeFromBatches(batches, requested){
 let remaining=requested,sold=0;
 // Remaining shelf life lower => first expired first (FEFO)
 batches.sort((a,b)=>a.life-b.life);
 for(const b of batches){const n=Math.min(b.qty,remaining);b.qty-=n;remaining-=n;sold+=n;if(remaining===0)break;}
 return sold;
}
function optimizeOrder(sku, batches, pipeline, mu, day, settings, rng){
 const lead=settings.leadTime,life=Math.max(1,sku.shelfLife+settings.shelfLifeOffset);
 const horizon=Math.max(1,Math.min(life,lead+2));
 const usable=batches.filter(b=>b.life>lead).reduce((s,b)=>s+b.qty,0)
   + pipeline.filter(p=>p.day>day&&p.day<=day+lead+horizon).reduce((s,p)=>s+p.qty,0)*.60;
 const maxOrder=Math.ceil(Math.max(15,mu*2.6)),step=Math.max(1,Math.floor(maxOrder/35));
 const scenarioDemands=Array.from({length:96},()=>{
   let sum=0;for(let j=0;j<horizon;j++)sum+=samplePoisson(mu,rng);return sum;
 });
 let best=0,min=Infinity;
 for(let q=0;q<=maxOrder;q+=step){
   let total=0;
   for(const d of scenarioDemands){const shortage=Math.max(0,d-usable-q),leftover=Math.max(0,usable+q-d);
     total+=sku.shortage*settings.shortageWeight*shortage + (sku.disposal+.25*sku.cost)*leftover + sku.holding*leftover*horizon*.5;
   }
   // Purchase charge against full units; avoid crediting unsold order stock as profit.
   const score=total/scenarioDemands.length+sku.cost*q;
   if(score<min){min=score;best=q;}
 }
 return {quantity:best,objective:min,samples:scenarioDemands.length,optimality:'bounded grid-search approximation'};
}
function policyDecision(policy,sku,batches,pipeline,mu,day,settings,rng){
 const inventory=batches.reduce((s,b)=>s+b.qty,0);
 const incoming=pipeline.reduce((s,p)=>s+p.qty,0);
 const position=inventory+incoming;
 if(policy==='baseline')return {quantity:Math.max(0,Math.round(mu*(settings.leadTime+1.5)-position)),objective:null};
 if(policy==='corrected')return {quantity:Math.max(0,Math.round(mu*(settings.leadTime+1.5)-position)),objective:null};
 return optimizeOrder(sku,batches,pipeline,mu,day,settings,rng);
}
export function runPolicy(sku, history, settings={}, policy='adaptive', seed=42){
 const cfg={leadTime:settings.leadTime??1,shelfLifeOffset:settings.shelfLifeOffset??0,shortageWeight:settings.shortageWeight??1,demandMultiplier:settings.demandMultiplier??1,days:settings.days??28};
 const estimate=estimateDemand(history);
 const forecast=(policy==='baseline'?estimate.naive:estimate.corrected)*cfg.demandMultiplier;
 const r=rngFromSeed(seed+137),optRng=rngFromSeed(seed+9341+policy.length*17);
 const demandPath=settings.demandPath??Array.from({length:cfg.days},(_,t)=>samplePoisson(sku.demand*cfg.demandMultiplier*(1+.10*Math.sin(t*2*Math.PI/7)),r));
 const life=Math.max(1,sku.shelfLife+cfg.shelfLifeOffset);
 const opening=Math.max(1,Math.round(estimate.naive*(cfg.leadTime+1)));
 let batches=[{qty:opening,life}],pipeline=[],spent=0,revenue=0,holding=0,disposal=0,lostPenalty=0,unmet=0,totalDemand=0,totalSales=0,waste=0,totalOrders=0;
 const timeline=[];
 for(let day=0;day<cfg.days;day++){
   const arrived=pipeline.filter(p=>p.day===day).reduce((s,p)=>s+p.qty,0);
   pipeline=pipeline.filter(p=>p.day!==day);
   if(arrived)batches.push({qty:arrived,life});
   const demand=demandPath[day];totalDemand+=demand;
   const sales=takeFromBatches(batches,demand);totalSales+=sales;
   const missing=demand-sales;unmet+=missing;lostPenalty+=missing*sku.shortage*cfg.shortageWeight;revenue+=sales*sku.price;
   const inventoryBeforeExpiry=batches.reduce((s,b)=>s+b.qty,0);
   holding+=inventoryBeforeExpiry*sku.holding;
   for(const b of batches)b.life--;
   const expired=batches.filter(b=>b.life<=0).reduce((s,b)=>s+b.qty,0);
   waste+=expired;disposal+=expired*sku.disposal;
   batches=batches.filter(b=>b.qty>0&&b.life>0);
   const m=policyDecision(policy,sku,batches,pipeline,forecast,day,cfg,optRng);
   const order=m.quantity;
   if(order){const arrivalDay=day+cfg.leadTime+1;pipeline.push({qty:order,day:arrivalDay});spent+=order*sku.cost;totalOrders+=order;}
   timeline.push({day:day+1,demand,sales,missing,inventory:batches.reduce((s,b)=>s+b.qty,0),expired,arrived,order,stockout:missing>0});
 }
 const totalCost=spent+holding+disposal+lostPenalty;
 return {policy,forecast,estimate,metrics:{fillRate:totalDemand?totalSales/totalDemand:1,cost:totalCost,waste,unmet,orders:totalOrders,revenue,netValue:revenue-totalCost,holding,disposal,purchases:spent,shortagePenalty:lostPenalty},timeline,assumptions:cfg};
}
export function comparePolicies(sku, settings={}, seed=42, inputHistory=null){
 const history=inputHistory?.length?inputHistory:generateHistory(sku,seed);
 const cfg={days:28,...settings};
 const r=rngFromSeed(seed+137);
 const demandPath=Array.from({length:cfg.days},(_,i)=>samplePoisson(sku.demand*(cfg.demandMultiplier??1)*(1+.10*Math.sin(i*2*Math.PI/7)),r));
 const used={...cfg,demandPath};
 return {sku,history,estimate:estimateDemand(history),policies:['baseline','corrected','adaptive'].map(p=>runPolicy(sku,history,used,p,seed)),dataSource:inputHistory?.length?'user-supplied CSV':'synthetic illustrative data',seed};
}
export function monteCarlo(sku, settings={}, seed=42, trials=24, inputHistory=null){
 const history=inputHistory?.length?inputHistory:generateHistory(sku,seed);
 const out={};
 for(const policy of ['baseline','corrected','adaptive'])out[policy]=[];
 for(let i=0;i<trials;i++){
   const scenarioSeed=seed+1000+i*71;
   const runs=comparePolicies(sku,{...settings},scenarioSeed,history).policies;
   for(const p of runs)out[p.policy].push(p.metrics);
 }
 return Object.fromEntries(Object.entries(out).map(([policy,values])=>{
   const costs=values.map(x=>x.cost).sort((a,b)=>a-b);
   const tail=costs.slice(Math.floor(costs.length*.9));
   return [policy,{cost:mean(costs),fillRate:mean(values.map(x=>x.fillRate)),waste:mean(values.map(x=>x.waste)),cvar90:mean(tail),trials:values.length}];
 }));
}
/** User data must be explicitly supplied as physical-unit sales. No network/file persistence. */
export function parseUserCSV(csv,skuId){
 const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<9)throw Error('At least eight daily records are required.');
 const cols=lines[0].split(',').map(x=>x.trim().toLowerCase());
 const idx=key=>cols.indexOf(key);
 if(idx('date')<0||idx('sales')<0||idx('stockout_hours')<0)throw Error('Required headers: date,sales,stockout_hours (optional sku).');
 const arr=[];
 for(const [i,line] of lines.slice(1).entries()){
  if(!line.trim())continue;
  const cells=line.split(',').map(x=>x.trim());
  if(idx('sku')>=0&&cells[idx('sku')]!==skuId)continue;
  const date=cells[idx('date')],sales=Number(cells[idx('sales')]),stock=Number(cells[idx('stockout_hours')]);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(sales)||sales<0||!Number.isFinite(stock)||stock<0||stock>16)throw Error(`Invalid sales or stockout_hours in input row ${i+2}.`);
  arr.push({day:arr.length+1,date,sales,unavailableHours:stock,availableFraction:1-stock/16,kind:'user-supplied'});
 }
 if(arr.length<8)throw Error('Selected SKU needs at least eight valid daily records.');
 return arr.sort((a,b)=>a.date.localeCompare(b.date));
}