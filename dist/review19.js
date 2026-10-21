/* RationWise v1.9: stage-matched, user-supplied scientific review dossiers.
 * No nutrient requirement data, review credential, licence, or feeding approval is bundled.
 * Client-side evidence is self-attested and is NOT authenticated by this module.
 */
(function(root){'use strict';
const S=(typeof module!=='undefined'&&module.exports)?require('./stages'):root.RationStages;
const Sci=(typeof module!=='undefined'&&module.exports)?require('./science2'):root.RationScience2;
const SCHEMA='rationwise-nutrient-review-packet-v1';
const STATES=['draft','documented_external_review'];
const RIGHTS=['unknown','restricted','commercial_permitted'];
const SAFETY=['unassessed','documented'];
const RISK_FIELDS=Object.freeze({
 dailyIntake:'Daily dry-matter/feed intake and performance basis',
 vitaminsAndTraceMinerals:'Vitamin and trace-mineral completeness',
 ingredientSuitability:'Species-specific ingredient suitability and inclusion limits',
 feedHazards:'Mycotoxins, contamination, antinutritional factors and local hazards',
 processing:'Feed manufacturing, storage and losses',
 localRegulation:'Country/market regulatory and labeling requirements'
});
const SOURCE_CATALOG=Object.freeze([
 {group:'poultry',title:'Nutrient Requirements of Poultry, Tenth Revised Edition',year:2026,doi:'10.17226/25395',rights:'not_assessed',numericValuesBundled:false},
 {group:'swine',title:'Nutrient Requirements of Swine, Eleventh Revised Edition',year:2012,doi:'10.17226/13298',rights:'not_assessed',numericValuesBundled:false},
 {group:'ruminant',title:'Nutrient Requirements of Dairy Cattle, Eighth Revised Edition',year:2021,doi:'10.17226/25806',rights:'not_assessed',numericValuesBundled:false},
 {group:'fish',title:'Nutrient Requirements of Fish and Shrimp',year:2011,doi:'10.17226/13039',rights:'not_assessed',numericValuesBundled:false}
]);
function canonical(id){return id==='chicken'?'chicken_broiler':id==='pig'?'pig_grower':id;}
const plain=v=>typeof v==='string'&&v.trim().length>0&&v.length<=800;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function makePacket(modelId){
 modelId=canonical(modelId);const stage=S.STAGES[modelId];if(!stage)throw Error('Unknown animal and stage');
 return {schema:SCHEMA,profileId:'',revision:1,modelId,species:stage.species,stageName:stage.stage,
 population:{breedOrStrain:'',region:'',productionContext:''},
 reference:{citation:'',tableOrPage:'',derivationMethod:'',rightsStatus:'unknown',rightsProof:''},
 targets:stage.keys.map((key,i)=>({key,mode:stage.directions[i],basis:'dm',value:null,sourceLocator:''})),
 review:{status:'draft',reviewerName:'',qualification:'',evidenceId:'',reviewedOn:''},
 safety:Object.fromEntries(Object.keys(RISK_FIELDS).map(k=>[k,{status:'unassessed',evidence:''}])),
 important:'This packet documents eight selected constraints only and does not establish complete animal nutrition, feeding safety or regulatory compliance.'};
}
function assessPacket(p){
 const errors=[],gaps=[],warnings=[];
 if(!p||typeof p!=='object')return {errors:['Packet must be a JSON object'],gaps:[],warnings:[],canApply:false,scientificallyCertified:false,commerciallyAuthorized:false};
 const stage=S.STAGES[canonical(p.modelId)];
 if(p.schema!==SCHEMA)errors.push('Unsupported review packet schema');
 if(!stage)errors.push('Unknown animal/stage');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(p.profileId||''))gaps.push('Unique profile ID (3–64 letters/numbers/._-) required');
 if(!Number.isInteger(p.revision)||p.revision<1)errors.push('Revision must be positive integer');
 if(stage){if(p.modelId!==canonical(p.modelId))errors.push('Stored model ID must be canonical');
  if(p.species!==stage.species||p.stageName!==stage.stage)errors.push('Species or stage metadata does not match the stage registry');}
 for(const [k,label] of [['breedOrStrain','Breed/strain'],['region','Country/region'],['productionContext','Production context']])if(!plain(p.population?.[k]))gaps.push(label+' applicability missing');
 if(!plain(p.reference?.citation))gaps.push('Scientific source citation required');
 if(!plain(p.reference?.tableOrPage))gaps.push('Exact table/page/equation required');
 if(!plain(p.reference?.derivationMethod))gaps.push('Nutrient interpretation/derivation method required');
 if(!RIGHTS.includes(p.reference?.rightsStatus))errors.push('Unrecognized commercial rights status');
 else if(p.reference.rightsStatus!=='commercial_permitted')gaps.push('Commercial rights not documented as permitted');
 if(p.reference?.rightsStatus==='commercial_permitted'&&!plain(p.reference.rightsProof))gaps.push('Rights permission/ownership evidence ID required');
 if(!Array.isArray(p.targets))errors.push('Targets must be an array');
 if(stage&&Array.isArray(p.targets)){
  if(p.targets.length!==stage.keys.length)errors.push('Target count must exactly match this stage');
  const seen=new Set();for(const t of p.targets){
   if(!t||typeof t!=='object'||!stage.keys.includes(t.key)||seen.has(t.key)){errors.push('Unknown, malformed or duplicate nutrient target');continue;}seen.add(t.key);
   const idx=stage.keys.indexOf(t.key),n=Sci.NUTRIENTS[t.key];
   if(t.mode!==stage.directions[idx])errors.push('Incorrect min/max direction for '+t.key);
   if(t.basis!=='dm')errors.push('Target '+t.key+' must be explicitly dry-matter basis; convert separately before import');
   if(t.value===null||t.value===''||t.value===undefined)gaps.push('Missing numeric target: '+t.key);
   else if(typeof t.value!=='number'||!Number.isFinite(t.value)||t.value<0||t.value>(n.kind==='energy'?60:100))errors.push('Invalid numeric value for '+t.key);
   if(t.value!==null&&t.value!==''&&t.value!==undefined&&!plain(t.sourceLocator))gaps.push('Source locator missing for '+t.key);
  }
  for(const k of stage.keys)if(!seen.has(k))errors.push('Missing required nutrient key '+k);
 }
 if(!STATES.includes(p.review?.status))errors.push('Unknown review status');
 if(p.review?.status==='documented_external_review'){
  for(const [k,label] of [['reviewerName','Reviewer name'],['qualification','Reviewer professional qualification'],['evidenceId','Signed review document ID']])if(!plain(p.review?.[k]))gaps.push(label+' required for documented review');
  if(!validDate(p.review?.reviewedOn))gaps.push('Valid review date required');
 }else gaps.push('External professional review has not been documented');
 for(const [k,label] of Object.entries(RISK_FIELDS)){
  const row=p.safety?.[k];if(!row||!SAFETY.includes(row.status))errors.push('Unknown/absent scientific screening control: '+k);
  else if(row.status==='unassessed')gaps.push('Unassessed: '+label);
  else if(!plain(row.evidence))gaps.push('Screening evidence ID missing: '+label);
 }
 if(stage?.species==='sheep')warnings.push('Sheep-specific copper safety requires special attention');
 if(stage?.species==='buffalo')warnings.push('Buffalo nutrient targets require buffalo-specific validation rather than cow substitution');
 if(stage?.species==='fish')warnings.push('Aquaculture water quality, pellet stability and apparent digestibility are outside the core nutrient scaffold');
 warnings.push('The eight modeled nutrient fields are a partial scaffold, not a complete feeding specification');
 warnings.push('Any external-review claim and data-use right entered in a static browser is operator-supplied and unauthenticated');
 const canApply=errors.length===0&&gaps.length===0;
 return {schema:'rationwise-review-audit-v1',modelId:p.modelId,errors,gaps,warnings,
  stageFieldCount:stage?.keys.length||0,providedTargetCount:Array.isArray(p.targets)?p.targets.filter(t=>typeof t?.value==='number'&&Number.isFinite(t.value)).length:0,
  canApply,reviewDocumentedByOperator:p.review?.status==='documented_external_review',
  scientificStatus:canApply?'review_evidence_recorded_not_authenticated':'incomplete_evidence',
  scientificallyCertified:false,feedingReady:false,commerciallyAuthorized:false};
}
function applyTargets(packet,currentModelId){
 const p=assessPacket(packet);if(canonical(currentModelId)!==packet?.modelId)throw Error('Cross-species or cross-stage profile import refused');
 if(!p.canApply)throw Error('Packet cannot be applied: '+[...p.errors,...p.gaps].slice(0,4).join('; '));
 return packet.targets.map(t=>({key:t.key,mode:t.mode,basis:'dm',value:t.value}));
}
function coverage(){return Object.entries(S.STAGES).map(([modelId,stage])=>({modelId,species:stage.species,stage:stage.stage,group:stage.group,modeledNutrientFields:stage.keys.length,
 nutritionistValidated:false,approvedNumericalProfilesBundled:0,status:'scientific_review_pending'}));}
const API=Object.freeze({SCHEMA,RISK_FIELDS,SOURCE_CATALOG,canonical,makePacket,assessPacket,applyTargets,coverage});
root.RationReview19=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
