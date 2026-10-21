/* RationWise v1.8 historical reference browser pane; no credential/feeding certification. */
(function(){'use strict';
const M=window.RationReference18,S=window.RationScience2,ST=window.RationStages;
const $=id=>document.getElementById(id);const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let current=null,copied=[];
const clearResults=()=>{const o=$('prodOutput');if(o)o.innerHTML='<div class="result-empty">Nutrient targets changed. Recalculate using reviewed records before using any results.</div>';};
const note=(v,err=false)=>{$('ref18Status').textContent=v;$('ref18Status').dataset.state=err?'error':'warning';};
function stageChanged(){current=null;copied=[];$('ref18Results').innerHTML='';
 const stage=M.canonical($('prodSpecies').value),hasNumbers=['chicken_broiler_starter','chicken_broiler','chicken_broiler_finisher','chicken_layer'].includes(stage);
 $('ref18AgeWrap').hidden=stage==='chicken_layer'||!hasNumbers;$('ref18IntakeWrap').hidden=stage!=='chicken_layer';
 $('ref18Apply').disabled=!hasNumbers;note(hasNumbers?'Historical poultry evidence is available for a limited preview. Enter the age or hen feed intake.':'This stage has no preloaded numeric reference. Use your own expert-reviewed source grid above; no chicken targets are substituted.');}
function clearStale(){if(!copied.length)return;clearResults();
 for(const old of copied){const el=$('prodTargets').querySelector(`[data-t="${old.i}"][data-field="value"]`);if(el&&Math.abs(Number(el.value)-old.value)<1e-6){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));}}
 copied=[];note('Historical values were cleared because the animal input changed. Recalculate and review before reusing.');}
function args(){const val=x=>$(x).value.trim()===''?NaN:Number($(x).value);return {modelId:M.canonical($('prodSpecies').value),ageDays:val('ref18Age'),feedIntakeGPerDay:val('ref18Intake')};}
function render(p){const el=$('ref18Results');
 if(p.status==='no_numerical_reference'){el.innerHTML=`<p class="prod-hint">${esc(p.message)}</p>`;return;}
 const rows=p.targets.map(t=>`<tr><td>${esc(S.NUTRIENTS[t.key].name)}</td><td>${t.sourceAsFedPercent.toFixed(3)}% at 90% DM</td><td><strong>${t.value.toFixed(3)}% DM</strong></td></tr>`).join('');
 el.innerHTML=`<div class="ref18-card"><strong>Historical reference only — ${p.targets.length} of ${p.targets.length+p.missing.length} stage constraints</strong><p>Source: <a href="${M.SOURCE.url}" target="_blank" rel="noopener noreferrer">USDA NRCS Technical Note (2020)</a>, adapted from NRC 1994.</p><div class="table-scroll"><table class="prod-table"><thead><tr><th>Mapped nutrient</th><th>Source concentration</th><th>Converted dry-matter concentration</th></tr></thead><tbody>${rows}</tbody></table></div><p class="prod-hint"><b>Still missing:</b> ${p.missing.map(k=>esc(S.NUTRIENTS[k].name)).join('; ')}.</p><p class="prod-hint">Non-phytate P is NOT mapped to available P. Modern genetics may require different profiles. <a href="${M.CURRENT.url}" target="_blank" rel="noopener noreferrer">2026 NASEM poultry science</a> is listed for independent expert review, but no 2026 table data are bundled.</p></div>`;
}
$('ref18Preview').addEventListener('click',()=>{clearStale();try{current=M.getPreview(args());render(current);note(current.status==='no_numerical_reference'?current.message:'Historical partial reference calculated. This is NOT a modern feeding recommendation or approved licensed production profile.');}catch(e){current=null;$('ref18Results').innerHTML='';note(e.message,true);}});
$('ref18Apply').addEventListener('click',()=>{
 try{
  const p=M.getPreview(args());if(p.status!=='historical_reference_preview_only')throw Error('No numerical preview available for selected stage');
  if(!current||JSON.stringify(current.context)!==JSON.stringify(p.context)||current.modelId!==p.modelId)throw Error('Preview the current animal data first.');
  // Write ONLY stage-matched reference values, never missing nutrients or review claims.
  const keys=ST.STAGES[p.modelId].keys;
  clearStale();for(const t of p.targets){const i=keys.indexOf(t.key),root=$('prodTargets');if(i<0)throw Error('Missing nutrient target row: '+t.key);
   const v=root.querySelector(`[data-t="${i}"][data-field="value"]`),mode=root.querySelector(`[data-t="${i}"][data-field="mode"]`),basis=root.querySelector(`[data-t="${i}"][data-field="basis"]`);
   if(!v||!mode||!basis)throw Error('Nutrient table is not ready');
   v.value=String(t.value);mode.value='min';basis.value='dm';v.dispatchEvent(new Event('input',{bubbles:true}));copied.push({i,value:t.value});
  }
  $('prodAttest').checked=false;clearResults();
  // DO NOT auto-fill a fake reviewer, evidence ID or rights attestation. Source not licensed.
  note(`Copied ${copied.length} historical partial concentrations only. ${p.missing.length} other required targets remain user-supplied. Do NOT represent this as an approved, feeding-ready or commercially licensed profile.`);
 }catch(e){note(e.message,true);}
});
for(const id of ['ref18Age','ref18Intake'])$(id).addEventListener('input',()=>{clearStale();current=null;});
$('prodSpecies').addEventListener('change',stageChanged);
$('ref18Download').addEventListener('click',()=>{if(!current){note('Preview first to create an audit report.',true);return;}
 const b=new Blob([JSON.stringify(M.auditPreview(current),null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`RationWise_v1.8_${current.modelId}_reference_audit.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
});stageChanged();
})();
