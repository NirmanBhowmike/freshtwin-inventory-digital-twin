import {SKUS,MODEL_VERSION,generateHistory,comparePolicies,monteCarlo,parseUserCSV,syntheticDemandValidation} from './engine.js';
import {VEGETABLES,validateVegetable} from './vegetables.js';
import {createWorkspace} from './workspace.js';
import {parseCatalog,decodeSeries,buildScenarioSku,toScenarioHistory,pseudoStockoutBacktest,categoryLabel,filterCatalog,formatId,BENCHMARK_URL,MODEL_INDEX_MULTIPLIER} from './empirical.js';
const $=(selector)=>document.querySelector(selector);
const $$=(selector)=>Array.from(document.querySelectorAll(selector));
const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const money=n=>'$'+fmt(n,0), pct=n=>(n*100).toFixed(1)+'%';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={mode:'vegetable',vegOverrides:{},sku:VEGETABLES[0],seed:42,settings:{leadTime:VEGETABLES[0].leadTime,shelfLifeOffset:0,demandMultiplier:1,shortageWeight:1,days:28},history:null,comparison:null,experiment:null,trials:24,day:1,dirty:false,loading:false,loadedCSV:null,catalog:null,benchmarkHistory:null,currentRecord:null,currentRows:null,loadToken:0,catalogLimit:12,catalogFilter:{search:"",group:"all",sort:"id"}};
let workspace=null;
const names={baseline:'Observed-sales baseline',corrected:'Stockout-aware reorder point',adaptive:'Freshness-aware optimizer'};
const tones={baseline:'#a1b5ad',corrected:'#72c8b2',adaptive:'#159f80'};
let toastHandle=null;
function toast(msg){const node=$('#toast');node.textContent=msg;node.classList.add('show');clearTimeout(toastHandle);toastHandle=setTimeout(()=>node.classList.remove('show'),3000);}
function svgLineChart(series,width=700,height=236){
 const L=42,R=14,T=14,B=31;const W=width-L-R,H=height-T-B;
 const maxima=series.flatMap(s=>s.data).filter(Number.isFinite);const maxY=Math.max(10,...maxima)*1.15;
 const x=i=>L+i/(Math.max(1,series[0].data.length-1))*W;const y=v=>T+H-(v/maxY)*H;
 const ticks=Array.from({length:5},(_,i)=>Math.round(maxY*i/4));
 let html=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily simulated ending inventory, demand and incoming replenishment"><defs><linearGradient id="mintFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#25ae8d" stop-opacity=".18"/><stop offset="1" stop-color="#25ae8d" stop-opacity="0"/></linearGradient></defs>`;
 ticks.forEach(v=>{html+=`<line x1="${L}" y1="${y(v)}" x2="${width-R}" y2="${y(v)}" stroke="#e9efeb" stroke-dasharray="3 4"/><text x="${L-10}" y="${y(v)+4}" font-size="10" text-anchor="end" fill="#91a39b">${v}</text>`});
 [1,7,14,21,28].forEach(day=>html+=`<text x="${x(day-1)}" y="${height-9}" font-size="10" text-anchor="middle" fill="#91a39b">D${day}</text>`);
 for(const s of series){const pts=s.data.map((v,i)=>[x(i),y(v)]);const path=pts.map(([a,b],i)=>`${i?'L':'M'}${a.toFixed(2)} ${b.toFixed(2)}`).join(' ');if(s.fill)html+=`<path d="${path} L${x(s.data.length-1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="url(#mintFill)"/>`;html+=`<path d="${path}" stroke="${s.color}" stroke-width="${s.fill?3:2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;}
 return html+'</svg>';
}
function refresh(){
 state.history=state.loadedCSV||(state.mode==='benchmark'?state.benchmarkHistory:null)||generateHistory(state.sku,state.seed);
 state.comparison=comparePolicies(state.sku,state.settings,state.seed,state.history);
 state.experiment=monteCarlo(state.sku,state.settings,state.seed,state.trials,state.history);
 state.dirty=false;const dirty=$('#dirtyResults');if(dirty)dirty.hidden=true;
 $('#exportBtn').disabled=state.loading;$('#ledgerExportBtn').disabled=state.loading;
 $('#sideDataMode').textContent=state.loadedCSV?'Imported CSV':state.mode==='benchmark'?'FreshRetailNet':'Vegetable demo';
 $('#dataBadge').textContent=state.loadedCSV?'IMPORTED CSV':state.mode==='benchmark'?'FRESHRETAILNET-50K':'VEGETABLE DEMONSTRATION';
 workspace?.render();
 updateSourceStatus();renderObservedHistory();
 renderOverview();renderInventory();renderExperiment();
}
function selectStoreSku(id){
 if(id.startsWith('FRN-')){setMode('benchmark',Number(id.slice(4)));return;}
 if(state.mode==='vegetable'){selectVegetable(id);return;}
 const found=SKUS.find(x=>x.id===id);if(!found)return;
 state.sku=found;state.loadedCSV=null;state.day=1;$('#skuSelect').value=id;$('#importMessage').textContent='';refresh();
}
function renderStoreGrid(){
 if(state.mode==='vegetable'){
   $('#storeCountBadge').textContent='10 NAMED VEGETABLES · ILLUSTRATIVE';
   $('#storeGrid').innerHTML=VEGETABLES.map(v=>{
     const sk=state.vegOverrides[v.id]||v,active=sk.id===state.sku.id;
     return `<button type="button" class="store-card ${active?'selected':''}" data-store-sku="${sk.id}" aria-pressed="${active}"><span class="store-card-top"><span class="store-product-icon" style="--product-color:${sk.hue}">${sk.icon}</span><span class="store-signal good"><i></i> SIMULATED</span></span><span class="store-product-name">${escapeHTML(sk.name)}</span><span class="store-product-category">${escapeHTML(sk.category)} · ${sk.shelfLife}-day shelf life</span><span class="store-capacity"><span style="width:${Math.min(100,sk.initialInventory/Math.max(1,sk.demand*3)*100)}%"></span></span><span class="store-product-foot"><span><strong>${fmt(sk.initialInventory)}</strong> opening units</span><strong>${fmt(sk.demand)}/day assumption</strong></span></button>`;
   }).join('');
   $('[data-store-sku]').forEach(btn=>btn.addEventListener('click',()=>selectVegetable(btn.dataset.storeSku)));
   return;
 }
 if(state.catalog?.catalog?.length){
  const cat=state.catalog.catalog, selected=state.currentRecord;
  const related=selected?[selected,...cat.filter(x=>x.category[0]===selected.category[0]&&x.id!==selected.id).slice(0,7)]:cat.slice(0,8);
  $('#storeCountBadge').textContent=`${cat.length} REAL PRODUCT IDS`;
  $('#storeGrid').innerHTML=related.map(r=>`<button type="button" class="store-card ${r.id===selected?.id?'selected':''}" data-benchmark-product="${r.id}" aria-pressed="${r.id===selected?.id}"><span class="store-card-top"><span class="store-product-icon" style="--product-color:#c6e7d5">▦</span><span class="store-signal ${r.stockoutDays>20?'amber':'good'}"><i></i> ${r.stockoutDays} STOCKOUT DAYS</span></span><span class="store-product-name">Product ${formatId(r.id)}</span><span class="store-product-category">${categoryLabel(r)} · Store ${r.store}</span><span class="store-capacity"><span style="width:${Math.min(100,r.stockoutDays/90*100).toFixed(1)}%;background:#ecb185"></span></span><span class="store-product-foot"><span><strong>${fmt(r.meanSale,2)}</strong> normalized sales/day</span><strong>Open history ↗</strong></span></button>`).join('');
  $$('[data-benchmark-product]').forEach(btn=>btn.addEventListener('click',()=>selectBenchmarkProduct(Number(btn.dataset.benchmarkProduct))));
  return;
 }
 $('#storeCountBadge').textContent='5 EXAMPLE PRODUCTS';
 const cards=SKUS.map((sku,index)=>{
  const c=(sku.id===state.sku.id)?state.comparison:comparePolicies(sku,state.settings,state.seed+index*19);
  const t=c.policies[2].timeline;
  const x=t[t.length-1],m=c.policies[2].metrics;
  const normal=Math.max(1,Math.round(sku.demand*(state.settings.leadTime+1)));
  const level=Math.min(100,Math.max(0,x.inventory/normal*100));
  const life=Math.max(1,sku.shelfLife+state.settings.shelfLifeOffset);
  const risk=m.unmet>0?'SHORTAGE OBSERVED':m.waste>0?'WASTE OBSERVED':'NO LOSS OBSERVED';
  const severity=m.unmet>0?'amber':m.waste>0?'blue':'good';
  return `<button type="button" class="store-card ${sku.id===state.sku.id?'selected':''}" data-store-sku="${sku.id}" aria-pressed="${sku.id===state.sku.id}"><span class="store-card-top"><span class="store-product-icon" style="--product-color:${sku.hue}">${sku.icon}</span><span class="store-signal ${severity}"><i></i> ${risk}</span></span><span class="store-product-name">${escapeHTML(sku.name)}</span><span class="store-product-category">${escapeHTML(sku.category)} · ${life}-day shelf life</span><span class="store-capacity"><span style="width:${level.toFixed(1)}%"></span></span><span class="store-product-foot"><span><strong>${fmt(x.inventory)}</strong> units on hand · Day 28</span><strong>${pct(m.fillRate)} filled</strong></span></button>`;
 }).join('');
 $('#storeGrid').innerHTML=cards;
 $$('[data-store-sku]').forEach(btn=>btn.addEventListener('click',()=>selectStoreSku(btn.dataset.storeSku)));
}
function renderFlowLaboratory(row){
 const stages=[
  {icon:'↓',label:'RECEIVED',qty:row.arrived,sub:'units arrived'},
  {icon:'↗',label:'FULFILLED',qty:row.sales,sub:'units sold'},
  {icon:'⚠',label:'LOST DEMAND',qty:row.missing,sub:'unmet units'},
  {icon:'⌛',label:'EXPIRED',qty:row.expired,sub:'discarded units'},
  {icon:'→',label:'ORDERED',qty:row.order,sub:'future arrivals'}
 ];
 $('#flowDayTag').textContent=`DAY ${String(row.day).padStart(2,'0')}`;
 $('#flowStages').innerHTML=stages.map((x,i)=>`<div class="flow-stage ${i===2&&x.qty?'alert':''}"><span class="flow-stage-icon">${x.icon}</span><span class="flow-stage-label">${x.label}</span><strong>${fmt(x.qty)}</strong><small>${x.sub}</small></div>`).join('');
 const cohorts=[...row.ageCohorts].sort((a,b)=>a.remainingLife-b.remainingLife);
 const total=cohorts.reduce((n,x)=>n+x.qty,0);
 $('#batchTotal').textContent=`${total} units across ${cohorts.length} cohort${cohorts.length===1?'':'s'}`;
 $('#batchDistribution').innerHTML=cohorts.length?cohorts.map((x,i)=>`<div class="batch-segment" style="flex:${Math.max(.001,x.qty)};background:${x.remainingLife<=1?'#f9c1a1':x.remainingLife<=2?'#f4d98e':i%2?'#80d5b1':'#37af8a'}" title="${x.qty} units · ${x.remainingLife} days remaining"><span>${x.qty}</span></div>`).join(''):'<div class="batch-empty">No stock remaining at close of day</div>';
 const legend=cohorts.map(x=>`<span><i class="batch-dot ${x.remainingLife<=1?'hot':'cool'}"></i> ${x.qty} units · ${x.remainingLife} day${x.remainingLife===1?'':'s'} left</span>`).join('');
 const pipeline=row.pipeline.reduce((sum,x)=>sum+x.qty,0);
 $('#pipelineSummary').innerHTML=`<div class="batch-legend">${legend||'<span>All batches consumed or expired.</span>'}</div><div class="pipeline-note"><strong>${pipeline} units</strong> currently on order ${row.pipeline.length?'· arrives on day '+row.pipeline.map(x=>x.dueDay).join(', day '):'· no pending receipts'}</div>`;
}
function renderTradeoff(){
 const e=state.experiment,items=Object.entries(e),maxWaste=Math.max(1,...items.map(([,p])=>p.waste))*1.35;
 const minFill=Math.max(0,Math.min(...items.map(([,p])=>p.fillRate))-.04),maxFill=Math.min(1,Math.max(...items.map(([,p])=>p.fillRate))+.04);
 const w=740,h=250,left=69,right=32,top=24,bottom=48;
 const fx=v=>left+v/maxWaste*(w-left-right),fy=v=>top+(maxFill-v)/Math.max(.02,maxFill-minFill)*(h-top-bottom);
 let out=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Scatter plot comparing mean expired units and fulfillment rates for three replenishment policies"><rect x="${left}" y="${top}" width="${w-left-right}" height="${h-top-bottom}" rx="12" fill="#f5faf7"/>`;
 for(let i=0;i<=4;i++){const y=top+(h-top-bottom)*i/4;out+=`<line x1="${left}" y1="${y}" x2="${w-right}" y2="${y}" stroke="#e1eae4"/><text x="${left-11}" y="${y+4}" font-size="11" text-anchor="end" fill="#718d7d">${((maxFill-(maxFill-minFill)*i/4)*100).toFixed(0)}%</text>`;}
 for(let i=0;i<=4;i++){const x=left+(w-left-right)*i/4;out+=`<text x="${x}" y="${h-20}" font-size="11" text-anchor="middle" fill="#718d7d">${(maxWaste*i/4).toFixed(0)}</text>`;}
 out+=`<text x="${(left+w-right)/2}" y="${h-3}" font-size="12" text-anchor="middle" fill="#597969">Mean units expired per trial →</text>`;
 for(const [key,p] of items){const x=fx(p.waste),y=fy(p.fillRate);out+=`<circle cx="${x}" cy="${y}" r="12" fill="${tones[key]}" stroke="#fff" stroke-width="4"><title>${names[key]}: ${p.waste.toFixed(1)} expired units, ${(p.fillRate*100).toFixed(1)}% fill rate</title></circle><text x="${x+17}" y="${y+4}" font-size="11" font-weight="700" fill="#355b4c">${key==='baseline'?'Sales baseline':key==='corrected'?'Corrected demand':'Freshness search'}</text>`;}
 $('#tradeoffChart').innerHTML=out+'</svg>';
}
function renderOverview(){
 const c=state.comparison,base=c.policies[0],aware=c.policies[1],optimized=c.policies[2],m=optimized.metrics, e=c.estimate;
 const cards=[{label:'INVENTORY FILL RATE',value:pct(m.fillRate),note:'Fulfilled units / latent units',icon:'◈',cls:''},{label:'SCENARIO TOTAL COST',value:money(m.cost),note:'Illustrative scenario economics (assumed costs)',icon:'＄',cls:'kpi-blue'},{label:'UNMET DEMAND',value:fmt(m.unmet)+' units',note:'28-day scenario shortfall',icon:'↘',cls:'kpi-peach'},{label:'PERISHED INVENTORY',value:fmt(m.waste)+' units',note:'Modeled expiration, not observed spoilage',icon:'♧',cls:'kpi-lime'}];
 renderStoreGrid();
 $('#kpis').innerHTML=cards.map(x=>`<article class="kpi ${x.cls}"><div class="kpi-label">${x.label}<span class="kpi-icon">${x.icon}</span></div><div class="kpi-value">${x.value}</div><div class="kpi-note">${x.note}</div></article>`).join('');
 const tl=optimized.timeline;
 $('#inventoryChart').innerHTML=svgLineChart([{data:tl.map(r=>r.inventory),color:'#18aa88',fill:true},{data:tl.map(r=>r.demand),color:'#a7c4e4'},{data:tl.map(r=>r.arrived),color:'#e6b78d'}]);
 $('#chartFoot').innerHTML=`<span>${tl.filter(x=>x.stockout).length} simulated stockout days</span><span>Demand path seed: ${state.seed}</span>`;
 $('#recommendation').innerHTML=`${fmt(m.orders)} <span style="font-size:14px;font-weight:600;color:#93ada1;letter-spacing:0">units</span>`;
 const best=[...c.policies].sort((a,b)=>a.metrics.cost-b.metrics.cost)[0];
 $('#recommendationText').textContent=`The sampled freshness-aware policy orders ${fmt(m.orders)} units across ${state.settings.days} simulated days. Lowest modeled cost in this scenario: ${names[best.policy]}.`;
 $('#policyList').innerHTML=c.policies.map(p=>`<div class="policy-row"><div><div class="policy-name">${names[p.policy]}</div><div class="policy-sub">28-day simulation result</div></div><div class="policy-result">${money(p.metrics.cost)}<small>${pct(p.metrics.fillRate)} fill rate</small></div></div>`).join('');
 const indexFactor=state.mode==='benchmark'&&state.currentRecord&&!state.loadedCSV?MODEL_INDEX_MULTIPLIER:1;
 const max=Math.max(e.naive,e.corrected,1)*1.2;
 $('#demandBars').innerHTML=`<div class="demand-bars"><div class="demand-row"><div class="demand-head"><strong>Recorded sales rate</strong><span>${fmt(e.naive/indexFactor,2)} ${indexFactor>1?'normalized/day':'units/day'}</span></div><div class="demand-track"><span style="width:${100*e.naive/max}%"></span></div></div><div class="demand-row"><div class="demand-head"><strong>Stockout-adjusted estimate</strong><span>${fmt(e.corrected/indexFactor,2)} ${indexFactor>1?'normalized/day':'units/day'}</span></div><div class="demand-track corrected"><span style="width:${100*e.corrected/max}%"></span></div></div><p class="demand-comment">${e.censoredDays} of the last ${Math.min(35,state.history.length)} historical days had unavailable hours. The adjustment estimates unseen demand; actual lost sales remain unknown. Benchmark sales are normalized.</p></div>`;
 const sk=state.sku;
 const shelfSKUS=state.mode==='vegetable'?VEGETABLES.slice(0,6):(state.currentRecord?[state.sku]:SKUS);
 $('#shelfVisual').innerHTML=`<div class="shelf-illustration"><div class="shelf-items">${shelfSKUS.map(s=>`<div class="shelf-item" title="${escapeHTML(s.name)}">${s.icon}</div>`).join('')}</div><div class="shelf-bar"></div><div class="shelf-caption"><span>First-expiring-first-out rotation</span><span>1 selected SKU model</span></div></div><div class="shelf-foot">◷ <span><strong>${escapeHTML(sk.name)}</strong> · assumed shelf life ${Math.max(1,sk.shelfLife+state.settings.shelfLifeOffset)} days</span></div>`;
}
function renderInventory(){
 const tl=state.comparison.policies[2].timeline,idx=Math.min(tl.length-1,Math.max(0,state.day-1)),r=tl[idx];
 $('#daySlider').max=tl.length;$('#daySlider').value=idx+1;$('#replayTitle').textContent=`Day ${String(idx+1).padStart(2,'0')} / ${tl.length}`;
 const fields=[['OPENING STOCK',r.openingInventory],['ARRIVALS',r.arrived],['FULFILLED SALES',r.sales],['ENDING STOCK',r.inventory]];
 $('#dayMetrics').innerHTML=fields.map(([k,v])=>`<div class="day-metric"><small>${k}</small><strong>${fmt(v)}</strong></div>`).join('');
 const evt=r.missing?`A stockout prevented ${r.missing} unit(s) of simulated demand from being fulfilled.`:r.expired?`${r.expired} units reached their modeled expiration date.`:r.arrived?`${r.arrived} units arrived from a previously placed purchase order.`:'The inventory state advanced without a stockout or expiration event.';
 renderFlowLaboratory(r);
 $('#dayEvent').innerHTML=`<strong>${r.stockout?'⚠ Stockout recorded':'✓ Inventory state updated'}</strong>${evt} Orders placed today: ${r.order} units. Receipts: ${r.arrived} units. Expired: ${r.expired} units.`;
 $('#ledgerTable tbody').innerHTML=tl.map(r=>`<tr class="${r.missing?'warn':''}"><td>Day ${String(r.day).padStart(2,'0')}</td><td>${r.openingInventory}</td><td>${r.demand}</td><td>${r.sales}</td><td>${r.missing}</td><td>${r.arrived}</td><td>${r.expired}</td><td>${r.order}</td><td>${r.inventory}</td></tr>`).join('');
}
function renderExperiment(){
 const e=state.experiment;
 const max=Math.max(...Object.values(e).map(p=>p.cost),1)*1.12;
 $('#comparisonChart').innerHTML=Object.entries(e).map(([name,p])=>`<div class="compare-row"><div class="compare-head"><strong>${names[name]}</strong><span>${money(p.cost)}</span></div><div class="compare-track"><div style="width:${(p.cost/max*100).toFixed(2)}%;background:${tones[name]}"></div></div></div>`).join('');
 const sorted=Object.entries(e).sort((a,b)=>a[1].cost-b[1].cost),best=sorted[0];
 const bestService=Object.entries(e).sort((a,b)=>b[1].fillRate-a[1].fillRate)[0];
 $('#experimentSummary').innerHTML=`<strong>Lowest modeled cost: ${names[best[0]]}; highest service: ${names[bestService[0]]}.</strong> Across ${state.trials} paired trials, the lowest-cost policy averaged ${money(best[1].cost)} and ${pct(best[1].fillRate)} fill rate. The highest service policy averaged ${pct(bestService[1].fillRate)}. All monetary inputs are illustrative.`;
 const gap=e.adaptive.cost-e.baseline.cost;
 $('#modelInsight').textContent=`Why the policies differ: the freshness-aware strategy costs ${money(e.adaptive.cost)} versus ${money(e.baseline.cost)} for the sales baseline (${gap>=0?'+':''}${money(gap)}). Its modeled cost standard deviation is ${money(e.adaptive.stdCost)}. ${e.adaptive.waste>0?`Expired stock averaged ${fmt(e.adaptive.waste,1)} units per trial, emerging from the simulated batch lifetimes.`:'No expiration occurred here. Shorter shelf life or a demand collapse can reveal spoilage trade-offs.'} CVaR90 summarizes only the worst simulated 10%, so small trial counts make the tail estimate unstable.`;
 const paired=e.adaptive.pairedCostBenefit;
 const [lower,upper]=paired.ci95;
 $('#pairedInterval').innerHTML=`<span class="interval-caption">PAIRED COST DIFFERENCE · SALES BASELINE − FRESHNESS SEARCH</span><strong>${paired.mean>=0?'+':'−'}${money(Math.abs(paired.mean))} <small>per 28-day trial</small></strong><p>Approximate 95% interval: ${money(lower)} to ${money(upper)}. ${lower>0?'Entire interval favors freshness-aware search.':upper<0?'Entire interval favors the sales baseline.':'Interval crosses zero; direction is inconclusive under this simulation.'} These are model-based intervals, not field-validated savings.</p>`;
 renderTradeoff();
 $('#researchTable tbody').innerHTML=Object.entries(e).map(([p,m])=>`<tr><td><strong>${names[p]}</strong></td><td>${money(m.cost)}</td><td>${pct(m.fillRate)}</td><td>${fmt(m.waste,1)}</td><td>${money(m.cvar90)}</td></tr>`).join('');
 $('#syntheticValidation').textContent=syntheticDemandValidation(state.sku,state.seed,[.55,.85,1.15],6).map(r=>`Capacity ${fmt(r.stockFactor,2)}×: ${pct(r.stockoutRate)} censored · raw MAE ${fmt(r.naiveMAE,2)} / adjusted MAE ${fmt(r.correctedMAE,2)}`).join(' | ')+' · Controlled synthetic known-demand diagnostic only; not actual benchmark lost-demand recovery.';
}
function settingsFromControls(){state.settings={days:28,demandMultiplier:Number($('#demandRange').value)/100,leadTime:Number($('#leadRange').value),shelfLifeOffset:Number($('#shelfRange').value),shortageWeight:Number($('#shortageRange').value)/10};state.trials=Number($('#trialRange').value);$('#demandValue').textContent=Math.round(state.settings.demandMultiplier*100)+'%';$('#leadValue').textContent=state.settings.leadTime+' day'+(state.settings.leadTime===1?'':'s');$('#shelfValue').textContent=(state.settings.shelfLifeOffset>0?'+':'')+state.settings.shelfLifeOffset+' days';$('#shortageValue').textContent=state.settings.shortageWeight.toFixed(1)+'×';$('#trialValue').textContent=state.trials+' runs';}
const viewData={overview:['Operations overview','OPERATIONS INTELLIGENCE · DIGITAL TWIN','Fresh food, smarter decisions.','A transparent simulation and optimization workbench for stockout-aware demand and perishable inventory.'],inventory:['Inventory twin','SIMULATION ENGINE · DAILY STATE','An operational twin you can inspect.','Follow every stock movement through the inventory and expiration model.'],experiments:['Decision lab','STOCHASTIC OPTIMIZATION · POLICY BENCHMARK','Decisions, evaluated under uncertainty.','Compare replenishment policies using seeded Monte Carlo trials and measurable outcomes.'],methodology:['Methodology','RESEARCH DESIGN · OPEN ASSUMPTIONS','Built to be scrutinized.','Audit the mathematical assumptions, dataset provenance and validation scope.']};
function navigate(view){if(!viewData[view])view='overview';$$('.view').forEach(el=>el.classList.toggle('active',el.id===view));$$('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===view));const [crumb,eyebrow,title,subtitle]=viewData[view];$('#breadcrumb').textContent=crumb;$('#pageEyebrow').textContent=eyebrow;$('#pageTitle').innerHTML=escapeHTML(title).replace(/\.$/,'<span class="heading-dot">.</span>');$('#pageSubtitle').textContent=subtitle;window.location.hash=view;window.scrollTo({top:0,behavior:'instant'});}
function downloadText(filename,data,type='text/plain'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvValue(s){return '"'+String(s).replaceAll('"','""')+'"';}
function exportLedger(){const t=state.comparison.policies[2].timeline;const rows=['day,opening_stock,demand,sales,lost,arrivals,expired,orders,closing_stock,outstanding_orders',...t.map(x=>[x.day,x.openingInventory,x.demand,x.sales,x.missing,x.arrived,x.expired,x.order,x.inventory,x.pipeline.reduce((sum,p)=>sum+p.qty,0)].join(','))];downloadText('freshtwin-inventory-ledger.csv',rows.join('\n'),'text/csv');toast('Daily inventory ledger exported.');}
function exportResults(){
 const payload={project:'FreshTwin',modelVersion:MODEL_VERSION,executedAt:new Date().toISOString(),dataMode:state.mode,sku:state.sku.id,product:state.sku.name,
  skuScenarioAssumptions:{...state.sku},seed:state.seed,settings:{...state.settings},
  historyMetrics:state.comparison.estimate,evaluation:state.comparison.evaluation,
  policies:state.comparison.policies.map(x=>({policy:x.policy,metrics:x.metrics,assumptions:x.assumptions})),
  monteCarlo:state.experiment,trials:state.trials,
  dataset:state.mode==='benchmark'&&state.catalog?{name:state.catalog.dataset,sha256:state.catalog.rawSha256,license:state.catalog.license,product:state.currentRecord?.id,store:state.currentRecord?.store}:null,
  limitations:'Benchmark records are normalized and anonymized. Future demand and cost outcomes are synthetic assumptions; no actual lost demand or observed savings are identified. Initial and terminal inventory are capitalized at cost for scenario comparison.'
 };
 downloadText('freshtwin-research-results.json',JSON.stringify(payload,null,2),'application/json');toast('Fully attributed results exported.');
}

const benchmarkShards=new Map();
function updateSourceStatus(){
 const real=Boolean(state.mode==='benchmark'&&state.currentRecord&&!state.loadedCSV), imported=Boolean(state.loadedCSV);
 $('#sourceState').textContent=imported?'User-imported observations':real?'FreshRetailNet-50K · observed normalized sales':'Vegetable demonstration · assumed scenarios';
 $('#sourceCaption').textContent=imported?'Session-only CSV · scenario assumptions apply':real?`Product ${formatId(state.currentRecord.id)} · Store ${state.currentRecord.store} · 90 days · normalized sales`:'Ten named vegetables · editable illustrative inputs · known simulated demand';
 $('#sourceStateDot').className=`source-dot ${real?'real':imported?'imported':'demo'}`;
 $('#metricScope').textContent=real?`Source: real normalized sales / stockouts. Decision outcomes use 10× scaled scenario units, assumed five-day shelf life and illustrative cost parameters. These are not retail financial results.`:
   imported?'Observed CSV is used to calibrate a separate inventory scenario; economic parameters are assumed.':'Scenario quantities, inventory and costs are simulated, not measured retailer observations.';
}
function renderObservedHistory(){
 const panel=$('#observedPanel');
 if(state.mode!=='benchmark'||!state.currentRows||state.loadedCSV){panel.hidden=true;return;}
 panel.hidden=false;
 const rows=state.currentRows, rec=state.currentRecord;
 const max=Math.max(.01,...rows.map(x=>x.normalizedSales));
 const width=980,height=210,L=39,R=14,T=22,B=33;
 const w=(width-L-R)/rows.length;
 let svg=`<svg role="img" aria-label="Observed normalized sales by day, with stockout days shown in orange" viewBox="0 0 ${width} ${height}">`;
 for(let k=0;k<=4;k++){const y=T+(height-T-B)*k/4;svg+=`<line x1="${L}" y1="${y}" x2="${width-R}" y2="${y}" stroke="#e3ede7" stroke-dasharray="4 4"/><text x="${L-9}" y="${y+4}" fill="#77988a" font-size="11" text-anchor="end">${fmt(max*(1-k/4),1)}</text>`;}
 rows.forEach((r,i)=>{const x=L+i*w+1,y=T+(height-T-B)*(1-r.normalizedSales/max),barHeight=T+(height-T-B)-y,color=r.unavailableHours?'#dd976f':'#1eaa88';svg+=`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(1,w-1.5).toFixed(2)}" height="${Math.max(.4,barHeight).toFixed(2)}" rx="1.4" fill="${color}"><title>${escapeHTML(r.date)}: ${fmt(r.normalizedSales,3)} normalized sale index · ${r.unavailableHours} stockout hours</title></rect>`;});
 [0,29,59,89].forEach(idx=>{if(rows[idx])svg+=`<text x="${(L+idx*w).toFixed(2)}" y="${height-11}" text-anchor="start" font-size="10" fill="#719080">${escapeHTML(rows[idx].date.slice(5))}</text>`;});
 $('#observedChart').innerHTML=svg+'</svg>';
 $('#observedTitle').textContent=`Product ${formatId(rec.id)} · observed daily sales`;
 $('#observedBadge').textContent=`STORE ${rec.store}`;
 $('#observedContext').textContent=`Real normalized sales index from ${rows[0].date} to ${rows.at(-1).date}. Orange bars indicate recorded daytime stockouts; green bars show no recorded daytime stockout.`;
 $('#observedSummary').innerHTML=`<strong>${fmt(rec.meanSale,2)}</strong><small>mean normalized sales/day</small><strong>${rec.stockoutDays}</strong><small>days with daytime stockouts</small>`;
 const bt=pseudoStockoutBacktest(rows);
 $('#observedBacktest').innerHTML=bt.available?`<strong>${fmt(bt.naiveMAE,3)} → ${fmt(bt.correctedMAE,3)}</strong><small>MAE, partial-day baseline → calibrated correction</small><span>Validation on ${bt.testDays} fully stocked days, with hourly sales artificially hidden after 2 PM. This is a pseudo-stockout test, not recovered real lost sales.</span>`:`<strong>Validation not available</strong><small>${escapeHTML(bt.reason)}</small>`;
}
function renderCatalog(){
 if(!state.catalog)return;
 const entries=filterCatalog(state.catalog.catalog,state.catalogFilter);
 $('#catalogTotal').textContent=fmt(state.catalog.catalog.length);
 $('#catalogContext').textContent=`${fmt(entries.length)} matching products · real 90-day histories · category and product IDs are anonymized`;
 $('#catalogGrid').innerHTML=entries.slice(0,state.catalogLimit).map(r=>`<button type="button" class="catalog-item ${state.currentRecord?.id===r.id?'active':''}" data-product-id="${r.id}" aria-pressed="${state.currentRecord?.id===r.id}"><span class="catalog-item-head"><span class="catalog-icon">▦</span><span class="catalog-stockout ${r.stockoutDays>20?'risk':''}">${r.stockoutDays} stockout days</span></span><strong>Product ${formatId(r.id)}</strong><small>${categoryLabel(r)} · Store ${r.store}</small><span class="catalog-stats"><b>${fmt(r.meanSale,2)}</b> normalized sales/day <span>Explore →</span></span></button>`).join('')||'<div class="catalog-empty">No matching product IDs. Try another search or category.</div>';
 $('#catalogShowing').textContent=`Showing ${fmt(Math.min(state.catalogLimit,entries.length))} of ${fmt(entries.length)}`;
 $('#catalogMore').hidden=state.catalogLimit>=entries.length;
 $$('[data-product-id]').forEach(el=>el.addEventListener('click',()=>selectBenchmarkProduct(Number(el.dataset.productId))));
}
const shardRequests=new Map();
async function selectBenchmarkProduct(id){
 const record=state.catalog?.catalog.find(x=>x.id===id);if(!record)return;
 const seq=++state.loadToken,part=id%16;
 setBusy(true);$('#catalogContext').textContent=`Loading verified Product ${formatId(id)} · Store ${record.store}…`;
 try{
  let shard=benchmarkShards.get(part);
  if(!shard){
   let request=shardRequests.get(part);
   if(!request){
    request=fetch(`./data/part-${String(part).padStart(2,'0')}.json`).then(res=>{if(!res.ok)throw Error(`Historical shard unavailable (HTTP ${res.status}).`);return res.json();}).finally(()=>shardRequests.delete(part));
    shardRequests.set(part,request);
   }
   shard=await request;benchmarkShards.set(part,shard);
  }
  const rows=decodeSeries(shard,record);
  if(seq!==state.loadToken||state.mode!=='benchmark')return;
  state.currentRecord=record;state.currentRows=rows;state.benchmarkHistory=toScenarioHistory(rows);
  state.loadedCSV=null;state.sku=buildScenarioSku(record);state.day=1;
  $('#skuSelect').value=state.sku.id;$('#importMessage').textContent='';
  refresh();renderCatalog();
  $('#catalogContext').textContent=`Product ${formatId(id)} · Store ${record.store} · 90 verified observed days`;
  toast(`Product ${formatId(id)} · Store ${record.store}: history loaded.`);
 }catch(err){
  if(seq!==state.loadToken||state.mode!=='benchmark')return;
  $('#catalogContext').textContent=`Could not load Product ${formatId(id)}: ${err.message}`;
  $('#skuSelect').value=state.sku.id;
  toast('History load failed. Earlier selection remains unchanged.');
 }finally{if(seq===state.loadToken)setBusy(false);}
}
async function loadBenchmarkCatalog(){
 try{
  const response=await fetch('./data/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error(`Benchmark catalog unavailable (HTTP ${response.status}).`);
  state.catalog=parseCatalog(await response.json());
  const groups=[...new Set(state.catalog.catalog.map(r=>r.category[0]))].sort((a,b)=>a-b);
  $('#catalogCategory').innerHTML='<option value="all">All groups</option>'+groups.map(g=>`<option value="${g}">Group ${g}</option>`).join('');
  if(state.mode==='benchmark')$('#skuSelect').innerHTML=state.catalog.catalog.map(r=>`<option value="FRN-${r.id}">Product ${formatId(r.id)} · Store ${r.store}</option>`).join('');
  renderCatalog();
  const first=[...state.catalog.catalog].sort((a,b)=>b.meanSale-a.meanSale).find(r=>r.stockoutDays>0)||state.catalog.catalog[0];
  if(state.mode==='benchmark')await selectBenchmarkProduct(first.id);else workspace?.render();
 }catch(err){
  $('#catalogContext').textContent=`Benchmark catalog unavailable: ${err.message}. The named vegetable simulation remains functional.`;
  $('#sourceState').textContent=state.mode==='vegetable'?'Vegetable demonstration · illustrative':'Benchmark unavailable';
  $('#sourceCaption').textContent='The real benchmark needs its attributed data assets. See Methodology.';
  $('#catalogMore').hidden=true;
  $('#catalogTotal').textContent='0';
  toast('Real benchmark unavailable; vegetable simulation remains usable.');
 }
}
function selectVegetable(id){
 const original=VEGETABLES.find(v=>v.id===id);if(!original)return;
 state.loadToken++;setBusy(false);state.mode='vegetable';
 state.sku=state.vegOverrides[id]||original;state.currentRecord=null;state.currentRows=null;state.benchmarkHistory=null;state.loadedCSV=null;state.day=1;
 $('#leadRange').value=state.sku.leadTime??1;settingsFromControls();
 $('#skuSelect').innerHTML=VEGETABLES.map(v=>`<option value="${v.id}">${escapeHTML(v.name)} · ${v.id}</option>`).join('');
 $('#skuSelect').value=id;$('#importMessage').textContent='';
 refresh();toast(`${state.sku.name} · illustrative vegetable scenario selected.`);
}
function setMode(mode,id){
 if(mode==='benchmark'){
   if(!state.catalog){toast('The benchmark catalog is still loading; please try again shortly.');return;}
   state.mode='benchmark';state.loadedCSV=null;
   $('#skuSelect').innerHTML=state.catalog.catalog.map(r=>`<option value="FRN-${r.id}">Product ${formatId(r.id)} · Store ${r.store}</option>`).join('');
   const first=state.catalog.catalog.find(r=>r.id===id)||state.currentRecord||state.catalog.catalog[0];
   workspace?.render();selectBenchmarkProduct(first.id);return;
 }
 selectVegetable(VEGETABLES.find(v=>v.id===id)?.id||VEGETABLES[0].id);
}
function updateVegetable(key,value){
 if(state.mode!=='vegetable')return;
 const next=validateVegetable({...state.sku,[key]:value});
 state.vegOverrides[state.sku.id]=next;state.sku=next;
 if(key==='leadTime')$('#leadRange').value=next.leadTime;
 settingsFromControls();state.day=1;refresh();
}
function resetVegetable(){
 if(state.mode!=='vegetable')return;
 delete state.vegOverrides[state.sku.id];selectVegetable(state.sku.id);toast('Vegetable assumptions restored to illustrated defaults.');
}
function resetScenario(){
 state.seed=42;$('#seedInput').value=42;
 $('#demandRange').value=100;$('#leadRange').value=state.sku.leadTime??1;$('#shelfRange').value=0;$('#shortageRange').value=10;$('#trialRange').value=24;
 state.day=1;settingsFromControls();refresh();toast('Seed and scenario controls reset to the default baseline.');
}
function markDirty(){state.dirty=true;$('#exportBtn').disabled=true;$('#ledgerExportBtn').disabled=true;const d=$('#dirtyResults');if(d){d.hidden=false;d.textContent='Parameters changed · click Evaluate all policies to update the results.';}}
function setBusy(busy){state.loading=busy;$('#runBtn').disabled=busy;$('#experimentBtn').disabled=busy;$('#replayBtn').disabled=busy;$('#exportBtn').disabled=busy||state.dirty;$('#ledgerExportBtn').disabled=busy||state.dirty;$('#catalogContext').setAttribute('aria-busy',String(busy));}
function bind(){
 $('#skuSelect').innerHTML=VEGETABLES.map(s=>`<option value="${s.id}">${escapeHTML(s.name)} · ${s.id}</option>`).join('');
 workspace=createWorkspace({state,onMode:setMode,onSelect:selectVegetable,onUpdate:updateVegetable,onReset:resetVegetable});workspace.bind();
 $$('[data-nav]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.nav)}));
 $('#openLab').addEventListener('click',()=>navigate('experiments'));
 $('#storeToReplay').addEventListener('click',()=>navigate('inventory'));
 $('#sourceToggle').addEventListener('click',()=>{const detail=$('#sourceDetail'),opened=detail.hidden;detail.hidden=!opened;$('#sourceToggle').setAttribute('aria-expanded',String(opened));});
 $('#catalogSearch').addEventListener('input',e=>{state.catalogFilter.search=e.target.value;state.catalogLimit=12;renderCatalog();});
 $('#catalogCategory').addEventListener('change',e=>{state.catalogFilter.group=e.target.value;state.catalogLimit=12;renderCatalog();});
 $('#catalogSort').addEventListener('change',e=>{state.catalogFilter.sort=e.target.value;state.catalogLimit=12;renderCatalog();});
 $('#catalogMore').addEventListener('click',()=>{state.catalogLimit+=12;renderCatalog();});
 $('#skuSelect').addEventListener('change',e=>{if(e.target.value.startsWith('FRN-')){setMode('benchmark',Number(e.target.value.slice(4)));return;}selectVegetable(e.target.value);});
 $('#seedInput').addEventListener('change',e=>{state.seed=Math.max(1,Math.min(999999,Math.floor(Number(e.target.value)||42)));e.target.value=state.seed;state.day=1;refresh();});
 $('#replayBtn').addEventListener('click',()=>{state.seed=state.seed+1;$('#seedInput').value=state.seed;state.day=1;refresh();toast('New reproducible scenario generated.');});
 $('#runBtn').addEventListener('click',()=>{refresh();toast('Three replenishment policies evaluated.');});
 $('#prevDay').addEventListener('click',()=>{state.day=Math.max(1,state.day-1);renderInventory();});
 $('#nextDay').addEventListener('click',()=>{state.day=Math.min(state.settings.days,state.day+1);renderInventory();});
 $('#daySlider').addEventListener('input',e=>{state.day=Number(e.target.value);renderInventory();});
 for(const id of ['demandRange','leadRange','shelfRange','shortageRange','trialRange'])$('#'+id).addEventListener('input',()=>{settingsFromControls();markDirty();});
 $('#resetBtn').addEventListener('click',resetScenario);
 $('#experimentBtn').addEventListener('click',()=>{settingsFromControls();refresh();toast(`Experiment complete: ${state.trials} paired simulation trials.`);});
 $('#exportBtn').addEventListener('click',exportResults);$('#ledgerExportBtn').addEventListener('click',exportLedger);
 $('#csvFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2_000_000)throw Error('CSV is too large (2 MB maximum).');state.loadedCSV=parseUserCSV(await f.text(),state.sku.id);state.day=1;$('#importMessage').className='import-message';$('#importMessage').textContent=`Imported ${state.loadedCSV.length} records for ${state.sku.id}. Data remains in this browser session.`;refresh();toast('User CSV imported for this SKU.');}catch(err){$('#importMessage').className='import-message error';$('#importMessage').textContent=err.message;toast('CSV import failed. Check the expected columns.');}finally{e.target.value='';}});
 $('#clearFile').addEventListener('click',()=>{state.loadedCSV=null;$('#importMessage').textContent=state.mode==='benchmark'?'Restored attributed benchmark observations.':'Restored illustrative vegetable observations.';$('#importMessage').className='import-message';refresh();toast('Source observations restored.');});
 $('#downloadSample').addEventListener('click',()=>{const hist=generateHistory(state.sku,42).slice(0,15),rows=['date,sales,stockout_hours,sku',...hist.map(x=>[x.date,x.sales,x.unavailableHours,state.sku.id].join(','))];downloadText(`example-${state.sku.id}.csv`,rows.join('\n'),'text/csv');});
 window.addEventListener('hashchange',()=>navigate((location.hash||'#overview').slice(1)));
 settingsFromControls();refresh();navigate((location.hash||'#overview').slice(1));
}
bind();
loadBenchmarkCatalog();