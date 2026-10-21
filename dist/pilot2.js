/* Browser-only Sprint 2 pilot. NEVER pretend its local reviewer controls are secure. */
(function(){'use strict';
const S=window.RationScience2,E=window.RationEngine2,fixtures=S.demoData();
const state={analyses:fixtures.analyses,quotes:fixtures.quotes,profile:fixtures.profiles[0],result:null};
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const num=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const today=()=>new Date().toISOString().slice(0,10);
function market(){return {country:$('pilotCountry').value.trim().toUpperCase(),currency:$('pilotCurrency').value.trim().toUpperCase()};}
function applicable(){return state.analyses.filter(a=>a.allowedGroups.includes(state.profile.group)&&a.enabled!==false);}
function energyKey(){return state.profile.group==='swine'?'neSwine':'me';}
function lysineKey(){return state.profile.group==='swine'?'sidLys':'digLys';}
function qFor(a){const {country,currency}=market();return state.quotes.find(q=>q.analysisId===a.id&&q.country===country&&q.currency===currency);}
function markStale(){state.result=null;$('pilotOutput').innerHTML='<div class="result-empty"><strong>Inputs updated.</strong> Run the pilot optimizer to recalculate.</div>';}
function renderTable(){
 const {country,currency}=market();
 $('pilotQuoteCaption').textContent=`${country||'??'} / ${currency||'???'} · Quoted amounts entered manually; no FX conversions or live market quotes · analysis and market quote versions tracked independently.`;
 $('pilotQuotes').innerHTML=applicable().map(a=>{
 const q=qFor(a),amount=q?String(q.amount):'',unit=q?.unit||'kg';
 return `<tr><td><strong>${esc(a.name)}</strong><small>Analysis v${a.version} · ${esc(a.review.status)}</small></td>
 <td><input data-id="${esc(a.id)}" data-field="dryMatterPct" aria-label="${esc(a.name)} dry matter percent" type="number" step="any" min="0" max="100" value="${a.dryMatterPct}"></td>
 <td><input data-id="${esc(a.id)}" data-field="${energyKey()}" aria-label="${esc(a.name)} stage energy MJ per kg DM" type="number" step="any" min="0" value="${a.nutrients[energyKey()]}"></td>
 <td><input data-id="${esc(a.id)}" data-field="${lysineKey()}" aria-label="${esc(a.name)} stage lysine percent DM" type="number" step="any" min="0" value="${a.nutrients[lysineKey()]}"></td>
 <td><input data-id="${esc(a.id)}" data-field="amount" aria-label="${esc(a.name)} local quoted price" placeholder="Enter price" type="number" step="any" min="0" value="${esc(amount)}"></td>
 <td><select data-id="${esc(a.id)}" data-field="unit" aria-label="${esc(a.name)} price quote unit">${Object.keys(S.PRICE_UNITS).map(k=>`<option value="${k}" ${k===unit?'selected':''}>${{kg:'per kg',tonne:'per tonne',bag25:'per 25kg',bag50:'per 50kg',bag100:'per 100kg'}[k]}</option>`).join('')}</select></td>
 <td><small>${q?'Quote v'+q.version:'No quote yet'}</small><br><button type="button" data-audit="${esc(a.id)}">Inspect</button></td></tr>`;}).join('');
}
function renderProfile(){
 $('pilotStageTitle').textContent=state.profile.stage;
 $('pilotRequirementSource').textContent=state.profile.source.referenceId;
 $('pilotTargets').innerHTML=state.profile.targets.map(t=>{
 const n=S.NUTRIENTS[t.key];return `<tr><td>${esc(n.name)}</td><td>${t.mode==='min'?'≥':'≤'}</td><td>${num(t.value,2)} ${esc(n.unit)} ${t.basis==='dm'?'DM':'as-fed'}</td></tr>`;
 }).join('');
}
function showRecord(id){const a=state.analyses.find(a=>a.id===id),q=qFor(a);
 $('pilotRecordName').textContent=a.name;
 const rows=[['Composition ID',a.id],['Composition version',a.version],['Composition source',a.source.referenceId],['Source rights',a.source.rights],['Scientific review',a.review.status],['Review history',a.history.map(h=>`${h.at} ${h.event} by ${h.by}`).join(' | ')],['Nutrients','All quantities stored on dry-matter basis'],['Local market',market().country+' / '+market().currency],['Quote ID',q?.id||'No quote'],['Quote version',q?.version||'—'],['Quote source',q?.provenance||'Not provided'],['Quote date',q?.quotedOn||'—']];
 $('pilotRecordDetails').innerHTML=rows.map(([key,v])=>`<div class="audit-rows"><b>${esc(key)}</b><span>${esc(v)}</span></div>`).join('');$('pilotRecordDialog').showModal();}
function editTable(e){const el=e.target,id=el.dataset?.id,field=el.dataset?.field;if(!id||!field)return;
 const a=state.analyses.find(a=>a.id===id),q=qFor(a);if(!a)return;
 try{
  if(field==='amount'||field==='unit'){
   const value=field==='amount'?el.value:q?.amount;
   if(value===''||value===undefined)throw Error('Provide a numeric quote amount before changing units.');
   const amount=Number(value);if(!Number.isFinite(amount)||amount<0)throw Error('Quote amount must be >=0.');
   const unit=field==='unit'?el.value:q?.unit||'kg';
   if(q){const next=S.reviseQuote(q,{amount,unit,quotedOn:today(),provenance:'LOCAL-USER-ENTRY (not independently verified)'},today());state.quotes[state.quotes.indexOf(q)]=next;}
   else{const m=market();const next={id:'q_local_'+m.country+'_'+m.currency+'_'+id,analysisId:id,country:m.country,currency:m.currency,amount,unit,quotedOn:today(),provenance:'LOCAL-USER-ENTRY (not independently verified)',version:1,demo:true};const errors=S.validateQuote(next);if(errors.length)throw Error(errors.join('; '));state.quotes.push(next);}
  }else{
   if(el.value.trim()==='')throw Error('Enter a composition value');const value=Number(el.value);if(!Number.isFinite(value))throw Error('Invalid composition value');
   const patch=field==='dryMatterPct'?{dryMatterPct:value}:{nutrients:{...a.nutrients,[field]:value}};
   const next=S.reviseAnalysis(a,patch,'browser_sandbox_editor',today());state.analyses[state.analyses.indexOf(a)]=next;
  }
  renderTable();markStale();
 }catch(err){$('pilotOutput').innerHTML=`<div class="result-error"><strong>Edit rejected</strong><p>${esc(err.message)}</p></div>`;renderTable();}
}
function run(){const m=market(),batch=Number($('pilotBatchKg').value);
 const r=E.optimize({analyses:state.analyses,quotes:state.quotes,profile:state.profile,batchKgAsFed:batch,group:state.profile.group,country:m.country,currency:m.currency,mode:'sandbox'});
 state.result=r;
 if(r.status!=='optimal'){$('pilotOutput').innerHTML=`<div class="result-error"><strong>${esc(r.status.toUpperCase())}</strong><p>${esc(r.message)}</p><p>No constraints were relaxed.</p></div>`;return;}
 $('pilotOutput').innerHTML=`<div class="result-hero"><div class="result-kicker">${esc(state.profile.stage.toUpperCase())} · MATHEMATICAL DEMO ONLY</div><div class="result-cost">${esc(r.currency)} ${num(r.costTotal)}</div><p>Ingredient-only illustration for ${num(batch,1)} kg as-fed</p></div><div class="result-body">
 <div class="metric-list"><div class="metric"><span>Cost/kg as-fed</span><strong>${num(r.pricePerKgAsFed,3)}</strong></div><div class="metric"><span>Cost/kg dry matter</span><strong>${num(r.pricePerKgDM,3)}</strong></div><div class="metric"><span>Dry matter content</span><strong>${num(r.blendDryMatterPct,2)}%</strong></div><div class="metric"><span>Batch dry matter</span><strong>${num(r.totalKgDM,1)} kg</strong></div></div>
 <div class="mix-title">Mathematical nutrient checks</div><div class="pilot-checks">${r.checks.map(t=>`<div><span>${esc(S.NUTRIENTS[t.key].name)}</span><b>${t.mode==='min'?'≥':'≤'} ${num(t.value,2)} → ${num(t.achieved,2)} ${esc(t.unit)} · ${t.basis==='dm'?'DM':'AF'}</b></div>`).join('')}</div>
 <div class="mix-title">Illustrative optimized ingredient mix</div>${r.rows.map(x=>`<div class="mix-row"><span>${esc(x.name)}</span><b>${num(x.kgAsFed,1)} kg AF · ${num(x.kgDM,1)} kg DM</b></div>`).join('')}
 <div class="result-warning"><strong>NOT FOR FEEDING OR MANUFACTURING</strong> Both the ingredient analyses and this species-stage profile are invented. All review states remain draft. Energy and amino acids here are mathematical fields, not validated nutritional availability. Costs do not include handling, premixes, shipping or taxes.</div>
 <div class="result-actions"><button type="button" id="pilotExport">↧ Export evidence CSV</button></div></div>`;
 $('pilotExport').addEventListener('click',()=>exportCsv(r));
}
function csv(v){const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'}
function exportCsv(r){const lines=[['RationWise v1.2 SPRINT 2 / SYNTHETIC - DO NOT FEED'],['Market',r.country],['Currency',r.currency],['Animal group',r.group],['Requirement ID',r.profileId],['Requirement version',r.profileVersion],['Requirement approval',r.profileReview],['Batch kg as-fed',r.batchKgAsFed],['Batch kg DM',r.totalKgDM],['Cost total',r.costTotal],[],['Ingredient','Analysis ID','Analysis version','Quote ID','Quote version','As-fed kg','Dry matter kg','Price/kg AF','Cost']];
 for(const x of r.rows)lines.push([x.name,x.analysisId,x.analysisVersion,x.quoteId,x.quoteVersion,x.kgAsFed,x.kgDM,x.pricePerKgAsFed,x.cost]);
 lines.push([],['Nutrient','Direction','Target','Achieved','Basis','Unit']);for(const c of r.checks)lines.push([S.NUTRIENTS[c.key].name,c.mode,c.value,c.achieved,c.basis,c.unit]);
 const blob=new Blob([lines.map(row=>row.map(csv).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='RationWise_v1.2_'+r.profileId+'_SYNTHETIC.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);
}
$('pilotProfile').addEventListener('change',e=>{const next=fixtures.profiles.find(p=>p.id===e.target.value);if(!next)return;state.profile=next;renderTable();renderProfile();markStale();});
$('pilotMarketPreset').addEventListener('change',e=>{const [c,m]=e.target.value.split('/');if(!c)return;$('pilotCountry').value=c;$('pilotCurrency').value=m;renderTable();markStale();});
for(const id of ['pilotCountry','pilotCurrency'])$(id).addEventListener('change',()=>{renderTable();markStale();});
$('pilotBatchKg').addEventListener('input',markStale);
$('pilotQuotes').addEventListener('change',editTable);
$('pilotQuotes').addEventListener('click',e=>{const b=e.target.closest('[data-audit]');if(b)showRecord(b.dataset.audit);});
$('pilotReset').addEventListener('click',()=>{const d=S.demoData();state.analyses=d.analyses;state.quotes=d.quotes;state.profile=d.profiles[0];$('pilotProfile').value=d.profiles[0].id;$('pilotMarketPreset').value='US/USD';$('pilotCountry').value='US';$('pilotCurrency').value='USD';$('pilotBatchKg').value='1000';renderTable();renderProfile();markStale();});
$('pilotCloseRecord').addEventListener('click',()=>$('pilotRecordDialog').close());
$('pilotRun').addEventListener('click',run);renderProfile();renderTable();run();
})();
