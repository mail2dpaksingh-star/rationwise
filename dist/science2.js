/* RationWise 1.2: separated versioned composition, quotes, and requirement profiles.
   Seed content is SYNTHETIC and must never be presented as nutrition advice. */
(function(root){'use strict';
const NUTRIENTS=Object.freeze({
 cp:{name:'Crude protein',unit:'%',kind:'mass_fraction'},
 ca:{name:'Total calcium',unit:'%',kind:'mass_fraction'},
 p:{name:'Total phosphorus',unit:'%',kind:'mass_fraction'},
 fiber:{name:'Crude fiber',unit:'%',kind:'mass_fraction'},
 me:{name:'ME, poultry',unit:'MJ/kg',kind:'energy'},
 neSwine:{name:'Net energy, swine',unit:'MJ/kg',kind:'energy'},
 digLys:{name:'Digestible lysine, poultry',unit:'%',kind:'mass_fraction'},
 sidLys:{name:'SID lysine, swine',unit:'%',kind:'mass_fraction'},
 sidThr:{name:'SID threonine, swine',unit:'%',kind:'mass_fraction'},
 sttdP:{name:'STTD phosphorus, swine',unit:'%',kind:'mass_fraction'},
 digMetCys:{name:'Digestible Met+Cys',unit:'%',kind:'mass_fraction'},
 availP:{name:'Available phosphorus',unit:'%',kind:'mass_fraction'},
 na:{name:'Sodium',unit:'%',kind:'mass_fraction'},
 ndf:{name:'Neutral detergent fiber (NDF)',unit:'%',kind:'mass_fraction'},
 starch:{name:'Starch',unit:'%',kind:'mass_fraction'},
 fat:{name:'Crude fat / ether extract',unit:'%',kind:'mass_fraction'},
 nel:{name:'Net energy for lactation (NEL), ruminant',unit:'MJ/kg',kind:'energy'},
 meRuminant:{name:'Metabolizable energy (ME), ruminant',unit:'MJ/kg',kind:'energy'},
 deFish:{name:'Digestible energy (DE), fish',unit:'MJ/kg',kind:'energy'},
 digLysFish:{name:'Digestible lysine, fish',unit:'%',kind:'mass_fraction'},
 availPFish:{name:'Available phosphorus, fish',unit:'%',kind:'mass_fraction'}
});
const GROUPS=['ruminant','poultry','fish','swine'];
const SPECIES_GROUP=Object.freeze({cattle:'ruminant',buffalo:'ruminant',sheep:'ruminant',goat:'ruminant',chicken:'poultry',turkey:'poultry',duck:'poultry',goose:'poultry',quail:'poultry',fish:'fish',pig:'swine'});
const SPECIALIZED_NUTRIENTS=Object.freeze({me:'poultry',digLys:'poultry',digMetCys:'poultry',availP:'poultry',neSwine:'swine',sidLys:'swine',sidThr:'swine',sttdP:'swine',nel:'ruminant',meRuminant:'ruminant',ndf:'ruminant',starch:'ruminant',deFish:'fish',digLysFish:'fish',availPFish:'fish'});
const RIGHTS=['demo_only','commercial_permitted','restricted','unknown'];
const STATES=['draft','in_review','approved','rejected'];
const PRICE_UNITS={kg:1,tonne:1000,bag25:25,bag50:50,bag100:100};
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const plain=s=>typeof s==='string'&&s.trim().length>0&&s.length<500;
const range=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const copy=x=>JSON.parse(JSON.stringify(x));
function validateAnalysis(a){
 const errors=[];
 if(!a||typeof a!=='object')return ['Analysis must be an object'];
 if(!/^[a-z0-9_-]{3,64}$/.test(a.id||''))errors.push('ID invalid');
 if(!plain(a.name))errors.push('Ingredient name required');
 if(!Number.isInteger(a.version)||a.version<1)errors.push('Analysis version invalid');
 if(!range(a.dryMatterPct,0.000001,100))errors.push('Dry matter must be >0 and <=100% as-fed');
 if(a.nutrientBasis!=='dry_matter')errors.push('All stored nutrients must declare DM basis');
 // Real analyses may contain only measured/qualified nutrients. NEVER treat an absent
 // nutrient as zero; engine2 requires every ingredient to provide every target nutrient.
 if(!a.nutrients||typeof a.nutrients!=='object'||!Object.keys(a.nutrients).length)errors.push('Ingredient nutrient analysis required');
 else for(const [k,value] of Object.entries(a.nutrients)){
  if(!Object.hasOwn(NUTRIENTS,k)||!range(value,0,NUTRIENTS[k]?.kind==='energy'?60:100))errors.push(k+' unknown or out of bounds');
 }
 // Historical synthetic fixtures are valid only as demonstrators; absence of
 // v1.4-only analytes must not be interpreted as zero in a calculation.
 if(!Array.isArray(a.allowedGroups)||!a.allowedGroups.length||a.allowedGroups.some(g=>!GROUPS.includes(g)))errors.push('Animal group eligibility invalid');
 if(!plain(a.source?.referenceId)||!plain(a.source?.description))errors.push('Composition evidence reference required');
 if(!RIGHTS.includes(a.source?.rights))errors.push('Data license/right-of-use status required');
 if(!STATES.includes(a.review?.status))errors.push('Approval state invalid');
 if(a.review?.status==='approved'){
  if(a.demo||a.source?.rights!=='commercial_permitted')errors.push('Demo/unlicensed source cannot be approved');
  if(!plain(a.review?.reviewedBy)||!plain(a.review?.evidenceId)||!dateOK(a.review?.reviewedOn)||!plain(a.source?.rightsProofRef))errors.push('Approval needs independent reviewer, evidence, date and usage-rights proof');
 }
 if(!Array.isArray(a.history)||!a.history.length||a.history.some(h=>!dateOK(h.at)||!plain(h.event)||!plain(h.by)))errors.push('Audit event history required');
 if(!dateOK(a.updatedOn))errors.push('Updated date invalid');
 if(!range(a.minPctAsFed,0,100)||!range(a.maxPctAsFed,0,100)||a.minPctAsFed>a.maxPctAsFed)errors.push('Inclusion bounds invalid');
 return errors;
}
function validateQuote(q){
 const e=[];if(!q||typeof q!=='object')return ['Quote must be an object'];
 if(!plain(q.id)||!plain(q.analysisId))e.push('Quote and linked analysis identifiers are required');
 if(!/^[A-Z]{2}$/.test(q.country||''))e.push('Country must be ISO 3166-1 alpha-2');
 if(!/^[A-Z]{3}$/.test(q.currency||''))e.push('Currency must be an ISO-style three-letter code');
 if(!range(q.amount,0,Number.MAX_SAFE_INTEGER))e.push('Quoted amount must be nonnegative');
 if(!Object.hasOwn(PRICE_UNITS,q.unit))e.push('Unsupported quote unit');
 if(!dateOK(q.quotedOn))e.push('Quote date invalid');
 if(!plain(q.provenance))e.push('Price source reference required');
 if(!Number.isInteger(q.version)||q.version<1)e.push('Quote version invalid');
 return e;
}
function validateProfile(p){
 const e=[];if(!p||typeof p!=='object')return ['Requirements profile missing'];
 if(!plain(p.id)||!plain(p.stage)||!plain(p.species))e.push('Species and production stage required');
 if(!GROUPS.includes(p.group))e.push('Group invalid');
 if(!Object.hasOwn(SPECIES_GROUP,p.species)||SPECIES_GROUP[p.species]!==p.group)e.push('Species / animal group mismatch');
 if(p.source&&['restricted','unknown'].includes(p.source.rights))e.push('Requirement profile use rights are not available');
 if(!Number.isInteger(p.version)||p.version<1)e.push('Profile version invalid');
 if(!STATES.includes(p.review?.status))e.push('Profile review status invalid');
 if(!plain(p.source?.referenceId)||!RIGHTS.includes(p.source?.rights))e.push('Requirement evidence and rights required');
 if(!Array.isArray(p.targets)||!p.targets.length)e.push('Explicit targets required');
 else for(const t of p.targets){
  if(!Object.hasOwn(NUTRIENTS,t.key)||!['min','max'].includes(t.mode)||!['dm','as_fed'].includes(t.basis))e.push('Target nutrient, direction or basis invalid');
  else if(!range(t.value,0,NUTRIENTS[t.key]?.kind==='energy'?60:100))e.push('Target numeric value invalid');
  if(Object.hasOwn(SPECIALIZED_NUTRIENTS,t.key)&&SPECIALIZED_NUTRIENTS[t.key]!==p.group)e.push(t.key+' is not a valid nutrient system for '+p.group);
 }
 if(p.review?.status==='approved'&&(p.demo||p.source?.rights!=='commercial_permitted'||!plain(p.review?.reviewedBy)||!plain(p.review?.evidenceId)||!dateOK(p.review?.reviewedOn)||!plain(p.source?.rightsProofRef)))e.push('Profile approval requires licensed, non-demo evidence and independent reviewer');
 return e;
}
function pricePerKg(q){const e=validateQuote(q);if(e.length)throw new Error(e.join('; '));return q.amount/PRICE_UNITS[q.unit]}
function reviseAnalysis(a,patch,by='local_user',on='2026-10-19'){
 if(!dateOK(on))throw new Error('Invalid edit date');
 if(validateAnalysis(a).length)throw new Error('Invalid source analysis');
 if(!patch||!Object.keys(patch).length||Object.keys(patch).some(k=>!['dryMatterPct','nutrients','name','minPctAsFed','maxPctAsFed','allowedGroups'].includes(k)))throw new Error('Only editable composition fields accepted');
 const b=copy(a);Object.assign(b,patch);b.version++;b.review={status:'draft',reviewedBy:null,evidenceId:null,reviewedOn:null};b.updatedOn=on;b.editedBy=by;b.history.push({at:on,event:'composition_modified_review_reset',by});
 const e=validateAnalysis(b);if(e.length)throw new Error(e.join('; '));return b;
}
function reviseQuote(q,patch,on='2026-10-19'){
 if(!dateOK(on))throw new Error('Invalid quote date');
 if(validateQuote(q).length)throw new Error('Invalid starting quote');
 if(!patch||!Object.keys(patch).length||Object.keys(patch).some(k=>!['amount','unit','quotedOn','provenance'].includes(k)))throw new Error('Quote edit keys invalid');
 const b=copy(q);Object.assign(b,patch);b.version++;
 const e=validateQuote(b);if(e.length)throw new Error(e.join('; '));return b;
}
function assembleMarket(analyses,quotes,{country,currency,group,mode='sandbox'}){
 if(!/^[A-Z]{2}$/.test(country||'')||!/^[A-Z]{3}$/.test(currency||'')||!GROUPS.includes(group))throw new Error('Country, currency, or animal group invalid');
 const out=[];const linked=[];
 for(const a of analyses){if(!a.allowedGroups.includes(group)||a.enabled===false)continue;
  const errors=validateAnalysis(a);if(errors.length)throw new Error(a.id+': '+errors.join('; '));
  if(!['demo_only','commercial_permitted'].includes(a.source.rights))throw new Error(a.id+': rights not available');
  if(mode==='production'&&(a.demo||a.review.status!=='approved'||a.source.rights!=='commercial_permitted'))throw new Error(a.id+': approved commercially licensed analysis required');
  const candidates=quotes.filter(q=>q.analysisId===a.id&&q.country===country&&q.currency===currency);
  if(candidates.length!==1)throw new Error(a.name+': expected exactly one local quote for '+country+'/'+currency+'; found '+candidates.length);
  const q=candidates[0],err=validateQuote(q);if(err.length)throw new Error(a.id+' quote: '+err.join('; '));
  if(mode==='production'&&(q.demo!==false||!plain(q.provenance)||/^synthetic|^demo/i.test(q.provenance)))throw new Error(a.id+': real non-demo quoted price and its source are required');
  linked.push({analysisId:a.id,analysisVersion:a.version,quoteId:q.id,quoteVersion:q.version});
  out.push({...copy(a),quoteId:q.id,quoteVersion:q.version,priceAsFed:pricePerKg(q)});
 }
 if(!out.length)throw new Error('No eligible analyses for animal group');
 return {ingredients:out,linked};
}
function demoData(){
 // Additional numbers are intentionally invented; never use these as reference composition.
 const base=(typeof module!=='undefined'&&module.exports?require('./catalog'):root.RationCatalog).demoCatalog();
 const extras=[
 [13.4,.2,.33,.10,.03],[10.4,2.8,1.1,.22,.04],[8.5,.55,.4,.18,.06],[9.8,.48,.35,.17,.05],
 [6.5,.40,.30,.15,.06],[7.0,.42,.28,.17,.08],[8.4,.7,.46,.18,.09],[8.8,1.15,.78,.22,.07],
 [0,0,0,0,0],[0,0,0,12,.0],[10.6,3.4,1.85,1.8,.6],[12.4,.12,.16,.07,.04]
 ];
 // Invented pseudo-NE and SID/STTD data intentionally lack nutritional validity.
 // Never infer pig performance from these numerical test fixtures.
 const pigExtras=[
  [10.1,.18,.18,.07],[8.3,2.5,1.55,.26],[6.2,.33,.35,.30],[7.1,.29,.32,.28],
  [2.0,.05,.05,.05],[4.0,.10,.12,.06],[4.8,.20,.21,.05],[5.7,.90,.90,.30],
  [0,0,0,0],[0,0,0,14],[9.8,3.2,1.9,1.40],[8.0,.05,.06,.05]
 ];
 const analyses=base.map((b,index)=>({
  id:b.id,name:b.name,version:1,dryMatterPct:b.dryMatterPct,nutrientBasis:'dry_matter',
  nutrients:{...b.nutrientsDM,me:extras[index][0],digLys:extras[index][1],digMetCys:extras[index][2],availP:extras[index][3],na:extras[index][4],neSwine:pigExtras[index][0],sidLys:pigExtras[index][1],sidThr:pigExtras[index][2],sttdP:pigExtras[index][3]},
  minPctAsFed:b.minPctAsFed,maxPctAsFed:b.maxPctAsFed,allowedGroups:b.allowedGroups,enabled:true,demo:true,
  source:{referenceId:'SYNTHETIC-S2-2026',description:'Invented test numbers, no assay / CoA / nutritional evidence',rights:'demo_only',rightsProofRef:null},
  review:{status:'draft',reviewedBy:null,evidenceId:null,reviewedOn:null},updatedOn:'2026-10-19',
  history:[{at:'2026-10-19',event:'synthetic_seeded',by:'RationWise-test-fixture'}]
 }));
 const quoteTables=[
  ['US','USD',base.map(a=>a.priceAsFed)],
  ['IN','INR',[25,54,18,21,8,14,29,25,7,63,110,16]],
  ['NP','NPR',[37,89,24,28,10,20,42,43,11,92,155,25]]
 ]; // Each list was invented independently; there is NO FX conversion.
 const quotes=quoteTables.flatMap(([country,currency,prices])=>base.map((a,j)=>({
  id:`q_${country.toLowerCase()}_${a.id}`,analysisId:a.id,country,currency,
  amount:prices[j],unit:'kg',quotedOn:'2026-10-19',
  provenance:'SYNTHETIC-MARKET-SEED / NOT A MARKET PRICE OR FX RATE',version:1,demo:true
 })));
 const profile={id:'demo_broiler_grower',version:1,species:'chicken',stage:'Broiler grower (synthetic pilot)',group:'poultry',demo:true,
  source:{referenceId:'SYNTHETIC-STAGE-FIXTURE',description:'Invented mathematical tests only; no scientific tables have been transcribed.',rights:'demo_only',rightsProofRef:null},
  review:{status:'draft',reviewedBy:null,evidenceId:null,reviewedOn:null},
  targets:[{key:'cp',mode:'min',basis:'dm',value:16.5},{key:'fiber',mode:'max',basis:'dm',value:12},
   {key:'me',mode:'min',basis:'dm',value:9.8},{key:'digLys',mode:'min',basis:'dm',value:.65},
   {key:'digMetCys',mode:'min',basis:'dm',value:.48},{key:'ca',mode:'min',basis:'dm',value:.5},
   {key:'availP',mode:'min',basis:'dm',value:.23},{key:'na',mode:'min',basis:'dm',value:.05}]};
 const pigProfile={id:'demo_pig_grower',version:1,species:'pig',stage:'Grower pig (synthetic mathematical pilot)',group:'swine',demo:true,
  source:{referenceId:'SYNTHETIC-SWINE-STAGE-FIXTURE',description:'Invented swine mathematical targets; NRC 2012 values have NOT been copied or validated.',rights:'demo_only',rightsProofRef:null},
  review:{status:'draft',reviewedBy:null,evidenceId:null,reviewedOn:null},
  targets:[{key:'cp',mode:'min',basis:'dm',value:16},{key:'fiber',mode:'max',basis:'dm',value:12},
   {key:'neSwine',mode:'min',basis:'dm',value:8.5},{key:'sidLys',mode:'min',basis:'dm',value:.65},
   {key:'sidThr',mode:'min',basis:'dm',value:.4},{key:'sttdP',mode:'min',basis:'dm',value:.19},
   {key:'ca',mode:'min',basis:'dm',value:.35},{key:'na',mode:'min',basis:'dm',value:.04}]};
 return {analyses,quotes,profiles:[profile,pigProfile]};
}
const API={NUTRIENTS,SPECIES_GROUP,SPECIALIZED_NUTRIENTS,PRICE_UNITS,validateAnalysis,validateQuote,validateProfile,pricePerKg,reviseAnalysis,reviseQuote,assembleMarket,demoData};
root.RationScience2=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
