/* RationWise: searchable, source-traceable DRAFT library; never certifies feeds. */
(function(root){'use strict';
const data=root.RationIngredientLibraryData;
const bridge=root.RationIngredientBridge;
const $=id=>document.getElementById(id);
if(!data||!bridge||!$('rwLibSearch'))return;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=data.entries;
const byId=new Map(records.map(r=>[r.id,r]));
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const rowText=r=>norm([r.name,r.category,...(r.aliases||[])].join(' '));
const groups=[...new Set(records.map(r=>r.category))].sort((a,b)=>a.localeCompare(b));
for(const v of groups){const o=document.createElement('option');o.value=v;o.textContent=v;$('rwLibCategory').append(o);}
// Keep the scientific source information in the data and exports, not on the farmer-facing selector.
const section=$('rwIngredientLibrary');
if(section){
 const introduction=section.querySelector('.rw-lib-top p');
 if(introduction)introduction.textContent='Search ingredients, view their nutrient values, and add them to your formulation.';
 const availability=$('rwLibDataFilter');
 if(availability){availability.value='all';const label=availability.closest('label');if(label)label.hidden=true;}
 const foot=section.querySelector('.rw-lib-foot');if(foot)foot.hidden=true;
}
let selection='';
function applicable(r,stage){return !stage?.group||r.groups.includes(stage.group);}
function getVisible(){
 const stage=bridge.getStage(),q=norm($('rwLibSearch').value.trim()),group=$('rwLibCategory').value,kind=$('rwLibDataFilter').value;
 return records.filter(r=>applicable(r,stage)&&(group==='all'||r.category===group)&&(kind==='all'||(kind==='numerical'?r.autoEligible:!r.autoEligible))&&(!q||rowText(r).includes(q)));
}
// Show the original numeric source figures; units live in the nutrient label.
// A two-column display MUST NOT be mistaken for a change to nutrient conversion or approval logic.
function nutrientLabel(key,item,r){
 const initial=String(item.originalColumn||key||'Nutrient').trim();
 const rawUnit=String(item.unit||'').trim();
 const knownDM=r.source?.basis==='dry_matter';
 if(/\bkcal\s*\/\s*kg\b/i.test(initial))return initial;
 if(/\bMJ\s*\/\s*kg\b/i.test(initial))return initial;
 if(/%/.test(initial)){
   if(knownDM&&/%\s*DM/i.test(rawUnit))return initial.replace(/\s*%\s*$/, ' (% DM)');
   return initial.replace(/\s*%\s*$/, ' (%)');
 }
 if(/\b(?:IU|g\/kg|mg\/kg)\b/i.test(initial))return initial;
 if(rawUnit==='%'||/%/.test(rawUnit))return initial + (knownDM&&/DM/i.test(rawUnit)?' (% DM)':' (%)');
 if(rawUnit&&rawUnit!=='—')return initial+' ('+rawUnit+')';
 return initial;
}
function showDetail(r){
 if(!r){$('rwLibDetails').innerHTML='<p>Select an ingredient to see its nutrient values.</p>';return;}
 const stage=bridge.getStage();
 const numeric=Object.entries(r.originalNutrients||{}).filter(([,v])=>v&&v.value!==null&&v.value!==''&&Number.isFinite(Number(v.value)));
 const rows=numeric.map(([key,v])=>`<tr><td>${escape(nutrientLabel(key,v,r))}</td><td class="rw-lib-number">${escape(v.value)}</td></tr>`).join('');
 const count=Object.keys(r.valuesDM||{}).filter(k=>stage.keys.includes(k)).length;
 $('rwLibDetails').innerHTML=`<div class="rw-lib-detail-header"><span class="rw-lib-kicker">${escape(r.category)}</span><h5>${escape(r.name)}</h5></div>
 <div class="rw-lib-table-scroll"><table class="rw-lib-table"><thead><tr><th>Nutrient</th><th>Value</th></tr></thead><tbody>${rows||'<tr><td colspan="2">No numeric values available.</td></tr>'}</tbody></table></div>
 <div class="rw-lib-controls">${r.autoEligible&&count>0?`<label class="rw-lib-ack"><input type="checkbox" id="rwLibOptIn"/> Include available nutrient values</label>`:''}
 <button type="button" id="rwLibAdd">Add ingredient to formulation</button>
 <p>Complete any missing nutrient values and ingredient price in Step 3.</p></div>`;
 $('rwLibAdd').addEventListener('click',()=>{
  const copyDraft=Boolean(r.autoEligible&&$('rwLibOptIn')?.checked);
  const result=bridge.addFromLibrary(r.id,{copyDraft});
  const msg=$('rwLibMessage');
  msg.textContent=result.ok?`${r.name} added. ${result.copied?result.copied+' nutrient values copied. ':''}Complete missing values and price in Step 3.`:result.error;
  msg.classList.toggle('rw-lib-error',!result.ok);
 });
}
function render(){
 const visible=getVisible(),stage=bridge.getStage();
 $('rwLibCount').textContent=`${visible.length} ingredients`;
 const shown=visible.slice(0,75);
 $('rwLibResults').innerHTML=shown.map(r=>`<button class="rw-lib-result${selection===r.id?' selected':''}" role="option" aria-selected="${selection===r.id}" data-rwid="${escape(r.id)}" type="button"><b>${escape(r.name)}</b><span>${escape(r.category)}</span></button>`).join('')+(visible.length>75?'<p class="rw-lib-more">Showing the first 75 results. Type more of the ingredient name to narrow results.</p>':'');
 if(!visible.some(r=>r.id===selection)){selection='';showDetail(null);}
 if(!shown.length)$('rwLibResults').innerHTML='<p class="rw-lib-no-results">No matching ingredient. Try another search, or add your ingredient manually below.</p>';
}
$('rwLibResults').addEventListener('click',e=>{
 const b=e.target.closest('[data-rwid]');if(!b)return;
 const rec=byId.get(b.dataset.rwid);if(!rec)return;
 selection=rec.id; $('rwLibMessage').textContent=''; render();showDetail(rec);
});
for(const id of ['rwLibSearch','rwLibCategory','rwLibDataFilter']){$(id).addEventListener(id==='rwLibSearch'?'input':'change',render);}
$('prodSpecies')?.addEventListener('change',()=>{selection='';$('rwLibMessage').textContent='';render();});
render();
root.RationIngredientLibraryUI={getVisible,render};
})(typeof window!=='undefined'?window:globalThis);
