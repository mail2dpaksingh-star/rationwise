/* RationWise source-traceable reference browser — independent from the chosen formulation model. */
(()=>{'use strict';
const db=window.RationExcelStandards, $=id=>document.getElementById(id);
if(!db||!$('rwExcelProfile')||!$('rwExcelAnimalGrid'))return;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const units=window.RationScience2?.NUTRIENTS||{};
const models=window.RationStages?.STAGES||{};
const profiles=db.profiles, ingredients=db.ingredients;
const categories=[
 ['cattle','Cattle','🐄'],['buffalo','Buffalo','🐃'],['sheep','Sheep','🐑'],['goat','Goats','🐐'],
 ['pig','Pigs','🐖'],['chicken','Chickens','🐔'],['turkey','Turkeys','🦃'],['duck','Ducks','🦆'],
 ['goose','Geese','🪿'],['quail','Quail','🐦'],['pheasant','Pheasants','🐦'],['fish','Fish','🐟'],['shrimp','Shrimp','🦐']
];
let animal='all', selectedProfile=null, selectedIngredient=null, visibleLimit=12;
const profileSelect=$('rwExcelProfile'), inspector=$('rwExcelInspector'), report=$('rwExcelReport'), modelSelect=$('rwExcelModel');
const typeCount=id=>profiles.filter(p=>p.species===id).length;
function activeStage(){const s=$('prodSpecies')?.value||'';return s==='pig'?'pig_grower':s==='chicken'?'chicken_broiler':s;}
function eligible(p){return p.models.includes(activeStage());}
function breedLabel(p){return p.sheet||p.name.split(' · ')[0];}
function available(){
 const q=($('rwExcelFilter').value||'').toLocaleLowerCase().trim();
 const br=$('rwExcelBreed').value;
 const pool=profiles.filter(p=>(animal==='all'||p.species===animal)&&(!br||breedLabel(p)===br)&&(!q||[p.name,p.sheet,p.stage,p.species,p.workbook].some(x=>String(x||'').toLocaleLowerCase().includes(q))));
 if(animal!=='all')return pool;
 // Show diversity before scrolling: distribute source records across groups in round-robin order.
 const groups=new Map();for(const p of pool){if(!groups.has(p.species))groups.set(p.species,[]);groups.get(p.species).push(p);}
 const out=[];let n=0;while(n<pool.length){for(const cat of categories){const g=groups.get(cat[0]);if(g&&g.length){out.push(g.shift());n++;}}}
 return out;
}
function renderAnimals(){
 const all={id:'all',name:'All animals',icon:'◎',count:profiles.length};
 const arr=[all,...categories.map(([id,name,icon])=>({id,name,icon,count:typeCount(id)}))];
 $('rwExcelAnimalGrid').innerHTML=arr.map(c=>`<button type="button" class="x25-animal ${c.id===animal?'active':''} ${c.count?'':'zero'}" data-animal="${c.id}" aria-pressed="${c.id===animal?'true':'false'}"><span class="x25-animal-ico" aria-hidden="true">${c.icon}</span><span class="x25-animal-label"><span class="x25-animal-name">${safe(c.name)}</span><span class="x25-animal-meta">${c.count?`${c.count} stage reference${c.count===1?'':'s'}`:'No workbook reference'}</span></span></button>`).join('');
}
function renderBreeds(){
 const sel=$('rwExcelBreed');const previous=sel.value;
 const list=[...new Set(profiles.filter(p=>animal==='all'||p.species===animal).map(breedLabel))].sort((a,b)=>a.localeCompare(b));
 sel.innerHTML='<option value="">All breeds / reference families</option>'+list.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');
 sel.value=list.includes(previous)?previous:'';
}
function markTransferStatus(){
 const p=selectedProfile;const matched=!!p&&eligible(p);
 const selectedModel=models[activeStage()];
 const count=p&&matched&&selectedModel?p.values.filter(v=>v.mapping&&selectedModel.keys.includes(v.mapping.key)).length:0;
 $('rwExcelTransfer').disabled=!matched||count===0;
 if(p&&matched&&count===0){$('rwExcelMatchHint').textContent='Enter appropriate nutrient measurements to calculate this stage.';}
 else if(p&&!matched){const msg=p.models.length?'Select the matching animal and stage to calculate.':'This animal or stage does not yet have its own calculation model.';
 $('rwExcelMatchHint').textContent=msg;}
 else if(p){$('rwExcelMatchHint').textContent='Matching animal and stage confirmed. Review workbook units and required nutrients before copying.';}
}
function showProfile(){
 selectedProfile=profiles.find(p=>p.id===profileSelect.value)||null;
 $('rwExcelConfirm').checked=false;report.textContent='';
 const p=selectedProfile;
 if(window.RationCompleteUI)window.RationCompleteUI.select(p);
 $('rwExcelMatch').hidden=!p;
 if(!p){inspector.innerHTML='<p class="x25-muted">Choose a stage from the cards or stage dropdown to view its source, nutrients and suitability.</p>';markTransferStatus();return;}
 const displayUnit=v=>{const direct=String(v.unit||'').trim();if(direct)return direct;const label=String(v.label||'');
  if(/%/.test(label))return '%';if(/\bkg\/day\b/i.test(label))return 'kg/day';
  if(/\bkcal\/kg\b/i.test(label))return 'kcal/kg';if(/\bMJ\/kg\b/i.test(label))return 'MJ/kg';
  if(/\bmg\/kg\b/i.test(label))return 'mg/kg';if(/\bg\/day\b/i.test(label))return 'g/day';
  if(/\bbody weight[, ]+kg\b/i.test(label))return 'kg';return 'unit not supplied';};
 const tr=p.values.map(v=>`<tr><td>${safe(v.label)}</td><td><b>${safe(v.raw)}</b> <span class="x25-unit">${safe(displayUnit(v))}</span></td></tr>`).join('');
 inspector.innerHTML=`<div class="x25-source"><strong>${safe(p.name)}</strong><span>${safe(p.species)} · ${p.values.length} source measurements</span><span>Source: ${safe(p.workbook)} · ${safe(p.sheet)} · ${safe(p.headCell)}</span></div>
 <div class="x25-table-wrap"><table class="x25-table"><thead><tr><th>Feeding-standard measurement</th><th>Value</th></tr></thead><tbody>${tr}</tbody></table></div>
 <p class="x25-note">The complete calculation below uses nutrient concentrations where the worksheet gives interpretable values and units. Animal intake and feeding-period measurements are shown separately. Original source data still require independent nutritional validation.</p>`;
 modelSelect.innerHTML=p.models.length?p.models.filter(m=>models[m]).map(m=>`<option value="${safe(m)}">${safe(models[m].stage)}</option>`).join(''):'<option value="">No matching animal-stage calculator</option>';
 modelSelect.value=p.models.includes(activeStage())?activeStage():modelSelect.options[0]?.value||'';
 $('rwExcelUseModel').disabled=!modelSelect.value||activeStage()===modelSelect.value;
 markTransferStatus();
}
function renderOptions(){
 const choices=available();const before=selectedProfile?.id;
 profileSelect.innerHTML='<option value="">Select animal / breed / weight / production stage…</option>'+choices.map(p=>`<option value="${safe(p.id)}">${safe(p.name)}</option>`).join('');
 const count=choices.length;
 $('rwExcelCount').textContent=`${profiles.length} stage references · ${db.sourceCount} source workbooks`;
 $('rwExcelMatchCount').textContent=`${count} reference stage${count===1?'':'s'} found`;
 $('rwExcelBrowseInfo').textContent=animal==='all'?'Browse all animal groups and available feeding standards.':`${categories.find(x=>x[0]===animal)?.[1]||animal}: ${count?'choose a breed and production stage':'no matching workbook entry; enter verified targets manually'}`;
 $('rwExcelCards').innerHTML=choices.slice(0,visibleLimit).map(p=>{
  const count=p.values.filter(v=>v.mapping).length;return `<button type="button" data-profile="${safe(p.id)}" class="x25-card ${before===p.id?'picked':''}"><span class="x25-card-title">${safe(p.name)}</span><span class="x25-card-foot"><span>${safe(p.sheet)} · ${safe(p.stage)}</span><span class="x25-state ${p.models.length?'':'muted'}">${p.models.length?`${count} nutrient fields`:'Browse standards'}</span></span></button>`;
 }).join('')||(animal==='buffalo'||animal==='sheep'?'<div class="x25-empty"><b>No dedicated values in these source workbooks yet.</b> This animal remains supported in the calculator, but requires its own verified nutrient targets. Cattle or goat standards will not be copied automatically.</div>':'<div class="x25-empty">No references match your filters. Try a different breed, animal group or search term.</div>');
 $('rwExcelMore').hidden=count<=visibleLimit;
 $('rwExcelMore').textContent=`Show more stages (${count-visibleLimit} remaining)`;
 const stillThere=choices.find(p=>p.id===before);
 profileSelect.value=stillThere?before:'';
 if(!stillThere){selectedProfile=null;showProfile();}else{showProfile();}
}
function chooseAnimal(id){if(id!=='all'&&!categories.some(c=>c[0]===id))return;animal=id;visibleLimit=12;selectedProfile=null;$('rwExcelFilter').value='';renderAnimals();renderBreeds();renderOptions();}
$('rwExcelAnimalGrid').addEventListener('click',e=>{const b=e.target.closest('[data-animal]');if(b)chooseAnimal(b.dataset.animal);});
$('rwExcelShowAll').addEventListener('click',()=>chooseAnimal('all'));
$('rwExcelBreed').addEventListener('change',()=>{visibleLimit=12;renderOptions();});
$('rwExcelFilter').addEventListener('input',()=>{visibleLimit=12;renderOptions();});
$('rwExcelCards').addEventListener('click',e=>{const b=e.target.closest('[data-profile]');if(!b)return;profileSelect.value=b.dataset.profile;showProfile();renderOptions();});
profileSelect.addEventListener('change',()=>{showProfile();renderOptions();});
$('rwExcelMore').addEventListener('click',()=>{visibleLimit+=24;renderOptions();});
modelSelect.addEventListener('change',()=>{$('rwExcelUseModel').disabled=!modelSelect.value||activeStage()===modelSelect.value;});
$('rwExcelUseModel').addEventListener('click',()=>{
 const p=selectedProfile,next=modelSelect.value;
 if(!p||!p.models.includes(next)||!models[next])return;
 const stage=$('prodSpecies');if(!stage||![...stage.options].some(o=>o.value===next)){report.textContent='This matching stage is not available in the current calculator. Choose appropriate targets manually.';return;}
 if(stage.value!==next){stage.value=next;stage.dispatchEvent(new Event('change',{bubbles:true}));}
 markTransferStatus();$('rwExcelUseModel').disabled=true;
 report.textContent=`Calculator stage set to ${models[next].stage}. Earlier nutrient entries may have been cleared. Review and confirm source values before copying.`;
});
$('prodSpecies').addEventListener('change',()=>{markTransferStatus();if(selectedProfile){$('rwExcelUseModel').disabled=!modelSelect.value||modelSelect.value===activeStage();$('rwExcelConfirm').checked=false;}});
function apply(){
 const p=selectedProfile;
 if(!p||!eligible(p)){report.textContent='Choose a reference matched to the current calculator species and production stage. Use the matching-stage control above if needed.';return;}
 if(!$('rwExcelConfirm').checked){report.textContent='Confirm that you understand this is an unreviewed reference before transferring targets.';return;}
 const model=models[activeStage()];if(!model){report.textContent='No compatible formulation stage available.';return;}
 const rows=[...document.querySelectorAll('#prodTargets tr')];
 for(const r of rows){const inp=r.querySelector('[data-field="value"]');if(inp){inp.value='';inp.dispatchEvent(new Event('input',{bubbles:true}));}}
 const copiedKeys=new Set();let copied=0;
 for(const v of p.values){const m=v.mapping;if(!m||copiedKeys.has(m.key))continue;
  const i=model.keys.indexOf(m.key);if(i<0||!rows[i])continue;
  const r=rows[i],inp=r.querySelector('[data-field="value"]'),direction=r.querySelector('[data-field="mode"]'),basis=r.querySelector('[data-field="basis"]');
  if(!inp||!direction||!basis||!Number.isFinite(m.value))continue;
  inp.value=String(Number(m.value.toFixed(5)));direction.value=m.mode;basis.value=m.basis;
  for(const el of [inp,direction,basis])el.dispatchEvent(new Event('change',{bubbles:true}));
  copied++;copiedKeys.add(m.key);
 }
 const src=$('prodRequirementSource');if(src){src.value=`Source: ${p.workbook} | ${p.sheet} | stage ${p.headCell} [UNREVIEWED]`;src.dispatchEvent(new Event('change',{bubbles:true}));}
 const missing=model.keys.filter(k=>!copiedKeys.has(k));
 report.textContent=`${copied} matching target${copied===1?'':'s'} copied. ${missing.length} additional required field${missing.length===1?'':'s'} still BLANK: ${missing.map(k=>units[k]?.name||k).join(', ')}. This is not a certified feeding formulation.`;
 report.scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('rwExcelTransfer').addEventListener('click',apply);
// Add source-backed ingredient values to the currently selected formulation.
// Only dimensions with a confirmed source basis or a user-specified basis are transferred.
const iSearch=$('rwExcelIngredientSearch'),iResults=$('rwExcelIngredientResults'),iDetail=$('rwExcelIngredientDetail'),ings=ingredients;
const wbTransfer=window.RationWorkbookIngredientTransfer;
function renderIngredients(){
 const q=iSearch.value.toLowerCase().trim(),matches=ings.filter(x=>!q||(x.name+' '+x.sheet).toLowerCase().includes(q)).slice(0,28);
 iResults.innerHTML=matches.map(x=>`<button type="button" data-ingredient="${safe(x.id)}" class="x25-hit ${selectedIngredient?.id===x.id?'picked':''}"><b>${safe(x.name)}</b><span>${safe(x.sheet)} · Row ${x.row}</span></button>`).join('')||'<p class="x25-muted">No matching ingredient found.</p>';
 $('rwExcelIngredientCount').textContent=`${ings.length} ingredient entries`;
}
function selectIngredient(id){
 selectedIngredient=ings.find(x=>x.id===id)||null;if(!selectedIngredient)return;
 const x=selectedIngredient;
 const known=wbTransfer?.declaredBasis(x),dryMatter=wbTransfer?.sourceDM(x);
 const stage=window.RationIngredientBridge?.getStage();
 const compatible=wbTransfer?.applicable(x,stage?.group);
 const rows=x.measurements.slice(0,30).map(m=>`<tr><td>${safe(m.metric||'Ingredient measurement')}</td><td>${safe(m.raw)}</td></tr>`).join('');
 iDetail.innerHTML=`<h4>${safe(x.name)}</h4><p class="x25-muted">${safe(x.sheet)} · Row ${x.row}</p>
 <div class="x25-table-wrap"><table class="x25-table"><thead><tr><th>Nutrient</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="x25-source-fields">${known?'<p>Source nutrient values: <strong>dry-matter basis</strong>.</p>':`<label>Nutrient values measured on<select id="rwIngredientBasis"><option value="">Choose basis…</option><option value="dm">Dry-matter basis</option><option value="as_fed">As-fed basis</option></select></label>`}
 ${dryMatter===null?'<label>Ingredient dry matter (%)<input id="rwIngredientDryMatter" type="number" min="0.01" max="100" step="any" placeholder="Enter dry matter %"/></label>':`<p>Dry matter: <strong>${dryMatter}% as-fed</strong></p>`}
 <label>Local price (optional; current selected price unit)<input id="rwIngredientLocalPrice" type="number" inputmode="decimal" min="0" step="any" placeholder="Enter price now or in formulation table"/></label>
 </div>
 <button type="button" id="rwExcelAddName" class="x25-primary">Add ingredient to formulation</button>
 <p class="x25-note">Adds this ingredient to your formulation. Available matching composition values are copied; price and missing measurements can be completed in the ingredient table. Animal-specific energy or digestibility from a different species is never assumed.</p>
 <div id="rwExcelIngredientMessage" class="x25-add-message" role="status">${compatible?'Ready to add ingredient and matching nutrient values.':'You can add this ingredient. General composition values can be copied when units are known; species-specific nutrients remain blank.'}</div>
 <button type="button" id="rwExcelViewAdded" class="x25-view-ingredient" hidden>View ingredient in formulation ↓</button>`;
 $('rwExcelAddName').addEventListener('click',addWithValues);renderIngredients();
}
function addWithValues(){
 const rec=selectedIngredient;if(!rec||!wbTransfer)return;
 const bridge=window.RationIngredientBridge,model=bridge?.getStage(),known=wbTransfer.declaredBasis(rec);
 if(!bridge||!model){$('rwExcelIngredientMessage').textContent='Calculator not yet ready.';return;}
 const basis=known||$('rwIngredientBasis')?.value||'';
 const dmPct=wbTransfer.sourceDM(rec)??($('rwIngredientDryMatter')?.value||null);
 const price=$('rwIngredientLocalPrice')?.value||null;
 const result=bridge.addFromWorkbook(rec,{basis,dmPct,price});
 const message=$('rwExcelIngredientMessage');
 if(!result.ok){message.textContent=result.error;return;}
 const plan=window.RationCompleteUI?.getPlan();
 const active=window.RationWorkbookIngredientTransfer.prepare(rec,{group:model.group,basis,dmPct});
 // The advanced nutrient table is repainted when a new ingredient row appears.
 // Populate compatible total/digestible identities, never substitute one for the other.
 setTimeout(()=>{
  const i=result.rowIndex;
  const inputs=[...document.querySelectorAll(`#rwCompleteAnalysis [data-i="${i}"][data-rw-nutrient]`)];
  for(const input of inputs){const val=active.expanded[input.dataset.rwNutrient];if(!String(input.value).trim()&&Number.isFinite(val)){
     input.value=String(Number(val.toFixed(6)));input.dispatchEvent(new Event('input',{bubbles:true}));
  }}
 },0);
 const shown=result.matched.length;
 const extra=plan?.b?.nutrients?.filter(n=>Number.isFinite(active.expanded[n.code])).length||0;
 const parts=[];
 if(result.already)parts.push(`${rec.name} is already in the formulation; newly supplied measurements were added without replacing your edits.`);
 else parts.push(`Added ${rec.name} to formulation (${document.querySelectorAll('#prodIngredients tr').length} ingredient rows).`);
 parts.push(`${shown+extra} matching nutrient field${shown+extra===1?'':'s'} populated or available.`);
 if(result.scope==='shared_composition')parts.push('Only general composition values were copied from this other animal-group source; enter the selected species’ energy and digestible nutrients separately.');
 if(result.needs.length)parts.push('For nutrient transfer, enter '+result.needs.join(' and ')+'; the ingredient name has already been added.');
 parts.push('Complete the local price and any remaining nutrient analyses before calculating.');
 message.textContent=parts.join(' ');
 const view=$('rwExcelViewAdded');view.hidden=false;
 view.onclick=()=>{
    const tab=document.querySelector('[data-step="3"]');if(tab)tab.click();
    const row=document.querySelectorAll('#prodIngredients tr')[result.rowIndex];
    row?.scrollIntoView({behavior:'smooth',block:'center'});
    row?.querySelector('[data-field="price"]')?.focus({preventScroll:true});
 };
}
$('prodSpecies').addEventListener('change',()=>{if(selectedIngredient)selectIngredient(selectedIngredient.id);});
iSearch.addEventListener('input',renderIngredients);
iResults.addEventListener('click',e=>{const b=e.target.closest('[data-ingredient]');if(b)selectIngredient(b.dataset.ingredient);});
renderAnimals();renderBreeds();renderOptions();renderIngredients();
})();
