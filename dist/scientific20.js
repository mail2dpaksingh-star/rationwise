/* RationWise v2.0: expanded nutrient-panel least-cost calculations.
 * All concentrations per kg dry matter, unit explicitly specified by analyte.
 * Scientific approval, ingredient suitability and feed-release are NOT performed.
 * No numerical animal requirements or ingredient profiles are bundled.
 */
(function(root){'use strict';
const LP=typeof module!=='undefined'&&module.exports?require('./solver'):root.RationLP;
const ST=typeof module!=='undefined'&&module.exports?require('./stages'):root.RationStages;
const BASE=typeof module!=='undefined'&&module.exports?require('./science2'):root.RationScience2;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const fin=v=>typeof v==='number'&&Number.isFinite(v);
const finiteRange=(v,lo,hi)=>fin(v)&&v>=lo&&v<=hi;
const nutrients={};
for(const [key,p] of Object.entries(BASE.NUTRIENTS))nutrients[key]={name:p.name,unit:p.unit,max:p.kind==='energy'?80:100,group:BASE.SPECIALIZED_NUTRIENTS?.[key]||null};
const extend={
 digThr:{name:'Digestible threonine, poultry',unit:'%',max:100,group:'poultry'},
 sidMetCys:{name:'SID methionine + cystine, swine',unit:'%',max:100,group:'swine'},
 mg:{name:'Magnesium',unit:'%',max:100},k:{name:'Potassium',unit:'%',max:100},cl:{name:'Chloride',unit:'%',max:100},
 zn:{name:'Zinc',unit:'mg/kg',max:1000000},cu:{name:'Copper',unit:'mg/kg',max:1000000},mn:{name:'Manganese',unit:'mg/kg',max:1000000},fe:{name:'Iron',unit:'mg/kg',max:1000000},
 se:{name:'Selenium',unit:'mg/kg',max:1000000},iodine:{name:'Iodine',unit:'mg/kg',max:1000000},
 vitA:{name:'Vitamin A activity',unit:'IU/kg',max:100000000},vitD3:{name:'Vitamin D3 activity',unit:'IU/kg',max:100000000},vitE:{name:'Vitamin E activity',unit:'IU/kg',max:100000000}
};
Object.assign(nutrients,extend);
// More conservative stage-specific panel lists for scientific REVIEW, not nutrient recommendations.
const panels={
 chicken_broiler:{label:'Broiler grower · extended nutrient panel',keys:['cp','me','digLys','digMetCys','digThr','ca','availP','na','fiber','mg','k','cl','zn','cu','mn','se','vitA','vitD3','vitE'],required:['cp','me','digLys','digMetCys','ca','availP','na'],
 maxKeys:['fiber'],issues:['Strain and age-specific amino acid ratios','Feed intake and premix specifications','Electrolyte balance and feed additive limits']},
 pig_grower:{label:'Grower pig · extended nutrient panel',keys:['cp','neSwine','sidLys','sidThr','sidMetCys','sttdP','ca','na','fiber','mg','k','cl','zn','cu','se','vitA','vitD3','vitE'],required:['cp','neSwine','sidLys','sidThr','sttdP','ca','na'],
 maxKeys:['fiber'],issues:['Actual SID amino-acid assay/source','STTD phosphorus system and phytase matrix','Genetics, growth and feed-intake context']},
 cattle_dairy:{label:'Dairy cow lactation · total mixed ration panel',keys:['cp','nel','ndf','starch','fat','ca','p','na','mg','k','cl','zn','cu','mn','se','vitA','vitD3','vitE'],required:['cp','nel','ndf','starch','fat','ca','p','na'],
 maxKeys:['starch','fat'],issues:['Actual dry-matter intake and forage physical effectiveness','MP/RDP/RUP, forage mineral and effective-fiber evaluation','DCAD, milk output and cow-specific risk factors']}
};
const aliases={chicken:'chicken_broiler',pig:'pig_grower'};
function canonical(id){return aliases[id]||id;}
function blank(modelId='chicken_broiler'){
 const id=canonical(modelId),p=panels[id];if(!p)throw Error('v2.0 scientific panel is not available for this stage');
 const st=ST.STAGES?.[id]||ST.STAGE_MODELS?.[id]||ST.STAGE_DEFINITIONS?.[id];
 const constraints=p.keys.map(key=>({key,mode:p.maxKeys.includes(key)?'max':'min',basis:'dm',value:null,locator:''}));
 return {schema:'rationwise-scientific-panel-2.0',modelId:id,species:st?.species||({chicken_broiler:'chicken',pig_grower:'pig',cattle_dairy:'cattle'}[id]),
  batchKgAsFed:1000,market:{country:'US',currency:'USD'},animalContext:{age:'',bodyWeightKg:null,production:'',genetics:''},
  reference:{citation:'',exactLocator:'',rightsStatus:'unknown',rightsProof:'',reviewStatus:'draft',reviewer:'',reviewEvidence:''},
  constraints,ingredients:[blankIngredient('ingredient_1'),blankIngredient('ingredient_2')]};
}
function blankIngredient(id){return {id,name:'',dryMatterPct:null,pricePerKgAsFed:null,minPctAsFed:0,maxPctAsFed:100,analysisRef:'',priceRef:'',safetyStatus:'not_screened',nutrients:{}};}
function profileAudit(p){
 const errors=[],gaps=[],warnings=[];
 if(!p||typeof p!=='object'||p.schema!=='rationwise-scientific-panel-2.0')return {errors:['Unsupported scientific-panel JSON schema'],gaps,warnings,canCalculate:false,feedingReady:false};
 const id=canonical(p.modelId),def=panels[id];
 if(!def)return {errors:['Unrecognized model/stage'],gaps,warnings,canCalculate:false,feedingReady:false};
 const spec={chicken_broiler:'chicken',pig_grower:'pig',cattle_dairy:'cattle'}[id];
 if(p.species!==spec)errors.push('Model/species mismatch');
 if(!finiteRange(p.batchKgAsFed,0.000001,1e9))errors.push('Batch size must be >0 kg as-fed');
 if(!/^[A-Z]{2}$/.test(p.market?.country||'')||!/^[A-Z]{3}$/.test(p.market?.currency||''))errors.push('ISO country/currency invalid');
 if(!Array.isArray(p.constraints)||!p.constraints.length)errors.push('No nutrient requirements');
 const limits=[],seen=new Set();
 for(const t of (Array.isArray(p.constraints)?p.constraints:[])){
  const specN=nutrients[t?.key];
  if(!specN||!def.keys.includes(t.key)){errors.push('Unexpected nutrient: '+String(t?.key));continue;}
  if(!['min','max'].includes(t.mode)||!['dm','as_fed'].includes(t.basis))errors.push(t.key+': invalid direction or basis');
  const signature=t.key+':'+t.mode+':'+t.basis;if(seen.has(signature))errors.push('Duplicate nutrient constraint: '+signature);seen.add(signature);
  if(t.value==null||t.value===''){gaps.push(t.key+': numerical requirement missing');continue;}
  if(!finiteRange(t.value,0,specN.max))errors.push(t.key+': numeric value or unit range invalid');
  else limits.push(t);
  if(!String(t.locator||'').trim())gaps.push(t.key+': exact evidence locator missing');
 }
 for(const k of def.required)if(!limits.some(t=>t.key===k))gaps.push('Core stage constraint missing: '+k);
 if(!Array.isArray(p.ingredients)||p.ingredients.length<2||p.ingredients.length>60)errors.push('Enter 2 to 60 ingredient records');
 const ids=new Set();
 for(const ing of (Array.isArray(p.ingredients)?p.ingredients:[])){
  if(typeof ing?.id!=='string'||!ing.id.trim()||ids.has(ing.id))errors.push('Unique ingredient ID required');ids.add(ing?.id);
  if(typeof ing?.name!=='string'||!ing.name.trim())errors.push('Ingredient name required');
  if(!finiteRange(ing?.dryMatterPct,0.000001,100))errors.push((ing?.name||ing?.id)+': dry matter must be 0–100% (nonzero)');
  if(!finiteRange(ing?.pricePerKgAsFed,0,1e12))errors.push((ing?.name||ing?.id)+': local price per kg as-fed missing');
  if(!finiteRange(ing?.minPctAsFed,0,100)||!finiteRange(ing?.maxPctAsFed,0,100)||ing.minPctAsFed>ing.maxPctAsFed)errors.push((ing?.name||ing?.id)+': invalid as-fed inclusion limits');
  if(!String(ing?.analysisRef||'').trim())gaps.push((ing?.name||ing?.id)+': analytical source/CoA missing');
  if(!String(ing?.priceRef||'').trim())gaps.push((ing?.name||ing?.id)+': price evidence missing');
  if(ing?.safetyStatus==='fail')errors.push((ing.name||ing.id)+': FAILED feed-safety screen (blocked)');
  else if(ing?.safetyStatus!=='pass')gaps.push((ing?.name||ing?.id)+': feed safety not verified');
  for(const t of limits){const v=ing?.nutrients?.[t.key];if(!finiteRange(v,0,nutrients[t.key].max))errors.push((ing?.name||ing?.id)+': missing/invalid '+t.key+' ('+nutrients[t.key].unit+' DM)');}
 }
 if(!p.reference?.citation||!p.reference?.exactLocator)gaps.push('Source reference and exact table/equation locator not documented');
 if(p.reference?.rightsStatus!=='commercial_permitted'||!p.reference?.rightsProof)gaps.push('Commercial-use permission not verified');
 if(p.reference?.reviewStatus!=='externally_reviewed'||!p.reference?.reviewer||!p.reference?.reviewEvidence)gaps.push('External nutritionist review not documented');
 if(!p.animalContext?.age||!p.animalContext?.genetics)gaps.push('Age/stage and genetic line not documented');
 if(id==='cattle_dairy'&&!p.animalContext?.production)gaps.push('Milk output and diet intake not documented');
 if(limits.length<def.keys.length)warnings.push('Optional nutrients are not constrained; panel is not a complete diet design.');
 warnings.push('Review metadata and ingredient source records are user-supplied, NOT authenticated by this offline website.');
 return {errors,gaps,warnings,canCalculate:errors.length===0&&limits.length>0,feedingReady:false,scientificallyCertified:false,commerciallyAuthorized:false,
  constrained:limits.length,coreCovered:def.required.filter(k=>limits.some(t=>t.key===k)).length,coreTotal:def.required.length,available:def.keys.length};
}
function solvePanel(p){
 const audit=profileAudit(p);const status={scientificStatus:'COMPUTATIONAL RESULT ONLY — NOT A FEEDING APPROVAL',audit};
 if(!audit.canCalculate)return {status:'blocked',message:audit.errors.join('; ')||'Insufficient data',...status};
 const ing=p.ingredients,targets=p.constraints.filter(t=>t.value!=null&&t.value!=='');
 const boundsMin=ing.reduce((s,i)=>s+i.minPctAsFed,0),boundsMax=ing.reduce((s,i)=>s+i.maxPctAsFed,0);
 if(boundsMin>100+1e-8||boundsMax<100-1e-8)return {status:'infeasible',message:'Ingredient inclusion bounds cannot sum to 100%.',...status};
 const n=ing.length,A=[],b=[];
 function upper(a,v){if(!a.every(fin)||!fin(v))throw Error('Invalid linear constraints');A.push(a);b.push(v);}
 for(let j=0;j<n;j++){const a=Array(n).fill(0);a[j]=1;upper(a,ing[j].maxPctAsFed-ing[j].minPctAsFed);}
 upper(Array(n).fill(1),100-boundsMin);upper(Array(n).fill(-1),boundsMin-100);
 for(const t of targets){
  const a=ing.map(i=>i.dryMatterPct/100*(i.nutrients[t.key]-(t.basis==='dm'?t.value:0)));
  const rhs=t.basis==='dm'?0:100*t.value;
  const fix=ing.reduce((s,i,j)=>s+i.minPctAsFed*a[j],0);
  if(t.mode==='min')upper(a.map(x=>-x),fix-rhs);else upper(a,rhs-fix);
 }
 let r;try{r=new LP.LPSolver(A,b,ing.map(i=>-i.pricePerKgAsFed)).solve()}catch(e){return {status:'error',message:e.message,...status};}
 if(r.status!=='optimal')return {status:r.status,message:'No least-cost blend meets all stated mathematical constraints.',...status};
 const rows=ing.map((i,j)=>{const pct=i.minPctAsFed+r.values[j];const kgAsFed=p.batchKgAsFed*pct/100,kgDM=kgAsFed*i.dryMatterPct/100;
  return {id:i.id,name:i.name,sharePctAsFed:pct,kgAsFed,kgDM,cost:kgAsFed*i.pricePerKgAsFed,pricePerKgAsFed:i.pricePerKgAsFed,safetyStatus:i.safetyStatus,analysisRef:i.analysisRef};});
 const totalDM=rows.reduce((s,x)=>s+x.kgDM,0),cost=rows.reduce((s,x)=>s+x.cost,0);
 if(totalDM<=0)return {status:'error',message:'No dry matter in solution',...status};
 const checks=targets.map(t=>{
  const total=rows.reduce((s,x,j)=>s+x.kgDM*ing[j].nutrients[t.key],0);
  const actual=total/(t.basis==='dm'?totalDM:p.batchKgAsFed);
  return {key:t.key,name:nutrients[t.key].name,unit:nutrients[t.key].unit,basis:t.basis,mode:t.mode,required:t.value,achieved:actual,met:t.mode==='min'?actual>=t.value-1e-6:actual<=t.value+1e-6};
 });
 if(checks.some(x=>!x.met)||Math.abs(rows.reduce((s,x)=>s+x.kgAsFed,0)-p.batchKgAsFed)>1e-5*Math.max(1,p.batchKgAsFed))return {status:'error',message:'Independent mass/nutrient checks failed.',...status};
 return {status:'optimal',currency:p.market.currency,modelId:canonical(p.modelId),batchKgAsFed:p.batchKgAsFed,totalKgDM:totalDM,blendDryMatterPct:100*totalDM/p.batchKgAsFed,
  costTotal:cost,pricePerKgAsFed:cost/p.batchKgAsFed,pricePerKgDM:cost/totalDM,
  rows:rows.filter(x=>x.kgAsFed>1e-7).sort((a,b)=>b.kgAsFed-a.kgAsFed),checks,...status};
}
const api={NUTRIENTS:Object.freeze(nutrients),PANELS:Object.freeze(panels),blank,blankIngredient,canonical,profileAudit,solvePanel};
root.RationScientific20=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
