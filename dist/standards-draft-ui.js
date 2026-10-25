/* RationWise: draft feeding standards browser. No licensing or nutritionist certification is implied. */
(()=>{'use strict';
const data=window.RationDraftStandards;
const $=id=>document.getElementById(id);
if(!data || !$('rwStandardSelect') || !$('prodSpecies'))return;
const profiles=data.profiles;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyNames={cp:'Crude protein',ca:'Calcium',p:'Phosphorus',ndf:'NDF',digLys:'Digestible lysine',digMetCys:'Digestible Met+Cys',availP:'Available P',sttdP:'STTD P',neSwine:'NE swine',meRuminant:'ME ruminant',deFish:'Fish DE',fiber:'Crude fiber',fat:'Crude fat'};
let selected=null;
function updateOptions(){
 const model=$('prodSpecies').value,select=$('rwStandardSelect');
 selected=null;select.innerHTML='<option value="">Select an appropriate draft reference…</option>';
 const eligible=profiles.filter(p=>p.model===model || (model==='chicken_broiler'&&p.model==='chicken') || (model==='pig_grower'&&p.model==='pig'));
 for(const p of eligible){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.label+' · Table '+p.table;select.append(opt)}
 $('rwStandardApply').disabled=true;
 $('rwStandardNotice').textContent='';
 $('rwStandardPreview').textContent=eligible.length?`${eligible.length} stage-specific draft reference${eligible.length===1?'':'s'} available for this model. Select one to inspect its values.`:'The uploaded draft does not contain a matching numeric reference for this animal/stage. Enter externally reviewed requirements manually; do not substitute another species.';
}
function updatePreview(){const p=profiles.find(x=>x.id===$('rwStandardSelect').value),dest=$('rwStandardPreview');selected=p||null;$('rwStandardApply').disabled=!p;$('rwStandardNotice').textContent='';if(!p){dest.textContent='Choose a reference profile to see its draft values.';return;}
 const rows=p.values.map(v=>`<tr><td>${safe(keyNames[v.key]||v.label||v.key)}</td><td><strong>${safe(v.raw)}</strong> ${safe(v.unit)}</td><td>${v.automatic?'Compatible target field':'Reference only'}</td></tr>`).join('');
 dest.innerHTML=`<div class="rw-standard-summary"><span>Source: draft Table ${p.table}</span><span>${safe(p.description)}</span><span>Unverified data rights</span></div><div class="rw-standard-table-wrap"><table class="rw-standard-table"><thead><tr><th>Nutrient / value</th><th>Draft value</th><th>Use</th></tr></thead><tbody>${rows}</tbody></table></div><div class="rw-standard-warning">${safe(p.notes||'Stage-specific values must be independently reviewed.')} Ranges use the lower bound as a minimum only where numerically compatible. This is not a complete nutrient model or feeding approval.</div>`;
}
function apply(){
 if(!selected)return;
 if(!(selected.model===$('prodSpecies').value || (selected.model==='chicken' && $('prodSpecies').value==='chicken_broiler') || (selected.model==='pig' && $('prodSpecies').value==='pig_grower'))) { $('rwStandardNotice').textContent='Animal stage changed; select a matching reference again.';return; }
 const p=selected, allowed=new Set();let copied=0,skipped=[];
 const rows=[...document.querySelectorAll('#prodTargets tr')];
 // Read rendered nutrient key order from the current stage; never apply across animal systems.
 const spec=window.RationStages?.STAGES?.[$('prodSpecies').value];
 if(!spec){$('rwStandardNotice').textContent='Stage model unavailable. No values applied.';return;}
 for(const v of p.values){if(!v.automatic)continue;
  const idx=spec.keys.indexOf(v.key);if(idx<0||allowed.has(v.key)){skipped.push(v.key);continue;}
  const tr=rows[idx];if(!tr){skipped.push(v.key);continue;}
  const inp=tr.querySelector('[data-field="value"]'),mode=tr.querySelector('[data-field="mode"]'),basis=tr.querySelector('[data-field="basis"]');
  if(!inp||!mode||!basis||v.value==null||v.value<0){skipped.push(v.key);continue;}
  inp.value=Number(v.value).toFixed(v.unit==='MJ/kg'?3:4).replace(/0+$/,'').replace(/\.$/,'');
  mode.value=v.mode;basis.value=v.basis;
  inp.dispatchEvent(new Event('input',{bubbles:true}));mode.dispatchEvent(new Event('change',{bubbles:true}));basis.dispatchEvent(new Event('change',{bubbles:true}));
  allowed.add(v.key);copied++;
 }
 // Source label is documentation, NEVER rights approval or real reviewer attestation.
 const source=$('prodRequirementSource');if(source)source.value='Feeding Standards DRAFT · Table '+p.table+' · '+p.label+' · UNVERIFIED';
 const required=rows.filter(r=>!r.querySelector('[data-field="value"]')?.value).length;
 $('rwStandardNotice').textContent=`Copied ${copied} compatible draft nutrient values. ${required} required nutrient fields remain blank. ${p.values.filter(v=>!v.automatic).length} reference entries were not converted because of unit or biological-model differences. You must verify all values and obtain independent review and rights clearance.`;
}
const ingSelect=$('rwStandardIngredient');
if(ingSelect){for(const label of data.ingredientNames||[]){const opt=document.createElement('option');opt.textContent=label;opt.value=label;ingSelect.append(opt)}
$('rwStandardIngredientAdd')?.addEventListener('click',()=>{
 const name=ingSelect.value;if(!name)return;
 let field=[...document.querySelectorAll('#prodIngredients [data-field="name"]')].find(x=>!x.value.trim());
 if(!field){$('prodAdd')?.click();field=[...document.querySelectorAll('#prodIngredients [data-field="name"]')].find(x=>!x.value.trim());}
 if(!field){$('rwStandardIngredientMessage').textContent='No empty ingredient row available (maximum 60).';return;}
 field.value=name;field.dispatchEvent(new Event('input',{bubbles:true}));
 $('rwStandardIngredientMessage').textContent='Added ingredient name only. Enter verified dry-matter composition, laboratory references, local price and suitability/inclusion limits.';
});}
document.querySelector('a[href="#rwDraftStandards"]')?.addEventListener('click', e=>{e.preventDefault();document.querySelector('[data-step="2"]')?.click();});
$('rwStandardSelect').addEventListener('change',updatePreview);
$('rwStandardApply').addEventListener('click',apply);
$('prodSpecies').addEventListener('change',()=>{setTimeout(updateOptions,0)});
// Page can be used with the existing 4-step layout and older stage aliases.
updateOptions();
})();
