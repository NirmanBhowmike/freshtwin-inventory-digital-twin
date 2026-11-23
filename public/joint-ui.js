/** FreshTwin v0.5 interactive coupled store lab. No network, no paid model key. */
import {VEGETABLES} from './vegetables.js';
import {compareJoint,jointMonteCarlo,JOINT_LABELS} from './joint.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const num=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const usd=(n,d=0)=>`${n<0?'−':''}$${num(Math.abs(n),d)}`;
const pct=n=>`${num(n*100,1)}%`;
const safe=x=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const colors={sales:'#abc2b4',corrected:'#83bed0',joint:'#23ae88'};
const names={sales:'Recorded-sales',corrected:'Stockout-adjusted',joint:'Joint constrained search'};
const state={active:false,seed:42,day:1,trials:12,selected:VEGETABLES.map(x=>x.id),source:VEGETABLES.slice(),settings:{days:21,capacity:310,budget:5500,demandMultiplier:1,scenarioSamples:10,searchSteps:12},run:null,mc:null,dirty:true};
const selectedProducts=()=>state.source.filter(x=>state.selected.includes(x.id));
function status(message,error=false){const el=$('#jointStatus');if(!el)return;el.textContent=message;el.classList.toggle('error',error);}
function updateTrialLabel(){const controls=[['jointBudget',v=>usd(v)],['jointCapacity',v=>num(v,0)+' volume units'],['jointDemand',v=>num(v/100,2)+'×'],['jointTrials',v=>`${v} paired trials`]];for(const [id,formatter] of controls){const out=$('#'+id+'Value');if(out)out.textContent=formatter(Number($('#'+id).value));}}
function renderSelections(){
 $('#jointProducts').innerHTML=state.source.map(x=>{
  const enabled=state.selected.includes(x.id);
  return `<label class="joint-product ${enabled?'active':''}"><input type="checkbox" data-joint-sku="${safe(x.id)}" ${enabled?'checked':''} /><span class="joint-produce-icon" style="--joint-hue:${x.hue}">${x.icon}</span><span><strong>${safe(x.name)}</strong><small>${safe(x.id)} · ${x.shelfLife}d life · ${num(x.storage,2)} space/unit</small></span><span class="joint-check">${enabled?'✓':'+'}</span></label>`;
 }).join('');
 $('#jointSelectedCount').textContent=`${state.selected.length} selected · one illustrative store`;
 $$('[data-joint-sku]').forEach(el=>el.addEventListener('change',()=>{
  const chosen=$$('[data-joint-sku]:checked').map(x=>x.dataset.jointSku);
  if(chosen.length===0){el.checked=true;status('Select at least one vegetable.',true);return;}
  state.selected=chosen;state.run=null;state.mc=null;state.dirty=true;renderSelections();markDirty();
 }));
}
function markDirty(){state.dirty=true;$('#jointExport').disabled=true;$('#jointExportLedger').disabled=true;$('#jointRerunHint').hidden=false;status('Scenario inputs changed. Run the coupled simulation to calculate fresh results.');}
function settingsFromUI(){
 state.settings={...state.settings,budget:Number($('#jointBudget').value),capacity:Number($('#jointCapacity').value),days:Number($('#jointDays').value),demandMultiplier:Number($('#jointDemand').value)/100};
 state.seed=Math.max(1,Math.min(999999,Math.floor(Number($('#jointSeed').value)||42)));state.trials=Number($('#jointTrials').value);
 updateTrialLabel();
}
function svgLine(series,{width=840,height=242,maxY=null,label='Measured simulated capacity'}={}){
 const padding={left:43,right:15,top:18,bottom:30},W=width-padding.left-padding.right,H=height-padding.top-padding.bottom;
 const n=series[0]?.values.length||1,upper=Math.max(1,maxY??Math.max(1,...series.flatMap(s=>s.values)));
 const x=i=>padding.left+i*Math.max(0,W)/Math.max(1,n-1),y=v=>padding.top+H*(1-v/upper);
 let s=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(label)}" preserveAspectRatio="xMidYMid meet">`;
 for(let i=0;i<=4;i++){const tick=upper*i/4,Y=y(tick);s+=`<line x1="${padding.left}" y1="${Y}" x2="${width-padding.right}" y2="${Y}" stroke="#deebe3" stroke-dasharray="3 5"/><text x="${padding.left-6}" y="${Y+4}" text-anchor="end" fill="#7a9788" font-size="11">${num(tick)}</text>`;}
 for(let d=0;d<Math.min(n,5);d++){const index=Math.round(d*(n-1)/Math.max(1,Math.min(n,5)-1));s+=`<text x="${x(index)}" y="${height-9}" text-anchor="middle" fill="#839f90" font-size="11">D${index+1}</text>`;}
 for(const v of series){const d=v.values.map((value,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');s+=`<path d="${d}" fill="none" stroke="${v.color}" stroke-width="${v.thickness||2.8}" stroke-linecap="round" stroke-linejoin="round"/>`;}
 return s+'</svg>';
}
function moneyBars(summary){
 const entries=Object.entries(summary);const lo=Math.min(...entries.map(([,m])=>m.cost),0),max=Math.max(...entries.map(([,m])=>m.cost),1);
 return entries.map(([p,m])=>`<div class="joint-bar-row"><div class="joint-bar-meta"><strong>${names[p]}</strong><span>${usd(m.cost)}</span></div><div class="joint-bar-track"><span style="width:${Math.max(1,100*(m.cost-lo)/(max-lo+1e-6)).toFixed(1)}%;background:${colors[p]}"></span></div><small>${pct(m.fillRate)} service · ${num(m.expired,1)} average expired units</small></div>`).join('');
}
function renderOverview(){
 const main=state.run.policies.find(x=>x.policy==='joint'),m=main.metrics,mc=state.mc;
 const c=mc.byPolicy,rank=[...Object.entries(c)].sort((a,b)=>a[1].cost-b[1].cost),lowest=rank[0];
 const highest=[...Object.entries(c)].sort((a,b)=>b[1].fillRate-a[1].fillRate)[0];
 const baseline=c.sales,diff=c.joint.cost-baseline.cost;
 $('#jointMetrics').innerHTML=[
  ['Joint policy modeled cost',usd(c.joint.cost),'Mean across paired scenarios','joint-metric-green'],
  ['Inventory fill rate',pct(c.joint.fillRate),'Units fulfilled / latent demand',''],
  ['Expected expired units',num(c.joint.expired,1),'FEFO model · per evaluation','joint-metric-peach'],
  ['Budget used',pct(m.capitalBudgetUsed),`${usd(m.purchases)} of ${usd(state.settings.budget)}`,''],
  ['Highest reserved storage',`${num(m.peakCapacity,1)} / ${num(state.settings.capacity)}`,'On-hand plus all committed inbound units',''],
  ['Paired cost difference',`${diff>=0?'+':'−'}${usd(Math.abs(diff))}`,'Joint minus recorded-sales baseline','joint-metric-purple']
 ].map(([title,value,note,extra])=>`<article class="joint-metric ${extra}"><small>${safe(title)}</small><strong>${safe(value)}</strong><span>${safe(note)}</span></article>`).join('');
 $('#jointCostBars').innerHTML=moneyBars(c);
 $('#jointPolicySummary').innerHTML=`<strong>Lowest modeled mean cost: ${safe(names[lowest[0]])}.</strong> Highest modeled fill rate: ${safe(names[highest[0]])}. The coupled method averages ${usd(c.joint.cost)} compared with ${usd(c.sales.cost)} for the sales baseline, a ${diff>=0?'higher':'lower'} cost of ${usd(Math.abs(diff))}. It is not assumed to be best under every objective or parameter setting.`;
 const paired=mc.pairedSavings;
 $('#jointInference').textContent=`${mc.trials} common-demand Monte Carlo trials. Recorded-sales minus joint cost: ${usd(paired.mean)} average difference; approximate 95% paired interval ${usd(paired.ci95[0])} to ${usd(paired.ci95[1])}. ${paired.ci95[0]<=0&&paired.ci95[1]>=0?'The interval crosses zero under the modeled scenarios.':'The interval does not cross zero under the assumed scenario distribution.'} CVaR90 uses a small worst-tail sample and is unstable at low trial counts.`;
 $('#jointResearchTable tbody').innerHTML=Object.entries(c).map(([p,v])=>`<tr><td><strong>${safe(names[p])}</strong></td><td>${usd(v.cost)}</td><td>${pct(v.fillRate)}</td><td>${num(v.expired,1)}</td><td>${usd(v.cvar90)}</td><td>${num(v.daysCapacityBinding,1)} / ${num(v.daysBudgetBinding,1)}</td></tr>`).join('');
 const tl=main.timeline;
 $('#jointCapacityPlot').innerHTML=svgLine([
  {values:tl.map(x=>x.reservedCapacity),color:'#25ae88',thickness:3.4},
  {values:tl.map(()=>state.settings.capacity),color:'#ef9a71',thickness:1.7}],{maxY:state.settings.capacity*1.1,label:'Shared refrigerated capacity utilization over 21 simulated days and capacity ceiling'});
 $('#jointCapacityCaption').textContent=`The green line is conservative reserved capacity including pending arrivals; orange is the hard volume limit. Peak ${num(m.peakCapacity,1)} / ${num(state.settings.capacity)}. The model never accepts orders exceeding that limit.`;
 $('#jointBudgetPlot').innerHTML=svgLine([
  {values:tl.map(x=>x.totalCommittedPurchases),color:'#409cc1',thickness:3.5},
  {values:tl.map(()=>state.settings.budget),color:'#e5b16f',thickness:1.7}],{maxY:state.settings.budget*1.1,label:'Cumulative committed purchases over the entire planning horizon and global budget limit'});
 $('#jointBudgetCaption').textContent=`The blue line tracks cumulative committed purchasing cost. This is a TOTAL ${state.settings.days}-day budget, not a daily limit. No policy may spend beyond ${usd(state.settings.budget)}.`;
 const bestCost=Math.min(...Object.values(c).map(x=>x.cost));
 $('#jointScientificReading').innerHTML=`<strong>Decision reading</strong><p>The joint heuristic provides ${pct(c.joint.fillRate)} average fulfillment with ${num(c.joint.expired,1)} units expiring per run. Its mean cost ranks ${Object.values(c).filter(x=>x.cost< c.joint.cost-1e-6).length+1} of 3 policies under the explicit illustrative penalties and credits. ${diff>0?'The coupled allocation costs more than the simple baseline under these assumptions; this is a legitimate research result, not an implementation error.':'It costs less under these assumptions, but these simulated differences are not measured store savings.'} Budget and capacity constraints apply identically to all policies. The ten named vegetables belong to one synthetic store; no anonymized benchmark products have been relabeled.</p>`;
 renderDay();
}
function renderDay(){
 if(!state.run)return;
 const joint=state.run.policies.find(x=>x.policy==='joint'),r=joint.timeline[state.day-1];
 $('#jointDayTitle').textContent=`Day ${String(state.day).padStart(2,'0')} / ${joint.timeline.length}`;
 $('#jointDaySlider').max=joint.timeline.length;$('#jointDaySlider').value=state.day;
 $('#jointDayStats').innerHTML=[['Demand',r.demand],['Fulfilled',r.sales],['Lost',r.lost],['Expired',r.expired],['Ordered',r.orders],['Budget left',usd(r.remainingBudget)]].map(([label,value])=>`<div><small>${safe(label)}</small><strong>${safe(value)}</strong></div>`).join('');
 $('#jointDailyTable tbody').innerHTML=r.products.map(p=>`<tr><td>${safe(p.name)}</td><td>${num(p.opening)}</td><td>${num(p.arrived)}</td><td>${num(p.demand)}</td><td>${num(p.sold)}</td><td>${num(p.lost)}</td><td>${num(p.expired)}</td><td>${num(p.closing)}</td><td><strong>${num(p.ordered)}</strong></td></tr>`).join('');
 $('#jointDayNote').textContent=`Day ${state.day}: ${num(r.orders)} total ordered across ${r.products.length} vegetables, ${usd(r.orderCost)} committed, ${num(r.reservedCapacity,1)} volume reserved out of ${num(state.settings.capacity)}. Constraints: ${r.bindBudget?'budget near binding':'budget slack'}, ${r.bindCapacity?'storage near binding':'storage slack'}. Orders become receivable after each SKU-specific supplier lead time.`;
 $('#jointLedger tbody').innerHTML=joint.timeline.map(x=>`<tr class="${x.day===state.day?'joint-active-row':''}"><td>${x.day}</td><td>${num(x.demand)}</td><td>${num(x.sales)}</td><td>${num(x.lost)}</td><td>${num(x.expired)}</td><td>${num(x.orders)}</td><td>${usd(x.orderCost)}</td><td>${num(x.reservedCapacity,1)}</td><td>${usd(x.remainingBudget)}</td></tr>`).join('');
}
function save(filename,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),800);}
function exportResult(){const json={project:'FreshTwin',version:'0.5.0',module:'joint-synthetic-store',dataScope:'All selected SKUs are illustrative vegetables from ONE synthetic store; never independently sampled real retailers.',source:state.source.filter(x=>state.selected.includes(x.id)).map(x=>({...x})),scenario:state.settings,seed:state.seed,simulation:state.run,monteCarlo:state.mc,limitations:['Not a connected physical-store digital twin','No real retailer shelf-life, costs or on-hand counts','Limited sampled heuristic; no global multi-period optimality certificate','Tail risk and confidence intervals are simulation estimates']};save('freshtwin-v05-joint-replenishment-results.json',JSON.stringify(json,null,2),'application/json');status('Reproducible research JSON downloaded.');}
function exportLedger(){const t=state.run.policies.find(x=>x.policy==='joint').timeline;
 const s=['day,demand,sales,lost,expired,orders,order_cost,reserved_volume,remaining_budget',...t.map(x=>[x.day,x.demand,x.sales,x.lost,x.expired,x.orders,x.orderCost.toFixed(2),x.reservedCapacity.toFixed(2),x.remainingBudget.toFixed(2)].join(','))].join('\n');save('freshtwin-v05-shared-store-ledger.csv',s,'text/csv');status('Joint store ledger CSV downloaded.');}
async function run(){
 settingsFromUI();const skus=selectedProducts();
 $('#jointRun').disabled=true;$('#jointStatus').setAttribute('aria-busy','true');status(`Calculating ${skus.length} SKUs with ${state.trials} paired Monte Carlo trials…`);
 // yield to paint loading state; all calculations remain deterministic and local
 await new Promise(resolve=>setTimeout(resolve,25));
 try{
  const result=compareJoint(skus,state.settings,state.seed,0);
  const stats=jointMonteCarlo(skus,state.settings,state.seed,state.trials);
  state.run=result;state.mc=stats;state.day=1;state.dirty=false;
  $('#jointRerunHint').hidden=true;$('#jointExport').disabled=false;$('#jointExportLedger').disabled=false;
  renderOverview();
  const c=stats.byPolicy;
  status(`Scenario complete · ${skus.length} vegetables · ${state.settings.days} days · ${state.trials} matched stochastic trials. Lowest modeled cost: ${names[Object.keys(c).sort((a,b)=>c[a].cost-c[b].cost)[0]]}.`);
 }catch(e){status(`Scenario invalid: ${e.message}`,true);}
 finally{$('#jointRun').disabled=false;$('#jointStatus').setAttribute('aria-busy','false');}
}
function init(){
 if(!$('#joint'))return;
 renderSelections();updateTrialLabel();
 ['jointBudget','jointCapacity','jointDemand','jointDays','jointTrials','jointSeed'].forEach(id=>$('#'+id).addEventListener('input',()=>{updateTrialLabel();markDirty();}));
 $('#jointRun').addEventListener('click',run);
 $('#jointReset').addEventListener('click',()=>{state.seed=42;state.trials=12;state.settings={days:21,capacity:310,budget:5500,demandMultiplier:1,scenarioSamples:10,searchSteps:12};state.selected=state.source.map(x=>x.id);for(const [id,value] of [['jointBudget',5500],['jointCapacity',310],['jointDemand',100],['jointDays',21],['jointTrials',12],['jointSeed',42]])$('#'+id).value=value;renderSelections();updateTrialLabel();markDirty();});
 $('#jointPrevDay').addEventListener('click',()=>{state.day=Math.max(1,state.day-1);renderDay();});
 $('#jointNextDay').addEventListener('click',()=>{state.day=Math.min(state.run?.policies[0].timeline.length||21,state.day+1);renderDay();});
 $('#jointDaySlider').addEventListener('input',e=>{state.day=Number(e.target.value);renderDay();});
 $('#jointExport').addEventListener('click',exportResult);$('#jointExportLedger').addEventListener('click',exportLedger);
 window.addEventListener('freshtwin:vegetables-updated',event=>{const skus=event.detail?.skus;if(!Array.isArray(skus)||skus.length!==10)return;state.source=skus;renderSelections();markDirty();});
 window.addEventListener('hashchange',()=>{if(location.hash==='#joint'&&!state.active){state.active=true;run();}});
 if(location.hash==='#joint'){state.active=true;run();}
}
init();