/* Ingredient evidence and approval governance. No external nutrition data implied. */
(function(root){
'use strict';
const NUTRIENTS=['cp','ca','p','fiber'];
const VALID_STATUS=new Set(['draft','in_review','approved','rejected']);
const VALID_RIGHTS=new Set(['demo_only','commercial_permitted','restricted','unknown']);
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
function finite(n){return typeof n==='number'&&Number.isFinite(n)}
function validDate(s){return typeof s==='string'&&ISO_DATE.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s}
function validateIngredient(ing){
  const errors=[];
  if(!ing||typeof ing!=='object') return {ok:false,errors:['Ingredient record must be an object']};
  if(typeof ing.id!=='string'||!/^[-_a-zA-Z0-9]{2,64}$/.test(ing.id))errors.push('Ingredient ID is invalid');
  if(typeof ing.name!=='string'||!ing.name.trim()||ing.name.length>140)errors.push('Ingredient name is missing or too long');
  if(!Number.isInteger(ing.recordVersion)||ing.recordVersion<1)errors.push('Record version is required');
  if(!finite(ing.dryMatterPct)||ing.dryMatterPct<=0||ing.dryMatterPct>100)errors.push('Dry matter % must be greater than 0 and at most 100');
  if(!finite(ing.priceAsFed)||ing.priceAsFed<0)errors.push('Price per as-fed kg must be nonnegative');
  if(ing.priceBasis!=='as_fed_kg')errors.push('Only as-fed kg prices are accepted');
  if(ing.nutrientBasis!=='dry_matter')errors.push('Nutrient basis must explicitly be dry_matter');
  for(const k of NUTRIENTS){
    if(!ing.nutrientsDM||!finite(ing.nutrientsDM[k])||ing.nutrientsDM[k]<0||ing.nutrientsDM[k]>100)errors.push(`Missing or invalid ${k} % of dry matter`);
  }
  if(!Array.isArray(ing.allowedGroups)||!ing.allowedGroups.length||ing.allowedGroups.some(x=>!['ruminant','poultry','fish','swine'].includes(x)))errors.push('Allowed animal groups must be explicit');
  if(!ing.source||typeof ing.source.referenceId!=='string'||!ing.source.referenceId.trim()||typeof ing.source.description!=='string'||!ing.source.description.trim())errors.push('Source reference ID and description are required');
  if(!ing.source||!VALID_RIGHTS.has(ing.source.rights))errors.push('Source usage rights must be explicit');
  if(!ing.approval||!VALID_STATUS.has(ing.approval.status))errors.push('Scientific approval status is required');
  if(ing.approval?.status==='approved'){
    if(ing.source?.rights!=='commercial_permitted')errors.push('Approved records require commercial reuse rights');
    if(!ing.approval.reviewedBy||!validDate(ing.approval.approvedOn)||!ing.approval.evidenceId)errors.push('Approved records require named reviewer, approval date and evidence ID');
    if(ing.demo===true)errors.push('Synthetic demonstration ingredient cannot be approved');
  }
  if(!Array.isArray(ing.audit)||!ing.audit.length||ing.audit.some(e=>!e||!validDate(e.date)||typeof e.event!=='string'||!e.event.trim()||typeof e.description!=='string'||!e.description.trim()))errors.push('Dated, descriptive audit history is required');
  if(!validDate(ing.updatedOn))errors.push('Record update date must be YYYY-MM-DD');
  return {ok:errors.length===0,errors};
}
function eligibility(ing,group,mode='sandbox'){
  const valid=validateIngredient(ing);
  if(!valid.ok)return {ok:false,reason:valid.errors.join('; ')};
  if(!ing.allowedGroups.includes(group))return {ok:false,reason:`${ing.name} is not enabled for this animal group`};
  if(!['demo_only','commercial_permitted'].includes(ing.source.rights))return {ok:false,reason:`${ing.name}: rights restricted or unknown; cannot use this record`};
  if(mode==='production'){
    if(ing.approval.status!=='approved'||ing.source.rights!=='commercial_permitted'||ing.modifiedLocally===true)
      return {ok:false,reason:`${ing.name}: independent approval and commercial data rights are required`};
  }
  return {ok:true};
}
function reviseLocally(ingredient, patch, date=new Date().toISOString().slice(0,10)){
  if(!validDate(date))throw new Error('Audit date is invalid');
  const initial=validateIngredient(ingredient);
  if(!initial.ok)throw new Error('Original record invalid: '+initial.errors.join('; '));
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length)throw new Error('A change is required');
  const allowed=['name','dryMatterPct','nutrientsDM','priceAsFed','minPctAsFed','maxPctAsFed','enabled'];
  if(Object.keys(patch).some(x=>!allowed.includes(x)))throw new Error('Edit field not permitted');
  const copy=JSON.parse(JSON.stringify(ingredient));
  Object.assign(copy,patch);
  copy.modifiedLocally=true;
  copy.approval={status:'draft',reviewedBy:null,approvedOn:null,evidenceId:null};
  copy.recordVersion+=1;
  copy.updatedOn=date;
  copy.audit.push({date,event:'local_edit',description:'Local sandbox change to '+Object.keys(patch).join(', ')+'; scientific approval reset'});
  const v=validateIngredient(copy);
  if(!v.ok)throw new Error(v.errors.join('; '));
  return copy;
}
function validateCatalog(catalog){
 const errors=[];const ids=new Set();
 for(const ing of catalog){
   const v=validateIngredient(ing);
   if(!v.ok)errors.push(`${ing.id||'unknown'}: ${v.errors.join('; ')}`);
   if(ids.has(ing.id))errors.push(`Duplicate ingredient ID ${ing.id}`);
   ids.add(ing.id);
 }
 return {ok:errors.length===0,errors};
}
const API={NUTRIENTS,validateIngredient,validateCatalog,eligibility,reviseLocally};
root.RationGovernance=API;
if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
