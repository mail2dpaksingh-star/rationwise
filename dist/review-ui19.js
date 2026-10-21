/* RationWise v1.9 clinical-style scientific dossier record-keeping. Local only, unauthenticated. */
(()=>{'use strict';
const M=window.RationReview19,S=window.RationStages,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastPacket=null,lastAudit=null,imported=false,applying=false;
const stage=()=>M.canonical($('prodSpecies').value);
function say(text,type='info'){$('rv19Status').textContent=text;$('rv19Status').dataset.state=type;}
function makeFromForm(){const p=M.makePacket(stage());p.profileId=$('rv19Id').value.trim();p.revision=Number($('rv19Revision').value);
 p.population={breedOrStrain:$('prodBreed').value.trim()||$('rv19Breed').value.trim(),region:$('rv19Region').value.trim(),productionContext:$('prodAnimalContext').value.trim()||$('rv19Context').value.trim()};
 p.reference={citation:$('rv19Citation').value.trim(),tableOrPage:$('rv19Locator').value.trim(),derivationMethod:$('rv19Method').value.trim(),rightsStatus:$('rv19Rights').value,rightsProof:$('rv19RightsProof').value.trim()};
 const rows=[...$('prodTargets').querySelectorAll('tr')];
 p.targets.forEach((t,i)=>{const row=rows[i];if(!row)return;
  const val=row.querySelector('[data-field="value"]'),mode=row.querySelector('[data-field="mode"]'),basis=row.querySelector('[data-field="basis"]');
  t.value=val.value.trim()===''?null:Number(val.value);t.mode=mode.value;t.basis=basis.value;t.sourceLocator=$('rv19Locator').value.trim();});
 p.review={status:$('rv19ReviewStatus').value,reviewerName:$('rv19Reviewer').value.trim(),qualification:$('rv19Qualification').value.trim(),evidenceId:$('rv19Evidence').value.trim(),reviewedOn:$('rv19Date').value};
 for(const k of Object.keys(M.RISK_FIELDS)){p.safety[k]={status:$('rv19Safe_'+k).value,evidence:$('rv19Proof_'+k).value.trim()};}
 return p;
}
function render(){if(!lastAudit)return;
 const a=lastAudit;const clean=xs=>xs.map(x=>`<li>${esc(x)}</li>`).join('');
 $('rv19Audit').innerHTML=`<div class="rv19-stats"><span><b>${a.providedTargetCount} / ${a.stageFieldCount}</b><small>modeled targets entered</small></span><span><b>${a.errors.length}</b><small>data errors</small></span><span><b>${a.gaps.length}</b><small>evidence gaps</small></span></div>
 <p class="rv19-${a.canApply?'ok':'no'}"><strong>${a.canApply?'EVIDENCE RECORDED (UNAUTHENTICATED)':'REVIEW GAPS PRESENT'}</strong> · ${a.canApply?'This packet can populate matching calculation targets, but has no feeding approval.':'Resolve issues before this packet can populate calculation targets.'}</p>
 ${a.errors.length?`<details open><summary>Validation errors (${a.errors.length})</summary><ul>${clean(a.errors)}</ul></details>`:''}
 ${a.gaps.length?`<details open><summary>Missing evidence (${a.gaps.length})</summary><ul>${clean(a.gaps)}</ul></details>`:''}
 <details><summary>Scientific limitations (${a.warnings.length})</summary><ul>${clean(a.warnings)}</ul></details>
 <p class="prod-hint"><strong>Never feeding certified.</strong> Review claims are self-declared; RationWise has not checked identity, signatures, rights, full nutrient adequacy or country feed laws.</p>`;
 $('rv19Apply').disabled=!imported||!a.canApply;
}
function evaluate(){lastPacket=makeFromForm();lastAudit=M.assessPacket(lastPacket);imported=false;render();say('Profile audited for '+lastPacket.stageName+'. '+lastAudit.errors.length+' data error(s), '+lastAudit.gaps.length+' evidence gap(s).');}
function dl(name,body){const blob=new Blob([JSON.stringify(body,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function hydrate(p){$('rv19Id').value=p.profileId||'';$('rv19Revision').value=p.revision||1;$('rv19Breed').value=p.population?.breedOrStrain||'';$('rv19Region').value=p.population?.region||'';$('rv19Context').value=p.population?.productionContext||'';
 $('rv19Citation').value=p.reference?.citation||'';$('rv19Locator').value=p.reference?.tableOrPage||'';$('rv19Method').value=p.reference?.derivationMethod||'';$('rv19Rights').value=p.reference?.rightsStatus||'unknown';$('rv19RightsProof').value=p.reference?.rightsProof||'';
 $('rv19ReviewStatus').value=p.review?.status||'draft';$('rv19Reviewer').value=p.review?.reviewerName||'';$('rv19Qualification').value=p.review?.qualification||'';$('rv19Evidence').value=p.review?.evidenceId||'';$('rv19Date').value=p.review?.reviewedOn||'';
 for(const k of Object.keys(M.RISK_FIELDS)){$('rv19Safe_'+k).value=p.safety?.[k]?.status||'unassessed';$('rv19Proof_'+k).value=p.safety?.[k]?.evidence||'';}}
$('rv19SafetyRows').innerHTML=Object.entries(M.RISK_FIELDS).map(([k,label])=>`<div class="rv19-safety-item"><b>${esc(label)}</b><select id="rv19Safe_${k}"><option value="unassessed">Not assessed</option><option value="documented">Documented (operator claim)</option></select><input id="rv19Proof_${k}" placeholder="Evidence ID / report reference" aria-label="Evidence for ${esc(label)}"></div>`).join('');
$('rv19AuditBtn').addEventListener('click',evaluate);
$('rv19Download').addEventListener('click',()=>{if(!lastPacket){evaluate();}dl('RationWise_v1.9_'+stage()+'_review_dossier.json',{packet:lastPacket,audit:lastAudit,releaseStatement:'REVIEW WORKBENCH ONLY — NOT CERTIFIED OR FEEDING READY'});say('Review dossier exported. This does not authorize feeding or commercial sale.');});
$('rv19Blank').addEventListener('click',()=>{const p=M.makePacket(stage());dl('RationWise_v1.9_'+stage()+'_blank_profile.json',p);say('Blank, species-specific dossier downloaded with no nutrient values.');});
$('rv19Import').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;
 try{if(f.size>200000)throw Error('File exceeds 200 KB');const obj=JSON.parse(await f.text()),p=obj.packet||obj;
  if(p.modelId!==stage())throw Error('Profile stage '+String(p.modelId)+' does not match current '+stage()+'. Change species before import.');
  if(p.schema!==M.SCHEMA)throw Error('Unsupported dossier format');
  const a=M.assessPacket(p);if(a.errors.length)throw Error('Invalid dossier: '+a.errors.join('; '));
  lastPacket=structuredClone(p);lastAudit=a;imported=true;hydrate(p);render();say('Profile imported and audited. No nutrient targets have been changed yet. Review before applying.');
 }catch(err){lastPacket=null;lastAudit=null;imported=false;$('rv19Apply').disabled=true;$('rv19Audit').textContent='Import rejected; existing calculator targets unchanged.';say(err.message,'error');}});
$('rv19Apply').addEventListener('click',()=>{if(!lastPacket||!imported)return;
 applying=true;try{const targets=M.applyTargets(lastPacket,stage());const rows=[...$('prodTargets').querySelectorAll('tr')];
  if(rows.length!==targets.length)throw Error('Live nutrient table does not match this stage');
  targets.forEach((t,i)=>{const row=rows[i];for(const [field,val] of [['value',t.value],['mode',t.mode],['basis','dm']]){const el=row.querySelector('[data-field="'+field+'"]');el.value=String(val);el.dispatchEvent(new Event(field==='value'?'input':'change',{bubbles:true}));}});
  $('prodReviewer').value=lastPacket.review.reviewerName;$('prodEvidence').value=lastPacket.review.evidenceId;
  $('prodRequirementSource').value=lastPacket.reference.citation+' / '+lastPacket.reference.tableOrPage;
  $('prodRequirementRights').value=lastPacket.reference.rightsProof;
  $('prodAttest').checked=false;imported=false;$('rv19Apply').disabled=true;
  say('Eight stage-matched targets copied. Self-attestation remains unchecked. Feeding approval is NOT implied.','ok');
 }catch(err){say('Cannot apply: '+err.message,'error');}finally{applying=false;}});
$('prodSpecies').addEventListener('change',()=>{lastPacket=null;lastAudit=null;imported=false;$('rv19Audit').textContent='No packet audited. Nutrient targets remain independent of the scientific dossier.';$('rv19Apply').disabled=true;say('Animal/stage changed. Generate or import a matching dossier.');});
function invalidate(){if(applying)return;if(lastPacket||lastAudit){lastPacket=null;lastAudit=null;imported=false;$('rv19Apply').disabled=true;$('rv19Audit').textContent='Inputs have changed since the last audit. Run the audit again before exporting or importing.';say('Changes detected. Previous review-packet audit invalidated.');}}
$('rv19Forms').addEventListener('input',invalidate);
$('rv19Forms').addEventListener('change',invalidate);
$('prodTargets').addEventListener('input',invalidate);
$('prodTargets').addEventListener('change',invalidate);
for(const id of ['prodBreed','prodAnimalContext']){ $(id).addEventListener('input',invalidate);$(id).addEventListener('change',invalidate); }
$('rv19Audit').textContent='No scientific review dossier audited yet.';say('Choose an animal, enter nutrient targets, and generate a source-traceable dossier.');
})();
