/* RationWise continuous animal-to-formulation workflow and printer. No new nutrition assumptions. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const REGION_BY_CODE={"AD":"Europe","AE":"Middle East & West Asia","AF":"South Asia","AG":"Central America & Caribbean","AI":"Central America & Caribbean","AL":"Europe","AM":"Middle East & West Asia","AO":"Africa","AQ":"Other regions","AR":"South America","AS":"Oceania","AT":"Europe","AU":"Oceania","AW":"Central America & Caribbean","AX":"Europe","AZ":"Middle East & West Asia","BA":"Europe","BB":"Central America & Caribbean","BD":"South Asia","BE":"Europe","BF":"Africa","BG":"Europe","BH":"Middle East & West Asia","BI":"Africa","BJ":"Africa","BL":"Central America & Caribbean","BM":"North America","BN":"Southeast Asia","BO":"South America","BQ":"Central America & Caribbean","BR":"South America","BS":"Central America & Caribbean","BT":"South Asia","BV":"Other regions","BW":"Africa","BY":"Europe","BZ":"Central America & Caribbean","CA":"North America","CC":"Oceania","CD":"Africa","CF":"Africa","CG":"Africa","CH":"Europe","CI":"Africa","CK":"Oceania","CL":"South America","CM":"Africa","CN":"East Asia","CO":"South America","CR":"Central America & Caribbean","CU":"Central America & Caribbean","CV":"Africa","CW":"Central America & Caribbean","CX":"Oceania","CY":"Europe","CZ":"Europe","DE":"Europe","DJ":"Africa","DK":"Europe","DM":"Central America & Caribbean","DO":"Central America & Caribbean","DZ":"Africa","EC":"South America","EE":"Europe","EG":"Africa","EH":"Africa","ER":"Africa","ES":"Europe","ET":"Africa","FI":"Europe","FJ":"Oceania","FK":"South America","FM":"Oceania","FO":"Europe","FR":"Europe","GA":"Africa","GB":"Europe","GD":"Central America & Caribbean","GE":"Middle East & West Asia","GF":"South America","GG":"Europe","GH":"Africa","GI":"Europe","GL":"North America","GM":"Africa","GN":"Africa","GP":"Central America & Caribbean","GQ":"Africa","GR":"Europe","GS":"South America","GT":"Central America & Caribbean","GU":"Oceania","GW":"Africa","GY":"South America","HK":"East Asia","HM":"Other regions","HN":"Central America & Caribbean","HR":"Europe","HT":"Central America & Caribbean","HU":"Europe","ID":"Southeast Asia","IE":"Europe","IL":"Middle East & West Asia","IM":"Europe","IN":"South Asia","IO":"Africa","IQ":"Middle East & West Asia","IR":"South Asia","IS":"Europe","IT":"Europe","JE":"Europe","JM":"Central America & Caribbean","JO":"Middle East & West Asia","JP":"East Asia","KE":"Africa","KG":"Central Asia","KH":"Southeast Asia","KI":"Oceania","KM":"Africa","KN":"Central America & Caribbean","KP":"East Asia","KR":"East Asia","KW":"Middle East & West Asia","KY":"Central America & Caribbean","KZ":"Central Asia","LA":"Southeast Asia","LB":"Middle East & West Asia","LC":"Central America & Caribbean","LI":"Europe","LK":"South Asia","LR":"Africa","LS":"Africa","LT":"Europe","LU":"Europe","LV":"Europe","LY":"Africa","MA":"Africa","MC":"Europe","MD":"Europe","ME":"Europe","MF":"Central America & Caribbean","MG":"Africa","MH":"Oceania","MK":"Europe","ML":"Africa","MM":"Southeast Asia","MN":"East Asia","MO":"East Asia","MP":"Oceania","MQ":"Central America & Caribbean","MR":"Africa","MS":"Central America & Caribbean","MT":"Europe","MU":"Africa","MV":"South Asia","MW":"Africa","MX":"Central America & Caribbean","MY":"Southeast Asia","MZ":"Africa","NA":"Africa","NC":"Oceania","NE":"Africa","NF":"Oceania","NG":"Africa","NI":"Central America & Caribbean","NL":"Europe","NO":"Europe","NP":"South Asia","NR":"Oceania","NU":"Oceania","NZ":"Oceania","OM":"Middle East & West Asia","PA":"Central America & Caribbean","PE":"South America","PF":"Oceania","PG":"Oceania","PH":"Southeast Asia","PK":"South Asia","PL":"Europe","PM":"North America","PN":"Oceania","PR":"Central America & Caribbean","PS":"Middle East & West Asia","PT":"Europe","PW":"Oceania","PY":"South America","QA":"Middle East & West Asia","RE":"Africa","RO":"Europe","RS":"Europe","RU":"Europe","RW":"Africa","SA":"Middle East & West Asia","SB":"Oceania","SC":"Africa","SD":"Africa","SE":"Europe","SG":"Southeast Asia","SH":"Africa","SI":"Europe","SJ":"Europe","SK":"Europe","SL":"Africa","SM":"Europe","SN":"Africa","SO":"Africa","SR":"South America","SS":"Africa","ST":"Africa","SV":"Central America & Caribbean","SX":"Central America & Caribbean","SY":"Middle East & West Asia","SZ":"Africa","TC":"Central America & Caribbean","TD":"Africa","TF":"Other regions","TG":"Africa","TH":"Southeast Asia","TJ":"Central Asia","TK":"Oceania","TL":"Southeast Asia","TM":"Central Asia","TN":"Africa","TO":"Oceania","TR":"Middle East & West Asia","TT":"Central America & Caribbean","TV":"Oceania","TW":"East Asia","TZ":"Africa","UA":"Europe","UG":"Africa","UM":"Oceania","US":"North America","UY":"South America","UZ":"Central Asia","VA":"Europe","VC":"Central America & Caribbean","VE":"South America","VG":"Central America & Caribbean","VI":"Central America & Caribbean","VN":"Southeast Asia","VU":"Oceania","WF":"Oceania","WS":"Oceania","XK":"Europe","YE":"Middle East & West Asia","YT":"Africa","ZA":"Africa","ZM":"Africa","ZW":"Africa","ZZ":"Other regions"};
const REGIONS=['Africa','Central Asia','South Asia','Southeast Asia','East Asia','Middle East & West Asia','Europe','North America','Central America & Caribbean','South America','Oceania','Other regions'];
const select=$('rwRegionSelect'),country=$('prodCountry'),currency=$('prodCurrency'),species=$('prodSpecies'),batch=$('prodBatch'),out=$('prodOutput'),report=$('rwPrintReport');
if(!select||!country||!species||!batch||!out||!report)return;
const clean=s=>String(s??'').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3});
// Populate region groups, retaining the existing worldwide country and currency mapping.
select.innerHTML=REGIONS.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
function regionFor(code){return REGION_BY_CODE[code]||'Other regions';}
function constrainCountries(region){
 for(const opt of country.options){const visible=regionFor(opt.value)===region;opt.hidden=!visible;opt.disabled=!visible;}
}
function syncRegion(){const r=regionFor(country.value);select.value=r;constrainCountries(r);}
syncRegion();
select.addEventListener('change',()=>{
 const name=select.value;const old=country.value;
 // When changing regions, use the first listed country in the newly selected region.
 // This triggers the existing price-clearing/currency-setting safety behavior.
 constrainCountries(name);
 if(regionFor(old)!==name){const first=[...country.options].find(o=>!o.hidden);if(first){country.value=first.value;country.dispatchEvent(new Event('change',{bubbles:true}));}}
 draw();
});
country.addEventListener('change',()=>{syncRegion();draw();});
// Saved workspaces and transferred farm profiles may switch country programmatically.
$('g21Apply')?.addEventListener('click',()=>queueMicrotask(()=>{syncRegion();draw();}));
$('prodLoad')?.addEventListener('change',ev=>{const file=ev.target.files?.[0];if(!file)return;file.text().then(t=>{const p=JSON.parse(t);if(typeof p.country==='string'&&REGION_BY_CODE[p.country]){
 // The source loader can only select countries present in the select. Temporarily restore all choices.
 for(const o of country.options){o.hidden=false;o.disabled=false;}
 select.value=regionFor(p.country);
 setTimeout(()=>{syncRegion();draw();},180);
 }}).catch(()=>{});},true);
let lastStage=species.value;
function activeStageText(){return clean($('prodStage')?.value)||species.selectedOptions[0]?.textContent?.trim()||'Stage not selected';}
function currentRef(){const choice=$('rwExcelProfile'),value=choice?.value;if(!value)return '';
 const p=window.RationExcelStandards?.profiles?.find(p=>p.id===value);return p?.name||choice.selectedOptions?.[0]?.textContent||'';
}
function summaryHTML(){const kg=Number(batch.value), valid=Number.isFinite(kg)&&kg>0;
 const breed=clean($('prodBreed')?.value), age=clean($('prodAnimalContext')?.value), region=select.value, countryName=country.selectedOptions?.[0]?.textContent?.trim()||'Select country';
 const chosen=currentRef();
 return `<div><small>ANIMAL & STAGE</small><strong>${esc(activeStageText())}</strong>${breed?`<span>${esc(breed)}</span>`:''}</div>
 <div><small>BATCH SIZE</small><strong>${valid?`${fmt(kg)} kg as-fed`:'Enter a valid quantity'}</strong>${age?`<span>${esc(age)}</span>`:''}</div>
 <div><small>MARKET</small><strong>${esc(region)}</strong><span>${esc(countryName)} · ${esc(currency.value||'currency not selected')}</span></div>
 ${chosen?`<div class="rw-flow-source"><small>FEEDING STANDARD</small><strong>${esc(chosen)}</strong></div>`:''}`;
}
function draw(){const html=summaryHTML();$('rwFlowSummary').innerHTML=html;
 document.querySelectorAll('.rw-follow-context').forEach(el=>{el.innerHTML=html;});
}
// Source browser is filtered visually to the selected animal on entry into Step 2; no nutrient tables are auto-applied.
function stageGroup(){const id=species.value==='chicken'?'chicken_broiler':species.value==='pig'?'pig_grower':species.value;return window.RationStages?.STAGES?.[id]?.species||'';}
function matchBrowseGroup(){const grp=stageGroup();if(!grp)return;
 const active=$('rwExcelAnimalGrid')?.querySelector('.x25-animal.active');
 if($('rwExcelProfile')?.value)return;
 if(active?.dataset.animal===grp)return;
 $('rwExcelAnimalGrid')?.querySelector(`[data-animal="${grp}"]`)?.click();
}
for(const tab of document.querySelectorAll('[data-step], [data-next], [data-back]'))tab.addEventListener('click',()=>{
 const go=Number(tab.dataset.next||tab.dataset.back||tab.dataset.step);
 if(go===2)setTimeout(matchBrowseGroup,0);
 queueMicrotask(draw);
});
species.addEventListener('change',()=>{
 lastStage=species.value;
 const selected=$('rwExcelProfile'),ref=window.RationExcelStandards?.profiles?.find(p=>p.id===selected?.value);
 const id=species.value==='chicken'?'chicken_broiler':species.value==='pig'?'pig_grower':species.value;
 if(ref&&!ref.models?.includes(id)){selected.value='';selected.dispatchEvent(new Event('change',{bubbles:true}));}
 draw();
});
for(const id of ['prodBatch','prodBreed','prodAnimalContext','prodCurrency'])$(id)?.addEventListener('input',draw);
$('rwExcelProfile')?.addEventListener('change',draw);
$('rwExcelCards')?.addEventListener('click',()=>queueMicrotask(draw));
// Provide save and print controls in a consistent place instead of inserting
// them into the result only after optimization. A saved input workspace is not
// a validated formulation; printing is possible only for a successful result.
const printButton=$('rwPrintButton'),saveFormulaButton=$('rwSaveCalculated'),help=$('rwResultHelp');
const validResult=()=>Boolean(out.querySelector('.rw-complete-result')||(out.querySelector('.result-hero')&&out.querySelector('#prodExport')));
function refreshActions(){
 const ready=validResult();
 if(printButton){printButton.disabled=false;printButton.title=ready?'Print or save this calculated formulation as a PDF':'Calculate the current inputs and print the formulation if feasible';}
 if(saveFormulaButton){saveFormulaButton.disabled=!ready;saveFormulaButton.title=ready?'Download the calculated ingredient quantities and nutrient checks':'Calculate a feasible formulation first';}
 if(help){
  const issue=out.querySelector('.result-error');
  help.textContent=ready?'Calculation complete for '+fmt(Number(batch.value))+' kg as-fed. Save the ingredient quantities or print the formula below.'
   :issue?'Cannot print a formulation yet. '+issue.textContent.replace(/\s+/g,' ').trim()
   :'Print formulation will first calculate the current inputs. If anything is missing or infeasible, the result area will explain what needs attention. You can save inputs at any time.';
 }
}
function invalidateCalculatedResult(){
 if(validResult())out.innerHTML='<div class="result-empty">Inputs or batch size changed. Recalculate to update the ingredient quantities, costs and printable report.</div>';
 report.hidden=true;
 refreshActions();
}
function makePrintable(){
 if(!validResult())return;
 const result=out.querySelector('.rw-complete-result')||out;
 const r=result.cloneNode(true);
 r.querySelectorAll('button,.result-actions,.rw-complete-download,#rwPrintButton').forEach(e=>e.remove());
 const breed=clean($('prodBreed')?.value),context=clean($('prodAnimalContext')?.value);
 report.innerHTML=`<div class="rw-print-head"><h1>RationWise · Feed formulation</h1><p>Owned by Dr. Surya Bahadur Singh</p></div>
 <div class="rw-print-meta"><div><b>Animal / stage</b><span>${esc(activeStageText())}</span></div>
 <div><b>Breed / strain</b><span>${esc(breed||'Not specified')}</span></div>
 <div><b>Batch size</b><span>${esc(batch.value)} kg as-fed</span></div>
 <div><b>Region / country</b><span>${esc(select.value)} · ${esc(country.selectedOptions?.[0]?.textContent?.trim()||country.value)}</span></div>
 <div><b>Currency</b><span>${esc(currency.value)}</span></div>
 <div><b>Production notes</b><span>${esc(context||'Not specified')}</span></div>
 <div><b>Calculated on</b><span>${esc(new Date().toLocaleString())}</span></div>
 ${currentRef()?`<div><b>Feeding standard selected</b><span>${esc(currentRef())}</span></div>`:''}
 </div><div class="rw-print-results"></div><p class="rw-print-warning">Numerical formulation based on supplied standards and user-entered ingredient analyses. Not an independently verified feeding or feed-safety approval. Check nutritional suitability, contaminants and local requirements before feeding.</p>`;
 report.querySelector('.rw-print-results').appendChild(r);
}
function printNow(){
 // A visible print button should actually respond. Calculate synchronously from
 // the current inputs first, and print only if there is a genuine feasible result.
 if(!validResult()){
  const calculateButton=$('prodCalculate');
  if(!calculateButton){
   if(help)help.textContent='Calculation is unavailable. Reload the page and try again.';
   return;
  }
  calculateButton.click();
  if(!validResult()){
   const message=out.querySelector('.result-error')?.textContent?.replace(/\s+/g,' ').trim();
   if(help)help.textContent='Cannot print a formulation yet. '+(message||'Complete the required ingredient analyses, nutrient targets and prices, then try again.');
   if(out.scrollIntoView)out.scrollIntoView({behavior:'smooth',block:'nearest'});
   return;
  }
 }
 makePrintable();report.hidden=false;window.print();
}
function downloadCalculated(){
 if(!validResult())return;
 const calc=out.querySelector('#rwCompleteExport')||out.querySelector('#prodExport');
 if(calc){calc.click();return;}
}
printButton?.addEventListener('click',printNow);
saveFormulaButton?.addEventListener('click',downloadCalculated);
$('rwEditAnimal')?.addEventListener('click',()=>{
 const btn=document.querySelector('.rw25-progress-button[data-step="1"]');btn?.click();
 $('prodSpecies')?.focus();
});
// The batch size is editable in every step, rather than buried in Step 1.
// Recalculate after changing it: never print a previous solution under a new size.
batch.addEventListener('input',()=>{invalidateCalculatedResult();draw();});
batch.addEventListener('change',()=>{invalidateCalculatedResult();draw();});
for(const id of ['prodSpecies','prodPriceUnit','prodCurrency','prodCountry','rwExcelProfile'])
 $(id)?.addEventListener('change',invalidateCalculatedResult);
for(const id of ['prodIngredients','prodTargets','rwCompleteAnalysis']){
 const el=$(id);if(!el)continue;
 el.addEventListener('input',invalidateCalculatedResult);
 el.addEventListener('change',invalidateCalculatedResult);
}
const observer=new MutationObserver(refreshActions);
observer.observe(out,{childList:true,subtree:true});
window.addEventListener('afterprint',()=>{report.hidden=true;});
refreshActions();draw();
window.RationWiseWorkflow={regionFor,showSummary:draw,printReport:printNow,refreshActions};
})();
