/* RationWise guided calculation readiness. Does not invent nutrient or moisture values. */
(()=>{'use strict';
const $=id=>document.getElementById(id),html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const step4=$('rw25Step4'),rowsEl=$('prodIngredients'),result=$('prodOutput');
if(!step4||!rowsEl||!result||!$('prodCalculate'))return;
const panel=document.createElement('section');panel.className='rw-ready';panel.id='rwReadyPanel';panel.setAttribute('aria-label','Complete missing calculation inputs');
const anchor=step4.querySelector('.prod-result');if(anchor)anchor.insertAdjacentElement('beforebegin',panel);
else step4.querySelector('.prod-panel')?.appendChild(panel);
const legacyKey=code=>{
 if(code==='crude_protein')return 'cp';if(code==='calcium')return 'ca';if(code==='total_phosphorus')return 'p';
 if(code==='ndf_ruminant')return 'ndf';if(code==='crude_fiber')return 'fiber';if(code==='fat')return 'fat';
 if(code==='me_ruminant')return 'meRuminant';if(code.startsWith('me_poultry'))return 'me';
 if(code==='nel_ruminant')return 'nel';if(code==='ne_swine')return 'neSwine';
 if(code.startsWith('de_fish'))return 'deFish';if(code.startsWith('digestible_lysine_chicken'))return 'digLys';
 if(code.startsWith('digestible_met_cys_chicken'))return 'digMetCys';
 if(code.startsWith('available_phosphorus_chicken'))return 'availP';
 if(code==='sttd_phosphorus_swine')return 'sttdP';return null;
};
const clean=v=>String(v??'').trim();const invalid=v=>!clean(v)||!Number.isFinite(Number(v));
const positive=v=>!invalid(v)&&Number(v)>0&&Number(v)<=100;
function focusOn(input,step){document.querySelector(`.rw25-progress-button[data-step="${step}"]`)?.click();
 if(input){input.scrollIntoView?.({behavior:'smooth',block:'center'});input.focus?.();}}
function issues(){
 const list=[];const batch=$('prodBatch');if(invalid(batch?.value)||Number(batch.value)<=0)list.push({label:'Enter a positive batch size (kg).',kind:'field',el:batch,step:1});
 const plan=window.RationCompleteUI?.getPlan();
 const chosen=$('rwExcelProfile')?.value;
 if(chosen){const p=window.RationExcelStandards?.profiles?.find(p=>p.id===chosen);const model=$('prodSpecies')?.value;
  const alias=model==='pig'?'pig_grower':model==='chicken'?'chicken_broiler':model;
  if(p&&!p.models?.includes(alias))list.push({label:'Choose the animal and stage matching the selected feeding standard.',kind:'field',el:$('prodSpecies'),step:1});
 }
 const table=[...rowsEl.querySelectorAll('tr')];const allActive=table.map((row,i)=>({row,i,name:clean(row.querySelector('[data-field="name"]')?.value)})).filter(x=>x.name);
 const normalizeName=s=>String(s).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
 const grouped=new Map();for(const x of allActive){const k=normalizeName(x.name);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x);}
 // One correction per unique ingredient and nutrient; duplicate rows must be
 // consolidated or renamed before a successful formulation can be reported.
 const active=[...grouped.values()].map(g=>g[0]);
 for(const g of grouped.values())if(g.length>1)list.push({label:`${g[0].name} appears in ${g.length} ingredient rows. Combine identical rows, remove an extra row, or rename different lots.`,kind:'duplicate',step:3,name:g[0].name});
 if(!active.length)list.push({label:'Add at least one feed ingredient.',kind:'generic',step:3});
 const stage=window.RationStages?.STAGES?.[$('prodSpecies')?.value] ||
  window.RationStages?.STAGES?.[{'chicken':'chicken_broiler','pig':'pig_grower'}[$('prodSpecies')?.value]];
 if(!plan?.limits?.length){
  const required=[...document.querySelectorAll('#prodTargets [data-field="value"]')];required.forEach((input,i)=>{if(invalid(input.value))list.push({label:`Enter required nutrient target ${input.closest('tr')?.querySelector('strong')?.textContent||i+1}.`,kind:'field',step:2,el:input});});
 }
 const extra=plan?.b?.nutrients||[];
 for(const {row,i,name} of active){
  const dm=row.querySelector('[data-field="dm"]');
  if(!positive(dm?.value))list.push({label:`${name}: enter dry matter (% as-fed).`,kind:'dm',row:i,name,el:dm,step:3,unit:'% as-fed'});
  const price=row.querySelector('[data-field="price"]');
  if(invalid(price?.value)||Number(price.value)<0)list.push({label:`${name}: enter your local purchase price.`,kind:'price',row:i,name,el:price,step:3,unit:'per selected price unit'});
  const min=row.querySelector('[data-field="min"]'),max=row.querySelector('[data-field="max"]');
  if(invalid(min?.value)||invalid(max?.value)||Number(min.value)>Number(max.value)||Number(min.value)<0||Number(max.value)>100)
    list.push({label:`${name}: check minimum and maximum inclusion percentages.`,kind:'field',step:3,el:min});
  const seenNutrients=new Set();
  for(const [j,n] of extra.entries()){
   if(seenNutrients.has(n.code))continue;seenNutrients.add(n.code);
   const expanded=$('rwCompleteAnalysis')?.querySelector(`input[data-i="${i}"][data-rw-nutrient="${CSS.escape(n.code)}"]`);
   const legacy=legacyKey(n.code)?row.querySelector(`[data-key="${legacyKey(n.code)}"]`):null;
   if(invalid(expanded?.value)&&invalid(legacy?.value)){
    list.push({label:`${name}: add ${n.name} (${n.unit} dry-matter basis).`,kind:'nutrient',step:3,el:expanded||legacy,n:n.name});
   }
  }
  if(!extra.length&&stage){for(const key of stage.keys){const input=row.querySelector(`[data-key="${key}"]`);
    if(invalid(input?.value))list.push({label:`${name}: add ${window.RationScience2?.NUTRIENTS?.[key]?.name||key} on dry-matter basis.`,kind:'nutrient',step:3,el:input});}}
 }
 return list;
}
function draw(){const list=issues();const complete=list.length===0;const missingDM=list.filter(x=>x.kind==='dm'),missingPrice=list.filter(x=>x.kind==='price'),duplicates=list.filter(x=>x.kind==='duplicate'),other=list.filter(x=>!['dm','price','duplicate'].includes(x.kind));
 panel.innerHTML=`<div class="rw-ready-head"><div><h3>${complete?'Inputs ready to calculate':'Complete your formulation'}</h3><p>${complete?'All required numeric fields appear complete. Select Calculate; the optimizer will still check whether the blend is feasible.':`${list.length} item${list.length===1?'':'s'} need attention before calculation. Correct them below or in Step 3.`}</p></div><span class="rw-ready-count">${complete?'Ready':list.length+' to fix'}</span></div>
 ${missingDM.length||missingPrice.length?`<div class="rw-ready-grid">${[...missingDM,...missingPrice].map(x=>`<label class="rw-ready-edit"><span>${html(x.name)} — ${x.kind==='dm'?'Dry matter (%)':'Local price'}</span><input type="number" min="${x.kind==='dm'?'0.01':'0'}" max="${x.kind==='dm'?'100':''}" step="any" inputmode="decimal" placeholder="${x.kind==='dm'?'Enter measured %':'Enter price'}" data-fix-row="${x.row}" data-fix-field="${x.kind==='dm'?'dm':'price'}" aria-label="${html(x.name)} ${x.kind==='dm'?'dry matter percent':'local price'}"><small>${x.kind==='dm'?'Enter the actual ingredient’s moisture-adjusted dry matter; do not substitute a value from a different sample.':'Price in the selected local currency and purchase unit.'}</small></label>`).join('')}</div><button id="rwReadyApply" type="button" class="rw-ready-apply">Apply entered values</button>`:''}
 ${duplicates.length?`<div class="rw-ready-list"><strong>Repeated ingredient entries</strong><ul>${duplicates.map(x=>`<li>${html(x.label)}</li>`).join('')}</ul><button type="button" id="rwMergeDuplicates" class="rw-ready-apply">Combine matching repeated entries</button></div>`:''}
 ${other.length?`<div class="rw-ready-list"><strong>Other information needed</strong><ul>${other.slice(0,8).map((x,i)=>`<li><button type="button" data-fix-issue="${i}" title="Open the input field">${html(x.label)} <span>Go to input →</span></button></li>`).join('')}</ul>${other.length>8?`<p>And ${other.length-8} more required measurements. Open Ingredients & Prices to complete the analysis table.</p>`:''}</div>`:''}
 ${complete?'<p class="rw-ready-info">Ready for mathematical optimization; this is not a feed-safety or nutritional certification.</p>':''}
 <div class="rw-ready-actions"><button type="button" id="rwReadyStep3">Edit ingredients &amp; analyses</button><button type="button" id="rwReadyDraftCSV">Save current inputs (CSV draft)</button><button type="button" id="rwReadyDraftPrint">Print current inputs (draft)</button></div>`;
 $('rwMergeDuplicates')?.addEventListener('click',()=>{
  const r=window.RationIngredientBridge?.consolidateIdentical?.();
  draw();
  $('rwReadyNotice').textContent=r?.removed?`${r.removed} repeated row${r.removed===1?'':'s'} combined without changing conflicting values. ${r.conflicts.length?'Other repeated rows have different values; review them in Step 3.':'Recalculate to update results.'}`: 'Those rows contain different information. Review them in Step 3; remove the unwanted entry or give different lots distinct names.';
 });
 const apply=$('rwReadyApply');apply?.addEventListener('click',()=>{
  let count=0;const errors=[];
  panel.querySelectorAll('[data-fix-field]').forEach(input=>{if(!clean(input.value))return;
   const isDM=input.dataset.fixField==='dm',value=Number(input.value);
   if(!Number.isFinite(value)||(isDM?(value<=0||value>100):value<0)){errors.push('Check '+input.getAttribute('aria-label'));return;}
   const old=rowsEl.querySelector(`tr:nth-child(${Number(input.dataset.fixRow)+1}) [data-field="${input.dataset.fixField}"]`);
   if(old){old.value=input.value;old.dispatchEvent(new Event('input',{bubbles:true}));count++;}
  });
  if(errors.length){$('rwReadyNotice').textContent=errors.join('; ');return;}
  draw();$('rwReadyNotice').textContent=count?`Applied ${count} value${count===1?'':'s'}. Check any remaining fields, then calculate.`:'Enter a value to apply.';
 });
 [...panel.querySelectorAll('[data-fix-issue]')].forEach((btn,i)=>btn.addEventListener('click',()=>{const x=other[i];focusOn(x?.el,x?.step||3);}));
 $('rwReadyStep3').addEventListener('click',()=>focusOn(null,3));
 $('rwReadyDraftPrint').addEventListener('click',printDraft);$('rwReadyDraftCSV').addEventListener('click',saveDraftCSV);
 const note=document.createElement('p');note.id='rwReadyNotice';note.setAttribute('role','status');note.className='rw-ready-notice';panel.appendChild(note);
}
function saveDraftCSV(){
 const rows=[['RationWise INCOMPLETE DRAFT — NOT A FORMULATION'],['Animal and stage',$('prodStage')?.value||''],['Batch (kg as-fed)',$('prodBatch')?.value||''],[],['Ingredient','Dry matter (% as-fed)','Price per selected unit']];
 for(const tr of rowsEl.querySelectorAll('tr')){const name=clean(tr.querySelector('[data-field="name"]')?.value);if(name)rows.push([name,clean(tr.querySelector('[data-field="dm"]')?.value),clean(tr.querySelector('[data-field="price"]')?.value)]);}
 rows.push([],['Missing information'],...issues().map(x=>[x.label]));
 const csv=rows.map(row=>row.map(v=>{let str=String(v??'');if(/^[=+@\-\t\r]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='RationWise_incomplete_draft.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function printDraft(){
 const report=$('rwPrintReport');if(!report)return;
 const selectedStage=$('prodStage')?.value||'Not selected';const batch=$('prodBatch')?.value||'Not specified';
 const ingredients=[...rowsEl.querySelectorAll('tr')].map(r=>({name:clean(r.querySelector('[data-field="name"]')?.value),dm:r.querySelector('[data-field="dm"]')?.value||'Missing',price:r.querySelector('[data-field="price"]')?.value||'Missing'})).filter(x=>x.name);
 report.innerHTML=`<h1>RationWise — Incomplete input draft</h1><p><strong>Not a calculated feed formulation.</strong> Numeric optimization has not succeeded. Do not use this as a feed recipe.</p><p>Animal / stage: ${html(selectedStage)} · Batch: ${html(batch)} kg as-fed</p><table><thead><tr><th>Ingredient</th><th>Dry matter (%)</th><th>Local price</th></tr></thead><tbody>${ingredients.map(x=>`<tr><td>${html(x.name)}</td><td>${html(x.dm)}</td><td>${html(x.price)}</td></tr>`).join('')}</tbody></table><h2>Information needed before calculation</h2><ul>${issues().map(x=>`<li>${html(x.label)}</li>`).join('')}</ul><p>Generated from user-entered inputs for recordkeeping only.</p>`;
 report.hidden=false;window.print();
}
let queued=false;function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;draw();},0);}
for(const id of ['prodIngredients','prodTargets','rwCompleteAnalysis','prodBatch','prodSpecies','rwExcelProfile','prodPriceUnit','prodCurrency']){
 const el=$(id);if(el){el.addEventListener('input',schedule);el.addEventListener('change',schedule);}}
$('prodCalculate').addEventListener('click',schedule);
const observer=new MutationObserver(schedule);observer.observe(rowsEl,{childList:true});
$('rwExcelProfile')?.addEventListener('change',schedule);
draw();window.RationWiseReadiness={issues,refresh:draw};
})();
