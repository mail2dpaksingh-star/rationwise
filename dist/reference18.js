/* RationWise v1.8 — historical public-source REFERENCE PREVIEW, not nutrition certification.
   This does not ship a complete ration profile. Only 3 selected percentages are transcribed
   from a 2020 USDA NRCS technical note based on 1994 NRC poultry guidance. The reference
   states values for a diet containing 90% DM, so percentage-on-DM = diet % / 0.90.
   Commercial rights for the underlying adapted NRC material have NOT been confirmed.
*/
(function(root){'use strict';
const Stages=(typeof module!=='undefined'&&module.exports)?require('./stages'):root.RationStages;
const SOURCE=Object.freeze({
 id:'USDA-NRCS-TN-190-NM-4-2020',title:'Feed and Animal Management for Poultry',year:2020,
 url:'https://directives.nrcs.usda.gov/sites/default/files2/1719834722/Nutrient%20Management%20190-04%2C%20Feed%20and%20Animal%20Management%20for%20Poultry.pdf',
 originalBasis:'diet at 90% dry matter (as-fed composition)',dryMatterFraction:0.9,
 originallyAdaptedFrom:'NRC Nutrient Requirements of Poultry (1994)',
 scientificStatus:'historical_partial_not_validated_for_modern_flocks',
 rightsStatus:'underlying_rights_not_cleared_for_commercial_redistribution'
});
const CURRENT=Object.freeze({year:2026,title:'Nutrient Requirements of Poultry: Tenth Revised Edition',url:'https://doi.org/10.17226/25395',contentBundled:false,rightsStatus:'requires_independent_check'});
// Only CP, total Ca and Na correspond clearly to existing RationWise stage keys.
// Non-phytate phosphorus from the source is NOT copied into 'available P' (different metrics).
const BROILER=Object.freeze({
 chicken_broiler_starter:{label:'Broiler, 0–3 weeks (historical)',start:0,end:21,cp:23.0,ca:1.0,na:0.2},
 chicken_broiler:{label:'Broiler, 3–6 weeks (historical)',start:21,end:42,cp:20.0,ca:0.9,na:0.15},
 chicken_broiler_finisher:{label:'Broiler, 6–8 weeks (historical)',start:42,end:56,cp:18.0,ca:0.8,na:0.12}
});
const LAYER=Object.freeze([
 {intake:80,cp:18.8,ca:4.06,na:0.19},
 {intake:100,cp:15.0,ca:3.25,na:0.15},
 {intake:120,cp:12.5,ca:2.71,na:0.13}
]);
const cleanNumber=v=>typeof v==='number'&&Number.isFinite(v);
function interpolateLayer(intake){
 if(!cleanNumber(intake)||intake<80||intake>120)throw Error('Layer daily feed intake must be 80–120 g/hen/day for this legacy reference. No extrapolation.');
 const p=LAYER.find(x=>x.intake===intake);
 if(p)return {...p};
 for(let i=1;i<LAYER.length;i++)if(intake<LAYER[i].intake){
  const lo=LAYER[i-1],hi=LAYER[i],ratio=(intake-lo.intake)/(hi.intake-lo.intake);
  return Object.fromEntries(['intake','cp','ca','na'].map(k=>[k,k==='intake'?intake:lo[k]+ratio*(hi[k]-lo[k])]));
 }
 throw Error('Unable to interpolate layer intake');
}
function canonical(modelId){return modelId==='chicken'?'chicken_broiler':modelId==='pig'?'pig_grower':modelId;}
function getPreview({modelId,ageDays,feedIntakeGPerDay}={}){
 const stageId=canonical(modelId),stage=Stages.STAGES[stageId];
 if(!stage)throw Error('Unrecognized animal production stage');
 const available=Object.keys(BROILER).includes(stageId)||stageId==='chicken_layer';
 if(!available)return {status:'no_numerical_reference',modelId:stageId,species:stage.species,stage:stage.stage,
  message:'No stage-matched numerical reference pack is bundled for this stage; enter a licensed and qualified-reviewed requirement profile.',
  targets:[],missing:stage.keys.slice(),source:null,feedingReady:false,commercialRightsCleared:false};
 let raw,context;
 if(stageId==='chicken_layer'){
  raw=interpolateLayer(feedIntakeGPerDay);context={feedIntakeGPerDay};
 } else {
  const profile=BROILER[stageId];
  if(!cleanNumber(ageDays)||ageDays<profile.start||ageDays>=profile.end)throw Error('Age must be within '+profile.start+' to <'+profile.end+' days for '+profile.label+'. No extrapolation or cross-stage substitution.');
  raw=profile;context={ageDays};
 }
 const targets=['cp','ca','na'].map(key=>({key,mode:'min',basis:'dm',value:Math.round(raw[key]/SOURCE.dryMatterFraction*1e8)/1e8,
  sourceAsFedPercent:raw[key],sourceDietDMPercent:90,unit:'%',conversion:'% DM = source diet % / 0.90'}));
 const missing=stage.keys.filter(k=>!targets.some(t=>t.key===k));
 return {status:'historical_reference_preview_only',modelId:stageId,species:stage.species,stage:stage.stage,
  source:SOURCE,moreCurrentReference:CURRENT,context,targets,missing,
  coverageFraction:targets.length/stage.keys.length, feedingReady:false,commercialRightsCleared:false,
  notes:['2020 USDA NRCS note adapts NRC 1994 values; not necessarily suitable for 2026 genetics or international conditions.',
   'Only crude protein, total calcium and sodium can map directly to this solver scaffold.',
   'Source non-phytate phosphorus is not equivalent to this software’s available phosphorus field.',
   'Digestible amino acids, metabolizable energy, fiber limits, vitamins, trace minerals, feed intake and safety must still be assessed.',
   'The original document references a 90% dry-matter diet; values here are converted to 100% DM.',
   'No human scientific review and no commercial rights clearance have been performed for the bundled historical numeric facts.']};
}
function auditPreview(p){
 if(!p||!Stages.STAGES[p.modelId])throw Error('Unknown preview');
 return {schema:'rationwise-reference-audit-v1',generatedAt:new Date().toISOString(),preview:p,
  allowedUse:'educational historical comparison only',doNotUseFor:'animal feeding, diet certification or automatic commercial recommendations'};
}
const API=Object.freeze({SOURCE,CURRENT,BROILER,LAYER,canonical,interpolateLayer,getPreview,auditPreview});
root.RationReference18=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
