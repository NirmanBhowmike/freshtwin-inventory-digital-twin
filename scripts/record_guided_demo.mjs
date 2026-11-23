/** Record a real-browser, captioned product walkthrough (no synthetic screenshots).
 * This script records the actual public application; narration is NOT synthesized.
 */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const url=process.env.FRESHTWIN_URL||'http://127.0.0.1:4173/';
const directory='.demo-artifacts';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:directory,size:{width:1440,height:900}}});
const page=await context.newPage();
const errors=[],scenes=[];
page.on('pageerror',e=>errors.push(e.message));
async function caption(label,note,seconds=7){
 await page.evaluate(({label,note})=>{
  let root=document.querySelector('#ft-video-caption');
  if(!root){root=document.createElement('aside');root.id='ft-video-caption';document.body.append(root);}
  root.setAttribute('style','position:fixed;z-index:99999;left:28px;bottom:22px;width:min(740px,calc(100vw - 56px));pointer-events:none;background:linear-gradient(125deg,#12382eec,#125c48f0);color:#fff;border:1px solid #67ca9a;border-radius:15px;padding:17px 21px;box-shadow:0 12px 35px #0a2f2a80;font:600 16px/1.5 Arial,sans-serif;');
  root.innerHTML='';const top=document.createElement('strong');top.textContent=label;top.style='display:block;color:#aeedc2;font-size:18px;margin-bottom:6px';
  const body=document.createElement('div');body.textContent=note;body.style='font-size:15px;font-weight:400;line-height:1.45';root.append(top,body);
 },{label,note});
 scenes.push({label,note,seconds});await page.waitForTimeout(seconds*1000);
}
async function move(selector){await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(750);}
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.querySelector('#modeVegetable')&&document.querySelector('#catalogTotal')?.textContent==='865',null,{timeout:60000});
 await caption('FRESHTWIN 0.5 · RESEARCH SOFTWARE','Production & Inventory Control: a public digital-twin prototype for stockout-aware demand and perishable inventory.',7);
 await page.screenshot({path:`${directory}/01_overview.png`});
 await move('#vegetablePanel');
 await caption('DATA SEPARATION','The named vegetables are ten illustrative scenarios. The real FreshRetailNet benchmark retains 865 anonymous product IDs without invented product names.',8);
 await page.locator('#modeBenchmark').click();
 await page.waitForFunction(()=>document.querySelector('#catalogPanel')&&!document.querySelector('#catalogPanel').hidden,null,{timeout:15000});
 await move('#catalogPanel');
 await caption('REAL DATA · REAL LIMITS','Observed normalized sales and stockout flags are genuine. Physical inventory levels, selling prices and expiration ages are not disclosed by the benchmark.',8);
 await page.locator('[data-nav="joint"]').click();
 await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:90000});
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await caption('PHASE 4 · JOINT VEGETABLE OPTIMIZATION','One synthetic grocery store contains ten produce SKUs. Each has a separate shelf life, demand pattern, supplier lead time, cost and refrigerated-space requirement.',9);
 await page.screenshot({path:`${directory}/02_joint_hero.png`});
 await move('#jointBudget');
 await caption('DECISION VARIABLES AND HARD CONSTRAINTS','One purchasing budget covers the entire 21-day horizon. Conservative storage reservation includes usable on-hand inventory and every committed incoming order.',8);
 await move('#jointProducts');
 await caption('A COUPLED PRODUCT ASSORTMENT','These ten vegetables share financial and storage constraints. The joint decision cannot be obtained by independently optimizing each SKU and assuming infinite resources.',7);
 await page.screenshot({path:`${directory}/03_joint_portfolio.png`});
 await move('#jointMetrics');
 await caption('SIMULATION RESULTS','Three feasible policies face exactly the same random future demand in each paired trial. The results report modeled total cost, fill rate, expiration and resource use.',9);
 await page.screenshot({path:`${directory}/04_joint_results.png`});
 await move('#jointCostBars');
 await caption('WHY THE DECISIONS DIFFER','The lowest-cost method may differ from the highest-service method. The joint heuristic is allowed to lose under some assumptions; the model never manufactures savings.',8);
 await move('#jointCapacityPlot');
 await caption('CAPACITY FEASIBILITY','The reserved-capacity trajectory must remain at or below the hard refrigerated-volume ceiling at every simulated decision.',8);
 await page.screenshot({path:`${directory}/05_capacity_chart.png`});
 await move('#jointBudgetPlot');
 await caption('PURCHASING FEASIBILITY','Cumulative supplier commitments can never exceed the shared purchasing budget. Both limitations are enforced in the engine and checked by automated tests.',8);
 await move('#jointDailyTable');
 await caption('FEFO AND INVENTORY BALANCE','The day-by-day ledger reconciles opening inventory plus arrivals with sold units, expiration and closing inventory for every vegetable.',8);
 await page.locator('#jointNextDay').click();
 await page.screenshot({path:`${directory}/06_day_replay.png`});
 await caption('BINDING-CONSTRAINT STRESS TEST','Now we lower the storewide budget and rerun the same seeded model. Differences describe scenario assumptions, not observed retailer profits.',7);
 await move('#jointBudget');
 await page.locator('#jointBudget').evaluate(el=>{el.value='2750';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#jointRun').click();
 await page.waitForFunction(()=>document.querySelector('#jointStatus')?.textContent.includes('Scenario complete'),null,{timeout:90000});
 await move('#jointMetrics');
 await caption('SCENARIO RECOMPUTED','The lower budget changes committed purchases and constrained policy outcomes. Research JSON and CSV exports retain the exact seed, SKU assumptions and settings.',8);
 await page.screenshot({path:`${directory}/07_budget_sensitivity.png`});
 await page.locator('[data-nav="methodology"]').click();
 await move('.objective-panel');
 await caption('METHODOLOGY AND VERIFICATION','The source repository includes reproducible code, mathematical constraints, Monte Carlo checks and an exhaustive oracle for reduced toy cases. The full ten-item optimizer remains approximate.',10);
 await page.screenshot({path:`${directory}/08_methodology.png`});
 await caption('SCIENTIFIC SCOPE','This is a fully functional simulation, not a live synchronized store. Actual lost demand, measured purchase costs and externally validated savings are unknown.',8);
 if(errors.length)throw Error('Browser JavaScript errors: '+JSON.stringify(errors));
}finally{
 const path=await page.video().path();await context.close();await browser.close();
 await fs.copyFile(path,`${directory}/FreshTwin_v05_Captioned_Demonstration.webm`);
 await fs.writeFile(`${directory}/scenes.json`,JSON.stringify({url,scenes,errors,notes:'Captured from the actual website. Captions are explicit; no generated narration or fake retail data.'},null,2));
}
console.log(`Captured ${scenes.length} on-screen research explanation scenes; total planned holds ${scenes.reduce((s,x)=>s+x.seconds,0)} seconds.`);