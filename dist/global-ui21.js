/* v2.1 user-side farm context. Uses session-only/explicit JSON export; no remote accounts or PII transport. */
(function(){'use strict';const G=window.RationGlobal21;if(!G)return;
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let profile=G.blank();
function options(items,val){return items.map(x=>`<option value="${escape(x[0])}" ${x[0]===val?'selected':''}>${escape(x[1])}</option>`).join('');}
function renderModels(){const ids=Object.entries(G.STAGES),v=$('g21Stage').value||profile.stageId;$('g21Stage').innerHTML=options(ids.map(([id,s])=>[id,`${s.stage}`]),v);if(!G.STAGES[v])$('g21Stage').value=profile.stageId;}
function relevantMeasures(){
 const id=profile.stageId,species=G.group(id);const keys=new Set(['bodyWeightKg','ageDays']);
 if((['cattle','buffalo','goat','sheep'].includes(species))&&(id.includes('dairy')||id.includes('lactation')))keys.add('milkKgPerDay');
 if(id.includes('gestation'))keys.add('gestationDay');
 if(id.includes('grower')||id.includes('finisher')||id.includes('beef')||id.includes('broiler')||id.includes('heifer'))keys.add('dailyGainG');
 if(id.includes('layer')||id.includes('breeder'))keys.add('eggsPerWeek');
 if(species==='fish')keys.add('waterTempC');
 for(const k of Object.keys(G.PRODUCTION_FIELDS))$('g21_'+k).parentElement.hidden=!keys.has(k);
}
function renderBreeds(){const species=G.group(profile.stageId),items=G.BREEDS[species]||[];$('g21BreedOptions').innerHTML=items.map(b=>`<option value="${escape(b)}"></option>`).join('');$('g21BreedHint').textContent=`${species||'Unknown'} · suggestions only; you may enter any locally used breed, crossbreed or strain.`;}
function draw(){
 const known=G.COUNTRY_OPTIONS.some(c=>c.code===profile.country);$('g21Country').value=known?profile.country:'OTHER';$('g21CountryOtherLabel').hidden=known;$('g21CountryOther').value=known?'':profile.country;$('g21Currency').value=profile.currency;$('g21Region').value=profile.region;
 $('g21Farm').value=profile.farmLabel;$('g21Breed').value=profile.breed;$('g21Notes').value=profile.strainNotes;
 $('g21Count').value=profile.animalCount??'';$('g21Stage').value=profile.stageId;
 for(const [id,k] of Object.entries({g21RefId:'referenceId',g21RefBreed:'applicableBreed',g21RefCountry:'applicableCountry',g21RefStatus:'reviewStatus',g21RefRights:'rights'}))$(id).value=profile.nutritionReference[k];
 for(const k of Object.keys(G.PRODUCTION_FIELDS))$('g21_'+k).value=profile.measures[k]??'';
 renderBreeds();relevantMeasures();status();
}
function update(){
 profile.farmLabel=$('g21Farm').value.trim();profile.country=$('g21Country').value==='OTHER'?$('g21CountryOther').value.trim().toUpperCase():$('g21Country').value;profile.currency=$('g21Currency').value.trim().toUpperCase();profile.region=$('g21Region').value.trim();
 profile.stageId=$('g21Stage').value;profile.breed=$('g21Breed').value.trim();profile.strainNotes=$('g21Notes').value.trim();
 const n=$('g21Count').value.trim();profile.animalCount=n===''?null:Number(n);
 for(const k of Object.keys(G.PRODUCTION_FIELDS)){const val=$('g21_'+k).value.trim();profile.measures[k]=val===''?null:Number(val);}
 for(const [id,k] of Object.entries({g21RefId:'referenceId',g21RefBreed:'applicableBreed',g21RefCountry:'applicableCountry',g21RefStatus:'reviewStatus',g21RefRights:'rights'}))profile.nutritionReference[k]=$(id).value.trim();
 profile.nutritionReference.applicableCountry=profile.nutritionReference.applicableCountry.toUpperCase();
 status();
}
function status(message){const c=G.check(profile),el=$('g21Status');el.className='g21-status '+(c.errors.length?'error':'warning');
 el.innerHTML=`<b>${c.errors.length?'Fix '+c.errors.length+' input errors':'Farm profile recorded · nutrient requirements NOT estimated'}</b><p>${escape(message||'Breed labels and production measurements organize your data; the calculator still requires independently sourced numerical targets.')}</p>`+(c.errors.length?`<ul>${c.errors.map(x=>'<li>'+escape(x)+'</li>').join('')}</ul>`:'')+`<small>${c.warnings.slice(0,3).map(escape).join(' · ')}</small>`;
 const proof=G.applicability(profile,{...profile.nutritionReference,modelId:profile.stageId});$('g21RefCheck').innerHTML='<b>'+escape(proof.status==='metadata_match_only'?'Metadata match only — NOT feeding approval':'Reference applicability not established')+'</b><ul>'+proof.reasons.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>';
 $('g21Export').disabled=Boolean(c.errors.length);$('g21Apply').disabled=Boolean(c.errors.length);
}
function trigger(el,event='input'){el.dispatchEvent(new Event(event,{bubbles:true}));}
function apply(){update();const issues=G.check(profile).errors;if(issues.length){status('Correct the profile before transferring.');return;}
 const p=G.normalize(profile);
 // The generic 37-stage workbench remains source of truth; changing stage intentionally wipes old numerical targets.
 const model=$('prodSpecies');const alias={chicken_broiler:'chicken',pig_grower:'pig'};
 model.value=alias[p.stageId]||p.stageId;if(!model.value){status('This stage is not present in the legacy drop-down');return;}
 trigger(model,'change');
 for(const [id,value] of Object.entries({prodBreed:p.breed,prodCountry:p.country,prodCurrency:p.currency,prodAnimalContext:[p.measures.bodyWeightKg==null?'':'BW '+p.measures.bodyWeightKg+' kg',p.measures.ageDays==null?'':'Age '+p.measures.ageDays+' d',p.measures.milkKgPerDay==null?'':'Milk '+p.measures.milkKgPerDay+' kg/day',p.measures.dailyGainG==null?'':'Gain '+p.measures.dailyGainG+' g/day',p.measures.gestationDay==null?'':'Gestation day '+p.measures.gestationDay,p.region,p.strainNotes].filter(Boolean).join(' | ')})){
 const el=$(id);el.value=value;trigger(el,'change');
 }
 // Clear any numeric values and old externally claimed scientific approvals during context change.
 for(const id of ['prodReviewer','prodEvidence','prodRequirementSource','prodRequirementRights']){const el=$(id);el.value='';trigger(el,'change');}
 $('prodAttest').checked=false;trigger($('prodAttest'),'change');
 if(['chicken_broiler','pig_grower','cattle_dairy'].includes(p.stageId)){
  const advanced=$('s20Model');advanced.value=p.stageId;trigger(advanced,'change');
  for(const [id,value] of Object.entries({s20Country:p.country,s20Currency:p.currency,s20Breed:p.breed,s20Age:[p.measures.bodyWeightKg==null?'':'BW '+p.measures.bodyWeightKg+'kg',p.measures.ageDays==null?'':'age '+p.measures.ageDays+'d'].filter(Boolean).join(' · '),s20Production:[p.measures.milkKgPerDay==null?'':'Milk '+p.measures.milkKgPerDay+'kg/day',p.measures.dailyGainG==null?'':'Growth '+p.measures.dailyGainG+'g/day'].filter(Boolean).join(' · ')})){const el=$(id);el.value=value;trigger(el);}
 }
 status('Profile transferred into the selected stage. Former nutrient requirements and review attestations were cleared to prevent reuse for a changed animal.');
 $('production').scrollIntoView({behavior:'smooth',block:'start'});
}
function download(){update();try{const p=G.normalize({...profile,savedAt:new Date().toISOString()});const json=JSON.stringify(p,null,2),b=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='RationWise_v2.1_farm_profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);status('Exported profile to your device. No account or cloud save is active.');}catch(e){status(e.message);}}
async function upload(ev){const file=ev.target.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('File too large (100 KB maximum)');const obj=JSON.parse(await file.text());profile=G.normalize(obj);draw();status('Imported a valid local profile. Review species/breed measurements before transferring.');}catch(e){status('Import rejected: '+e.message);}ev.target.value='';}
$('g21Country').innerHTML=options(G.COUNTRY_OPTIONS.map(c=>[c.code,`${c.name} (${c.code})`]),profile.country)+'<option value="OTHER">Other country (enter ISO-2 code)</option>';
renderModels();
const meas=$('g21Measurements');meas.innerHTML=Object.entries(G.PRODUCTION_FIELDS).map(([k,m])=>`<label>${escape(m.label)} (${escape(m.unit)})<input id="g21_${k}" type="number" min="${m.min}" max="${m.max}" step="any" placeholder="Optional"></label>`).join('');
const controls=['g21RefId','g21RefBreed','g21RefCountry','g21RefStatus','g21RefRights','g21CountryOther','g21Farm','g21Region','g21Currency','g21Breed','g21Notes','g21Count',...Object.keys(G.PRODUCTION_FIELDS).map(k=>'g21_'+k)];
for(const id of controls)$(id).addEventListener('input',()=>{update();if(id==='g21Stage')renderBreeds();});
$('g21Country').addEventListener('change',()=>{const old=G.defaultCurrency(profile.country);const code=$('g21Country').value;const next=G.defaultCurrency(code);$('g21CountryOtherLabel').hidden=code!=='OTHER';if(code==='OTHER')$('g21CountryOther').value='';if(!profile.currency||profile.currency===old)$('g21Currency').value=next||profile.currency;update();});
$('g21Stage').addEventListener('change',()=>{
 const oldSpecies=G.group(profile.stageId),newStage=$('g21Stage').value;
 if(newStage!==profile.stageId){profile.measures=Object.fromEntries(Object.keys(G.PRODUCTION_FIELDS).map(k=>[k,null]));
   if(G.group(newStage)!==oldSpecies){profile.breed='';profile.strainNotes='';profile.animalCount=null;}
   profile.nutritionReference={referenceId:'',applicableBreed:'',applicableCountry:'',reviewStatus:'draft',rights:'unknown'};
 }
 profile.stageId=newStage;draw();status('Animal stage changed. Prior measurements and scientific applicability claims were cleared to avoid transferring incorrect context.');
 });
$('g21Export').addEventListener('click',download);$('g21Import').addEventListener('change',upload);$('g21Apply').addEventListener('click',apply);
$('g21Reset').addEventListener('click',()=>{profile=G.blank();draw();});
window.RationWiseFarm={get:()=>{update();const p=G.normalize(profile);if(G.check(p).errors.length)throw Error('Correct the farm profile before saving');return p;},set:(v)=>{profile=G.normalize(v);draw();}};
draw();
})();
