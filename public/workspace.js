/** Standalone self-explanatory dual-mode interface for named vegetables and anonymous research records. */
import {VEGETABLES} from './vegetables.js';
const escapeHTML=x=>String(x).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fields=[
 ['demand','Mean daily demand','units/day',0,500,1],
 ['demandVariability','Demand variability','multiplicative σ',0,1.5,.05],
 ['cost','Purchase cost','$ / unit',0,100,.05],
 ['price','Selling price','$ / unit',0,100,.05],
 ['holding','Holding cost','$ / unit-day',0,20,.01],
 ['shortage','Shortage penalty','$ / unmet unit',0,100,.1],
 ['disposal','Spoilage disposal','$ / expired unit',0,50,.05],
 ['shelfLife','Shelf life','days',1,30,1],
 ['leadTime','Supplier lead time','days',0,14,1],
 ['storage','Storage use','capacity units / item',.01,100,.01],
 ['initialInventory','Opening on-hand inventory','units',0,2000,1],
 ['ageOldPercent','Older cohort share','% of opening stock',0,100,5]
];
const htmlField=(sku,[key,label,unit,min,max,step])=>`<label class="assumption-field"><span>${label}<small>${unit}</small></span><input type="number" data-assumption="${key}" value="${sku[key]}" min="${min}" max="${max}" step="${step}" inputmode="decimal" /></label>`;
export function createWorkspace({state,onMode,onSelect,onUpdate,onReset}){
 const $=s=>document.querySelector(s);
 function render(){
  const demo=state.mode==='vegetable';
  $('#modeVegetable').setAttribute('aria-pressed',String(demo));
  $('#modeBenchmark').setAttribute('aria-pressed',String(!demo));
  $('#modeVegetable').classList.toggle('active',demo);$('#modeBenchmark').classList.toggle('active',!demo);
  $('#modeSummary').textContent=demo?'Named vegetables · illustrative operating parameters · known simulated demand':'865 anonymized source-product IDs · genuine normalized observations · assumed inventory economics';
  $('#catalogPanel').hidden=demo;
  $('#vegetablePanel').hidden=!demo;
  if(!demo)return;
  $('#vegetableTiles').innerHTML=VEGETABLES.map(v=>{
   const s=state.vegOverrides[v.id]||v,active=s.id===state.sku.id;
   return `<button type="button" class="vegetable-tile ${active?'active':''}" data-veg-id="${s.id}" aria-pressed="${active}"><span class="produce-icon" style="--produce-accent:${s.hue}">${s.icon}</span><span class="veg-tile-text"><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.category)} · ${s.shelfLife} days</small><em>${s.initialInventory} opening units · ${s.demand} units/day</em></span></button>`;
  }).join('');
  $('#vegetableTiles').querySelectorAll('[data-veg-id]').forEach(btn=>btn.addEventListener('click',()=>onSelect(btn.dataset.vegId)));
  const sku=state.sku;
  $('#vegetableAssumptions').innerHTML=fields.map(f=>htmlField(sku,f)).join('');
  $('#vegetableHeading').textContent=`${sku.name} · inventory parameters`;
  $('#vegetableExplanation').textContent=`This is an explicitly simulated SKU, not a decoded FreshRetailNet product. Opening stock is split into a newer cohort and an older cohort, based on the editable age-share setting. Values are model inputs, not retailer quotations.`;
  $('#vegetableAssumptions').querySelectorAll('[data-assumption]').forEach(input=>input.addEventListener('change',e=>{
   try{onUpdate(e.target.dataset.assumption,Number(e.target.value));$('#vegError').textContent='';}
   catch(err){$('#vegError').textContent=err.message;render();}
  }));
 }
 function bind(){
  $('#modeVegetable').addEventListener('click',()=>onMode('vegetable'));
  $('#modeBenchmark').addEventListener('click',()=>onMode('benchmark'));
  $('#vegReset').addEventListener('click',onReset);
  render();
 }
 return {render,bind};
}