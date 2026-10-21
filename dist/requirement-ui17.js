/* RationWise v1.7 reference grid editor. Pure browser: no reviewer authentication. */
(function(){'use strict';
const M=window.RationRequirements17, S=window.RationStages, Sci=window.RationScience2;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canonical=id=>id==='chicken'?'chicken_broiler':id==='pig'?'pig_grower':id;
let grid=null,computed=null,applied=false,updating=false;
const metadata={reqId:'id',reqSource:'sourceReference',reqMethod:'methodDescription',reqPopulation:'countryOrPopulation',reqReviewer:'reviewer',reqEvidence:'reviewEvidence',reqRights:'rightsStatus',reqRightsProof:'rightsProof',reqReviewState:'dataStatus'};
function notice(msg,style='warning'){$('reqMessage').textContent=msg;$('reqMessage').dataset.state=style;}
function axesNow(){return [$('reqAxis1').value,$('reqAxis2').value].filter(Boolean);}
function displayAxis(){const id=canonical($('prodSpecies').value),allowed=M.MODEL_AXES[id],a=$('reqAxis1'),b=$('reqAxis2');
 if(!allowed){$('reqUnsupported').hidden=false;$('reqSupported').hidden=true;grid=null;computed=null;return;}
 $('reqUnsupported').hidden=true;$('reqSupported').hidden=false;
 const wasA=a.value,wasB=b.value;
 a.innerHTML=allowed.map(k=>`<option value="${k}">${esc(M.AXES[k].label)} (${esc(M.AXES[k].unit)})</option>`).join('');
 a.value=allowed.includes(wasA)?wasA:allowed[0];
 b.innerHTML='<option value="">No second axis · 1D interpolation</option>'+allowed.filter(x=>x!==a.value).map(k=>`<option value="${k}">${esc(M.AXES[k].label)} (${esc(M.AXES[k].unit)})</option>`).join('');
 b.value=allowed.includes(wasB)&&wasB!==a.value?wasB:'';
 displayContext();
}
function displayContext(){const axes=axesNow();$('reqContexts').innerHTML=axes.map((key,i)=>`<label>${esc(M.AXES[key].label)} (${esc(M.AXES[key].unit)})<input id="reqContext${i}" data-axis="${key}" type="number" min="${M.AXES[key].min}" max="${M.AXES[key].max}" step="any" placeholder="Enter actual animal value" autocomplete="off" /></label>`).join('');}
function metadataToGrid(){if(!grid)return;for(const [id,key] of Object.entries(metadata))grid[key]=$(id).value;}
function metadataFromGrid(){if(!grid)return;for(const [id,key] of Object.entries(metadata))$(id).value=grid[key]||'';}
function createBlank(){invalidate('Reference grid replaced.');const id=canonical($('prodSpecies').value);try{
 const old=grid;grid=M.makeTemplate(id,axesNow());grid.id=old?.modelId===id?old.id:'';
 metadataToGrid();if(!grid.methodDescription)grid.methodDescription='Piecewise-linear interpolation; values provided in referenced grid';metadataFromGrid();
 computed=null;applied=false;renderGrid();notice('Blank reference grid created. Enter published/licensed or laboratory-supported anchor values. No nutrient numbers are filled automatically.');
 }catch(e){notice(e.message,'error');}}
function renderGrid(){if(!grid){$('reqGrid').innerHTML='<p class="prod-hint">Create a blank grid or import a reference-grid JSON file to begin.</p>';return;}
 const stage=S.STAGES[grid.modelId];$('reqGrid').innerHTML=`<div class="table-scroll"><table class="prod-table" aria-label="Editable scientific reference points"><thead><tr><th>Anchor</th>${grid.axes.map(a=>`<th>${esc(M.AXES[a].label)}<small>${esc(M.AXES[a].unit)}</small></th>`).join('')}${stage.keys.map(k=>`<th>${esc(Sci.NUTRIENTS[k].name)}<small>${esc(Sci.NUTRIENTS[k].unit)} DM</small></th>`).join('')}</tr></thead><tbody>${grid.points.map((p,i)=>`<tr><td>${i+1}</td>${grid.axes.map(a=>`<td><input type="number" step="any" data-point="${i}" data-axis-value="${a}" value="${p.coordinates[a]??''}" aria-label="Point ${i+1} ${esc(a)}"></td>`).join('')}${stage.keys.map(k=>`<td><input type="number" step="any" data-point="${i}" data-nutrient="${k}" value="${p.targets[k]??''}" aria-label="Point ${i+1} ${esc(k)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="prod-hint">Anchor rows must form a complete 1D or 2D reference grid. For two axes, supply all four low/high combinations. Units follow the selected production stage and values are on a dry-matter basis.</p>`;
}
function contextNow(){const o={};for(const field of $('reqContexts').querySelectorAll('input[data-axis]')){o[field.dataset.axis]=field.value.trim()===''?NaN:Number(field.value);}return o;}
function preview(){if(!grid){notice('Create or import a reference grid first.','error');return;}
 metadataToGrid();try{computed=M.interpolateGrid(grid,contextNow(),{allowDraftPreview:true});renderPrediction(computed);notice(computed.draftPreview?'Preview only: unreviewed or commercially unlicensed reference grids cannot populate production targets.':'Reference grid accepted for calculation. Reviewer credentials and nutritional adequacy are NOT independently verified.','success');}
 catch(e){computed=null;$('reqResults').innerHTML='';notice('Cannot estimate: '+e.message,'error');}}
function renderPrediction(result){$('reqResults').innerHTML=`<div class="req-meta"><b>${result.draftPreview?'DRAFT PREVIEW · NOT APPLICABLE':'EXTERNALLY REVIEWED (OPERATOR CLAIM) · NOT CERTIFIED'}</b><span>Reference: ${esc(result.sourceReference)} · Grid ${esc(result.sourceId)} revision ${result.revision}</span></div><div class="table-scroll"><table class="prod-table"><thead><tr><th>Nutrient</th><th>Direction</th><th>Estimated target</th><th>Basis</th></tr></thead><tbody>${result.targets.map(t=>`<tr><td>${esc(Sci.NUTRIENTS[t.key].name)}</td><td>${t.mode==='min'?'Minimum':'Maximum'}</td><td><strong>${t.value.toFixed(5)}</strong> ${esc(Sci.NUTRIENTS[t.key].unit)}</td><td>DM</td></tr>`).join('')}</tbody></table></div><p class="prod-hint">${result.terms.length} reference corner(s) used. Weights: ${result.terms.map(t=>t.weight.toFixed(4)).join(' + ')}. This does not model actual dry-matter intake, vitamins, minerals beyond the stage scaffold, premixes, or safety.</p>`;}
function apply(){if(!grid){notice('No grid available','error');return;}if(grid.modelId!==canonical($('prodSpecies').value)){notice('Grid species/stage does not match live calculator','error');return;}
 try{metadataToGrid();const result=M.interpolateGrid(grid,contextNow());
  updating=true;for(let i=0;i<result.targets.length;i++){
   const t=result.targets[i],el=$(`prodTargets`).querySelector(`[data-t="${i}"][data-field="value"]`),basis=$('prodTargets').querySelector(`[data-t="${i}"][data-field="basis"]`),mode=$('prodTargets').querySelector(`[data-t="${i}"][data-field="mode"]`);
   if(!el||!basis||!mode)throw Error('Live target table not ready for this species');
   el.value=String(t.value);mode.value=t.mode;basis.value='dm';
   el.dispatchEvent(new Event('input',{bubbles:true}));mode.dispatchEvent(new Event('change',{bubbles:true}));basis.dispatchEvent(new Event('change',{bubbles:true}));
  }
  $('prodReviewer').value=grid.reviewer;
  $('prodEvidence').value=grid.reviewEvidence;
  $('prodRequirementSource').value=`${grid.sourceReference} | Grid ${grid.id}, rev ${grid.revision}`;
  $('prodRequirementRights').value=grid.rightsProof;
  $('prodAttest').checked=false;
  applied=true;computed=result;renderPrediction(result);
  notice('Applied '+result.targets.length+' interpolated concentrations to the live target table. You must still supply real ingredients, local prices, and personally attest to the evidence. No feeding approval is implied.','success');
 }catch(e){notice('Cannot apply grid: '+e.message,'error');}finally{updating=false;}
}
function invalidate(reason){if(!applied||updating)return;applied=false;computed=null;
 // Changing animal circumstances invalidates automatic values: clear the previously derived values.
 for(const el of $('prodTargets').querySelectorAll('[data-field="value"]')){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));}
 $('reqResults').innerHTML='';notice(reason+' Automatically derived targets were cleared; estimate again.','warning');}
function csvProof(){const blob=new Blob([JSON.stringify(grid,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`RationWise_v1.7_reference_grid_${canonical($('prodSpecies').value)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function importGridFile(file){if(!file)return;if(file.size>250000){notice('Maximum grid file size is 250 KB','error');return;}
 file.text().then(t=>{const doc=JSON.parse(t);if(doc.modelId!==canonical($('prodSpecies').value))throw Error('Import denied: reference grid model does not match selected animal/stage');
 const errs=M.validateGrid(doc).filter(e=>!e.startsWith('Point ')); // Allow incomplete numerical records only in draft editor.
 if(errs.length&&doc.dataStatus==='externally_reviewed')throw Error(errs.join('; '));
 if(!Array.isArray(doc.axes)||doc.axes.length<1||doc.axes.length>2||doc.axes.some(a=>!M.MODEL_AXES[doc.modelId].includes(a))||!Array.isArray(doc.points)||doc.points.length>100)throw Error('Invalid reference grid shape');
 invalidate('Reference grid imported.');grid=structuredClone(doc);$('reqAxis1').value=grid.axes[0];$('reqAxis2').innerHTML='<option value="">No second axis · 1D interpolation</option>'+M.MODEL_AXES[doc.modelId].filter(x=>x!==grid.axes[0]).map(k=>`<option value="${k}">${esc(M.AXES[k].label)}</option>`).join('');$('reqAxis2').value=grid.axes[1]||'';displayContext();metadataFromGrid();computed=null;applied=false;renderGrid();$('reqResults').innerHTML='';notice('Imported reference-grid data. Inspect all source, unit, animal, and rights fields before preview/apply.','success');
 }).catch(e=>notice('Import failed: '+e.message,'error'));}
function exportState(){return {grid,context:contextNow(),lastApplied:applied};}
function importState(state){if(!state||!state.grid)return;const g=state.grid;if(g.modelId!==canonical($('prodSpecies').value))return;
 grid=structuredClone(g);if(!Array.isArray(grid.axes)||grid.axes.length<1||grid.axes.length>2||!grid.axes.every(a=>M.MODEL_AXES[g.modelId].includes(a)))return;
 $('reqAxis1').value=grid.axes[0];$('reqAxis2').innerHTML='<option value="">No second axis · 1D interpolation</option>'+M.MODEL_AXES[g.modelId].filter(x=>x!==grid.axes[0]).map(k=>`<option value="${k}">${esc(M.AXES[k].label)}</option>`).join('');$('reqAxis2').value=grid.axes[1]||'';displayContext();metadataFromGrid();renderGrid();
 for(const [key,val] of Object.entries(state.context||{})){const field=$('reqContexts').querySelector(`input[data-axis="${key}"]`);if(field)field.value=val;}
 applied=false;computed=null;if(state.lastApplied){for(const el of $('prodTargets').querySelectorAll('[data-field="value"]')){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));}}notice('Reference grid restored from workspace; recalculate the estimated requirements before applying.');
}
$('prodSpecies').addEventListener('change',()=>{grid=null;computed=null;applied=false;for(const id of Object.keys(metadata))$(id).value=id==='reqRights'?'unknown':id==='reqReviewState'?'draft':id==='reqMethod'?'Piecewise-linear interpolation between source-backed requirement anchor points':'';displayAxis();renderGrid();$('reqResults').innerHTML='';notice('Select physiological axes, then create or import a stage-matched grid.');});
$('reqAxis1').addEventListener('change',()=>{invalidate('Physiological axis changed.');displayAxis();if(grid){grid=null;applied=false;renderGrid();notice('Axis changed. Create a new grid or import an existing grid.');}});
$('reqAxis2').addEventListener('change',()=>{invalidate('Physiological axis changed.');displayContext();if(grid){grid=null;applied=false;renderGrid();notice('Axis changed. Create a new grid or import an existing grid.');}});
$('reqContexts').addEventListener('input',()=>invalidate('Animal context changed.'));
$('prodTargets').addEventListener('input',e=>{if(e.target.dataset?.t!==undefined&&!updating&&applied){applied=false;notice('A target was edited manually after estimation. This target set no longer matches the imported source grid.','warning');}});
$('reqCreate').addEventListener('click',createBlank);
$('reqGrid').addEventListener('input',e=>{const p=e.target.dataset.point;if(p===undefined||!grid)return;const i=Number(p),n=e.target.value.trim()===''?null:Number(e.target.value);invalidate('A reference-grid anchor was edited.');if(e.target.dataset.axisValue)grid.points[i].coordinates[e.target.dataset.axisValue]=n;else if(e.target.dataset.nutrient)grid.points[i].targets[e.target.dataset.nutrient]=n;computed=null;applied=false;});
for(const id of Object.keys(metadata))$(id).addEventListener('change',()=>{if(grid){invalidate('Reference-grid evidence changed.');metadataToGrid();computed=null;applied=false;}});
$('reqPreview').addEventListener('click',preview);$('reqApply').addEventListener('click',apply);
$('reqDownload').addEventListener('click',()=>{if(!grid){notice('Create a grid first','error');return;}metadataToGrid();csvProof();});
$('reqImport').addEventListener('change',e=>{importGridFile(e.target.files?.[0]);e.target.value='';});
window.RationRequirementUI17={exportState,importState};displayAxis();renderGrid();notice('No nutrient requirement numbers are bundled. Use your own source-backed anchor records.');
})();
