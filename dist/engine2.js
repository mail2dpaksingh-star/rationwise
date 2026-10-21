/* RationWise 1.2 science+market LP. All choices x_i are kg as-fed percentage points.
   Nutrient coefficients are %DM or MJ/kg DM; no fake as-fed conversion for energy. */
(function(root){'use strict';
const S=typeof module!=='undefined'&&module.exports?require('./science2'):root.RationScience2;
const LP=typeof module!=='undefined'&&module.exports?require('./solver'):root.RationLP;
const Stages=typeof module!=='undefined'&&module.exports?require('./stages'):root.RationStages;
const fail=(status,message)=>({status,message,scientificStatus:'NOT VALIDATED FOR FEEDING'});
function optimize({analyses,quotes,profile,country='US',currency='USD',batchKgAsFed=100,group='poultry',mode='sandbox'}={}){
 try{
  if(!['sandbox','production'].includes(mode))return fail('invalid','Unknown solve mode');
  if(!Number.isFinite(batchKgAsFed)||batchKgAsFed<=0||batchKgAsFed>1e8)return fail('invalid','Batch must be >0 kg as-fed');
  const profileErrors=S.validateProfile(profile);if(profileErrors.length)return fail('blocked','Requirements: '+profileErrors.join('; '));
  if(profile.group!==group)return fail('blocked','Profile is not for selected animal group');
  if(mode==='production'&&(profile.demo||profile.review.status!=='approved'||profile.source.rights!=='commercial_permitted'))return fail('blocked','Independently reviewed, commercially licensed production-stage requirements required');
  if(!Array.isArray(analyses)||!Array.isArray(quotes))return fail('invalid','Arrays of analyses and quotes required');
  const {ingredients,linked}=S.assembleMarket(analyses,quotes,{country,currency,group,mode});
  // Production *calculations* are enabled for non-demo records with declared external
  // review evidence. In an offline browser those claims are user supplied, not authenticated.
  // This is NEVER itself scientific, regulatory or manufacturing authorization.
  if(mode==='production'){
   const model=Stages.stageFor(profile);
   if(!model)return fail('blocked','Production calculation requires a reviewed species-stage requirement system; unsupported or mismatched model.');
   const check=Stages.checkStage(profile);
   if(check.length)return fail('blocked',check.join('; '));
   if(group==='ruminant'&&!profile.modelId)return fail('blocked','Named ruminant stage model is required; livestock species are not interchangeable');
   if(group==='fish'&&!profile.modelId)return fail('blocked','Named fish species/stage model is required; aquatic species are not interchangeable');
  }
  for(const a of ingredients)for(const t of profile.targets)
   if(!Number.isFinite(a.nutrients[t.key]))return fail('blocked',a.name+': missing analysed nutrient '+t.key+'; unknown values cannot be assumed zero');
  const ids=new Set();for(const a of ingredients){if(ids.has(a.id))return fail('invalid','Duplicate ingredient IDs');ids.add(a.id);}
  const n=ingredients.length, min=ingredients.reduce((v,a)=>v+a.minPctAsFed,0),max=ingredients.reduce((v,a)=>v+a.maxPctAsFed,0);
  if(min>100+1e-8||max<100-1e-8)return fail('infeasible','As-fed inclusion bounds cannot sum to 100%');
  const A=[],b=[];function upper(v,rhs){if(!Number.isFinite(rhs)||v.some(x=>!Number.isFinite(x)))throw Error('Nonfinite LP values');A.push(v);b.push(rhs);}
  for(let j=0;j<n;j++){const v=Array(n).fill(0);v[j]=1;upper(v,ingredients[j].maxPctAsFed-ingredients[j].minPctAsFed);}
  upper(Array(n).fill(1),100-min);upper(Array(n).fill(-1),min-100);
  for(const t of profile.targets){
   // A DM-basis target compares nutrient per DM: sum x DM (n_i-target)>=0.
   // AF target compares nutrient per kg AF: sum x DM n_i>=100*target.
   const coeff=ingredients.map(a=>a.dryMatterPct/100*(a.nutrients[t.key]-(t.basis==='dm'?t.value:0)));
   const rhs=t.basis==='dm'?0:100*t.value;
   const fixed=ingredients.reduce((v,a,j)=>v+a.minPctAsFed*coeff[j],0);
   t.mode==='min'?upper(coeff.map(x=>-x),fixed-rhs):upper(coeff,rhs-fixed);
  }
  const result=new LP.LPSolver(A,b,ingredients.map(a=>-a.priceAsFed)).solve();
  if(result.status!=='optimal')return fail(result.status,'No solution meets all declared mathematical limits. Constraints were not relaxed.');
  const rows=ingredients.map((a,j)=>{
   const sharePctAF=a.minPctAsFed+result.values[j], kgAsFed=sharePctAF*batchKgAsFed/100, kgDM=kgAsFed*a.dryMatterPct/100;
   return {analysisId:a.id,analysisVersion:a.version,quoteId:a.quoteId,quoteVersion:a.quoteVersion,name:a.name,sharePctAF,kgAsFed,kgDM,pricePerKgAsFed:a.priceAsFed,cost:kgAsFed*a.priceAsFed,nutrientsDM:{...a.nutrients}};
  });
  const totalKgAsFed=rows.reduce((s,r)=>s+r.kgAsFed,0),totalKgDM=rows.reduce((s,r)=>s+r.kgDM,0);
  if(totalKgDM<=1e-10)return fail('error','Dry matter cannot be zero');
  const nutrients={};
  for(const [key,def] of Object.entries(S.NUTRIENTS)){
   if(rows.some(r=>!Number.isFinite(r.nutrientsDM[key])))continue;
   const total=rows.reduce((s,r)=>s+r.kgDM*r.nutrientsDM[key]/(def.kind==='energy'?1:100),0);
   nutrients[key]={total,absoluteUnit:def.kind==='energy'?'MJ':'kg',dm:total/totalKgDM*(def.kind==='energy'?1:100),asFed:total/totalKgAsFed*(def.kind==='energy'?1:100),unit:def.unit};
  }
  const checks=profile.targets.map(t=>{
   const actual=nutrients[t.key][t.basis==='dm'?'dm':'asFed'];
   return {...t,achieved:actual,unit:S.NUTRIENTS[t.key].unit,met:t.mode==='min'?actual>=t.value-1e-5:actual<=t.value+1e-5};
  });
  const massOK=Math.abs(totalKgAsFed-batchKgAsFed)<1e-5*Math.max(1,batchKgAsFed);
  if(!massOK||checks.some(c=>!c.met)||rows.some(r=>{const a=ingredients.find(i=>i.id===r.analysisId);return r.sharePctAF<a.minPctAsFed-1e-5||r.sharePctAF>a.maxPctAsFed+1e-5}))return fail('error','Independent numerical checks failed. No result released.');
  const costTotal=rows.reduce((s,r)=>s+r.cost,0);
  return {status:'optimal',mode,modelId:profile.modelId||null,scientificStatus:mode==='production'?'PRODUCTION-CALCULATION MATHEMATICS — EXTERNAL SCIENTIFIC REVIEW CLAIMS NOT AUTHENTICATED BY THIS WEBSITE':'MATHEMATICAL SANDBOX ONLY — NOT VALIDATED FOR FEEDING',country,currency,group,profileId:profile.id,profileVersion:profile.version,
   profileReview:profile.review.status,linked,checks,nutrients,rows:rows.filter(r=>r.kgAsFed>1e-8).sort((a,b)=>b.kgAsFed-a.kgAsFed),
   batchKgAsFed,totalKgDM,blendDryMatterPct:100*totalKgDM/batchKgAsFed,costTotal,
   pricePerKgAsFed:costTotal/batchKgAsFed,pricePerKgDM:costTotal/totalKgDM,
   warnings:mode==='production'?[ 
   'Calculated using values and review claims supplied by the operator. RationWise did not independently verify laboratory analyses, requirement adequacy, nutritional completeness or reviewer identity.',
   'A qualified animal nutritionist, region-specific feed safety/regulatory checks, ingredient suitability, processing, premix and manufacturing controls are necessary before feeding.',
   'Cost is ingredients only; excludes processing, transport, taxes, losses and mixing tolerances.'
  ]:[ 'Illustrative, unverified composition and stage requirements. DO NOT FEED.',
   'Species-specific intake, amino-acid digestibility, ingredient bioavailability, toxicity, processing losses, biosecurity, lab QC and regulation are not verified.',
   'Prices are illustrative within each market, not live quotes or exchange-rate conversions.']};
 }catch(e){return fail('blocked',String(e.message||e));}
}
const API={optimize};root.RationEngine2=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
