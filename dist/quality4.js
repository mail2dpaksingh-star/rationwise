/* RationWise v1.5 - optional, auditable scientific readiness layer.
 * Never conflates a mathematically feasible formulation with certified animal feed.
 * Reference records/values must be supplied by an authorized rightsholder.
 */
(function(root){'use strict';
const Nutrients=(typeof module!=='undefined'&&module.exports?require('./science2'):root.RationScience2).NUTRIENTS;
const allowedBases=['dry_matter','as_fed'];
const requiredLabColumns=['ingredient_name','nutrient_key','reported_value','reported_unit','basis','sample_date','laboratory','method_reference','evidence_id','rights_status'];
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
const validValue=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function convertToDm({key,value,unit,basis,dryMatterPct}){
 if(!Object.hasOwn(Nutrients,key))throw Error('Unrecognized nutrient: '+key);
 if(!validValue(value)||!Number.isFinite(dryMatterPct)||dryMatterPct<=0||dryMatterPct>100)throw Error('Value/DM must be finite, nonnegative and dry matter >0 and <=100');
 if(!allowedBases.includes(basis))throw Error('Nutrient basis must be dry_matter or as_fed');
 const energy=Nutrients[key].kind==='energy';
 let normalized;
 if(energy){if(unit==='MJ/kg')normalized=value;else if(unit==='kcal/kg')normalized=value*0.004184;else throw Error('Energy requires MJ/kg or kcal/kg');}
 else {if(unit==='%')normalized=value;else if(unit==='g/kg')normalized=value/10;else if(unit==='mg/kg')normalized=value/10000;else throw Error('Mass-fraction nutrients require %, g/kg or mg/kg');}
 if(basis==='as_fed')normalized=normalized/(dryMatterPct/100);
 const max=energy?60:100;
 if(normalized>max+1e-9)throw Error('Normalized '+key+' exceeds maximum '+max+' '+Nutrients[key].unit+' DM; check units, moisture and analyte basis');
 return Number(normalized.toPrecision(12));
}
function parseCsv(text){
 if(typeof text!=='string')throw Error('CSV must be text');if(text.length>1e6)throw Error('CSV exceeds 1MB');
 const out=[];let row=[],cur='',quotes=false,s=text.replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){const c=s[i];if(quotes){if(c==='"'&&s[i+1]==='"'){cur+='"';i++;}else if(c==='"')quotes=false;else cur+=c;}
 else if(c==='"'){if(cur.length)throw Error('Malformed CSV quote');quotes=true;}
 else if(c===','){row.push(cur);cur='';}
 else if(c==='\r'||c==='\n'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cur);if(row.some(x=>x.trim()))out.push(row);row=[];cur='';}
 else cur+=c;}
 if(quotes)throw Error('Unclosed CSV field');row.push(cur);if(row.some(x=>x.trim()))out.push(row);
 if(!out.length||out[0].length!==requiredLabColumns.length||out[0].some((h,i)=>h.trim()!==requiredLabColumns[i]))throw Error('Lab CSV header mismatch; download the standard template');
 const records=[];const seen=new Set();
 if(out.length>1501)throw Error('Maximum 1,500 assay records per import');
 out.slice(1).forEach((cells,i)=>{
  if(cells.length!==requiredLabColumns.length)throw Error('Row '+(i+2)+': wrong number of CSV columns');
  const rec=Object.fromEntries(requiredLabColumns.map((h,j)=>[h,cells[j].trim()]));
  if(!nonempty(rec.ingredient_name)||!nonempty(rec.nutrient_key))throw Error('Row '+(i+2)+': ingredient and analyte required');
  if(!isDate(rec.sample_date)||!nonempty(rec.laboratory)||!nonempty(rec.method_reference)||!nonempty(rec.evidence_id))throw Error('Row '+(i+2)+': lab, sample date, method and evidence must be specified');
  if(!['owned_by_user','licensed_for_commercial_use','restricted','unknown'].includes(rec.rights_status))throw Error('Row '+(i+2)+': invalid rights status');
  if(!allowedBases.includes(rec.basis))throw Error('Row '+(i+2)+': basis invalid');
  if(rec.nutrient_key!=='dry_matter'&&!Object.hasOwn(Nutrients,rec.nutrient_key))throw Error('Row '+(i+2)+': unsupported nutrient');
  const v=Number(rec.reported_value);if(rec.reported_value===''||!validValue(v))throw Error('Row '+(i+2)+': nutrient value must be present and nonnegative');
  rec.reported_value=v;
  if(rec.nutrient_key==='dry_matter'&&(rec.reported_unit!=='%'||rec.basis!=='as_fed'||v<=0||v>100))throw Error('Row '+(i+2)+': dry_matter must be % as_fed in (0,100]');
  const key=rec.ingredient_name.trim().toLocaleLowerCase('en-US')+'::'+rec.nutrient_key;
  if(seen.has(key))throw Error('Duplicate ingredient/analyte: '+key);seen.add(key);
  records.push(rec);
 });
 return records;
}
function normalizeLabRecords(records){
 if(!Array.isArray(records)||!records.length)throw Error('Laboratory records required');
 const groups=new Map();
 for(const r of records){const id=r.ingredient_name.trim().toLocaleLowerCase('en-US');if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);}
 const converted=[];
 for(const rows of groups.values()){
  const dm=rows.find(r=>r.nutrient_key==='dry_matter');
  if(!dm)throw Error(rows[0].ingredient_name+': explicit dry_matter assay required to normalize lab data');
  if(dm.rights_status==='restricted'||dm.rights_status==='unknown')throw Error(dm.ingredient_name+': dry-matter source use rights unavailable');
  const metadata={laboratory:dm.laboratory,sampleDate:dm.sample_date,method:dm.method_reference,evidenceId:dm.evidence_id,rights:dm.rights_status};
  const analytes={},lineage={};
  for(const r of rows){if(r.nutrient_key==='dry_matter')continue;
   if(r.rights_status==='restricted'||r.rights_status==='unknown')throw Error(r.ingredient_name+': unlicensed/unknown use rights for '+r.nutrient_key);
   // Do not assume analytical methods are interchangeable; each analyte retains its own method.
   analytes[r.nutrient_key]=convertToDm({key:r.nutrient_key,value:r.reported_value,unit:r.reported_unit,basis:r.basis,dryMatterPct:dm.reported_value});
   lineage[r.nutrient_key]={rawValue:r.reported_value,rawUnit:r.reported_unit,basis:r.basis,sampleDate:r.sample_date,laboratory:r.laboratory,method:r.method_reference,evidenceId:r.evidence_id,rights:r.rights_status};
  }
  converted.push({name:dm.ingredient_name,dryMatterPct:dm.reported_value,nutrients:analytes,lineage,metadata});
 }
 return converted;
}
const issue=(severity,code,message,ingredient=null)=>({severity,code,message,...(ingredient?{ingredient}:{})});
function assessReadiness({ingredients=[],profile=null,result=null,controls={}}={}){
 const issues=[];
 if(!profile||!Array.isArray(profile.targets)||profile.targets.length===0)issues.push(issue('block','TARGETS_MISSING','No stage targets defined'));
 if(!result||result.status!=='optimal')issues.push(issue('block','SOLUTION_MISSING','No mathematically feasible result available'));
 if(!controls.authenticatedReviewer)issues.push(issue('block','REVIEWER_UNVERIFIED','Reviewer identity and approval have not been verified by an authenticated backend'));
 if(!controls.regionRegulatoryReview)issues.push(issue('block','REGION_RULES_UNVERIFIED','Country-specific feed ingredient and regulatory restrictions have not been verified'));
 if(!controls.premixAndMicronutrientReview)issues.push(issue('block','MICRONUTRIENT_REVIEW_MISSING','Micronutrients, vitamins, electrolyte balance and premixes have not been independently reviewed'));
 if(!controls.manufacturingQA)issues.push(issue('block','MANUFACTURING_QA_MISSING','Manufacturing QC and processing validation are not recorded'));
 if(!Array.isArray(ingredients)||!ingredients.length)issues.push(issue('block','INGREDIENTS_MISSING','No ingredients entered'));
 const used=new Set((result?.rows||[]).filter(r=>r.kgAsFed>1e-8).map(r=>r.name.toLocaleLowerCase('en-US')));
 for(const ing of ingredients){
  const name=(ing.name||'Unknown ingredient').trim();
  // Only active ingredients contribute to feed safety decision.
  if(result?.status==='optimal'&&!used.has(name.toLocaleLowerCase('en-US')))continue;
  if(!nonempty(ing.analysisRef)||!nonempty(ing.rightsRef))issues.push(issue('block','INGREDIENT_EVIDENCE_MISSING','Laboratory/rights evidence missing',name));
  if(ing.hazardStatus==='fail')issues.push(issue('block','HAZARD_FAILED','Ingredient has a failed hazard/safety screen; DO NOT USE',name));
  else if(ing.hazardStatus!=='passed')issues.push(issue('block','HAZARD_UNVERIFIED','Ingredient contaminant and suitability screen is not confirmed',name));
  if(!nonempty(ing.hazardEvidence))issues.push(issue('block','HAZARD_EVIDENCE_MISSING','Hazard screening documentation not identified',name));
  if(!ing.labMeta?.sampleDate||!isDate(ing.labMeta.sampleDate)||!nonempty(ing.labMeta.laboratory)||!nonempty(ing.labMeta.method))issues.push(issue('block','LAB_TRACE_INCOMPLETE','Sample date, laboratory or method not recorded for imported analytical evidence',name));
  const vals=ing.nutrients||{};
  for(const t of profile?.targets||[]){
   if(vals[t.key]===''||vals[t.key]===undefined||!Number.isFinite(Number(vals[t.key])))issues.push(issue('block','NUTRIENT_NOT_MEASURED','Nutrient '+t.key+' missing; never substitute zero',name));
   if(!ing.lineage||!ing.lineage[t.key])issues.push(issue('warning','ANALYTE_LINEAGE_UNCONFIRMED','Nutrient '+t.key+' entered manually, without individual assay metadata',name));
  }
 }
 return {releaseReady:issues.every(i=>i.severity!=='block'),issues,blockingCount:issues.filter(i=>i.severity==='block').length,warningCount:issues.filter(i=>i.severity==='warning').length,classification:'LOCAL PREFLIGHT ONLY — NOT A CERTIFICATE; SERVER-SIDE AND EXPERT APPROVAL REQUIRED'};
}
function labCsvTemplate(){return requiredLabColumns.join(',')+'\r\n';}
const API={convertToDm,parseCsv,normalizeLabRecords,assessReadiness,labCsvTemplate,requiredLabColumns};
root.RationQuality4=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
