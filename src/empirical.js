/**
 * FreshRetailNet-50K public dataset interface. Preserve original anonymized product IDs,
 * category IDs, normalized sales, and actual stockout hours. The simulator's artificial
 * scale/cost/shelf-life settings are NEVER dataset fields.
 * Source and license: https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K (CC BY 4.0)
 */
export const MODEL_INDEX_MULTIPLIER = 10;
export const BENCHMARK_URL = 'https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K';
const validNumber = value => typeof value === 'number' && Number.isFinite(value);
const sum = data => data.reduce((a,b) => a+b, 0);
const mean = a => a.length ? sum(a)/a.length : 0;
export const formatId = n => String(n).padStart(4,'0');
export function parseCatalog(json) {
 if(!json || json.dataset!=='Dingdong-Inc/FreshRetailNet-50K'||json.license!=='CC BY 4.0'||!Array.isArray(json.catalog))throw Error('Invalid FreshRetailNet source metadata.');
 const ids=new Set();
 for(const item of json.catalog){
  if(!Number.isInteger(item.id)||!Number.isInteger(item.store)||!validNumber(item.meanSale)||!Array.isArray(item.category)||!Number.isInteger(item.stockoutDays))throw Error('Invalid product metadata.');
  if(ids.has(item.id))throw Error(`Duplicate benchmark product ${item.id}.`);
  ids.add(item.id);
 }
 if(ids.size<800)throw Error(`Incomplete benchmark catalog (${ids.size} products).`);
 return json;
}
export function decodeSeries(json,record){
 if(!record||!json||!Array.isArray(json.series))throw Error('Invalid benchmark shard.');
 const match=json.series.find(s=>s.id===record.id&&s.store===record.store);
 if(!match)throw Error(`Product ${record.id} is missing its expected source series.`);
 const rows=match.rows.map((r,i)=>{
  if(!Array.isArray(r)||r.length!==7||typeof r[0]!=='string'||!validNumber(r[1])||r[1]<0||!Number.isInteger(r[2])||r[2]<0||r[2]>16||!Array.isArray(r[6])||r[6].length!==24||!r[6].every(x=>validNumber(x)&&x>=0))throw Error(`Invalid observed record ${i+1}.`);
  return {date:r[0],normalizedSales:r[1],unavailableHours:r[2],discount:r[3],promotion:r[4],holiday:r[5],hourly:r[6]};
 });
 if(rows.length!==record.days||rows.length<85)throw Error('Benchmark series length mismatch.');
 return rows;
}
export function buildScenarioSku(record){
 // Prices, costs, shelf life are explicitly ASSUMED, not recovered from dataset.
 // Scenario unit is an arbitrary 10× transform of the normalized observation index.
 const avg=Math.max(1,Math.round(record.meanSale*MODEL_INDEX_MULTIPLIER));
 return {id:`FRN-${record.id}`,name:`Product ${formatId(record.id)}`,
  category:`Group ${record.category[0]} · Category ${record.category[1]} / ${record.category[2]}`,
  unit:'scenario units',demand:avg,shelfLife:5,price:3.8,cost:1.7,shortage:4.0,holding:.08,disposal:.35,
  hue:'#98c9ae',icon:'▣',empirical:true,rawId:record.id,store:record.store,city:record.city};
}
export function toScenarioHistory(rows){
 return rows.map((r,i)=>({day:i+1,date:r.date,
  sales:Math.max(0,Math.round(r.normalizedSales*MODEL_INDEX_MULTIPLIER)),
  unavailableHours:r.unavailableHours,availableFraction:1-r.unavailableHours/16,
  normalizedSales:r.normalizedSales,kind:'observed-normalized-index-conversion'}));
}
/** Transparent pseudo-stockout backtest, not a held-out true-demand recovery validation.
 * Restrict testing to days with no recorded stockouts, so full-day sales are observed.
 * Hide sales after hour 14 (2pm), compare naive partial-day total with a historical
 * average early-day fraction learned on the FIRST 70 fully stocked days. This
 * evaluates an artificial cutoff, not actual unobserved retailer demand.
 */
export function pseudoStockoutBacktest(rows,cutoffHour=14){
 const training=rows.slice(0,70).filter(r=>r.unavailableHours===0&&r.normalizedSales>0);
 const test=rows.slice(70).filter(r=>r.unavailableHours===0&&r.normalizedSales>0);
 if(training.length<5||test.length<3)return {available:false,trainingDays:training.length,testDays:test.length,reason:'Insufficient fully stocked days for a meaningful evaluation.'};
 const fractions=training.map(r=>sum(r.hourly.slice(0,cutoffHour))/Math.max(r.normalizedSales,1e-8)).filter(x=>x>0.025&&x<=1.05);
 const fraction=Math.max(.08,Math.min(.98,mean(fractions)));
 const baseline=test.map(r=>sum(r.hourly.slice(0,cutoffHour)));
 const truth=test.map(r=>r.normalizedSales);
 const corrected=baseline.map(x=>x/fraction);
 const errors=(values)=>mean(values.map((v,i)=>Math.abs(v-truth[i])));
 return {available:true,cutoffHour,trainingDays:training.length,testDays:test.length,
  meanObservedFraction:fraction,naiveMAE:errors(baseline),correctedMAE:errors(corrected),
  method:'Pre-cutoff hourly share learned from earlier days with no recorded stockouts',
  scope:'Artificial cutoff on otherwise fully stocked days; not a measurement of genuine lost sales.'};
}
export function categoryLabel(record){return `Group ${record.category[0]} · Category ${record.category[1]}`;}
export function filterCatalog(catalog,{search='',group='all',sort='id'}={}){
 const q=String(search).trim().toLowerCase();
 const list=catalog.filter(x=>(group==='all'||String(x.category[0])===String(group)) &&
   (!q||[x.id,formatId(x.id),x.store,categoryLabel(x),`product ${x.id}`,`product ${formatId(x.id)}`].some(x=>String(x).toLowerCase().includes(q))));
 const orders={id:(a,b)=>a.id-b.id,activity:(a,b)=>b.meanSale-a.meanSale,stockout:(a,b)=>b.stockoutDays-a.stockoutDays};
 return list.sort(orders[sort]||orders.id);
}