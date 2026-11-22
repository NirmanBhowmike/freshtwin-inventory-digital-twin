import {SKUS, generateHistory,comparePolicies,monteCarlo,parseUserCSV} from './engine.js';
const $=(selector)=>document.querySelector(selector);
const $$=(selector)=>Array.from(document.querySelectorAll(selector));
const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const money=n=>'$'+fmt(n,0), pct=n=>(n*100).toFixed(1)+'%';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={sku:SKUS[0],seed:42,settings:{leadTime:1,shelfLifeOffset:0,demandMultiplier:1,shortageWeight:1,days:28},history:null,comparison:null,experiment:null,trials:24,day:1,loadedCSV:null};
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
 state.history=state.loadedCSV||generateHistory(state.sku,state.seed);
 state.comparison=comparePolicies(state.sku,state.settings,state.seed,state.loadedCSV);
 state.experiment=monteCarlo(state.sku,state.settings,state.seed,state.trials,state.loadedCSV);
 $('#sideDataMode').textContent=state.loadedCSV?'Imported CSV':'Synthetic';
 $('#dataBadge').textContent=state.loadedCSV?'USER-IMPORTED CSV':'SYNTHETIC MODE';
 renderOverview();renderInventory();renderExperiment();
}
function renderOverview(){
 const c=state.comparison,base=c.policies[0],aware=c.policies[1],optimized=c.policies[2],m=optimized.metrics, e=c.estimate;
 const cards=[{label:'INVENTORY FILL RATE',value:pct(m.fillRate),note:'Fulfilled units / latent units',icon:'◈',cls:''},{label:'SIMULATED TOTAL COST',value:money(m.cost),note:'Purchases + carrying + waste + shortages',icon:'＄',cls:'kpi-blue'},{label:'UNMET DEMAND',value:fmt(m.unmet)+' units',note:'28-day simulated lost sales',icon:'↘',cls:'kpi-peach'},{label:'PERISHED INVENTORY',value:fmt(m.waste)+' units',note:'Expired and disposed in simulation',icon:'♧',cls:'kpi-lime'}];
 $('#kpis').innerHTML=cards.map(x=>`<article class="kpi ${x.cls}"><div class="kpi-label">${x.label}<span class="kpi-icon">${x.icon}</span></div><div class="kpi-value">${x.value}</div><div class="kpi-note">${x.note}</div></article>`).join('');
 const tl=optimized.timeline;
 $('#inventoryChart').innerHTML=svgLineChart([{data:tl.map(r=>r.inventory),color:'#18aa88',fill:true},{data:tl.map(r=>r.demand),color:'#a7c4e4'},{data:tl.map(r=>r.arrived),color:'#e6b78d'}]);
 $('#chartFoot').innerHTML=`<span>${tl.filter(x=>x.stockout).length} simulated stockout days</span><span>Demand path seed: ${state.seed}</span>`;
 $('#recommendation').innerHTML=`${fmt(m.orders)} <span style="font-size:14px;font-weight:600;color:#93ada1;letter-spacing:0">units</span>`;
 const best=[...c.policies].sort((a,b)=>a.metrics.cost-b.metrics.cost)[0];
 $('#recommendationText').textContent=`The bounded freshness-aware policy orders ${fmt(m.orders)} units across 28 simulated days. Lowest realized cost in this scenario: ${names[best.policy]}.`;
 $('#policyList').innerHTML=c.policies.map(p=>`<div class="policy-row"><div><div class="policy-name">${names[p.policy]}</div><div class="policy-sub">28-day simulation result</div></div><div class="policy-result">${money(p.metrics.cost)}<small>${pct(p.metrics.fillRate)} fill rate</small></div></div>`).join('');
 const max=Math.max(e.naive,e.corrected,1)*1.2;
 $('#demandBars').innerHTML=`<div class="demand-bars"><div class="demand-row"><div class="demand-head"><strong>Recorded sales rate</strong><span>${fmt(e.naive,1)} units/day</span></div><div class="demand-track"><span style="width:${100*e.naive/max}%"></span></div></div><div class="demand-row"><div class="demand-head"><strong>Stockout-adjusted estimate</strong><span>${fmt(e.corrected,1)} units/day</span></div><div class="demand-track corrected"><span style="width:${100*e.corrected/max}%"></span></div></div><p class="demand-comment">${e.censoredDays} of the last ${Math.min(35,state.history.length)} historical days had unavailable hours. The adjustment is a heuristic estimate, not independently verified true demand.</p></div>`;
 const sk=state.sku;
 $('#shelfVisual').innerHTML=`<div class="shelf-illustration"><div class="shelf-items">${SKUS.map(s=>`<div class="shelf-item" title="${escapeHTML(s.name)}">${s.icon}</div>`).join('')}</div><div class="shelf-bar"></div><div class="shelf-caption"><span>First-expiring-first-out rotation</span><span>5 modeled SKUs</span></div></div><div class="shelf-foot">◷ <span><strong>${escapeHTML(sk.name)}</strong> · assumed shelf life ${Math.max(1,sk.shelfLife+state.settings.shelfLifeOffset)} days</span></div>`;
}
function renderInventory(){
 const tl=state.comparison.policies[2].timeline,idx=Math.min(tl.length-1,Math.max(0,state.day-1)),r=tl[idx];
 $('#daySlider').max=tl.length;$('#daySlider').value=idx+1;$('#replayTitle').textContent=`Day ${String(idx+1).padStart(2,'0')} / ${tl.length}`;
 const fields=[['REALIZED DEMAND',r.demand],['FULFILLED SALES',r.sales],['ENDING STOCK',r.inventory],['UNMET DEMAND',r.missing]];
 $('#dayMetrics').innerHTML=fields.map(([k,v])=>`<div class="day-metric"><small>${k}</small><strong>${fmt(v)}</strong></div>`).join('');
 const evt=r.missing?`A stockout prevented ${r.missing} unit(s) of simulated demand from being fulfilled.`:r.expired?`${r.expired} units reached their modeled expiration date.`:r.arrived?`${r.arrived} units arrived from a previously placed purchase order.`:'The inventory state advanced without a stockout or expiration event.';
 $('#dayEvent').innerHTML=`<strong>${r.stockout?'⚠ Stockout recorded':'✓ Inventory state updated'}</strong>${evt} Orders placed today: ${r.order} units. Receipts: ${r.arrived} units. Expired: ${r.expired} units.`;
 $('#ledgerTable tbody').innerHTML=tl.map(r=>`<tr class="${r.missing?'warn':''}"><td>Day ${String(r.day).padStart(2,'0')}</td><td>${r.demand}</td><td>${r.sales}</td><td>${r.missing}</td><td>${r.arrived}</td><td>${r.expired}</td><td>${r.order}</td><td>${r.inventory}</td></tr>`).join('');
}
function renderExperiment(){
 const e=state.experiment;
 const max=Math.max(...Object.values(e).map(p=>p.cost),1)*1.12;
 $('#comparisonChart').innerHTML=Object.entries(e).map(([name,p])=>`<div class="compare-row"><div class="compare-head"><strong>${names[name]}</strong><span>${money(p.cost)}</span></div><div class="compare-track"><div style="width:${(p.cost/max*100).toFixed(2)}%;background:${tones[name]}"></div></div></div>`).join('');
 const sorted=Object.entries(e).sort((a,b)=>a[1].cost-b[1].cost),best=sorted[0];
 $('#experimentSummary').innerHTML=`<strong>Lowest mean modeled cost: ${names[best[0]]}.</strong> Across ${state.trials} paired runs, it achieved ${money(best[1].cost)} average cost and ${pct(best[1].fillRate)} fill rate. This is a simulation result, not evidence of realized retail savings.`;
 $('#researchTable tbody').innerHTML=Object.entries(e).map(([p,m])=>`<tr><td><strong>${names[p]}</strong></td><td>${money(m.cost)}</td><td>${pct(m.fillRate)}</td><td>${fmt(m.waste,1)}</td><td>${money(m.cvar90)}</td></tr>`).join('');
}
function settingsFromControls(){state.settings={days:28,demandMultiplier:Number($('#demandRange').value)/100,leadTime:Number($('#leadRange').value),shelfLifeOffset:Number($('#shelfRange').value),shortageWeight:Number($('#shortageRange').value)/10};state.trials=Number($('#trialRange').value);$('#demandValue').textContent=Math.round(state.settings.demandMultiplier*100)+'%';$('#leadValue').textContent=state.settings.leadTime+' day'+(state.settings.leadTime===1?'':'s');$('#shelfValue').textContent=(state.settings.shelfLifeOffset>0?'+':'')+state.settings.shelfLifeOffset+' days';$('#shortageValue').textContent=state.settings.shortageWeight.toFixed(1)+'×';$('#trialValue').textContent=state.trials+' runs';}
const viewData={overview:['Operations overview','OPERATIONS INTELLIGENCE · DIGITAL TWIN','Fresh food, smarter decisions.','A transparent simulation and optimization workbench for stockout-aware demand and perishable inventory.'],inventory:['Inventory twin','SIMULATION ENGINE · DAILY STATE','An operational twin you can inspect.','Follow every stock movement through the inventory and expiration model.'],experiments:['Decision lab','STOCHASTIC OPTIMIZATION · POLICY BENCHMARK','Decisions, evaluated under uncertainty.','Compare replenishment policies using seeded Monte Carlo trials and measurable outcomes.'],methodology:['Methodology','RESEARCH DESIGN · OPEN ASSUMPTIONS','Built to be scrutinized.','Audit the mathematical assumptions, dataset provenance and validation scope.']};
function navigate(view){if(!viewData[view])view='overview';$$('.view').forEach(el=>el.classList.toggle('active',el.id===view));$$('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===view));const [crumb,eyebrow,title,subtitle]=viewData[view];$('#breadcrumb').textContent=crumb;$('#pageEyebrow').textContent=eyebrow;$('#pageTitle').innerHTML=escapeHTML(title).replace(/\.$/,'<span class="heading-dot">.</span>');$('#pageSubtitle').textContent=subtitle;window.location.hash=view;window.scrollTo({top:0,behavior:'instant'});}
function downloadText(filename,data,type='text/plain'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvValue(s){return '"'+String(s).replaceAll('"','""')+'"';}
function exportLedger(){const t=state.comparison.policies[2].timeline;const rows=['day,demand,sales,lost,arrivals,expired,orders,closing_stock',...t.map(x=>[x.day,x.demand,x.sales,x.missing,x.arrived,x.expired,x.order,x.inventory].join(','))];downloadText('freshtwin-inventory-ledger.csv',rows.join('\n'),'text/csv');toast('Daily inventory ledger exported.');}
function exportResults(){const payload={project:'FreshTwin',version:'0.1.0',dataSource:state.loadedCSV?'user-supplied browser CSV':'synthetic illustrated history',sku:state.sku.id,seed:state.seed,settings:state.settings,historyMetrics:state.comparison.estimate,policies:state.comparison.policies.map(x=>({policy:x.policy,metrics:x.metrics})),monteCarlo:state.experiment,trials:state.trials,disclaimer:'Outputs from a research prototype. Synthetic assumptions do not represent realized retail performance.'};downloadText('freshtwin-research-results.json',JSON.stringify(payload,null,2),'application/json');toast('Research results downloaded.');}
function bind(){
 $('#skuSelect').innerHTML=SKUS.map(s=>`<option value="${s.id}">${escapeHTML(s.name)} · ${s.id}</option>`).join('');
 $$('[data-nav]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.nav)}));
 $('#openLab').addEventListener('click',()=>navigate('experiments'));
 $('#skuSelect').addEventListener('change',e=>{state.sku=SKUS.find(s=>s.id===e.target.value)||SKUS[0];state.loadedCSV=null;state.day=1;refresh();toast('Selected SKU loaded.');});
 $('#seedInput').addEventListener('change',e=>{state.seed=Math.max(1,Math.min(999999,Math.floor(Number(e.target.value)||42)));e.target.value=state.seed;state.day=1;refresh();});
 $('#replayBtn').addEventListener('click',()=>{state.seed=state.seed+1;$('#seedInput').value=state.seed;state.day=1;refresh();toast('New reproducible scenario generated.');});
 $('#runBtn').addEventListener('click',()=>{refresh();toast('Three replenishment policies evaluated.');});
 $('#prevDay').addEventListener('click',()=>{state.day=Math.max(1,state.day-1);renderInventory();});
 $('#nextDay').addEventListener('click',()=>{state.day=Math.min(state.settings.days,state.day+1);renderInventory();});
 $('#daySlider').addEventListener('input',e=>{state.day=Number(e.target.value);renderInventory();});
 for(const id of ['demandRange','leadRange','shelfRange','shortageRange','trialRange'])$('#'+id).addEventListener('input',settingsFromControls);
 $('#experimentBtn').addEventListener('click',()=>{settingsFromControls();refresh();toast(`Experiment complete: ${state.trials} paired simulation trials.`);});
 $('#exportBtn').addEventListener('click',exportResults);$('#ledgerExportBtn').addEventListener('click',exportLedger);
 $('#csvFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2_000_000)throw Error('CSV is too large (2 MB maximum).');state.loadedCSV=parseUserCSV(await f.text(),state.sku.id);state.day=1;$('#importMessage').className='import-message';$('#importMessage').textContent=`Imported ${state.loadedCSV.length} records for ${state.sku.id}. Data remains in this browser session.`;refresh();toast('User CSV imported for this SKU.');}catch(err){$('#importMessage').className='import-message error';$('#importMessage').textContent=err.message;toast('CSV import failed. Check the expected columns.');}finally{e.target.value='';}});
 $('#clearFile').addEventListener('click',()=>{state.loadedCSV=null;$('#importMessage').textContent='Restored deterministic synthetic observations.';$('#importMessage').className='import-message';refresh();toast('Synthetic data restored.');});
 $('#downloadSample').addEventListener('click',()=>{const hist=generateHistory(state.sku,42).slice(0,15),rows=['date,sales,stockout_hours,sku',...hist.map(x=>[x.date,x.sales,x.unavailableHours,state.sku.id].join(','))];downloadText(`example-${state.sku.id}.csv`,rows.join('\n'),'text/csv');});
 window.addEventListener('hashchange',()=>navigate((location.hash||'#overview').slice(1)));
 settingsFromControls();refresh();navigate((location.hash||'#overview').slice(1));
}
bind();