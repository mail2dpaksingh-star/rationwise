/* Synthetic data only: deliberately not sourced from commercial feed databases.
   Values are invented testing fixtures, NOT nutrient analyses or recommendations.
   No demo record is approved. */
(function(root){
'use strict';
const entries=[
 ['demo_maize','Maize / corn (synthetic)',90,10,.05,.30,2.5,.28,['ruminant','poultry','fish','swine'],0,70],
 ['demo_soy','Soy meal (synthetic)',89,47,.35,.70,6.5,.56,['ruminant','poultry','fish','swine'],0,55],
 ['demo_bran','Wheat bran (synthetic)',88,16,.10,1.10,12,.19,['ruminant','poultry','fish','swine'],0,35],
 ['demo_rice','Rice bran (synthetic)',90,15,.08,1.25,9,.24,['ruminant','poultry','fish','swine'],0,35],
 ['demo_silage','Grass silage (synthetic)',32,14,.55,.30,30,.075,['ruminant'],0,65],
 ['demo_hay','Grass hay (synthetic)',88,11,.40,.22,32,.21,['ruminant'],0,70],
 ['demo_alfalfa','Alfalfa hay (synthetic)',90,20,1.35,.25,27,.29,['ruminant'],0,55],
 ['demo_sunflower','Sunflower meal (synthetic)',90,35,.36,1.10,17,.34,['ruminant','poultry','fish','swine'],0,30],
 ['demo_limestone','Limestone (synthetic)',98,0,37,0,0,.12,['ruminant','poultry','swine'],0,2],
 ['demo_phosphate','Dicalcium phosphate (synthetic)',98,0,24,18,0,.60,['ruminant','poultry','fish','swine'],0,10],
 ['demo_fishmeal','Fish meal (synthetic)',92,57,4.0,2.6,0,1.12,['poultry','fish','swine'],0,40],
 ['demo_cassava','Cassava meal (synthetic)',90,3,.10,.12,4,.18,['ruminant','poultry','fish','swine'],0,40]
];
function demoCatalog(){return entries.map(([id,name,dm,cp,ca,p,fiber,price,groups,min,max])=>({
 id,name,recordVersion:1,dryMatterPct:dm,priceAsFed:price,priceBasis:'as_fed_kg',nutrientBasis:'dry_matter',
 nutrientsDM:{cp,ca,p,fiber},allowedGroups:groups,
 source:{referenceId:'SYNTHETIC-S1-2026',description:'Invented demonstration fixture; NOT a feed analysis or valid reference',rights:'demo_only'},
 approval:{status:'draft',reviewedBy:null,approvedOn:null,evidenceId:null},demo:true,
 minPctAsFed:min,maxPctAsFed:max,enabled:true,updatedOn:'2026-10-19',
 audit:[{date:'2026-10-19',event:'seeded',description:'Generated synthetic demonstration record; not validated'}]
}));}
const ANIMALS={
 cattle:{label:'Cattle / cow',group:'ruminant',symbol:'🐄'},buffalo:{label:'Buffalo',group:'ruminant',symbol:'🐃'},
 sheep:{label:'Sheep',group:'ruminant',symbol:'🐑'},goat:{label:'Goat',group:'ruminant',symbol:'🐐'},
 chicken:{label:'Chicken',group:'poultry',symbol:'🐓'},fish:{label:'Fish',group:'fish',symbol:'🐟'},pig:{label:'Pig / swine',group:'swine',symbol:'🐖'}
};
const API={demoCatalog,ANIMALS};
root.RationCatalog=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
