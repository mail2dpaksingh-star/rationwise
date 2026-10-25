/* RationWise scientific evidence import: source data != feeding certification. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.RationEvidence=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const GROUPS=['ruminant','poultry','swine','fish'];
const NUTRIENTS=['cp','ca','p','fiber','me','neSwine','digLys','sidLys','sidThr','sttdP','digMetCys','availP','na','ndf','starch','fat','nel','meRuminant','deFish','digLysFish','availPFish'];
const ENERGY=new Set(['me','neSwine','nel','meRuminant','deFish']);
const SPECIFIC={me:'poultry',digLys:'poultry',digMetCys:'poultry',availP:'poultry',neSwine:'swine',sidLys:'swine',sidThr:'swine',sttdP:'swine',nel:'ruminant',meRuminant:'ruminant',ndf:'ruminant',starch:'ruminant',deFish:'fish',digLysFish:'fish',availPFish:'fish'};
const RIGHTS=['cc0','cc_by','owner_data','licensed','restricted','unknown'];
const TYPES=['feed_lab','feed_reference','food_composition'];
const isText=x=>typeof x==='string'&&x.trim().length>0&&x.length<=700;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function numericValue(m,dm){
 if(!NUTRIENTS.includes(m.key))throw Error('Unknown nutrient '+m.key);
 if(!finite(m.value)||m.value<0)throw Error('Invalid nutrient number '+m.key);
 if(!['dry_matter','as_fed'].includes(m.basis))throw Error('Unknown nutrient basis '+m.key);
 const isEnergy=ENERGY.has(m.key);
 let value;
 if(isEnergy){if(!['MJ/kg','kcal/kg'].includes(m.unit))throw Error('Energy unit must be MJ/kg or kcal/kg');value=m.value*(m.unit==='kcal/kg'?0.004184:1);}
 else {if(!['%','g/kg','mg/kg'].includes(m.unit))throw Error('Composition unit must be %, g/kg or mg/kg');value=m.value*(m.unit==='g/kg'?0.1:m.unit==='mg/kg'?0.0001:1);}
 if(m.basis==='as_fed')value=value/(dm/100);
 if(!Number.isFinite(value)||value>(isEnergy?60:100)+1e-7)throw Error('Out of range normalized nutrient '+m.key);
 return Number(value.toFixed(8));
}
function assess(record){
 const errors=[],warnings=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return {valid:false,errors:['Record must be an object'],warnings,normalized:null};
 if(!isText(record.id)||!isText(record.name))errors.push('ID and ingredient name required');
 if(!GROUPS.includes(record.group))errors.push('Valid animal group required');
 if(!TYPES.includes(record.sourceType))errors.push('Source type must be feed_lab, feed_reference or food_composition');
 const s=record.source||{};
 for(const f of ['publisher','referenceId','method','observedOn'])if(!isText(s[f]))errors.push('Source '+f+' required');
 if(isText(s.observedOn)&&(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s.observedOn)||Number.isNaN(Date.parse(s.observedOn))||new Date(s.observedOn+'T00:00:00Z').toISOString().slice(0,10)!==s.observedOn))errors.push('Source date must be a valid YYYY-MM-DD');
 if(!RIGHTS.includes(s.rights))errors.push('Rights classification required');
 if(['cc_by','owner_data','licensed'].includes(s.rights)&&!isText(s.rightsEvidence))errors.push('Rights document / evidence identifier required');
 if(!finite(record.dryMatterPct)||record.dryMatterPct<=0||record.dryMatterPct>100)errors.push('Measured dry matter required: >0 to 100% as-fed');
 if(!Array.isArray(record.measurements)||record.measurements.length===0||record.measurements.length>80)errors.push('At least one nutrient measurement required (max 80)');
 let normalized={};const seen=new Set();
 for(const m of Array.isArray(record.measurements)?record.measurements.slice(0,81):[]){
  if(!m||typeof m!=='object'){errors.push('Malformed measurement');continue;}
  if(seen.has(m.key)){errors.push('Duplicate nutrient '+m.key);continue;}seen.add(m.key);
  if(SPECIFIC[m.key]&&SPECIFIC[m.key]!==record.group){errors.push(m.key+' belongs to '+SPECIFIC[m.key]+' not '+record.group);continue;}
  if(record.sourceType==='food_composition'&&['me','nel','neSwine','meRuminant','deFish','digLys','digMetCys','sidLys','sidThr','sttdP','availP','digLysFish','availPFish'].includes(m.key)){errors.push('Food-composition record cannot claim feed-system '+m.key);continue;}
  try{if(!finite(record.dryMatterPct)||record.dryMatterPct<=0)continue;normalized[m.key]=numericValue(m,record.dryMatterPct);}catch(err){errors.push(err.message);}
 }
 if(record.sourceType==='food_composition')warnings.push('Human-food composition values are not feed-energy or animal digestibility values. Preview only.');
 if(!['cc0','cc_by','owner_data','licensed'].includes(s.rights))warnings.push('Use rights not documented; preview only.');
 if(!isText(s.reviewer)||!isText(s.reviewEvidence))warnings.push('Independent feeding review not documented.');
 warnings.push('Importer does not verify source authenticity, laboratory method, contaminant safety or diet adequacy.');
 const rightsOK=['cc0','cc_by','owner_data','licensed'].includes(s.rights)&&(!['cc_by','owner_data','licensed'].includes(s.rights)||isText(s.rightsEvidence));
 const copyCandidate=errors.length===0&&rightsOK&&record.sourceType!=='food_composition';
 return {valid:errors.length===0,errors,warnings,normalized:errors.length?null:normalized,copyCandidate,rightsOK};
}
function parsePack(raw){
 if(typeof raw==='string'&&raw.length>2e6)throw Error('Evidence file exceeds 2 MB');
 const obj=typeof raw==='string'?JSON.parse(raw):raw;
 if(!obj||obj.schema!=='rationwise-evidence-1'||!Array.isArray(obj.records))throw Error('Expected schema rationwise-evidence-1 with records[]');
 if(obj.records.length>120)throw Error('Maximum 120 entries per evidence pack');
 const ids=new Set(),validated=[];
 for(const r of obj.records){const a=assess(r);if(ids.has(r?.id)){a.errors.push('Duplicate record ID');a.valid=false;a.copyCandidate=false;a.normalized=null;}ids.add(r?.id);validated.push({record:r,assessment:a});}
 return {schema:obj.schema,records:validated};
}
function blankPack(){return {schema:'rationwise-evidence-1',records:[{id:'REPLACE-LOT-ID',name:'Enter an ingredient',group:'poultry',sourceType:'feed_lab',dryMatterPct:null,source:{publisher:'',referenceId:'',method:'',observedOn:'2026-10-24',rights:'unknown',rightsEvidence:'',url:'',reviewer:'',reviewEvidence:''},measurements:[{key:'cp',value:null,unit:'%',basis:'dry_matter'}]}]};}
return Object.freeze({assess,numericValue,parsePack,blankPack,GROUPS,NUTRIENTS});
});
