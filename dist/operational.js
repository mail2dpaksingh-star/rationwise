/* RationWise v1.6: operational production mathematics with USER-SUPPLIED data.
   Important: browser-entered review metadata is NOT authenticated certification.
   This module never changes or approves the built-in synthetic records. */
(function(){'use strict';
const S=window.RationScience2,E=window.RationEngine2,Registry=window.RationStages,Q=window.RationQuality4;
const STAGES={...Registry.STAGES,chicken:Registry.STAGES.chicken_broiler,pig:Registry.STAGES.pig_grower};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,dp=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:dp}):'—';
const today=()=>new Date().toISOString().slice(0,10);
let ingredients=[],targets=[],last=null;
function blank(){return {name:'',dm:'',price:'',min:'0',max:'100',analysisRef:'',rightsRef:'',nutrients:{},labMeta:null,lineage:{},hazardStatus:'not_checked',hazardEvidence:''};}
function resetStage(){const d=STAGES[$('prodSpecies').value];$('prodStage').value=d.stage;$('prodModelInfo').textContent=d.context+' Required nutrient values are blank until provided by you. This stage template is not a complete animal nutrition specification.';targets=d.keys.map((key,i)=>({key,mode:d.directions[i],basis:'dm',value:''}));ingredients=[blank(),blank(),blank()];paint();clear();updatePreflight();}
function clear(){last=null;$('prodOutput').innerHTML='<div class="result-empty">Enter your measured ingredient values, local quotes, and independently established stage requirements to calculate.</div>';}
function paint(){
 $('prodTargets').innerHTML=targets.map((t,i)=>`<tr><td><strong>${esc(S.NUTRIENTS[t.key].name)}</strong><small>${esc(S.NUTRIENTS[t.key].unit)}</small></td><td><select data-t="${i}" data-field="mode"><option value="min" ${t.mode==='min'?'selected':''}>Minimum ≥</option><option value="max" ${t.mode==='max'?'selected':''}>Maximum ≤</option></select></td><td><input data-t="${i}" data-field="value" type="number" min="0" max="100" step="any" placeholder="Required" value="${esc(t.value)}" aria-label="${esc(t.key)} target"></td><td><select data-t="${i}" data-field="basis"><option value="dm" ${t.basis==='dm'?'selected':''}>Dry matter</option><option value="as_fed" ${t.basis==='as_fed'?'selected':''}>As-fed</option></select></td></tr>`).join('');
 const names=targets.map(t=>t.key);
 $('prodCols').innerHTML=`<th>Ingredient / source</th><th>DM % AF</th><th>Price / selected unit</th><th>Min % AF</th><th>Max % AF</th>${names.map(k=>`<th>${esc(S.NUTRIENTS[k].name)}<small>${esc(S.NUTRIENTS[k].unit)} DM</small></th>`).join('')}<th>Rights proof ID</th><th>Hazard / suitability screen</th><th>Hazard evidence ID</th><th></th>`;
 $('prodIngredients').innerHTML=ingredients.map((a,i)=>`<tr><td><input data-i="${i}" data-field="name" placeholder="e.g. laboratory-analysed maize" value="${esc(a.name)}" aria-label="Ingredient name ${i+1}"><input data-i="${i}" data-field="analysisRef" placeholder="Laboratory report / CoA reference" value="${esc(a.analysisRef)}" aria-label="Ingredient evidence ${i+1}"></td>
 <td><input data-i="${i}" data-field="dm" type="number" min="0" max="100" step="any" placeholder="DM" value="${esc(a.dm)}" aria-label="Dry matter ${i+1}"></td>
 <td><input data-i="${i}" data-field="price" type="number" min="0" step="any" placeholder="Price" value="${esc(a.price)}" aria-label="Price ${i+1}"></td>
 <td><input data-i="${i}" data-field="min" type="number" min="0" max="100" step="any" value="${esc(a.min)}" aria-label="Minimum inclusion ${i+1}"></td>
 <td><input data-i="${i}" data-field="max" type="number" min="0" max="100" step="any" value="${esc(a.max)}" aria-label="Maximum inclusion ${i+1}"></td>
 ${names.map(key=>`<td><input data-i="${i}" data-key="${key}" type="number" min="0" max="100" step="any" placeholder="Required" value="${esc(a.nutrients[key]??'')}" aria-label="${esc(a.name||'Ingredient '+(i+1))} ${esc(key)} on DM basis"></td>`).join('')}
 <td><input data-i="${i}" data-field="rightsRef" placeholder="Permission / ownership proof" value="${esc(a.rightsRef)}" aria-label="Rights evidence ${i+1}"></td><td><select data-i="${i}" data-field="hazardStatus" aria-label="Hazard screening status ${i+1}"><option value="not_checked" ${a.hazardStatus!=='passed'&&a.hazardStatus!=='fail'?'selected':''}>Not checked</option><option value="passed" ${a.hazardStatus==='passed'?'selected':''}>Evidence reviewed / pass (operator claim)</option><option value="fail" ${a.hazardStatus==='fail'?'selected':''}>FAILED — do not use</option></select></td><td><input data-i="${i}" data-field="hazardEvidence" placeholder="e.g. mycotoxin/contaminant CoA" value="${esc(a.hazardEvidence||'')}" aria-label="Hazard evidence ${i+1}"></td><td><button type="button" class="prod-remove" data-remove="${i}" aria-label="Remove ingredient ${i+1}">×</button></td></tr>`).join('');
}
function captureChange(e){const d=e.target.dataset||{};
 if(d.t!==undefined){const t=targets[Number(d.t)];if(t)t[d.field]=e.target.value;}
 if(d.i!==undefined){const a=ingredients[Number(d.i)];if(a){if(d.key){a.nutrients[d.key]=e.target.value;delete a.lineage[d.key];}else if(d.field){a[d.field]=e.target.value;if(d.field==='dm'){a.labMeta=null;a.lineage={};}}}}
 clear();
}
function numeric(v,label,min=0,max=100){if(v===''||v===null||v===undefined||!Number.isFinite(Number(v)))throw Error(label+': supply a numeric value');const n=Number(v);if(n<min||n>max)throw Error(label+': outside allowed range');return n;}
function makeRecords(){
 const modelId=$('prodSpecies').value,d=STAGES[modelId],species=d.species,country=$('prodCountry').value.trim().toUpperCase(),currency=$('prodCurrency').value.trim().toUpperCase(),batch=numeric($('prodBatch').value,'Batch kg',0.0001,1e8);
 const reviewer=$('prodReviewer').value.trim(),evidence=$('prodEvidence').value.trim(),requirementSource=$('prodRequirementSource').value.trim(),rights=$('prodRequirementRights').value.trim(),priceSource=$('prodPriceSource').value.trim();
 const stage=$('prodStage').value.trim();
 if(!stage||!reviewer||!evidence||!requirementSource||!rights||!priceSource)throw Error('Fill in stage, external reviewer, profile evidence, requirement source, requirement rights proof and price provenance');
 if(!/^[A-Z]{2}$/.test(country)||!/^[A-Z]{3}$/.test(currency))throw Error('Enter a two-letter ISO country code and three-letter currency code');
 if(!($('prodAttest').checked))throw Error('Confirm that the records are genuine, non-synthetic and reviewed outside RationWise');
 const on=today(),unit=$('prodPriceUnit').value;
 const tt=targets.map(t=>({key:t.key,mode:t.mode,basis:t.basis,value:numeric(t.value,S.NUTRIENTS[t.key].name+' target')}));
 const profile={id:'user_'+modelId+'_stage',modelId:modelId==='chicken'?'chicken_broiler':modelId==='pig'?'pig_grower':modelId,species,stage,group:d.group,version:1,demo:false,source:{referenceId:requirementSource,description:'User supplied stage requirements; independent scientific verification not performed by RationWise',rights:'commercial_permitted',rightsProofRef:rights},review:{status:'approved',reviewedBy:reviewer,evidenceId:evidence,reviewedOn:on},targets:tt};
 const errors=S.validateProfile(profile);if(errors.length)throw Error('Requirement profile: '+errors.join('; '));
 if(!ingredients.length)throw Error('Add at least one ingredient');
 const analyses=[],quotes=[];
 for(let i=0;i<ingredients.length;i++){
  const r=ingredients[i],name=r.name.trim(),lab=r.analysisRef.trim(),usage=r.rightsRef.trim();
  if(!name||!lab||!usage)throw Error('Ingredient '+(i+1)+': enter name, laboratory/CoA evidence and rights proof');
  const nutrients={};for(const t of tt)nutrients[t.key]=numeric(r.nutrients[t.key],name+' / '+t.key);
  const a={id:'user_ing_'+(i+1),name,version:1,dryMatterPct:numeric(r.dm,name+' dry matter',0.000001,100),nutrientBasis:'dry_matter',nutrients,
   minPctAsFed:numeric(r.min,name+' minimum inclusion'),maxPctAsFed:numeric(r.max,name+' maximum inclusion'),allowedGroups:[d.group],enabled:true,demo:false,
   source:{referenceId:lab,description:'User-provided laboratory/CoA or scientific analysis reference; not independently verified by RationWise',rights:'commercial_permitted',rightsProofRef:usage},
   review:{status:'approved',reviewedBy:reviewer,evidenceId:evidence,reviewedOn:on},updatedOn:on,history:[{at:on,event:'user_claimed_external_review',by:'local_operator'}]};
  const q={id:'price_'+(i+1),analysisId:a.id,country,currency,amount:numeric(r.price,name+' price',0,Number.MAX_SAFE_INTEGER),unit,quotedOn:on,provenance:priceSource,version:1,demo:false};
  const ve=S.validateAnalysis(a),vq=S.validateQuote(q);if(ve.length||vq.length)throw Error(name+': '+[...ve,...vq].join('; '));
  analyses.push(a);quotes.push(q);
 }
 return {analyses,quotes,profile,country,currency,group:d.group,batchKgAsFed:batch,mode:'production',operatorClaims:{reviewer,evidence,requirementSource,priceSource},animalContext:{breedOrTaxon:$('prodBreed').value.trim(),ageWeightProduction:$('prodAnimalContext').value.trim()}};
}
function showError(message){$('prodOutput').innerHTML=`<div class="result-error"><strong>Calculation blocked</strong><p>${esc(message)}</p><p>No target or inclusion limit was silently relaxed.</p></div>`;}
function calculate(){
 try{
 const inputs=makeRecords(),r=E.optimize(inputs);last={r,inputs};if(r.status!=='optimal'){showError(r.message);return;}
 $('prodOutput').innerHTML=`<div class="result-hero"><div class="result-kicker">LIVE USER-DATA CALCULATION · EXTERNAL REVIEW NOT VERIFIED</div><div class="result-cost">${esc(r.currency)} ${fmt(r.costTotal)}</div><p>${fmt(r.batchKgAsFed,1)} kg as-fed · ${esc(inputs.profile.stage)}</p></div>
 <div class="result-body"><div class="result-error"><strong>SCIENTIFIC RELEASE BLOCKED — this is a numerical calculation only.</strong><p>${ingredients.some(a=>a.hazardStatus==='fail'&&r.rows.some(z=>z.name===a.name))?'CRITICAL: at least one ingredient in this blend has a FAILED hazard screen. Do not use for animal feeding or feed production. ':' '}Reviewer identity, regional compliance, micronutrient completeness and manufacturing QC have not been independently validated by RationWise. See scientific readiness preflight below.</p></div><div class="metric-list"><div class="metric"><span>Cost/kg as-fed</span><strong>${fmt(r.pricePerKgAsFed,3)}</strong></div><div class="metric"><span>Cost/kg dry matter</span><strong>${fmt(r.pricePerKgDM,3)}</strong></div><div class="metric"><span>Blend dry matter</span><strong>${fmt(r.blendDryMatterPct,2)}%</strong></div><div class="metric"><span>Total dry matter</span><strong>${fmt(r.totalKgDM,2)} kg</strong></div></div>
 <div class="mix-title">Entered target checks</div><div class="pilot-checks">${r.checks.map(t=>`<div><span>${esc(S.NUTRIENTS[t.key].name)}</span><b>${t.mode==='min'?'≥':'≤'} ${fmt(t.value,3)} → ${fmt(t.achieved,3)} ${esc(t.unit)} ${t.basis==='dm'?'DM':'AF'}</b></div>`).join('')}</div>
 <div class="mix-title">Optimized quantities</div>${r.rows.map(x=>`<div class="mix-row"><span>${esc(x.name)}</span><b>${fmt(x.kgAsFed,2)} kg AF · ${fmt(x.kgDM,2)} kg DM (${fmt(x.sharePctAF,2)}%)</b></div>`).join('')}
 <div class="result-warning"><strong>Math result — not an animal-feeding certification.</strong>${esc(r.warnings.join(' '))} Review entries are supplied by the user and not independently authenticated.</div>
 <div class="result-actions"><button type="button" id="prodExport">Download calculation CSV</button><button type="button" id="prodJSON">Save records JSON</button></div></div>`;
 $('prodExport').addEventListener('click',()=>download('RationWise_v1.6_user_data_calculation.csv',csvReport(r,inputs),'text/csv;charset=utf-8'));
 $('prodJSON').addEventListener('click',()=>download('RationWise_v1.6_user_data_records.json',JSON.stringify({schema:'rationwise-1.6',inputs,analyticalProvenance:ingredients.map(({name,labMeta,lineage,hazardStatus,hazardEvidence})=>({name,labMeta,lineage,hazardStatus,hazardEvidence})),readiness:Q.assessReadiness({ingredients,profile:inputs.profile,result:r})},null,2),'application/json'));
 }catch(e){last=null;showError(e.message||String(e));}
}
function csvField(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function csvReport(r,inp){const z=[['RationWise v1.7 USER-ENTERED DATA -- NOT INDEPENDENTLY CERTIFIED'],['Animal',inp.profile.species],['Stage',inp.profile.stage],['Breed or exact taxon',inp.animalContext?.breedOrTaxon||'not supplied'],['Age/weight/production (not used to derive targets)',inp.animalContext?.ageWeightProduction||'not supplied'],['External reviewer claimed',inp.operatorClaims.reviewer],['Review evidence ID',inp.operatorClaims.evidence],['Market country',r.country],['Currency',r.currency],['Batch kg AF',r.batchKgAsFed],['Batch kg DM',r.totalKgDM],['Total cost',r.costTotal],['Price / kg AF',r.pricePerKgAsFed],[],['Ingredient','Lab source ID','kg AF','kg DM','pct AF','price per kg AF','cost']];
 for(const v of r.rows)z.push([v.name,inp.analyses.find(x=>x.id===v.analysisId)?.source.referenceId,v.kgAsFed,v.kgDM,v.sharePctAF,v.pricePerKgAsFed,v.cost]);z.push([],['Nutrient','direction','target','achieved','unit','basis']);for(const v of r.checks)z.push([S.NUTRIENTS[v.key].name,v.mode,v.value,v.achieved,v.unit,v.basis]);z.push([],['WARNING','Review and feeding safety were NOT independently verified by RationWise']);return z.map(row=>row.map(csvField).join(',')).join('\r\n');}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function saveTemplate(){let data;try{data=makeRecords();}catch(_){data=null;}const p={schema:'rationwise-1.7-workspace',species:$('prodSpecies').value,stage:$('prodStage').value,country:$('prodCountry').value,currency:$('prodCurrency').value,batch:$('prodBatch').value,unit:$('prodPriceUnit').value,
 breed:$('prodBreed').value,animalContext:$('prodAnimalContext').value,reviewer:$('prodReviewer').value,evidence:$('prodEvidence').value,source:$('prodRequirementSource').value,rights:$('prodRequirementRights').value,priceSource:$('prodPriceSource').value,targets,ingredients,requirementGrid:window.RationRequirementUI17?.exportState()||null};download('RationWise_v1.7_workspace.json',JSON.stringify(p,null,2),'application/json');}
function loadFile(file){if(!file)return;if(file.size>2e6){showError('File must be smaller than 2MB');return;}file.text().then(raw=>{
 const p=JSON.parse(raw),prior=p.schema==='rationwise-1.3-workspace';
 const selectStage=prior?(p.species==='chicken'?'chicken':p.species==='pig'?'pig':null):p.species;
 if(!['rationwise-1.7-workspace','rationwise-1.6-workspace','rationwise-1.4-workspace','rationwise-1.3-workspace'].includes(p.schema)||!selectStage||!STAGES[selectStage]||!Array.isArray(p.targets)||!Array.isArray(p.ingredients)||p.ingredients.length>60)throw Error('Invalid or unsupported RationWise workspace');
 $('prodSpecies').value=selectStage;resetStage();const d=STAGES[selectStage];if(p.targets.length!==d.keys.length||p.targets.some((t,i)=>t.key!==d.keys[i]))throw Error('Imported nutrient template does not match selected species/stage');
 targets=p.targets;ingredients=p.ingredients.map(x=>({...blank(),...x,nutrients:{...(x.nutrients||{})}}));
 for(const [id,key] of Object.entries({prodBreed:'breed',prodAnimalContext:'animalContext',prodCountry:'country',prodCurrency:'currency',prodBatch:'batch',prodPriceUnit:'unit',prodReviewer:'reviewer',prodEvidence:'evidence',prodRequirementSource:'source',prodRequirementRights:'rights',prodPriceSource:'priceSource'}))if(typeof p[key]==='string')$(id).value=p[key];
 $('prodAttest').checked=false;paint();clear();updatePreflight();window.RationRequirementUI17?.importState(p.requirementGrid);
 }).catch(e=>showError('Import failed: '+e.message));}
/* CSV import is deliberately explicit and opt-in; no inferred 0 values. */
function ingredientHeaders(){return ['name','analysisRef','rightsRef','dm','price','min','max',...STAGES[$('prodSpecies').value].keys];}
function csvEscape(v){return '"'+String(v??'').replaceAll('"','""')+'"';}
function downloadCsvTemplate(){const h=ingredientHeaders();download('RationWise_v1.6_'+$('prodSpecies').value+'_blank_ingredients.csv',[h.map(csvEscape).join(','),h.map(()=>csvEscape('')).join(',')].join('\r\n'),'text/csv;charset=utf-8');}
function parseCsv(s){
 const rows=[];let row=[],field='',quoted=false;const t=s.replace(/^\uFEFF/,'');
 for(let i=0;i<t.length;i++){const c=t[i];if(quoted){if(c==='"'&&t[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
 else if(c==='"'){if(field.length)throw Error('Malformed CSV quotation');quoted=true;}
 else if(c===','){row.push(field);field='';}
 else if(c==='\r'||c==='\n'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[];}
 else field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quotation');row.push(field);if(row.some(x=>x.trim()!==''))rows.push(row);return rows;
}
function loadIngredientCsv(file){if(!file)return;if(file.size>1024*1024){showError('Ingredient CSV must be smaller than 1MB');return;}
 file.text().then(raw=>{
 const data=parseCsv(raw),headers=ingredientHeaders();if(!data.length||data[0].length!==headers.length||data[0].some((v,i)=>v.trim()!==headers[i]))throw Error('CSV header does not match the selected species/stage. Download its blank CSV template first.');
 if(data.length<2)throw Error('CSV has no ingredient rows');if(data.length>61)throw Error('Maximum of 60 ingredient records');
 const out=data.slice(1).map((row,i)=>{if(row.length!==headers.length)throw Error('CSV row '+(i+2)+' has wrong number of columns');const a=blank();for(let j=0;j<headers.length;j++){const h=headers[j];if(STAGES[$('prodSpecies').value].keys.includes(h))a.nutrients[h]=row[j];else a[h]=row[j];}return a;});
 if(out.some(x=>!x.name?.trim()))throw Error('Each ingredient CSV row needs a name');ingredients=out;paint();clear();updatePreflight();
 }).catch(e=>showError('Ingredient CSV import failed: '+e.message));
}
function importLabCsv(file){
 if(!file)return;if(file.size>1000000){showError('Laboratory CSV must be smaller than 1MB');return;}
 file.text().then(text=>{
  const recs=Q.parseCsv(text),normalized=Q.normalizeLabRecords(recs),expected=STAGES[$('prodSpecies').value].keys;
  const known=new Set(normalized.map(r=>r.name.toLocaleLowerCase('en-US')));
  if(known.size!==normalized.length)throw Error('Duplicate ingredient names in lab file');
  // Explicitly replace ingredients only. Targets, batch details and price metadata remain operator-supplied.
  ingredients=normalized.map(r=>{
   const a=blank();a.name=r.name;a.dm=String(r.dryMatterPct);a.analysisRef=r.metadata.evidenceId;
   a.labMeta=r.metadata;a.lineage=r.lineage;
   for(const key of expected)if(Object.hasOwn(r.nutrients,key))a.nutrients[key]=String(r.nutrients[key]);
   return a;
  });
  if(ingredients.length>60)throw Error('Maximum 60 ingredient rows');
  $('prodImportMessage').textContent='Imported '+normalized.length+' ingredient laboratory records; fill missing nutrient results, prices, rights proof and hazard screening before solving. Analysis values were converted to % DM / MJ/kg DM.';
  paint();clear();updatePreflight();
 }).catch(e=>showError('Lab CSV import failed: '+e.message));
}
function updatePreflight(){
 const panel=$('prodSafetyOutput');if(!panel)return;
 const profile=last?.inputs?.profile||{targets:targets.map(t=>({key:t.key}))};
 const report=Q.assessReadiness({ingredients,profile,result:last?.r,controls:{authenticatedReviewer:false,regionRegulatoryReview:false,premixAndMicronutrientReview:false,manufacturingQA:false}});
 const blocks=report.issues.filter(i=>i.severity==='block'),warn=report.issues.filter(i=>i.severity==='warning');
 panel.innerHTML=`<strong>Not authorized for direct feeding or manufacture</strong><p>${blocks.length} outstanding release blockers · ${warn.length} evidence warnings. This local preflight cannot authenticate reviewers or ensure nutrient adequacy.</p><div class="quality-list">${blocks.slice(0,14).map(i=>`<div><b>${esc(i.code)}</b>${esc(i.ingredient?i.ingredient+': ':'')}${esc(i.message)}</div>`).join('')}${blocks.length>14?`<div>...and ${blocks.length-14} additional blockers (download full report).</div>`:''}</div>`;
 return report;
}
function downloadSafetyReport(){const report=updatePreflight();download('RationWise_v1.6_scientific_readiness.json',JSON.stringify({version:'1.6.0',date:today(),stage:$('prodSpecies').value,country:$('prodCountry').value,calculationStatus:last?.r?.status||'not_run',report},null,2),'application/json');}
$('prodLabTemplate').addEventListener('click',()=>download('RationWise_v1.6_laboratory_assays_template.csv',Q.labCsvTemplate(),'text/csv;charset=utf-8'));
$('prodLabImport').addEventListener('change',e=>{importLabCsv(e.target.files?.[0]);e.target.value='';});
$('prodSafetyCheck').addEventListener('click',updatePreflight);
$('prodSafetyExport').addEventListener('click',downloadSafetyReport);
$('prodSpecies').addEventListener('change',resetStage);
$('prodTargets').addEventListener('input',captureChange);$('prodTargets').addEventListener('change',captureChange);
$('prodIngredients').addEventListener('input',captureChange);$('prodIngredients').addEventListener('change',captureChange);
$('prodIngredients').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;ingredients.splice(Number(b.dataset.remove),1);paint();clear();});
$('prodAdd').addEventListener('click',()=>{if(ingredients.length>=60){showError('Maximum of 60 ingredients per session');return;}ingredients.push(blank());paint();clear();updatePreflight();});
$('prodCalculate').addEventListener('click',()=>{calculate();updatePreflight();});
$('prodTemplate').addEventListener('click',downloadCsvTemplate);
$('prodImportCSV').addEventListener('change',e=>{loadIngredientCsv(e.target.files?.[0]);e.target.value='';});
$('prodSave').addEventListener('click',saveTemplate);
$('prodLoad').addEventListener('change',e=>loadFile(e.target.files?.[0]));
$('prodReset').addEventListener('click',()=>{for(const id of ['prodBreed','prodAnimalContext','prodReviewer','prodEvidence','prodRequirementSource','prodRequirementRights','prodPriceSource'])$(id).value='';$('prodAttest').checked=false;resetStage();});
for(const id of ['prodBreed','prodAnimalContext','prodCountry','prodCurrency','prodBatch','prodPriceUnit','prodReviewer','prodEvidence','prodRequirementSource','prodRequirementRights','prodPriceSource','prodAttest'])$(id).addEventListener('change',clear);
resetStage();
})();
