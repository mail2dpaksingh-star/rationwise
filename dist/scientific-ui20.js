(function(){'use strict';
const M=window.RationScientific20;if(!M)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let work=M.blank('chicken_broiler'),last=null;
const number=v=>v==null?'':v;
function num(v){if(String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:NaN;}
function syncControls(){
 $('s20Model').value=work.modelId;$('s20Batch').value=work.batchKgAsFed;$('s20Currency').value=work.market.currency;$('s20Country').value=work.market.country;
 for(const [id,p] of Object.entries({s20Age:'age',s20Breed:'genetics',s20Production:'production'}))$(id).value=work.animalContext[p]||'';
 for(const [id,p] of Object.entries({s20Citation:'citation',s20Locator:'exactLocator',s20Rights:'rightsStatus',s20RightsProof:'rightsProof',s20Review:'reviewStatus',s20Reviewer:'reviewer',s20Evidence:'reviewEvidence'}))$(id).value=work.reference[p]||'';
 $('s20ModelHint').textContent=M.PANELS[work.modelId].issues.join(' · ');
 renderTargets();renderIngredients();renderAnalytes();audit();
}
function renderTargets(){
 $('s20Targets').innerHTML=work.constraints.map((t,i)=>{
  const def=M.NUTRIENTS[t.key];return `<tr><td><strong>${esc(def.name)}</strong><div class="s20-dim">${esc(t.key)}</div></td>
  <td>${esc(def.unit)} ${t.basis==='dm'?'per DM':'per as-fed'}</td>
  <td><select data-target="${i}" data-field="mode" aria-label="Constraint direction ${esc(def.name)}"><option value="min" ${t.mode==='min'?'selected':''}>Minimum ≥</option><option value="max" ${t.mode==='max'?'selected':''}>Maximum ≤</option></select></td>
  <td><input data-target="${i}" data-field="value" type="number" min="0" step="any" value="${esc(number(t.value))}" placeholder="Enter reviewed value" aria-label="Nutrient target ${esc(def.name)}"></td>
  <td><input data-target="${i}" data-field="locator" value="${esc(t.locator)}" placeholder="Page / table / study" aria-label="Source locator ${esc(def.name)}"></td></tr>`;
 }).join('');
}
function renderIngredients(){
 $('s20IngredientRows').innerHTML=work.ingredients.map((a,i)=>`<tr><td><input data-ing="${i}" data-field="name" value="${esc(a.name)}" placeholder="Ingredient ${i+1}"></td>
  <td><input data-ing="${i}" data-field="dryMatterPct" value="${esc(number(a.dryMatterPct))}" type="number" min="0.000001" max="100" step="any" placeholder="DM %"></td>
  <td><input data-ing="${i}" data-field="pricePerKgAsFed" value="${esc(number(a.pricePerKgAsFed))}" type="number" step="any" min="0" placeholder="Price/kg"></td>
  <td><input data-ing="${i}" data-field="minPctAsFed" value="${esc(number(a.minPctAsFed))}" type="number" min="0" max="100" step="any"></td>
  <td><input data-ing="${i}" data-field="maxPctAsFed" value="${esc(number(a.maxPctAsFed))}" type="number" min="0" max="100" step="any"></td>
  <td><select data-ing="${i}" data-field="safetyStatus"><option value="not_screened" ${a.safetyStatus==='not_screened'?'selected':''}>Not screened</option><option value="pass" ${a.safetyStatus==='pass'?'selected':''}>Pass (claim)</option><option value="fail" ${a.safetyStatus==='fail'?'selected':''}>Failed — block</option></select></td>
  <td><input data-ing="${i}" data-field="analysisRef" value="${esc(a.analysisRef)}" placeholder="CoA ID"></td>
  <td><input data-ing="${i}" data-field="priceRef" value="${esc(a.priceRef)}" placeholder="Supplier quote"></td>
  <td><button type="button" data-remove="${i}" class="s20-small">Remove</button></td></tr>`).join('');
}
function renderAnalytes(){
 const keep=$('s20Analyte').value,keys=M.PANELS[work.modelId].keys;
 $('s20Analyte').innerHTML=keys.map(k=>`<option value="${esc(k)}" ${k===keep?'selected':''}>${esc(M.NUTRIENTS[k].name)} (${esc(M.NUTRIENTS[k].unit)} DM)</option>`).join('');
 renderAssays();
}
function renderAssays(){const key=$('s20Analyte').value;
 $('s20AssayRows').innerHTML=work.ingredients.map((a,i)=>`<tr><td>${esc(a.name||'Ingredient '+(i+1))}</td><td><input data-assay="${i}" type="number" step="any" min="0" value="${esc(number(a.nutrients[key]))}" placeholder="Measured value" aria-label="${esc(key)} for ${esc(a.name||'ingredient '+(i+1))}"></td><td>${esc(M.NUTRIENTS[key].unit)} per kg dry matter</td></tr>`).join('');
}
function audit(){const d=M.profileAudit(work);const severity=d.errors.length?'error':d.gaps.length?'warning':'info';
 $('s20Audit').innerHTML=`<div class="s20-status ${severity}"><strong>${d.errors.length} calculation errors · ${d.gaps.length} evidence/completeness gaps</strong><p>Core constraints entered: ${d.coreCovered||0}/${d.coreTotal||0} · Numerical nutrient targets: ${d.constrained||0}/${d.available||0}. Feeding-ready: NO</p></div>`+
 (d.errors.length?`<details open><summary>Calculation blockers (${d.errors.length})</summary><ul>${d.errors.slice(0,45).map(v=>'<li>'+esc(v)+'</li>').join('')}</ul></details>`:'')+
 (d.gaps.length?`<details><summary>Missing scientific evidence (${d.gaps.length})</summary><ul>${d.gaps.slice(0,60).map(v=>'<li>'+esc(v)+'</li>').join('')}</ul></details>`:'');
 $('s20Go').disabled=!d.canCalculate;
}
function renderResult(r){
 if(r.status!=='optimal'){$('s20Result').innerHTML=`<div class="s20-status error"><strong>${esc(r.status)}</strong> ${esc(r.message||'No solution')}</div>`;return;}
 const rows=r.rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.sharePctAsFed.toFixed(3)}%</td><td>${x.kgAsFed.toFixed(3)}</td><td>${x.kgDM.toFixed(3)}</td><td>${x.cost.toFixed(2)}</td></tr>`).join('');
 const checks=r.checks.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.mode==='min'?'≥':'≤'} ${x.required}</td><td>${x.achieved.toFixed(4)}</td><td>${esc(x.unit)}</td><td>${x.met?'Pass':'Fail'}</td></tr>`).join('');
 $('s20Result').innerHTML=`<div class="s20-status warning"><strong>Calculation succeeded — NOT approved for animal feeding.</strong> The reference evidence and reviewer identity are unverified. Missing micronutrients/assays remain gaps.</div>
 <div class="s20-metrics"><span><small>Batch cost</small><strong>${esc(r.currency)} ${r.costTotal.toFixed(2)}</strong></span><span><small>Cost/kg as-fed</small><strong>${r.pricePerKgAsFed.toFixed(4)}</strong></span><span><small>Feed dry matter</small><strong>${r.blendDryMatterPct.toFixed(2)}%</strong></span></div>
 <h4>Least-cost blend</h4><div class="table-scroll"><table><thead><tr><th>Ingredient</th><th>% as-fed</th><th>kg as-fed</th><th>kg dry matter</th><th>Cost</th></tr></thead><tbody>${rows}</tbody></table></div>
 <h4>Constraint audit</h4><div class="table-scroll"><table><thead><tr><th>Nutrient</th><th>Requirement</th><th>Calculated</th><th>Unit</th><th>Check</th></tr></thead><tbody>${checks}</tbody></table></div>
 <button type="button" id="s20SaveResult">Export result + provenance (JSON)</button>`;
 $('s20SaveResult').addEventListener('click',()=>download('RationWise_v2_calculation.json',JSON.stringify({schema:'rationwise-calculation-2.0',inputs:work,result:r},null,2)));
}
function download(name,content){const b=new Blob([content],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
// Controls update objects rather than editing DOM text; escaped, validated before optimization.
for(const [id,field,path] of [['s20Batch','batchKgAsFed',null],['s20Country','country','market'],['s20Currency','currency','market'],['s20Age','age','animalContext'],['s20Breed','genetics','animalContext'],['s20Production','production','animalContext'],['s20Citation','citation','reference'],['s20Locator','exactLocator','reference'],['s20Rights','rightsStatus','reference'],['s20RightsProof','rightsProof','reference'],['s20Review','reviewStatus','reference'],['s20Reviewer','reviewer','reference'],['s20Evidence','reviewEvidence','reference']]){
 $(id).addEventListener('input',e=>{(path?work[path]:work)[field]=id==='s20Batch'?num(e.target.value):e.target.value;last=null;audit();});
}
$('s20Model').addEventListener('change',e=>{work=M.blank(e.target.value);last=null;syncControls();$('s20Result').textContent='Choose your inputs, then calculate.';});
$('s20Targets').addEventListener('input',e=>{const index=Number(e.target.dataset.target),field=e.target.dataset.field;if(!Number.isInteger(index)||!field||!work.constraints[index])return;work.constraints[index][field]=field==='value'?num(e.target.value):e.target.value;last=null;audit();});
$('s20IngredientRows').addEventListener('input',e=>{const index=Number(e.target.dataset.ing),field=e.target.dataset.field;if(!Number.isInteger(index)||!field||!work.ingredients[index])return;work.ingredients[index][field]=['dryMatterPct','pricePerKgAsFed','minPctAsFed','maxPctAsFed'].includes(field)?num(e.target.value):e.target.value;last=null;audit();});
$('s20IngredientRows').addEventListener('click',e=>{const n=e.target.dataset.remove;if(n===undefined)return;if(work.ingredients.length<=2){$('s20Result').textContent='At least two ingredient records are required.';return;}work.ingredients.splice(Number(n),1);renderIngredients();renderAssays();audit();});
$('s20Analyte').addEventListener('change',renderAssays);
$('s20AssayRows').addEventListener('input',e=>{const index=Number(e.target.dataset.assay),key=$('s20Analyte').value;if(!work.ingredients[index])return;const n=num(e.target.value);if(n===null)delete work.ingredients[index].nutrients[key];else work.ingredients[index].nutrients[key]=n;last=null;audit();});
$('s20Add').addEventListener('click',()=>{if(work.ingredients.length>=60)return;work.ingredients.push(M.blankIngredient('ingredient_'+(Date.now())+'_'+work.ingredients.length));renderIngredients();renderAssays();audit();});
$('s20AuditBtn').addEventListener('click',audit);
$('s20Go').addEventListener('click',()=>{last=M.solvePanel(work);renderResult(last);audit();});
$('s20Download').addEventListener('click',()=>download('RationWise_v2_scientific_panel.json',JSON.stringify(work,null,2)));
$('s20Import').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2e6)throw Error('2MB maximum');const parsed=JSON.parse(await f.text());const id=M.canonical(parsed.modelId);if(!M.PANELS[id])throw Error('Unsupported model');if(!Array.isArray(parsed.constraints)||!Array.isArray(parsed.ingredients)||parsed.ingredients.length>60)throw Error('Invalid arrays');if(parsed.schema!=='rationwise-scientific-panel-2.0')throw Error('Wrong schema');work=parsed;last=null;syncControls();$('s20Result').textContent='Imported your dataset; run Audit before calculation.';}catch(err){$('s20Result').innerHTML='<div class="s20-status error">Import failed: '+esc(err.message)+'</div>';}e.target.value='';});
syncControls();
})();
