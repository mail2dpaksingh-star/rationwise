/* RationWise complete-source nutrient calculation. Mathematical feasibility only, not feeding approval.
   Reads ONLY source-stated, dimensionally meaningful values. Never assumes missing ingredient analyses are zero. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const priceUnits={kg:1,tonne:1000,bag25:25,bag50:50,bag100:100};
function decimal(s){const v=Number(String(s).replaceAll(',','').trim());return Number.isFinite(v)?v:null;}
function parseRange(s){
 const t=String(s??'').trim().replaceAll('–','-').replaceAll('—','-');
 // Do not treat Excel dates, e.g. 12/3/2026 or serial 46024, as nutrient bounds.
 if(/^\d{4}-\d\d-\d\d$/.test(t)||/^\d+\/\d+\//.test(t))return null;
 const a=t.match(/^\s*([\d.,]+)\s*(?:-|\bto\b)\s*([\d.,]+)\s*$/i);
 if(a){const low=decimal(a[1]),high=decimal(a[2]);return low!==null&&high!==null&&high>=low?{low,high}:null;}
 const x=decimal(t);return x!==null?{low:x,high:null}:null;
}
function classify(profile,v){
 const label=String(v.label||'').toLowerCase().replace(/[†‡*]/g,'').replace(/phosphorous/g,'phosphorus');
 const unit=String(v.unit||'').toLowerCase();
 if(v.issue&&/date serial|corrupt|misformatted/i.test(v.issue))return {kind:'source',reason:'Check original source cell'};
 const raw=String(v.raw??'');const vals=parseRange(raw);
 const meta=/body weight|milk\s*,?\s*kg|age,|days in milk|parity|days pre|weight gain|body wt gain|daily gain|feed structure|feeding period|feed intake|estimated feed|dmi|dry matter intake|production stage|gestation day|feed consumption|fat%|fat % in milk|milk production|feed amount|maturity|intake \+ wastage|litter|post-farrowing/i.test(label);
 if(meta)return {kind:'context',reason:'Animal or feeding information'};
 if(!vals)return {kind:'source',reason:'Text or unspecified source value'};
 if(/vitamin.*mineral premix|premix|phytase|withdrawal|medication|antibiotic|feed additive/i.test(label))return {kind:'context',reason:'Ingredient use or specialized feeding instruction'};
 const isRuminant=['cattle','buffalo','sheep','goat'].includes(profile.species);
 const basis=isRuminant?'dm':'as_fed';
 let code='',name='',targetUnit='%',factor=1,system='general';const joined=(label+' '+unit).trim();
 if(/(?:net energy|\bne content|\bne \b)/.test(label)) {code='ne_swine';name='Net energy (swine)';targetUnit='MJ/kg';system='swine';}
 else if(/\bnel\b|net energy for lactation/i.test(label)) {code='nel_ruminant';name='Net energy for lactation';targetUnit='MJ/kg';system='ruminant';}
 else if(/digestible energy|\bde content|^de\s|^de\(/i.test(label)){code=profile.species==='fish'?'de_fish':'de';name='Digestible energy';targetUnit='MJ/kg';system=profile.species;}
 else if(/metabolizable energy|metabolisable energy|\bme content|^me\b|\bamen\b/i.test(label)){code=/amen/i.test(label)?'ame_n_poultry':isRuminant?'me_ruminant':profile.species==='pig'?'me_swine':'me_poultry';name=/amen/i.test(label)?'Nitrogen-corrected apparent metabolizable energy (AMEn)':'Metabolizable energy';targetUnit='MJ/kg';system=profile.species;}
 else if(/crude protein|approximate crude protein|\bcp\s*%|\bcp%|^protein\s*\(/i.test(label)) {code='crude_protein';name='Crude protein';}
 else if(/digestible protein/i.test(label)){code='digestible_protein';name='Digestible protein';system=profile.species;}
 else if(/forage ndf/i.test(label)){code='forage_ndf';name='Forage neutral detergent fiber';system='ruminant';}
 else if(/\bndf\b/i.test(label)){code='ndf';name='Neutral detergent fiber';system='ruminant';}
 else if(/\btdn\b/i.test(label)){code='tdn';name='Total digestible nutrients';system='ruminant';}
 else if(/starch/i.test(label)){code='starch';name='Starch';}
 else if(/ether extract|lipids|crude fat|\bfat \(%|\bfat\s*%/i.test(label)){code='fat';name='Fat / ether extract';}
 else if(/crude fiber|crude fibre/i.test(label)){code='crude_fiber';name='Crude fiber';}
 else if(/\blysine\b/i.test(label)){const digest=/digestible|\bsid\b/.test(label)||(profile.species==='chicken'&&/broiler cobb/i.test(profile.sheet||''));code=digest?'digestible_lysine':'total_lysine';name=digest?'Digestible lysine':'Total lysine';system=profile.species;}
 else if(/methionine.*cystine/i.test(label)){const digest=/digestible|\bsid\b/.test(label)||(profile.species==='chicken'&&/broiler cobb/i.test(profile.sheet||''));code=digest?'digestible_met_cys':'total_met_cys';name=digest?'Digestible methionine + cystine':'Total methionine + cystine';system=profile.species;}
 else if(/methionine/i.test(label)){const digest=/digestible|\bsid\b/.test(label)||(profile.species==='chicken'&&/broiler cobb/i.test(profile.sheet||''));code=digest?'digestible_methionine':'total_methionine';name=digest?'Digestible methionine':'Total methionine';system=profile.species;}
 else if(/threonine|arginine|tryptophan|valine|isoleucine|leucine|histidine|phenylalanine/i.test(label)){const base=label.match(/threonine|arginine|tryptophan|valine|isoleucine|leucine|histidine|phenylalanine/)[0];const dig=/digestible|\bsid\b/.test(label)||(profile.species==='chicken'&&/broiler cobb/i.test(profile.sheet||''));code=(dig?'digestible_':'total_')+base;name=(dig?'Digestible ':'Total ')+base;system=profile.species;}
 else if(/sttd phosphorus/i.test(label)){code='sttd_phosphorus';name='STTD phosphorus';system='swine';}
 else if(/available phosph|phosphorus\s*\(available/i.test(label)){code='available_phosphorus';name='Available phosphorus';system=profile.species;}
 else if(/\bphosphorus\b|^p\s*%|^p%|^p\s*\(/i.test(label)){code='total_phosphorus';name='Total phosphorus';}
 else if(/\bcalcium\b|^ca\s*%|^ca%|^ca\s*\(/i.test(label)){code='calcium';name='Calcium';}
 else if(/\bsodium\b/i.test(label)){code='sodium';name='Sodium';}
 else if(/common salt/i.test(label)){code='common_salt';name='Common salt';}
 else if(/linoleic acid/i.test(label)){code='linoleic_acid';name='Linoleic acid';}
 else if(/choline/i.test(label)){code='choline';name='Choline';targetUnit='mg/kg';}
 else if(/\bvitamin\s*[adebk]/i.test(label)){const letter=label.match(/\bvitamin\s*([adebk])/)[1];code='vitamin_'+letter;name='Vitamin '+letter.toUpperCase();targetUnit=/\biu\b/i.test(label+' '+unit)?'IU/kg':'mg/kg';}
 else return {kind:'context',reason:'Other source measurement'};
 if(targetUnit==='MJ/kg'){
   if(/kcal\s*\/\s*kg/i.test(label+' '+unit)) factor=.004184;
   else if(/mcal\s*\/\s*kg/i.test(label+' '+unit)) factor=4.184;
   else if(/mj\s*\/\s*kg/i.test(label+' '+unit))factor=1;
   else return {kind:'source',reason:'Energy unit not stated clearly'};
   if(vals.low*factor>40||vals.low*factor<2)return {kind:'source',reason:'Energy magnitude does not match the stated unit'};
 } else if(targetUnit==='mg/kg'||targetUnit==='IU/kg'){
   if(!/(mg\s*\/\s*kg|iu\s*\/\s*kg|unit\s*\/\s*kg)/i.test(label+' '+unit))return {kind:'source',reason:'Unit not stated for this nutrient'};
 } else {
   // Concentration values, not absolute daily masses. An absent unit must be
   // supported by a clear (%) nutrient heading or source notation.
   if(/\bg\/\s*kg/i.test(label+' '+unit)){factor=0.1;}
   else if(!/(\%|^cp\s*%|^ca\s*%|^p\s*%|^ndf\b|^forage ndf|\btdn\b|^lysine$|^methionine$|^threonine$|^arginine$|^tryptophan$|^linoleic acid$|^approximate crude protein$|^calcium$|^phosphorus$)/i.test(joined))return {kind:'source',reason:'Concentration units unclear'};
   if(vals.low*factor>100||vals.low<0)return {kind:'source',reason:'Nutrient percentage outside 0–100'};
 }
 let mode=/\bmax(?:imum)?\b/.test(label)?'max':'min';
 return {kind:'nutrient',code:system==='general'?code:code+'_'+system,name,unit:targetUnit,basis,low:vals.low*factor,high:vals.high===null?null:vals.high*factor,mode,sourceCell:v.cell,raw,sourceLabel:v.label};
}
function build(profile){
 const nutrients=[],context=[],notes=[],seen=new Set();
 // Goat-maintenance tables express daily amounts. Convert to concentrations
 // ONLY where the same row states dry matter intake (DMI) in kg/day.
 if(profile.species==='goat'&&/^Goat maintenance ·/.test(profile.name)){
  const dmiRow=profile.values.find(v=>/^DMI$/i.test(v.label)&&/kg\/day/i.test(v.unit));
  const dmi=dmiRow?decimal(dmiRow.raw):null;
  if(dmi!==null&&dmi>0){
   const daily={'TDN':{code:'tdn_ruminant',name:'Total digestible nutrients',unit:'%',factor:100},
    'Crude protein':{code:'crude_protein',name:'Crude protein',unit:'%',factor:100},
    'Calcium':{code:'calcium',name:'Calcium',unit:'%',factor:0.1},
    'Phosphorus':{code:'total_phosphorus',name:'Total phosphorus',unit:'%',factor:0.1},
    'Vitamin A':{code:'vitamin_a',name:'Vitamin A',unit:'IU/kg',factor:1000},
    'Vitamin D':{code:'vitamin_d',name:'Vitamin D',unit:'IU/kg',factor:1}};
   for(const v of profile.values){const def=daily[v.label],val=decimal(v.raw);
    if(!def||val===null)continue;
    const expected={'TDN':'kg/day','Crude protein':'kg/day','Calcium':'g/day','Phosphorus':'g/day','Vitamin A':'1000 IU/day','Vitamin D':'IU/day'}[v.label];
    if(String(v.unit).trim()!==expected)continue;
    nutrients.push({kind:'nutrient',code:def.code,name:def.name,unit:def.unit,basis:'dm',low:val*def.factor/dmi,high:null,mode:'min',sourceCell:v.cell,raw:v.raw,sourceLabel:v.label,derived:'Daily nutrient amount ÷ '+dmi+' kg dry matter intake'});
    seen.add(def.code+'|'+v.cell);
   }
  }
 }
 for(const v of profile.values){const r=classify(profile,v);if(r.kind==='nutrient'){
   const key=r.code+'|'+r.sourceCell;
   if(!seen.has(key)){nutrients.push(r);seen.add(key);}
 }else if(r.kind==='context')context.push({label:v.label,value:v.raw,unit:v.unit,cell:v.cell});
 else if(!nutrients.some(n=>n.sourceCell===v.cell))notes.push({label:v.label,value:v.raw,cell:v.cell,reason:r.reason});}
 return {profileId:profile.id,name:profile.name,species:profile.species,models:profile.models,workbook:profile.workbook,sheet:profile.sheet,nutrients,context,notes};
}
// Explain why a mathematically valid ingredient set cannot meet the full requirement profile.
// These are per-nutrient attainable bounds *under inclusion limits*, not a proposed diet.
function feasibleShares(ingredients, objective, maximize){
  const shares=ingredients.map(a=>a.min);
  let left=100-shares.reduce((s,x)=>s+x,0);
  if(left < -1e-7 || ingredients.reduce((s,a)=>s+a.max,0) < 100-1e-7)return null;
  const indices=ingredients.map((_,i)=>i).sort((a,b)=>maximize?objective[b]-objective[a]:objective[a]-objective[b]);
  for(const i of indices){const add=Math.min(Math.max(0,ingredients[i].max-shares[i]),Math.max(0,left));shares[i]+=add;left-=add;}
  return left>1e-6?null:shares;
}
function achievedValue(limit,ingredients,shares){
 const weighted=ingredients.reduce((sum,a,i)=>sum+shares[i]*a.dm/100*a.nutrients[limit.code],0);
 if(limit.basis==='dm'){
   const denominator=ingredients.reduce((sum,a,i)=>sum+shares[i]*a.dm/100,0);
   return denominator>0?weighted/denominator:NaN;
 }
 return weighted/100;
}
function independentExtreme(limit,ingredients,maximize){
 if(limit.basis!=='dm'){
   const scores=ingredients.map(a=>a.dm/100*a.nutrients[limit.code]);
   const shares=feasibleShares(ingredients,scores,maximize);
   return shares?achievedValue(limit,ingredients,shares):NaN;
 }
 // Linear fractional objective. The Dinkelbach iterations solve the extreme
 // concentration of nutrient per dry-matter mass with positive DM denominator.
 let guess=ingredients.reduce((sum,a)=>sum+a.nutrients[limit.code],0)/ingredients.length;
 for(let k=0;k<80;k++){
   const scores=ingredients.map(a=>a.dm/100*(a.nutrients[limit.code]-guess));
   const shares=feasibleShares(ingredients,scores,maximize);
   if(!shares)return NaN;
   const next=achievedValue(limit,ingredients,shares);
   if(!Number.isFinite(next))return NaN;
   if(Math.abs(next-guess)<1e-10*Math.max(1,Math.abs(next)))return next;
   guess=next;
 }
 return guess;
}
function explainInfeasible(limits,ingredients){
 const all=limits.map(t=>{
  const low=independentExtreme(t,ingredients,false),high=independentExtreme(t,ingredients,true);
  const tol=1e-6*Math.max(1,Math.abs(t.value));
  const impossible=t.mode==='min'?high < t.value-tol:low > t.value+tol;
  return {name:t.name,code:t.code,unit:t.unit,basis:t.basis,mode:t.mode,target:t.value,
    reachableMin:low,reachableMax:high,impossible};
 });
 const conflicts=all.filter(x=>x.impossible).sort((a,b)=>{
  const shortfall=x=>x.mode==='min'?(x.target-x.reachableMax):(x.reachableMin-x.target);
  return shortfall(b)-shortfall(a);
 });
 return {conflicts,combinedConflict:conflicts.length===0,checked:all.length};
}

// Generic LP: supports all chosen source concentrations and both ends of a specified range.
function optimize({limits,ingredients,batchKg=100,currency='USD'}={}){
 if(!Array.isArray(limits)||!limits.length)throw Error('Select a feeding standard with numerical nutrient limits.');
 if(!Array.isArray(ingredients)||!ingredients.length)throw Error('Enter at least one ingredient.');
 if(!Number.isFinite(batchKg)||batchKg<=0)throw Error('Enter a positive feed batch quantity.');
 const keys=[...new Set(limits.map(t=>t.code))],defs=new Map(keys.map(k=>[k,limits.find(l=>l.code===k)]));
 for(const a of ingredients){
  if(!a.name)throw Error('Ingredient name is missing.');
  if(!Number.isFinite(a.dm)||a.dm<=0||a.dm>100||!Number.isFinite(a.price)||a.price<0||!Number.isFinite(a.min)||!Number.isFinite(a.max)||a.min<0||a.max>100||a.min>a.max)throw Error(a.name+': check dry matter, price and inclusion limits.');
  if(a.hazard==='fail')throw Error(a.name+': ingredient failed safety screen.');
  for(const key of keys){const val=a.nutrients[key];const d=defs.get(key);if(!Number.isFinite(val))throw Error(a.name+': enter '+d.name+' ('+d.unit+') per kg dry matter. Missing nutrient cannot be treated as zero.');if(val<0||val>(d.unit==='%'?100:d.unit==='MJ/kg'?60:100000000))throw Error(a.name+': '+d.name+' value out of range.');}
 }
 const mn=ingredients.reduce((s,a)=>s+a.min,0),mx=ingredients.reduce((s,a)=>s+a.max,0);
 if(mn>100+1e-7||mx<100-1e-7)throw Error('Ingredient inclusion limits cannot total 100%.');
 const n=ingredients.length,A=[],b=[];
 function upper(coeff,rhs){A.push(coeff);b.push(rhs);}
 for(let i=0;i<n;i++){const x=Array(n).fill(0);x[i]=1;upper(x,ingredients[i].max-ingredients[i].min);}
 upper(Array(n).fill(1),100-mn);upper(Array(n).fill(-1),mn-100);
 for(const t of limits){if(!Number.isFinite(t.value)||t.value<0)throw Error('Invalid source nutrient bound');
  const coeff=ingredients.map(a=>a.dm/100*(a.nutrients[t.code]-(t.basis==='dm'?t.value:0)));
  const rhs=t.basis==='dm'?0:100*t.value;
  const fixed=ingredients.reduce((s,a,i)=>s+a.min*coeff[i],0);
  if(t.mode==='max')upper(coeff,rhs-fixed);else upper(coeff.map(x=>-x),fixed-rhs);
 }
 if(!root.RationLP?.LPSolver)throw Error('Optimization library unavailable.');
 const r=new root.RationLP.LPSolver(A,b,ingredients.map(a=>-a.price)).solve();
 if(r.status!=='optimal')return {status:r.status,explanation:'No blend meets all current nutrient targets and ingredient inclusion limits.',diagnostics:explainInfeasible(limits,ingredients)};
 const rows=ingredients.map((a,i)=>({name:a.name,kgAF:batchKg*(a.min+r.values[i])/100,sharePct:a.min+r.values[i],dmKg:batchKg*(a.min+r.values[i])*a.dm/10000,cost:batchKg*(a.min+r.values[i])*a.price/100}));
 const totalDM=rows.reduce((s,a)=>s+a.dmKg,0);
 const checks=limits.map(t=>{
  const metric=ingredients.reduce((s,a,i)=>s+rows[i].dmKg*a.nutrients[t.code],0);
  const achieved=metric/(t.basis==='dm'?totalDM:batchKg);
  return {...t,achieved,pass:t.mode==='min'?achieved>=t.value-1e-5:achieved<=t.value+1e-5};
 });
 if(checks.some(t=>!t.pass))throw Error('Independent nutrient check failed. No formula released.');
 return {status:'optimal',rows,checks,totalDM,totalCost:rows.reduce((s,r)=>s+r.cost,0),currency,batchKg};
}
const api={parseRange,classify,build,optimize,explainInfeasible};root.RationCompleteModel=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
