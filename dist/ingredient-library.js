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
let selection='';
function applicable(r,stage){return !stage?.group||r.groups.includes(stage.group);}
function getVisible(){
 const stage=bridge.getStage(),q=norm($('rwLibSearch').value.trim()),group=$('rwLibCategory').value,kind=$('rwLibDataFilter').value;
 return records.filter(r=>applicable(r,stage)&&(group==='all'||r.category===group)&&(kind==='all'||(kind==='numerical'?r.autoEligible:!r.autoEligible))&&(!q||rowText(r).includes(q)));
}
function status(r){return r.autoEligible?'DM-basis draft values':'Reference only · Basis unresolved';}
function showDetail(r){
 if(!r){$('rwLibDetails').innerHTML='<p>Select an ingredient to inspect the available source data.</p>';return;}
 const stage=bridge.getStage();
 const numKeys=Object.keys(r.valuesDM||{});
 const compatible=numKeys.filter(key=>stage.keys.includes(key));
 const tableRows=r.autoEligible?numKeys.map(k=>{
   const x=r.originalNutrients[k],raw=x?.value,unit=x?.unit||'% DM';
   return `<tr><td>${escape(root.RationScience2?.NUTRIENTS?.[k]?.name||k)}</td><td>${escape(raw)} ${escape(unit)}</td><td>${escape(k==='meRuminant'?r.valuesDM[k].toFixed(3)+' MJ/kg DM':r.valuesDM[k])}</td><td>${compatible.includes(k)?'Matches selected stage':'Reference only'}</td></tr>`;
 }).join(''):Object.entries(r.originalNutrients||{}).slice(0,18).map(([name,v])=>`<tr><td>${escape(name)}</td><td>${escape(v.value)} ${escape(v.unit)}</td><td colspan="2">No confirmed basis / model match</td></tr>`).join('');
 $('rwLibDetails').innerHTML=`<div class="rw-lib-detail-header"><span class="rw-lib-kicker">${escape(r.category)}</span><h5>${escape(r.name)}</h5><span>${escape(status(r))}</span></div>
 <div class="rw-lib-source"><strong>Source and traceability</strong><div>Owner-supplied <em>Feeding Standards — Draft</em>, Table ${escape(r.source.table)}</div><div>Attributed source: ${escape(r.source.attribution)}</div><div>Data basis: ${escape(r.source.basis==='dry_matter'?'Dry matter':'Not established in the draft')}</div><div>Scientific review: <b>pending</b> · Public reuse rights: <b>unconfirmed</b></div></div>
 <div class="rw-lib-table-scroll"><table class="rw-lib-table"><thead><tr><th>Nutrient</th><th>Source figure</th><th>Calculated DM value</th><th>Compatibility</th></tr></thead><tbody>${tableRows||'<tr><td colspan="4">No transferable numeric nutrient data.</td></tr>'}</tbody></table></div>
 <div class="rw-lib-controls">${r.autoEligible?`<label class="rw-lib-ack"><input type="checkbox" id="rwLibOptIn"/> Copy ${compatible.length} compatible <em>draft</em> numbers for research calculation (not a laboratory result or approval)</label>`:''}
 <button type="button" id="rwLibAdd">Add ingredient to formulation</button><p>Dry matter ${r.dryMatterPctAsFed==null?'not established':escape(r.dryMatterPctAsFed)+'% as-fed'}. Price, assay/CoA, usage-rights evidence, and contaminant/suitability screening must be supplied separately.</p></div>`;
 $('rwLibAdd').addEventListener('click',()=>{
  const copyDraft=Boolean(r.autoEligible&&$('rwLibOptIn')?.checked);
  const result=bridge.addFromLibrary(r.id,{copyDraft});
  const msg=$('rwLibMessage');
  msg.textContent=result.ok?`Added ${r.name}. ${result.copied} compatible draft nutrient fields copied; ${result.missing} required fields still missing. Enter local price, laboratory/source evidence, rights proof and hazard screening; obtain qualified review before using any result for animal feeding.`:result.error;
  msg.classList.toggle('rw-lib-error',!result.ok);
 });
}
function render(){
 const visible=getVisible(),stage=bridge.getStage();
 $('rwLibCount').textContent=`${visible.length} searchable ${stage.group||'feed'} ingredient reference${visible.length===1?'':'s'} (${records.length} records in the draft library). Values are not region-specific market measurements.`;
 const shown=visible.slice(0,75);
 $('rwLibResults').innerHTML=shown.map(r=>`<button class="rw-lib-result${selection===r.id?' selected':''}" role="option" aria-selected="${selection===r.id}" data-rwid="${escape(r.id)}" type="button"><b>${escape(r.name)}</b><span>${escape(r.category)} · Table ${r.source.table}</span><small>${r.autoEligible?'DM-basis numeric profile':'Reference only'}</small></button>`).join('')+(visible.length>75?'<p class="rw-lib-more">Showing the first 75 results. Type more of the ingredient name to narrow results.</p>':'');
 if(!visible.some(r=>r.id===selection)){selection='';showDetail(null);}
 if(!shown.length)$('rwLibResults').innerHTML='<p class="rw-lib-no-results">No exact reference found for this stage. You may still add an ingredient manually using “+ Add ingredient” below the table.</p>';
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
