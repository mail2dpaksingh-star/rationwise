/* RationWise — owner-supplied Excel evidence interface. Source figures are NOT certified diets. */
(()=>{'use strict';
const db=window.RationExcelStandards, $=id=>document.getElementById(id);
if(!db||!$('rwExcelProfile')||!$('rwExcelInspector'))return;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const units=window.RationScience2?.NUTRIENTS||{};
const profiles=db.profiles, ings=db.ingredients;
let selectedProfile=null, selectedIngredient=null;
function stage(){return $('prodSpecies')?.value||'';}
function eligible(p){return p.models.includes(stage());}
const profileSelect=$('rwExcelProfile'), inspector=$('rwExcelInspector'), report=$('rwExcelReport');
function renderOptions(){
 const query=($('rwExcelFilter').value||'').toLowerCase().trim();
 const choices=profiles.filter(p=>eligible(p)&&(!query||(p.name+' '+p.sheet+' '+p.workbook).toLowerCase().includes(query)));
 profileSelect.innerHTML='<option value="">Select breed / age / production period…</option>'+choices.map(p=>`<option value="${p.id}">${safe(p.name)}</option>`).join('');
 selectedProfile=null; $('rwExcelTransfer').disabled=true; $('rwExcelConfirm').checked=false;
 $('rwExcelCount').textContent=choices.length+' applicable Excel profiles';
 inspector.innerHTML=choices.length?'<p class="x25-muted">Select the precise breed, growth phase, or production period to view source values and cell references.</p>':'<p class="x25-muted">No directly matching Excel profile exists for this stage. Use documented external targets; do not substitute another species or life stage.</p>';
 report.textContent='';
}
function showProfile(){
 selectedProfile=profiles.find(p=>p.id===profileSelect.value&&eligible(p))||null;
 $('rwExcelTransfer').disabled=!selectedProfile;
 $('rwExcelConfirm').checked=false;report.textContent='';
 const p=selectedProfile;
 if(!p){inspector.textContent='Select a source profile to review.';return;}
 const tr=p.values.slice(0,36).map(v=>{
 const mapped=v.mapping;const hasIssue=!!v.issue;
 const marker=hasIssue&&v.issue.includes('date serial')?'Check Excel cell':mapped?'Compatible field':'Reference only';
 const desc=mapped?`${safe(units[mapped.key]?.name||mapped.key)} · ${mapped.mode==='min'?'minimum':'maximum'} · ${mapped.basis==='dm'?'dry matter':'as-fed'}`:hasIssue?safe(v.issue):'Requires interpretation';
 return `<tr><td>${safe(v.label)}<small>${safe(v.cell)}</small></td><td><b>${safe(v.raw)}</b> ${safe(v.unit)}</td><td><span class="x25-status ${mapped?'ok':hasIssue?'risk':''}">${safe(marker)}</span><small>${desc}</small></td></tr>`;
 }).join('');
 const compatible=p.values.filter(v=>v.mapping).length;
 inspector.innerHTML=`<div class="x25-source"><span>Source workbook</span><strong>${safe(p.workbook)}</strong><span>Worksheet: ${safe(p.sheet)} · stage header ${safe(p.headCell)} · ${compatible} transferable constraint${compatible===1?'':'s'}</span></div>
 <div class="x25-table-wrap"><table class="x25-table"><thead><tr><th>Analyte / cell</th><th>Workbook value</th><th>Compatibility</th></tr></thead><tbody>${tr}</tbody></table></div>
 <p class="x25-note">Source values are unreviewed workbook references. Table rights, breed applicability, laboratory analyses, premixes, feed safety and complete nutrient adequacy still need independent verification. Missing targets are not assigned zero.</p>`;
}
function apply(){
 const p=selectedProfile;
 if(!p||!eligible(p)){report.textContent='Select a reference matching the current stage.';return;}
 if(!$('rwExcelConfirm').checked){report.textContent='Please acknowledge the source status before transferring any values.';return;}
 const model=window.RationStages?.STAGES?.[stage()]||((stage()==='chicken'||stage()==='pig')?window.RationStages?.STAGES?.[stage()==='chicken'?'chicken_broiler':'pig_grower']:null);
 if(!model){report.textContent='No compatible formulation stage available.';return;}
 const rows=[...document.querySelectorAll('#prodTargets tr')];
 // Remove stale inputs when switching between stage reference profiles. Never blend two standards silently.
 for(const r of rows){const t=r.querySelector('[data-field="value"]');if(t){t.value='';t.dispatchEvent(new Event('input',{bubbles:true}));}}
 let copied=0;const copiedKeys=new Set(),skipped=[];
 for(const v of p.values){const m=v.mapping;if(!m||copiedKeys.has(m.key))continue;
  const i=model.keys.indexOf(m.key);if(i<0||!rows[i]){skipped.push(m.key);continue;}
  const r=rows[i],inp=r.querySelector('[data-field="value"]'),mode=r.querySelector('[data-field="mode"]'),basis=r.querySelector('[data-field="basis"]');
  if(!inp||!mode||!basis||!Number.isFinite(m.value))continue;
  inp.value=String(Number(m.value.toFixed(5)));mode.value=m.mode;basis.value=m.basis;
  for(const el of [inp,mode,basis])el.dispatchEvent(new Event('change',{bubbles:true}));
  copied++;copiedKeys.add(m.key);
 }
 const source=$('prodRequirementSource');if(source){source.value=`Excel: ${p.workbook} | ${p.sheet} | stage ${p.headCell} [UNREVIEWED]`;source.dispatchEvent(new Event('change',{bubbles:true}));}
 // Never set reviewer, rights proof, approval or safety attestations.
 const missing=model.keys.filter(k=>!copiedKeys.has(k));
 report.textContent=`${copied} source-matched target${copied===1?'':'s'} copied. ${missing.length} additional required field${missing.length===1?'':'s'} remain BLANK: ${missing.map(k=>units[k]?.name||k).join(', ')}. Independent scientific review still required.`;
 report.scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('rwExcelFilter').addEventListener('input',renderOptions);
profileSelect.addEventListener('change',showProfile);
$('rwExcelTransfer').addEventListener('click',apply);
$('prodSpecies').addEventListener('change',renderOptions);
// Ingredient reference panel (read-only nutritional values, name transfer only).
const iSearch=$('rwExcelIngredientSearch'), iResults=$('rwExcelIngredientResults'), iDetail=$('rwExcelIngredientDetail');
const listed=[];
function renderIngredients(){
 const q=iSearch.value.toLowerCase().trim(),matches=ings.filter(x=>!q||(x.name+' '+x.sheet).toLowerCase().includes(q)).slice(0,28);
 iResults.innerHTML=matches.map(x=>`<button type="button" data-ingredient="${x.id}" class="x25-hit ${selectedIngredient?.id===x.id?'picked':''}"><b>${safe(x.name)}</b><span>${safe(x.sheet)} · Row ${x.row}</span></button>`).join('')||'<p class="x25-muted">No matching ingredient reference.</p>';
 $('rwExcelIngredientCount').textContent=`${ings.length} workbook ingredient entries`;
}
function selectIngredient(id){
 selectedIngredient=ings.find(x=>x.id===id)||null;
 if(!selectedIngredient)return;
 const x=selectedIngredient;
 iDetail.innerHTML=`<h4>${safe(x.name)}</h4><p class="x25-muted">${safe(x.workbook)} · ${safe(x.sheet)} · Row ${x.row}</p>
 <div class="x25-table-wrap"><table class="x25-table"><thead><tr><th>Nutrient in source</th><th>Workbook value</th><th>Cell</th></tr></thead><tbody>${x.measurements.slice(0,25).map(m=>`<tr><td>${safe(m.metric||'Unlabeled measurement')}</td><td>${safe(m.raw)}</td><td>${safe(m.column+x.row)}</td></tr>`).join('')}</tbody></table></div>
 <p class="x25-note">Reference only — measurement basis, commercial rights, species-specific energy/digestibility, ingredient dry matter and safety have not been confirmed. Numeric values are NOT transferred into the optimizer automatically.</p><button type="button" id="rwExcelAddName" class="x25-primary x25-secondary">Add ingredient name only</button><span id="rwExcelIngredientMessage" role="status"></span>`;
 $('rwExcelAddName').addEventListener('click',addName);
 renderIngredients();
}
function addName(){
 const name=selectedIngredient?.name;if(!name)return;
 const tbody=$('prodIngredients');let input=[...tbody.querySelectorAll('input[data-field="name"]')].find(x=>!x.value.trim());
 if(!input){$('prodAdd').click();input=[...tbody.querySelectorAll('input[data-field="name"]')].find(x=>!x.value.trim());}
 if(!input){$('rwExcelIngredientMessage').textContent='No blank ingredient rows available.';return;}
 input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));
 $('rwExcelIngredientMessage').textContent='Ingredient name added. Enter verified dry matter, laboratory nutrients, local price and safety records before calculating.';
}
iSearch.addEventListener('input',renderIngredients);
iResults.addEventListener('click',e=>{const b=e.target.closest('[data-ingredient]');if(b)selectIngredient(b.dataset.ingredient);});
renderOptions();renderIngredients();
})();
