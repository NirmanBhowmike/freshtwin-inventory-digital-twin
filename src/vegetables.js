/* Named produce scenarios are illustrative, never aliases for the anonymized research benchmark. */
const entries = [
 ['VEG-001','Baby Spinach','Leafy greens','packs','🥬',24,0.35,4,2.35,0.12,5.0,0.40,4,1,0.30,'#75be9a'],
 ['VEG-002','Broccoli Crowns','Cruciferous','heads','🥦',30,0.28,2.60,1.20,0.07,3.2,0.32,6,2,0.28,'#78b98c'],
 ['VEG-003','Cherry Tomatoes','Tomatoes','packs','🍅',26,0.32,3.90,1.95,0.09,4.5,0.30,5,1,0.30,'#e78d75'],
 ['VEG-004','Cucumbers','Fresh vegetables','pieces','🥒',35,0.30,1.50,0.73,0.05,2.2,0.19,7,2,0.25,'#8dc79c'],
 ['VEG-005','Carrots','Root vegetables','bags','🥕',20,0.24,2.45,1.10,0.05,3.0,0.18,12,2,0.27,'#eead73'],
 ['VEG-006','Red Bell Peppers','Peppers','pieces','🫑',24,0.42,2.20,1.05,0.07,2.8,0.28,6,2,0.33,'#e89f7e'],
 ['VEG-007','Romaine Lettuce','Leafy greens','heads','🥬',27,0.40,2.90,1.40,0.11,4.3,0.36,4,1,0.32,'#a3c887'],
 ['VEG-008','Cauliflower','Cruciferous','heads','🥦',19,0.31,3.25,1.68,0.09,3.8,0.37,6,2,0.38,'#c8dcb6'],
 ['VEG-009','Zucchini','Fresh vegetables','pieces','🥒',29,0.34,1.75,0.86,0.06,2.9,0.21,5,1,0.29,'#84b690'],
 ['VEG-010','Green Beans','Legumes','bags','🫛',21,0.43,3.80,1.96,0.12,5.1,0.42,4,2,0.35,'#90c88f']
];
export const VEGETABLES = entries.map(([id,name,category,unit,icon,demand,demandVariability,price,cost,holding,shortage,disposal,shelfLife,leadTime,storage,hue]) => {
 const initialInventory=Math.round(demand*(leadTime+1.35));
 return {id,name,category,unit,icon,demand,demandVariability,price,cost,holding,shortage,disposal,shelfLife,leadTime,storage,initialInventory,ageOldPercent:30,hue,demo:true};
});
export function validateVegetable(sku){
 const bounded={demand:[0,500],demandVariability:[0,1.5],price:[0,100],cost:[0,100],holding:[0,20],shortage:[0,100],disposal:[0,50],shelfLife:[1,30],leadTime:[0,14],storage:[.01,100],initialInventory:[0,2000],ageOldPercent:[0,100]};
 for(const [key,[low,high]] of Object.entries(bounded)){
  if(!Number.isFinite(sku[key])||sku[key]<low||sku[key]>high)throw Error(`${key} must be between ${low} and ${high}.`);
 }
 if(sku.price<sku.cost)throw Error('Selling price must not be less than purchase cost in this demonstration scenario.');
 for(const key of ['shelfLife','leadTime','initialInventory'])if(!Number.isInteger(sku[key]))throw Error(`${key} must be a whole number.`);
 return sku;
}
export function ageCohortsFor(sku){
 const life=Math.max(1,Math.round(sku.shelfLife)),total=Math.max(0,Math.round(sku.initialInventory));
 if(life<2||!total)return total?[{qty:total,life}]:[];
 const older=Math.round(total*(sku.ageOldPercent??30)/100);
 return [{qty:total-older,life},{qty:older,life:Math.max(1,Math.ceil(life/2))}].filter(x=>x.qty>0);
}