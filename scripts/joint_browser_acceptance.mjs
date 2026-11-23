/** Production-capable Chromium acceptance for the Phase 4 Joint Store Lab. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const url=process.env.FRESHTWIN_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1512,height:940},acceptDownloads:true});
const checks=[],failures=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().includes('/joint')&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
await fs.mkdir('.browser-artifacts',{recursive:true});
async function check(name,fn){try{await fn();checks.push({name,status:'PASS'});console.log('PASS',name);}catch(e){checks.push({name,status:'FAIL',detail:e.message});failures.push(name+' — '+e.message);console.error('FAIL',name,e.message);}}
async function exported(){const pending=page.waitForEvent('download');await page.locator('#jointExport').click();const d=await pending;const filepath=await d.path();return JSON.parse(await fs.readFile(filepath,'utf8'));}
try{
 await check('FreshTwin v0.5 loads a dedicated joint-store navigation section',async()=>{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('[data-nav="joint"]').count(),1);
  assert.equal(await page.locator('#joint').count(),1);
  await page.locator('[data-nav="joint"]').click();
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:60000});
 });
 await check('Ten distinct named vegetable SKUs are visible',async()=>{
  assert.equal(await page.locator('#jointProducts [data-joint-sku]').count(),10);
  assert.equal(await page.locator('#jointProducts input:checked').count(),10);
  assert.match(await page.locator('#jointSelectedCount').textContent(),/10 selected/);
 });
 await check('Joint simulator renders six real KPI values and three policy comparisons',async()=>{
  assert.equal(await page.locator('#jointMetrics .joint-metric').count(),6);
  assert.equal(await page.locator('#jointResearchTable tbody tr').count(),3);
  assert.equal(await page.locator('#jointCapacityPlot svg').count(),1);
  assert.equal(await page.locator('#jointBudgetPlot svg').count(),1);
  assert.match(await page.locator('#jointPolicySummary').textContent(),/Lowest modeled mean cost/);
 });
 await check('Exported numerical results prove exact budget, storage and stock conservation',async()=>{
  const r=await exported();assert.equal(r.version,'0.5.0');assert.equal(r.source.length,10);
  for(const policy of r.simulation.policies){
   assert.ok(policy.metrics.purchases<=r.scenario.budget+1e-7);
   assert.ok(policy.metrics.peakCapacity<=r.scenario.capacity+1e-7);
   for(const day of policy.timeline){
    assert.ok(day.reservedCapacity<=r.scenario.capacity+1e-7);
    assert.ok(day.remainingBudget>=-1e-7);
    for(const sku of day.products){assert.equal(sku.opening+sku.arrived-sku.sold-sku.expired,sku.closing);assert.equal(sku.demand,sku.sold+sku.lost);}
   }
  }
  assert.equal(r.monteCarlo.trials,12);
 });
 await check('Budget stress marks results stale and enforces new shared limit',async()=>{
  await page.locator('#jointBudget').evaluate(el=>{el.value='2500';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#jointRerunHint').isVisible(),true);
  assert.equal(await page.locator('#jointExport').isDisabled(),true);
  await page.locator('#jointRun').click();
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:60000});
  const r=await exported();assert.equal(r.scenario.budget,2500);
  for(const p of r.simulation.policies)assert.ok(p.metrics.purchases<=2500+1e-7);
 });
 await check('Portfolio changes really remove a product from the optimization problem',async()=>{
  await page.locator('[data-joint-sku="VEG-010"]').uncheck();
  assert.equal(await page.locator('#jointProducts input:checked').count(),9);
  await page.locator('#jointRun').click();
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:60000});
  const r=await exported();assert.equal(r.source.length,9);
  assert.ok(r.simulation.policies.every(p=>p.timeline.every(t=>t.products.length===9)));
 });
 await check('Daily FEFO operations replay remains linked to ledger details',async()=>{
  await page.locator('#jointNextDay').click();
  assert.match(await page.locator('#jointDayTitle').textContent(),/Day 02/);
  assert.equal(await page.locator('#jointDailyTable tbody tr').count(),9);
  assert.equal(await page.locator('#jointLedger tbody tr').count(),21);
  await page.locator('#jointPrevDay').click();assert.match(await page.locator('#jointDayTitle').textContent(),/Day 01/);
 });
 await check('Reset restores the reproducible full-store baseline and deterministic export',async()=>{
  await page.locator('#jointReset').click();
  assert.equal(await page.locator('#jointProducts input:checked').count(),10);
  assert.equal(await page.locator('#jointBudget').inputValue(),'5500');
  await page.locator('#jointRun').click();
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:60000});
  const a=await exported();
  await page.locator('#jointRun').click();
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:60000});
  const b=await exported();
  assert.deepEqual(b.simulation,a.simulation);
  assert.deepEqual(b.monteCarlo,a.monteCarlo);
 });
 await check('48-trial paired stochastic stress scenario completes',async()=>{
  await page.locator('#jointTrials').selectOption('48');
  await page.locator('#jointRun').click({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:90000});
  const r=await exported();assert.equal(r.monteCarlo.trials,48);assert.equal(r.simulation.policies.length,3);
 });
 await check('Joint store lab fits 1512, 768 and 390px viewports without horizontal document overflow',async()=>{
  for(const width of [1512,768,390]){
   await page.setViewportSize({width,height:880});
   const v=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth}));
   assert.ok(v.doc<=v.win+2,`At width ${width}: ${JSON.stringify(v)}`);
   if(width===390)await page.screenshot({path:'.browser-artifacts/freshtwin-v05-joint-mobile.png',fullPage:true});
  }
  await page.setViewportSize({width:1512,height:940});
  await page.screenshot({path:'.browser-artifacts/freshtwin-v05-joint-desktop.png',fullPage:true});
 });
 await check('Joint research ledger CSV downloads',async()=>{
  const pending=page.waitForEvent('download');await page.locator('#jointExportLedger').click();const d=await pending;
  assert.equal(d.suggestedFilename(),'freshtwin-v05-shared-store-ledger.csv');
 });
 await check('No uncaught JavaScript error or missing joint module assets',async()=>assert.deepEqual(errors,[]));
}finally{await fs.writeFile('.browser-artifacts/joint-acceptance.json',JSON.stringify({url,checks,failures,errors},null,2));await browser.close();}
console.log(`Joint browser acceptance ${checks.length-failures.length}/${checks.length} PASS`);
if(failures.length)process.exitCode=1;