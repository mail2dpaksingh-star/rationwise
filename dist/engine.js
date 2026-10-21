/* RationWise v1.1 least-cost optimizer: decision units are kg AS FED / 100kg
   finished as-fed mixture. Every ingredient nutrient % is on dry-matter basis.
   Targets can be expressed as DM% or finished-batch as-fed %. Never silently
   infer moisture, nutrient basis, missing values, prices, or species eligibility.
*/
(function(root){
'use strict';
const {LPSolver}=typeof module!=='undefined'&&module.exports?require('./solver'):root.RationLP;
const Gov=typeof module!=='undefined'&&module.exports?require('./governance'):root.RationGovernance;
const EPS=1e-7;
function response(status,message){return {status,message,scientificStatus:'NOT VALIDATED FOR FEEDING'}}
function optimize({ingredients,targets,batchKgAsFed=100,animalGroup,currency='USD',mode='sandbox'}){
 try{
  if(!Array.isArray(ingredients)||!Array.isArray(targets)||!['ruminant','poultry','fish','swine'].includes(animalGroup))return response('invalid','Ingredient list, targets, or animal group missing');
  if(!Number.isFinite(batchKgAsFed)||batchKgAsFed<=0||batchKgAsFed>1e8)return response('invalid','Batch size must be positive kg as-fed');
  if(!/^[A-Z]{3}$/.test(currency))return response('invalid','Use an ISO-style 3-letter currency code');
  if(!['sandbox','production'].includes(mode))return response('invalid','Mode must be sandbox or production');
  const active=ingredients.filter(i=>i.enabled!==false);
  if(!active.length)return response('invalid','Select at least one ingredient');
  const seen=new Set();
  for(const ing of active){
    if(seen.has(ing.id))return response('invalid','Duplicate ingredient ID');
    seen.add(ing.id);
    const eligible=Gov.eligibility(ing,animalGroup,mode);
    if(!eligible.ok)return response('blocked',eligible.reason);
    if(!Number.isFinite(ing.minPctAsFed)||!Number.isFinite(ing.maxPctAsFed)||ing.minPctAsFed<0||ing.maxPctAsFed>100||ing.minPctAsFed>ing.maxPctAsFed)
      return response('invalid',`${ing.name}: inclusion bounds must be 0–100% as-fed`);
  }
  const minSum=active.reduce((s,i)=>s+i.minPctAsFed,0);
  const maxSum=active.reduce((s,i)=>s+i.maxPctAsFed,0);
  if(minSum>100+EPS||maxSum<100-EPS)return response('infeasible','As-fed inclusion bounds cannot total 100%');
  if(!targets.length)return response('invalid','At least one explicit nutrient constraint is required');
  for(const t of targets){
    if(!Gov.NUTRIENTS.includes(t.key)||!['min','max'].includes(t.mode)||!['dm','as_fed'].includes(t.basis)||!Number.isFinite(t.value)||t.value<0||t.value>100)
      return response('invalid','Each target needs a valid nutrient, direction, basis, and percentage');
  }
  // Shift variables from x_i [0..100] to y_i=x_i-min_i >= 0.
  const n=active.length,A=[],b=[],cost=active.map(i=>-i.priceAsFed);
  function upper(row,rhs){
    if(!Number.isFinite(rhs)||row.some(v=>!Number.isFinite(v)))throw new Error('Non-finite optimization coefficient');
    A.push(row);b.push(rhs);
  }
  active.forEach((ing,i)=>{const row=Array(n).fill(0);row[i]=1;upper(row,ing.maxPctAsFed-ing.minPctAsFed)});
  const remaining=100-minSum;
  upper(Array(n).fill(1),remaining);upper(Array(n).fill(-1),-remaining);
  for(const t of targets){
    const coeff=active.map(i=>{
      const dm=i.dryMatterPct/100;
      return t.basis==='dm'?dm*(i.nutrientsDM[t.key]-t.value):dm*i.nutrientsDM[t.key];
    });
    const rhs=t.basis==='dm'?0:100*t.value;
    const locked=active.reduce((s,i,j)=>s+i.minPctAsFed*coeff[j],0);
    if(t.mode==='min')upper(coeff.map(v=>-v),locked-rhs);
    else upper(coeff,rhs-locked);
  }
  const sol=new LPSolver(A,b,cost).solve();
  if(sol.status!=='optimal')return response(sol.status,'No mixture meets every chosen inclusion and nutrient constraint. Constraints were not relaxed.');
  const rows=active.map((i,j)=>{
    const fractionPct=i.minPctAsFed+sol.values[j];
    const kgAsFed=fractionPct*batchKgAsFed/100;
    const kgDM=kgAsFed*i.dryMatterPct/100;
    return {id:i.id,name:i.name,version:i.recordVersion,sourceRef:i.source.referenceId,approval:i.approval.status,rights:i.source.rights,
      amountPctAsFed:fractionPct,kgAsFed,kgDM,dmPctOfIngredient:i.dryMatterPct,priceAsFed:i.priceAsFed,
      cost:kgAsFed*i.priceAsFed,nutrientsDM:{...i.nutrientsDM}};
  });
  const totalAF=rows.reduce((s,i)=>s+i.kgAsFed,0);
  const totalDM=rows.reduce((s,i)=>s+i.kgDM,0);
  if(totalDM<=EPS)return response('error','Mixture dry matter must be positive');
  const nutrients={};
  Gov.NUTRIENTS.forEach(key=>{
    const kg=rows.reduce((s,i)=>s+i.kgDM*i.nutrientsDM[key]/100,0);
    nutrients[key]={kg,dmPct:100*kg/totalDM,asFedPct:100*kg/totalAF};
  });
  const costTotal=rows.reduce((s,i)=>s+i.cost,0);
  const violations=[];
  if(Math.abs(totalAF-batchKgAsFed)>1e-5*Math.max(1,batchKgAsFed))violations.push('Batch mass conservation');
  for(const i of rows){
    const source=active.find(x=>x.id===i.id);
    if(i.amountPctAsFed<source.minPctAsFed-1e-5||i.amountPctAsFed>source.maxPctAsFed+1e-5)violations.push(`${i.name}: inclusion limit`);
  }
  for(const t of targets){
    const achieved=t.basis==='dm'?nutrients[t.key].dmPct:nutrients[t.key].asFedPct;
    if(t.mode==='min'&&achieved+1e-5<t.value || t.mode==='max'&&achieved-1e-5>t.value)violations.push(`${t.key}: ${t.mode} ${t.value}% (${t.basis})`);
  }
  if(violations.length)return response('error','Numerical verification failed: '+violations.join('; '));
  const allApproved=active.every(i=>Gov.eligibility(i,animalGroup,'production').ok);
  const scientificStatus=allApproved?'INGREDIENT DATA APPROVED — RATION NOT VALIDATED':'DEMONSTRATION / UNREVIEWED — NOT FOR FEEDING';
  rows.forEach(r=>{r.mixPctOfDM=100*r.kgDM/totalDM});
  return {status:'optimal',scientificStatus,rows:rows.filter(r=>r.kgAsFed>1e-8).sort((a,b)=>b.kgAsFed-a.kgAsFed),
    batchKgAsFed,totalKgDM:totalDM,blendDryMatterPct:100*totalDM/totalAF,blendMoisturePct:100-100*totalDM/totalAF,
    nutrients,costTotal,pricePerKgAsFed:costTotal/totalAF,pricePerKgDM:costTotal/totalDM,
    currency,mode,animalGroup,targets:targets.map(t=>({...t})),sourceCount:active.length,
    // Feed completeness can NEVER be established by this sparse four-nutrient pilot.
    warnings:['Not a complete or balanced feed: energy, digestible nutrients, vitamins, trace minerals, toxins and additional species-specific factors are not evaluated.','Price excludes transport, processing, premixes and taxes.']};
 }catch(e){return response('error',String(e.message||e))}
}
const API={optimize};
root.RationEngine=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
