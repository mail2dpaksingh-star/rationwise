/* RationWise optional, locally imported feed composition evidence workspace. */
(function(root){'use strict';const $=id=>document.getElementById(id),e=root.RationEvidence,b=root.RationIngredientBridge;
if(!e||!b||!$('rwEvidenceImport'))return;
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let records=[],selected=-1;
const dl=(name,blob)=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([blob],{type:'application/json'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500);};
function detail(){const area=$('rwEvidenceDetail');if(selected<0||!records[selected]){area.innerHTML='';return;}
const {record:r,assessment:a}=records[selected],d=b.getStage(),matched=r?.group===d.group;
const rows=a.valid?Object.entries(a.normalized).map(([key,value])=>`<tr><td>${esc(root.RationScience2?.NUTRIENTS?.[key]?.name||key)}</td><td>${value}</td><td>${d.keys.includes(key)?'Model matches':'Not required for stage'}</td></tr>`).join(''):'';
area.innerHTML=`<h5>${esc(r?.name||'Unknown')}</h5><p><strong>Source:</strong> ${esc(r?.source?.publisher)} · ${esc(r?.source?.referenceId)} · ${esc(r?.source?.observedOn)}<br><strong>Method:</strong> ${esc(r?.source?.method)} · <strong>Rights:</strong> ${esc(r?.source?.rights)} · Evidence: ${esc(r?.source?.rightsEvidence||'Not supplied')}<br><strong>Review:</strong> ${esc(r?.source?.reviewer||'Not documented')} (not verified by RationWise)</p>${(typeof r?.source?.url==='string'&&r.source.url.startsWith('https://'))?`<p><a target="_blank" rel="noopener noreferrer" href="${esc(r.source.url)}">Open source reference</a></p>`:''}
${a.errors.length?`<p class="rw-evidence-errors">${a.errors.map(esc).join('; ')}</p>`:''}
${a.valid?`<div class="rw-evidence-table"><table><thead><tr><th>Nutrient</th><th>Normalized value (DM basis)</th><th>Stage applicability</th></tr></thead><tbody>${rows}</tbody></table></div>`:''}
<ul>${a.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
<label class="rw-evidence-opt"><input type="checkbox" id="rwEvidenceCopy" ${a.copyCandidate&&matched?'':'disabled'}/> I have confirmed the record, legal rights and numerical basis, and want to COPY compatible nutrients. This does not constitute feeding approval.</label>
<button id="rwEvidenceAdd" type="button" ${a.valid&&matched?'':'disabled'}>Add selected ingredient to formulation</button><p class="rw-evidence-small">${matched?'Matches selected animal group.':'Switch to a matching animal stage before importing.'} Price, inclusion bounds, hazard checks and actual qualified feeding review remain separate.</p>`;
$('rwEvidenceAdd')?.addEventListener('click',()=>{
const c=!!$('rwEvidenceCopy')?.checked,out=b.addFromEvidence(r,{copyValues:c});$('rwEvidenceMessage').textContent=out.ok?`Added ${r.name}; copied ${out.copied} externally supplied nutrient values, ${out.missing} required model fields missing. Separate feed-safety and nutritional review still required.`:out.error;
});
}
function render(){const g=b.getStage().group;const area=$('rwEvidenceList');area.innerHTML=records.map(({record:r,assessment:a},i)=>`<button type="button" data-index="${i}" class="rw-evidence-item${selected===i?' active':''}" aria-pressed="${selected===i}" ${r?.group===g?'':'title="Different animal group"'}><b>${esc(r?.name||'Unnamed record')}</b><small>${esc(r?.group)} · ${esc(r?.source?.rights)} · ${a.valid?'Data structurally checked':'Invalid evidence'}${r?.group===g?'':' · Different stage group'}</small></button>`).join('');area.querySelectorAll('[data-index]').forEach(btn=>btn.addEventListener('click',()=>{selected=Number(btn.dataset.index);render();detail();}));detail();}
$('rwEvidenceTemplate').addEventListener('click',()=>dl('RationWise_blank_evidence_template.json',JSON.stringify(e.blankPack(),null,2)));
$('rwEvidenceImport').addEventListener('change',async ev=>{const f=ev.target.files?.[0];ev.target.value='';if(!f)return;
try{if(f.size>2e6)throw Error('Max 2MB per evidence pack');const pack=e.parsePack(await f.text());records=pack.records;selected=records.length?0:-1;
$('rwEvidenceMessage').textContent=`Loaded ${records.length} locally supplied records. ${records.filter(x=>x.assessment.valid).length} passed structural checks; 0 independently verified by RationWise. No data sent to any server.`;render();}catch(err){$('rwEvidenceMessage').textContent='Import failed: '+err.message;}}
);
$('prodSpecies').addEventListener('change',()=>{render();});
root.RationEvidenceWorkspace={count:()=>records.length,records:()=>records.map(x=>({id:x.record?.id,valid:x.assessment.valid}))};
})(window);
