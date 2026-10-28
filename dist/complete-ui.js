/* Customer-facing complete nutrient formulation workflow. */
(()=>{'use strict';
const $=id=>document.getElementById(id),M=window.RationCompleteModel;
if(!M||!$('rwExcelInspector')||!$('prodCalculate'))return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toLocaleString(undefined,{maximumFractionDigits:3});
let current=null,plan=null,labels=[];
const panel=document.createElement('section');panel.id='rwCompletePanel';panel.className='rw-complete-panel';
$('rwExcelInspector').insertAdjacentElement('afterend',panel);
const analysis=document.createElement('section');analysis.id='rwCompleteAnalysis';analysis.className='rw-complete-panel';
const step3=$('rw25Step3');step3?.querySelector('.rw25-step-controls')?.insertAdjacentElement('beforebegin',analysis);
const manualTable=$('prodTargets')?.closest('.table-scroll');
const optional=document.createElement('details');optional.className='rw-source-detail rw-optional-manual';
optional.innerHTML='<summary>Optional: add more nutrient targets</summary>';
if(manualTable){manualTable.parentNode.insertBefore(optional,manualTable);optional.appendChild(manualTable);optional.open=true;}

function limitsFor(p){const b=M.build(p);const limits=[];
 for(const n of b.nutrients){
  // Retain original bounds and the complete source label. Range means both bounds.
  if(n.high!==null){limits.push({...n,mode:'min',value:n.low});limits.push({...n,mode:'max',value:n.high});}
  else limits.push({...n,mode:n.mode,value:n.low});
 }
 return {b,limits};}
function render(){
 if(!current){panel.innerHTML='';analysis.innerHTML='';plan=null;return;}
 const {b,limits}=limitsFor(current);plan={b,limits};
 const keys=[...new Map(b.nutrients.map(n=>[n.code,n])).values()];labels=keys;
 const stat=keys.length;const skipped=b.notes.length;
 panel.innerHTML=`<div class="rw-complete-heading"><div><p class="rw-complete-eyebrow">Complete feeding-standard calculation</p><h3>All nutrient targets from this stage</h3><p>These values will be combined in the least-cost calculation. Enter the matching laboratory measurements for your feed ingredients in Step 3.</p></div><strong class="rw-complete-total">${stat} nutrient${stat===1?'':'s'}</strong></div>
 <div class="rw-complete-table-wrap"><table class="rw-complete-table"><thead><tr><th>Nutrient</th><th>Feeding target</th><th>Basis</th></tr></thead><tbody>${keys.map(n=>`<tr><td>${esc(n.name)}</td><td>${n.high!==null?`${fmt(n.low)}–${fmt(n.high)}`:`${n.mode==='max'?'≤':'≥'} ${fmt(n.low)}`} ${esc(n.unit)}</td><td>${n.basis==='dm'?'Dry matter':'As-fed feed'}</td></tr>`).join('')}</tbody></table></div>
 ${b.context.length?`<details class="rw-source-detail"><summary>Animal measurements and feeding information (${b.context.length})</summary><div>${b.context.map(v=>`<p><b>${esc(v.label)}</b>: ${esc(v.value)} ${esc(v.unit)}</p>`).join('')}</div></details>`:''}
 ${skipped?`<details class="rw-source-detail"><summary>Original source cells needing clarification (${skipped})</summary><p>These are preserved from the workbook, but are not nutritional concentration limits that can be calculated safely.</p><div>${b.notes.map(v=>`<p>${esc(v.label)}: ${esc(v.value)} (cell ${esc(v.cell)}; ${esc(v.reason)})</p>`).join('')}</div></details>`:''}
 <p class="rw-complete-micro">Source: ${esc(b.workbook)}, ${esc(b.sheet)}. Values are from supplied spreadsheets; independent feeding and reuse-rights validation remains separate.</p>`;
 if(!keys.length){analysis.innerHTML='<p>For this stage, enter your nutrient requirements and ingredient analyses using the main calculator.</p>';return;}
 renderAnalysis();
}
function renderAnalysis(){
 if(!plan)return;
 const rows=[...document.querySelectorAll('#prodIngredients tr')];
 analysis.innerHTML=`<div class="rw-complete-heading"><div><p class="rw-complete-eyebrow">Ingredient nutrient data</p><h3>Complete nutrient analysis</h3><p>Enter source-matched nutrient values for each ingredient on a <b>dry-matter basis</b>. If a value is already entered in the main ingredient table, it is reused automatically.</p></div></div>
 <div class="rw-complete-table-wrap"><table class="rw-complete-table rw-analysis-table"><thead><tr><th>Ingredient</th>${labels.map(v=>`<th>${esc(v.name)}<small>${esc(v.unit)} DM</small></th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr data-idx="${i}"><th class="rw-ing-name">${esc(r.querySelector('[data-field="name"]')?.value||`Ingredient ${i+1}`)}</th>${labels.map(n=>`<td><input type="number" step="any" min="0" data-rw-nutrient="${esc(n.code)}" data-i="${i}" aria-label="${esc(n.name)} for ingredient ${i+1}" placeholder="—"></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="rw-complete-micro">If a required measurement is unknown, the calculation will explain what is missing rather than assume zero.</p>`;
}
// Reuse standard eight-field measurements wherever nutrient identity and energy basis match exactly.
function legacyKey(code){
 if(code==='crude_protein')return 'cp';if(code==='calcium')return 'ca';if(code==='total_phosphorus')return 'p';
 if(code==='ndf_ruminant')return 'ndf';if(code==='crude_fiber')return 'fiber';if(code==='fat')return 'fat';
 if(code==='me_ruminant')return 'meRuminant';if(code.startsWith('me_poultry'))return 'me';
 if(code==='nel_ruminant')return 'nel';if(code==='ne_swine')return 'neSwine';
 if(code.startsWith('de_fish'))return 'deFish';if(code.startsWith('digestible_lysine_chicken'))return 'digLys';
 if(code.startsWith('digestible_met_cys_chicken'))return 'digMetCys';
 if(code.startsWith('available_phosphorus_chicken'))return 'availP';
 if(code==='sttd_phosphorus_swine')return 'sttdP';
 if(code.startsWith('total_phosphorus'))return 'p';
 return null;
}
function num(v,name){if(v===undefined||v===null||String(v).trim()===''||!Number.isFinite(Number(v)))throw Error(name+' is missing.');return Number(v);}
function capture(){
 const modelId=$('prodSpecies').value;
 if(!current.models.includes(modelId)&&!(modelId==='pig'&&current.models.includes('pig_grower'))&&!(modelId==='chicken'&&current.models.includes('chicken_broiler')))throw Error('Choose a calculator stage matching '+current.name+' before calculating.');
 const currency=$('prodCurrency').value.trim().toUpperCase(),batchKg=num($('prodBatch').value,'Batch size');
 const stage=window.RationStages?.STAGES?.[modelId]||(modelId==='pig'?window.RationStages?.STAGES?.pig_grower:window.RationStages?.STAGES?.chicken_broiler);
 const userLimits=[];
 if(stage){[...document.querySelectorAll('#prodTargets tr')].forEach((tr,i)=>{
   const value=tr.querySelector('[data-field="value"]')?.value;
   if(value===undefined||String(value).trim()==='')return;
   const key=stage.keys[i],spec=window.RationScience2?.NUTRIENTS?.[key];
   if(!key||!spec||!Number.isFinite(Number(value)))throw Error('Check the manually entered nutrient target on row '+(i+1));
   userLimits.push({code:'manual_'+key,name:spec.name,unit:spec.unit,basis:tr.querySelector('[data-field="basis"]')?.value||'dm',mode:tr.querySelector('[data-field="mode"]')?.value||'min',value:Number(value)});
 });}
 const pu=$('prodPriceUnit').value,unit={kg:1,tonne:1000,bag25:25,bag50:50,bag100:100}[pu];if(!unit)throw Error('Choose a supported ingredient price unit.');
 const records=[...document.querySelectorAll('#prodIngredients tr')].map((r,i)=>{
 const name=r.querySelector('[data-field="name"]')?.value.trim();if(!name)return null;
 const dm=num(r.querySelector('[data-field="dm"]')?.value,name+' dry matter'),price=num(r.querySelector('[data-field="price"]')?.value,name+' price')/unit;
 const min=num(r.querySelector('[data-field="min"]')?.value,name+' minimum inclusion');const max=num(r.querySelector('[data-field="max"]')?.value,name+' maximum inclusion');
 const hazard=r.querySelector('[data-field="hazardStatus"]')?.value||'not_checked';
 const nutrients={};
 for(const m of userLimits){const k=m.code.slice('manual_'.length);nutrients[m.code]=num(r.querySelector(`[data-key="${k}"]`)?.value,`${name} — ${m.name}`);}
 for(const n of labels){const raw=analysis.querySelector(`input[data-i="${i}"][data-rw-nutrient="${n.code}"]`)?.value;
  const legacy=legacyKey(n.code);const old=legacy?r.querySelector(`[data-key="${legacy}"]`)?.value:null;
  nutrients[n.code]=num(String(raw||'').trim()?raw:old,`${name} — ${n.name}`);
 }
 return {name,dm,price,min,max,hazard,nutrients};
 }).filter(Boolean);
 return {ingredients:records,limits:[...plan.limits,...userLimits],batchKg,currency};
}
function showResults(res){const out=$('prodOutput');
 if(res.status!=='optimal'){out.innerHTML=`<div class="result-error"><strong>No feasible formulation</strong><p>${esc(res.explanation)}</p></div>`;return;}
 out.innerHTML=`<section class="rw-complete-result"><p class="rw-complete-eyebrow">Nutrient-complete mathematical calculation</p><h2>Feed formulation</h2><div class="rw-result-highlight"><strong>${esc(res.currency)} ${fmt(res.totalCost)}</strong><span>Ingredient cost for ${fmt(res.batchKg)} kg as-fed</span></div><h3>Ingredient quantities</h3><table class="rw-complete-table"><thead><tr><th>Ingredient</th><th>Inclusion</th><th>As-fed kg</th><th>Cost</th></tr></thead><tbody>${res.rows.filter(r=>r.kgAF>1e-6).map(r=>`<tr><td>${esc(r.name)}</td><td>${fmt(r.sharePct)}%</td><td>${fmt(r.kgAF)}</td><td>${fmt(r.cost)}</td></tr>`).join('')}</tbody></table><h3>All calculated nutrient checks</h3><div class="rw-complete-table-wrap"><table class="rw-complete-table"><thead><tr><th>Nutrient</th><th>Required</th><th>Calculated</th></tr></thead><tbody>${res.checks.map(t=>`<tr><td>${esc(t.name)}</td><td>${t.mode==='min'?'≥':'≤'} ${fmt(t.value)} ${esc(t.unit)} ${t.basis==='dm'?'DM':'as-fed'}</td><td>${fmt(t.achieved)} ${esc(t.unit)}</td></tr>`).join('')}</tbody></table></div><p class="rw-complete-micro">Mathematical result based on user-entered ingredient analyses and supplied feeding-standard nutrient limits. Feed safety, micronutrient completeness and scientific approval are not certified by this calculator.</p><button type="button" id="rwCompleteExport" class="rw-complete-download">Export formulation CSV</button></section>`;
 $('rwCompleteExport').onclick=()=>{
  const values=[['RationWise calculation — user-entered data; feeding approval not verified'],['Source',plan.b.workbook,plan.b.sheet],['Currency',res.currency],['Ingredient','Inclusion %','kg AF','Cost'],...res.rows.map(r=>[r.name,r.sharePct,r.kgAF,r.cost]),[],['Nutrient','Direction','Limit','Achieved','Unit'],...res.checks.map(x=>[x.name,x.mode,x.value,x.achieved,x.unit])];
  const csv=values.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='RationWise_complete_formula.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
}
// Capture-phase interception only for a selected feeding-standard reference with numerical targets.
$('prodCalculate').addEventListener('click',e=>{
 if(!plan?.limits?.length)return;
 e.stopImmediatePropagation();e.preventDefault();
 try{showResults(M.optimize(capture()));}catch(err){$('prodOutput').innerHTML=`<div class="result-error"><strong>More information needed</strong><p>${esc(err.message)}</p></div>`;}
},true);
const observer=new MutationObserver(()=>{if(!current)return;const n=document.querySelectorAll('#prodIngredients tr').length;if(n!==Number(analysis.dataset.nrows||0)){
 // Repaint only when row count changes; preserve user-entered expanded analyses for existing rows.
 const previous=[...analysis.querySelectorAll('[data-rw-nutrient]')].map(x=>[x.dataset.i,x.dataset.rwNutrient,x.value]);renderAnalysis();
 previous.forEach(([i,key,val])=>{const el=analysis.querySelector(`input[data-i="${i}"][data-rw-nutrient="${key}"]`);if(el)el.value=val;});analysis.dataset.nrows=String(n);
 }});
observer.observe($('prodIngredients'),{childList:true});
window.RationCompleteUI={select(p){current=p||null;optional.open=!p;render();analysis.dataset.nrows=String(document.querySelectorAll('#prodIngredients tr').length);},getPlan(){return plan;}};
})();
