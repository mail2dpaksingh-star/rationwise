/* RationWise v2.1 · global farm context, profile validation & reference applicability.
 * Breed data are descriptive taxonomy/line labels, not nutritional equations.
 * No hidden numeric feed requirements, FX rates, or reference values are included.
 */
(function(root){'use strict';
const STAGES=(typeof module!=='undefined'&&module.exports)?require('./stages').STAGES:root.RationStages.STAGES;
const VERSION='rationwise-global-farm-v2.1';
const COUNTRY_OPTIONS=Object.freeze(((typeof module!=='undefined'&&module.exports)?require('./world-currencies').countryOptions:(root.RationWorldCurrencies?.countryOptions || [])).map(({code,name,currency})=>Object.freeze({code,name,currency})));
const BREEDS=Object.freeze({
 cattle:['Holstein Friesian','Jersey','Brown Swiss','Gir','Sahiwal','Red Sindhi','Angus','Hereford','Brahman','Crossbred','Other / unlisted'],
 buffalo:['Murrah','Nili-Ravi','Jaffarabadi','Mediterranean','Surti','Mehsana','Other / unlisted'],
 sheep:['Merino','Dorper','Suffolk','Awassi','Katahdin','Barbados Blackbelly','Crossbred','Other / unlisted'],
 goat:['Saanen','Alpine','Boer','Jamunapari','Black Bengal','Beetal','Nubian','Crossbred','Other / unlisted'],
 pig:['Large White / Yorkshire','Landrace','Duroc','Pietrain','Berkshire','Hampshire','Crossbred','Other / unlisted'],
 chicken:['Cobb 500','Ross 308','Lohmann Brown','Hy-Line Brown','Rhode Island Red','Local / indigenous','Crossbred','Other / unlisted'],
 turkey:['Broad Breasted White','Bronze','Heritage / other strain','Other / unlisted'],
 duck:['Pekin','Khaki Campbell','Muscovy','Indian Runner','Other / unlisted'],
 goose:['Embden','Toulouse','Chinese goose','Other / unlisted'],
 quail:['Japanese quail','Coturnix line','Bobwhite quail','Other / unlisted'],
 fish:['Nile tilapia','Blue tilapia','African catfish','Channel catfish','Common carp','Rainbow trout','Other / unlisted']
});
const clean=s=>typeof s==='string'?s.trim():'';
const isCode=(s,re)=>typeof s==='string'&&re.test(s);
const validNum=(n,min,max)=>n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max);
const PRODUCTION_FIELDS=Object.freeze({
 bodyWeightKg:{label:'Average live body weight',unit:'kg',min:0.001,max:3000},
 ageDays:{label:'Age',unit:'days',min:0,max:10000},
 milkKgPerDay:{label:'Milk yield (if lactating)',unit:'kg/day',min:0,max:150},
 dailyGainG:{label:'Daily gain (if relevant)',unit:'g/day',min:0,max:3000},
 eggsPerWeek:{label:'Eggs produced per week (if relevant)',unit:'eggs',min:0,max:7},
 gestationDay:{label:'Gestation day (if relevant)',unit:'day',min:0,max:700},
 waterTempC:{label:'Water temperature (fish)',unit:'°C',min:-2,max:45}
});
function defaultCurrency(country){return COUNTRY_OPTIONS.find(x=>x.code===country)?.currency||'';}
function blank(){return {schema:VERSION,profileId:'',farmLabel:'',country:'US',region:'',currency:'USD',stageId:'cattle_dairy',breed:'',strainNotes:'',animalCount:null,
 measures:Object.fromEntries(Object.keys(PRODUCTION_FIELDS).map(k=>[k,null])),nutritionReference:{referenceId:'',applicableBreed:'',applicableCountry:'',reviewStatus:'draft',rights:'unknown'},
 notes:'',savedAt:'',origin:'user_entered',schemaVersion:1};}
function group(stageId){return STAGES[stageId]?.species||null;}
function check(profile){const errors=[],warnings=[];
 if(!profile||typeof profile!=='object'||Array.isArray(profile))return {errors:['Profile must be an object'],warnings:[]};
 if(profile.schema!==VERSION)errors.push('Unsupported profile schema');
 if(!STAGES[profile.stageId])errors.push('Unknown animal stage');
 if(!isCode(profile.country,/^[A-Z]{2}$/))errors.push('Country must be uppercase ISO-2 (e.g. IN, US, NP)');
 if(!isCode(profile.currency,/^[A-Z]{3}$/))errors.push('Currency must be uppercase ISO-3 (e.g. INR, USD, NPR)');
 for(const k of ['farmLabel','region','breed','strainNotes','notes','profileId'])if(typeof profile[k]!=='string'||profile[k].length>240)errors.push(k+' must be text of at most 240 characters');
 if(clean(profile.breed).length===0)warnings.push('Breed/strain is not specified; numeric requirements must not be inferred.');
 if(!validNum(profile.animalCount,1,100000000)||profile.animalCount!==null&&!Number.isInteger(profile.animalCount))errors.push('Animal count must be a positive whole number');
 if(!profile.measures||typeof profile.measures!=='object'||Array.isArray(profile.measures))errors.push('Measurements object missing');
 else for(const [k,def] of Object.entries(PRODUCTION_FIELDS)){if(!Object.hasOwn(profile.measures,k)||!validNum(profile.measures[k],def.min,def.max))errors.push('Invalid measurement '+k+' ('+def.unit+')');}
 const ref=profile.nutritionReference;
 if(!ref||typeof ref!=='object'||Array.isArray(ref))errors.push('Nutrition source metadata missing');
 else {
  for(const k of ['referenceId','applicableBreed','applicableCountry'])if(typeof ref[k]!=='string'||ref[k].length>240)errors.push('Invalid source field '+k);
  if(!['draft','externally_reviewed'].includes(ref.reviewStatus))errors.push('Invalid review status');
  if(!['unknown','restricted','commercial_permitted'].includes(ref.rights))errors.push('Invalid rights status');
 }
 if(profile.origin!=='user_entered')errors.push('Unknown profile origin');
 if(profile.schemaVersion!==1)errors.push('Unsupported profile schema version');
 if(profile.savedAt&&!/^\d{4}-\d{2}-\d{2}T/.test(profile.savedAt))errors.push('Invalid saved timestamp');
 if(profile.measures?.bodyWeightKg===null)warnings.push('Body weight not recorded; many scientific models require it.');
 if(!clean(ref?.referenceId))warnings.push('No licensed nutrient reference linked to this animal profile.');
 if(clean(ref?.referenceId)&&ref?.reviewStatus==='draft')warnings.push('Reference remains draft.');
 if(clean(ref?.referenceId)&&ref?.rights!=='commercial_permitted')warnings.push('Commercial reuse rights not documented.');
 if(defaultCurrency(profile.country)&&defaultCurrency(profile.country)!==profile.currency)warnings.push('Currency differs from the listed country default. This is allowed; NO exchange-rate conversion is performed.');
 return {errors,warnings};
}
function normalize(raw){ // strict explicit shape: imported extra keys are discarded
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid profile JSON');
 const p=blank();
 for(const k of ['profileId','farmLabel','country','region','currency','stageId','breed','strainNotes','animalCount','notes','savedAt','origin','schemaVersion','schema'])if(Object.hasOwn(raw,k))p[k]=raw[k];
 if(raw.measures&&typeof raw.measures==='object'&&!Array.isArray(raw.measures))for(const k of Object.keys(PRODUCTION_FIELDS))if(Object.hasOwn(raw.measures,k))p.measures[k]=raw.measures[k];
 if(raw.nutritionReference&&typeof raw.nutritionReference==='object'&&!Array.isArray(raw.nutritionReference))for(const k of Object.keys(p.nutritionReference))if(Object.hasOwn(raw.nutritionReference,k))p.nutritionReference[k]=raw.nutritionReference[k];
 const chk=check(p);if(chk.errors.length)throw Error(chk.errors.join('; '));return p;
}
function applicability(profile,reference){
 const p=check(profile);if(p.errors.length)return {status:'blocked',reasons:p.errors};
 const reasons=[];if(!reference||typeof reference!=='object')return {status:'unverified',reasons:['No nutrient requirement reference selected']};
 if(reference.modelId!==profile.stageId)reasons.push('Selected nutrient reference is for a different species/stage');
 const breed=clean(profile.breed).toLowerCase(),targetBreed=clean(reference.applicableBreed).toLowerCase();
 if(!breed||!targetBreed||targetBreed!==breed)reasons.push('Breed or strain applicability has not been verified by exact match');
 const country=clean(reference.applicableCountry).toUpperCase();
 if(country!==profile.country)reasons.push('Country/population applicability is not verified');
 if(reference.reviewStatus!=='externally_reviewed')reasons.push('External review not documented');
 if(reference.rights!=='commercial_permitted')reasons.push('Commercial rights not documented');
 if(!clean(reference.referenceId))reasons.push('Missing scientific source ID');
 // Even a matched metadata record is unverified until independently authenticated.
 return {status:reasons.length?'unverified':'metadata_match_only',reasons:reasons.length?reasons:['Metadata matches; RationWise has NOT authenticated the reference, nutritional targets, or reviewer.']};
}
const api=Object.freeze({VERSION,COUNTRY_OPTIONS,BREEDS,PRODUCTION_FIELDS,STAGES,defaultCurrency,group,blank,check,normalize,applicability});
root.RationGlobal21=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
