import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalog,decodeSeries,buildScenarioSku,toScenarioHistory,pseudoStockoutBacktest,filterCatalog,MODEL_INDEX_MULTIPLIER} from '../src/empirical.js';
const products=Array.from({length:865},(_,i)=>({id:i,store:i%8,category:[i%5,i%17,i%25,i%70],meanSale:.1+i/100,stockoutDays:i%35,days:90}));
const catalog={dataset:'Dingdong-Inc/FreshRetailNet-50K',license:'CC BY 4.0',catalog:products};
test('catalog enforces source license and product-ID uniqueness',()=>{
 assert.equal(parseCatalog(catalog).catalog.length,865);
 assert.throws(()=>parseCatalog({...catalog,license:'MIT'}),/Invalid/);
 assert.throws(()=>parseCatalog({...catalog,catalog:[...products,products[0]]}),/Duplicate/);
 assert.throws(()=>parseCatalog({...catalog,catalog:products.slice(0,10)}),/Incomplete/);
});
test('real-world sales stay normalized until expressly converted into scenario units',()=>{
 const raw=Array.from({length:90},(_,i)=>[`2024-04-${String(i%30+1).padStart(2,'0')}`,i/10, i%3===0?4:0,.9,0,0,Array(24).fill(i/240)]);
 const rows=decodeSeries({series:[{id:12,store:4,rows:raw}]},{id:12,store:4,days:90});
 assert.equal(rows[1].normalizedSales,.1);
 assert.equal(toScenarioHistory(rows)[1].sales,Math.round(.1*MODEL_INDEX_MULTIPLIER));
 const sku=buildScenarioSku({id:12,store:4,city:0,category:[3,4,5,6],meanSale:2});
 assert.equal(sku.name,'Product 0012');
 assert.equal(sku.category,'Group 3 · Category 4 / 5');
 assert.equal(sku.unit,'scenario units');
 assert.equal(sku.shelfLife,5);
 assert.throws(()=>decodeSeries({series:[{id:12,store:4,rows:raw.slice(0,50)}]},{id:12,store:4,days:90}),/length/);
});
test('catalog filters by actual anonymized IDs and group code',()=>{
 assert.deepEqual(filterCatalog(products,{search:'product 0002'}).map(p=>p.id),[2]);
 assert.equal(filterCatalog(products,{group:'3'}).every(p=>p.category[0]===3),true);
 assert.equal(filterCatalog(products,{sort:'stockout'})[0].stockoutDays,34);
});
test('pseudo-stockout diagnosis uses a train-before-test partition',()=>{
 const daily=Array.from({length:90},(_,i)=>({date:`2024-${i}`,unavailableHours:0,normalizedSales:24,hourly:Array(24).fill(1)}));
 const r=pseudoStockoutBacktest(daily,14);
 assert.equal(r.available,true);
 assert.equal(r.trainingDays,70);
 assert.equal(r.testDays,20);
 assert.ok(r.naiveMAE>0);
 assert.ok(r.correctedMAE<.000001);
 assert.equal(r.cutoffHour,14);
});
test('insufficient uncensored evaluation days report unavailable, not spurious evidence',()=>{
 const daily=Array.from({length:90},()=>({unavailableHours:16,normalizedSales:1,hourly:Array(24).fill(0)}));
 const r=pseudoStockoutBacktest(daily);
 assert.equal(r.available,false);
 assert.equal(r.testDays,0);
});