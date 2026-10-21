/* RationWise 1.1 browser presentation. No remote calls, accounts or payments. */
(function(){'use strict';
const Gov=window.RationGovernance, Engine=window.RationEngine, Units=window.RationUnits, Lib=window.RationCatalog;
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(n,dec=2)=>Number.isFinite(n)?Number(n).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'—';
const state={species:'cattle',currency:'USD',batchKgAsFed:1000,priceUnit:'kg',catalog:Lib.demoCatalog(),result:null};
function group(){return Lib.ANIMALS[state.species].group;}
function relevant(){return state.catalog.filter(i=>i.allowedGroups.includes(group()));}
function renderSpecies(){
 $('animalGrid').innerHTML=Object.entries(Lib.ANIMALS).map(([key,a])=>`<button type="button" class="animal ${state.species===key?'active':''}" data-animal="${key}" aria-pressed="${state.species===key}"><span>${esc(a.symbol)}</span>${esc(a.label)}</button>`).join('');
 $('groupCaption').textContent=`Selected: ${Lib.ANIMALS[state.species].label} · group '${group()}'. This is a mathematical scenario, not a production-stage ration.`;
}
function renderIngredientTable(){
 const unitText={kg:'kg',tonne:'metric tonne',bag25:'25 kg bag',bag50:'50 kg bag',bag100:'100 kg bag'}[state.priceUnit];
 $('priceHead').textContent=`Price / ${unitText} AF`;
 const rows=relevant();
 $('ingredientBody').innerHTML=rows.map(i=>{const displayedPrice=Units.fromPricePerKgAsFed(i.priceAsFed,state.priceUnit);
  return `<tr class="${i.enabled?'':'inactive'}" data-row="${esc(i.id)}">
   <td><input type="checkbox" data-field="enabled" data-id="${esc(i.id)}" aria-label="Include ${esc(i.name)}" ${i.enabled?'checked':''}></td>
   <td><div class="record-name">${esc(i.name)}</div><div class="record-status">DRAFT · SYNTHETIC · v${i.recordVersion}</div></td>
   <td><input aria-label="${esc(i.name)} price per ${esc(unitText)}" data-id="${esc(i.id)}" data-field="priceAsFed" value="${displayedPrice.toFixed(state.priceUnit==='kg'?3:2)}" type="number" min="0" step="any"></td>
   <td><input aria-label="${esc(i.name)} dry matter percentage" data-id="${esc(i.id)}" data-field="dryMatterPct" value="${i.dryMatterPct}" type="number" min="0.0001" max="100" step="any"></td>
   <td><input aria-label="${esc(i.name)} crude protein percent of dry matter" data-id="${esc(i.id)}" data-field="cp" value="${i.nutrientsDM.cp}" type="number" min="0" max="100" step="any"></td>
   <td><input aria-label="${esc(i.name)} crude fiber percent of dry matter" data-id="${esc(i.id)}" data-field="fiber" value="${i.nutrientsDM.fiber}" type="number" min="0" max="100" step="any"></td>
   <td><input aria-label="${esc(i.name)} minimum inclusion percentage as-fed" data-id="${esc(i.id)}" data-field="minPctAsFed" value="${i.minPctAsFed}" type="number" min="0" max="100" step="any"></td>
   <td><input aria-label="${esc(i.name)} maximum inclusion percentage as-fed" data-id="${esc(i.id)}" data-field="maxPctAsFed" value="${i.maxPctAsFed}" type="number" min="0" max="100" step="any"></td>
   <td><button data-audit="${esc(i.id)}" type="button">Record ↗</button></td></tr>`;}).join('');
 $('countText').textContent=`${rows.filter(i=>i.enabled).length} enabled · ${rows.length} eligible synthetic records`;
 $('priceHint').textContent=`Prices use ${state.currency} per ${unitText} as-fed. Currency selection changes labels only — it never performs an exchange-rate conversion.`;
}
function cfg(){
 const get=(id)=>{const el=$(id);if(el.value.trim()==='')return NaN;return Number(el.value)};
 return {batchKgAsFed:get('batchKg'),currency:state.currency,animalGroup:group(),ingredients:relevant(),
  targets:[{key:'cp',mode:'min',basis:$('cpBasis').value,value:get('cpMin')},
           {key:'fiber',mode:'max',basis:$('fiberBasis').value,value:get('fiberMax')}],
  mode:'sandbox'};
}
function renderError(r){
 $('output').innerHTML=`<div class="result-error"><strong>${r.status==='infeasible'?'No feasible blend':'Input review required'}</strong><p>${esc(r.message||'Please check the inputs.')}</p><p><b>No constraints were relaxed.</b> No feeding recommendation is produced.</p></div>`;
}
function renderResult(r){
 if(r.status!=='optimal')return renderError(r);
 const c=esc(state.currency),kg=r.batchKgAsFed;
 const ratio=100*r.totalKgDM/kg;
 const active=r.rows.filter(i=>i.kgAsFed>0);
 $('output').innerHTML=`<div class="result-hero"><div class="result-kicker">MATHEMATICAL OPTIMUM · NOT APPROVED</div><div class="result-cost">${c} ${f(r.costTotal,2)}</div><p>Estimated ingredient-only cost for ${f(kg,1)} kg as-fed</p></div>
 <div class="result-body"><div class="metric-list"><div class="metric"><span>Price / kg as-fed</span><strong>${c} ${f(r.pricePerKgAsFed,3)}</strong></div><div class="metric"><span>Price / kg dry matter</span><strong>${c} ${f(r.pricePerKgDM,3)}</strong></div><div class="metric"><span>Blend dry matter</span><strong>${f(r.blendDryMatterPct,2)}%</strong></div><div class="metric"><span>Dry matter in batch</span><strong>${f(r.totalKgDM,1)} kg</strong></div><div class="metric"><span>Crude protein / DM</span><strong>${f(r.nutrients.cp.dmPct,2)}%</strong></div><div class="metric"><span>Crude protein / AF</span><strong>${f(r.nutrients.cp.asFedPct,2)}%</strong></div><div class="metric"><span>Crude fiber / DM</span><strong>${f(r.nutrients.fiber.dmPct,2)}%</strong></div><div class="metric"><span>Blend moisture</span><strong>${f(r.blendMoisturePct,2)}%</strong></div></div>
 <div class="mix-title">Optimized illustrative mix</div><div class="mix-bar" title="As-fed ingredient shares">${active.map(i=>`<span style="width:${Math.max(0,Math.min(100,i.amountPctAsFed))}%" title="${esc(i.name)}"></span>`).join('')}</div>
 ${active.map(i=>`<div class="mix-row"><span>${esc(i.name)}</span><b>${f(i.amountPctAsFed,1)}% · ${f(i.kgAsFed,1)} kg AF</b></div>`).join('')}
 <div class="result-bottom"><span>Total as-fed</span><span>${f(kg,2)} kg</span></div><div class="result-bottom"><span>Total dry matter</span><span>${f(r.totalKgDM,2)} kg</span></div>
 <div class="result-warning"><strong>NOT VALIDATED FOR FEEDING</strong> Synthetic ingredient values; no validated species/age requirements. Energy, digestible amino acids, minerals, vitamins, anti-nutrients, toxins and manufacturing safety are not evaluated.</div>
 <div class="result-actions"><button id="exportBtn" type="button">↧ Export annotated CSV</button><button id="printBtn" type="button">⎙ Print result</button></div>
 </div>`;
 $('exportBtn').addEventListener('click',()=>exportCSV(r));$('printBtn').addEventListener('click',()=>window.print());
}
function run(){const r=Engine.optimize(cfg());state.result=r;renderResult(r)}
function markStale(){state.result=null;$('output').innerHTML='<div class="result-empty"><strong>Inputs updated.</strong><p>Click “Calculate least-cost blend” to update the result.</p></div>'}
function updateIngredient(id,field,raw,checked){
 const i=state.catalog.find(x=>x.id===id);if(!i)return;
 let patch;
 if(field==='enabled'){patch={enabled:checked};}
 else {
  if(raw.trim()===''){alert('A numeric ingredient value cannot be blank.');renderIngredientTable();return;}
  const v=Number(raw);if(!Number.isFinite(v)){alert('Enter a finite number');renderIngredientTable();return;}
  if(field==='priceAsFed'){
   try{patch={priceAsFed:Units.toPricePerKgAsFed(v,state.priceUnit)}}catch(e){alert(e.message);renderIngredientTable();return;}
  }else if(field==='cp'||field==='fiber')patch={nutrientsDM:{...i.nutrientsDM,[field]:v}};
  else patch={[field]:v};
 }
 try{const revised=Gov.reviseLocally(i,patch,new Date().toISOString().slice(0,10));state.catalog[state.catalog.indexOf(i)]=revised;renderIngredientTable();markStale();}
 catch(e){alert('Change rejected: '+e.message);renderIngredientTable();}
}
function showAudit(id){
 const i=state.catalog.find(x=>x.id===id);if(!i)return;
 $('auditTitle').textContent=i.name;
 const pairs=[['Record ID',i.id],['Record version',i.recordVersion],['Nutrient unit basis','% of dry matter'],['Price unit basis',`${state.currency}/kg as-fed`],['Moisture / dry matter',`${f(100-i.dryMatterPct,1)}% moisture / ${f(i.dryMatterPct,1)}% DM`],['Source reference',i.source.referenceId],['Source notes',i.source.description],['Usage rights',i.source.rights],['Scientific approval',i.approval.status],['Animal groups',i.allowedGroups.join(', ')],['Last updated',i.updatedOn],['Audit events',i.audit.map(e=>`${e.date}: ${e.event} — ${e.description}`).join(' | ')]];
 $('auditContent').innerHTML=pairs.map(([a,b])=>`<div class="audit-rows"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')+'<div class="warn"><strong>Scientific provenance warning:</strong> This is a synthetic demonstration record, not a tested feed ingredient. It may not be used as an approved production ingredient.</div>';
 if($('auditDialog').showModal)$('auditDialog').showModal();else $('auditDialog').setAttribute('open','');
}
function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCSV(r){const rec=[['RationWise v1.1 SPRINT 1 - SYNTHETIC DEMONSTRATION: NOT FOR FEEDING'],['Animal',Lib.ANIMALS[state.species].label],['Currency (local, no FX)',r.currency],['Price basis','currency/kg as-fed'],['Batch kg as-fed',r.batchKgAsFed],['Blend kg DM',r.totalKgDM],['DM % blend',r.blendDryMatterPct],['Cost total',r.costTotal],['Cost/kg AF',r.pricePerKgAsFed],['Cost/kg DM',r.pricePerKgDM],['Scientific status',r.scientificStatus],[],['Ingredient','Record version','Source ID','Approval','Rights','Share % AF','Quantity kg AF','Quantity kg DM','DM % ingredient','CP % DM','Crude fiber % DM','Unit price/kg AF','Ingredient cost']];
 r.rows.forEach(i=>rec.push([i.name,i.version,i.sourceRef,i.approval,i.rights,i.amountPctAsFed,i.kgAsFed,i.kgDM,i.dmPctOfIngredient,i.nutrientsDM.cp,i.nutrientsDM.fiber,i.priceAsFed,i.cost]));
 rec.push([],['Nutrient','kg','% DM','% as-fed']);for(const [key,v] of Object.entries(r.nutrients))rec.push([key,v.kg,v.dmPct,v.asFedPct]);
 rec.push([],['Entered target','mode','basis','value']);r.targets.forEach(t=>rec.push([t.key,t.mode,t.basis,t.value]));
 rec.push([],['WARNING','Synthetic ingredient data only. Not a nutritionally complete or safe feeding formula.']);
 const out='\ufeff'+rec.map(row=>row.map(csvCell).join(',')).join('\r\n');const blob=new Blob([out],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`rationwise-v1_1-${state.species}-DEMO.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('animalGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-animal]');if(!btn)return;state.species=btn.dataset.animal;renderSpecies();renderIngredientTable();markStale()});
$('currency').addEventListener('change',e=>{state.currency=e.target.value;renderIngredientTable();markStale()});
$('priceUnit').addEventListener('change',e=>{state.priceUnit=e.target.value;renderIngredientTable();markStale()});
$('ingredientBody').addEventListener('change',e=>{const inp=e.target.closest('[data-field]');if(inp)updateIngredient(inp.dataset.id,inp.dataset.field,inp.value,inp.checked)});
$('ingredientBody').addEventListener('click',e=>{const b=e.target.closest('[data-audit]');if(b)showAudit(b.dataset.audit)});
$('runBtn').addEventListener('click',run);
['batchKg','cpMin','fiberMax','cpBasis','fiberBasis'].forEach(id=>$(id).addEventListener('change',markStale));
$('resetBtn').addEventListener('click',()=>{state.catalog=Lib.demoCatalog();renderIngredientTable();markStale()});
$('closeDialog').addEventListener('click',()=>$('auditDialog').close());
renderSpecies();renderIngredientTable();run();
})();
