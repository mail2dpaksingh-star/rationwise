/* RationWise: unit-aware transfer of supplied worksheet ingredient compositions.
   Conversion is mathematics only, not lab verification, data licensing, or feeding approval. */
(function(root){'use strict';
const kcalToMJ=0.004184;
const ruminantSheet='Feed composition for ruminants';
function sourceGroup(rec){
 if(rec.sheet===ruminantSheet||rec.sheet==='composition of trees for goats')return 'ruminant';
 if(rec.sheet==='feed and their composition')return 'poultry_swine';
 if(rec.sheet==='feed composition')return 'fish';
 return null;
}
function applicable(rec,group){const g=sourceGroup(rec);return g===group||(g==='poultry_swine'&&(group==='poultry'||group==='swine'));}
function declaredBasis(rec){return rec.sheet===ruminantSheet&&rec.workbook==='Feeding standards for ruminants.xlsx'?'dm':null;}
function sourceDM(rec){const field=(rec.measurements||[]).find(m=>/^dm\s*%?$/.test(String(m.metric||'').trim().toLowerCase()));return field&&Number.isFinite(field.numeric)&&field.numeric>0&&field.numeric<=100?field.numeric:null;}
function convert(rec,{group,basis,dmPct,allowCommon=false}={}){
 if(!rec||!Array.isArray(rec.measurements))throw Error('Choose a source ingredient.');
 const crossGroup=!applicable(rec,group);
 if(crossGroup&&!allowCommon)throw Error('This ingredient table does not describe the chosen animal group. Select the appropriate animal before adding it.');
 const confirmed=declaredBasis(rec);
 if(confirmed&&basis&&basis!==confirmed)throw Error('This source expressly states dry-matter basis. Do not change it to as-fed.');
 const selectedBasis=confirmed||basis;
 if(!['dm','as_fed'].includes(selectedBasis))throw Error('Choose whether the source values are on a dry-matter or as-fed basis.');
 const d=sourceDM(rec)??Number(dmPct);
 if(!(d>0&&d<=100))throw Error('Enter the ingredient dry matter (0–100%) before adding nutrient values.');
 const percentFactor=selectedBasis==='as_fed'?100/d:1;
 const main={},expanded={},transferred=[];
 const set=(name,legacy,extended,val,kind='pct')=>{
  if(!Number.isFinite(val)||val<0)return;
  const x=val*(kind==='energy'?kcalToMJ:1)*percentFactor;
  if(!Number.isFinite(x)||x<0||x>(kind==='energy'?60:100))return;
  if(legacy)main[legacy]=x;
  for(const key of (extended||[]))expanded[key]=x;
  transferred.push(name);
 };
 for(const field of rec.measurements){
  const key=String(field.metric||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/phosphorous/g,'phosphorus');
  const val=field.numeric;if(!Number.isFinite(val))continue;
  if(/^dm\s*%?$/.test(key))continue;
  // For a different animal group, only general chemical composition is transferable.
  // Published energy systems, TDN, digestibility and availability are species/model-specific.
  if(crossGroup&&!(/^(?:cp|cf|ee|ca|p)\s*%?$/.test(key)))continue;
  if(/^cp\s*%?$/.test(key))set('Crude protein','cp',['crude_protein'],val);
  else if(/^cf\s*%?$/.test(key))set('Crude fiber','fiber',['crude_fiber'],val);
  else if(/^ndf\s*%?$/.test(key)&&group==='ruminant')set('NDF','ndf',['ndf_ruminant'],val);
  else if(/^ee\s*%?$/.test(key))set('Fat / ether extract','fat',['fat'],val);
  else if(/^ca\s*%?$/.test(key))set('Calcium','ca',['calcium'],val);
  else if(/^p\s*%?$/.test(key))set('Total phosphorus','p',['total_phosphorus'],val);
  else if(/^tdn\s*%?$/.test(key)&&group==='ruminant')set('TDN',null,['tdn_ruminant'],val);
  else if(/^me\s*\(kcal\/kg\)/.test(key)){
    const legacy=group==='ruminant'?'meRuminant':group==='poultry'?'me':null;
    const ex=group==='ruminant'?['me_ruminant']:group==='poultry'?['me_poultry_chicken','me_poultry_turkey','me_poultry_duck','me_poultry_goose','me_poultry_quail']:group==='swine'?['me_swine']:[];
    set('Metabolizable energy',legacy,ex,val,'energy');
  }
  else if(/^amen\s*\(kcal\/kg\)/.test(key)&&group==='poultry')set('AMEn',null,['ame_n_poultry_chicken','ame_n_poultry_turkey','ame_n_poultry_duck','ame_n_poultry_goose','ame_n_poultry_quail'],val,'energy');
  else if(/^de\s*\(kcal\/kg\)/.test(key)&&group==='fish')set('Digestible energy','deFish',['de_fish_fish'],val,'energy');
  else if(/^available p\s*%$/.test(key)){
   const legacy=group==='poultry'?'availP':group==='fish'?'availPFish':null;
   set('Available phosphorus',legacy,group==='fish'?['available_phosphorus_fish']:group==='poultry'?['available_phosphorus_chicken','available_phosphorus_turkey','available_phosphorus_duck','available_phosphorus_goose','available_phosphorus_quail']:[],val);
  }
  else if(/^(?:lys|meth|meth\s*\+\s*cyst|arg|tryp|thr)\s*%$/.test(key)){
   // Source labels do not claim digestibility, so NEVER fill SID/digestible AA fields.
   const names={'lys':'lysine','meth':'methionine','meth + cyst':'met_cys','arg':'arginine','tryp':'tryptophan','thr':'threonine'};
   const stem=key.replace(/\s*%$/,'').trim().replace(/\s+/g,' '),aa=names[stem];
   if(aa)set('Total '+aa,null,['total_'+aa+'_'+(group==='poultry'?'chicken':group==='fish'?'fish':'pig')],val);
  }
  else if(/^18:2/.test(key))set('Linoleic acid',null,['linoleic_acid'],val);
  // RDP/RUP are percentages of crude protein, NOT dietary % DM; not copied as nutrient concentrations.
  // ADF, ash, NFC, etc remain visible in source table but do not match current optimizer constraints.
 }
 return {name:rec.name,dmPct:d,basis:selectedBasis,group,main,expanded,transferred,scope:crossGroup?'shared_composition':'matched_animal',
   source:{id:rec.id,workbook:rec.workbook,sheet:rec.sheet,row:rec.row,rights:'not confirmed',review:'not independently verified'}};
}
function prepare(rec,{group,basis,dmPct}={}){
 if(!rec||!Array.isArray(rec.measurements))throw Error('Choose a source ingredient.');
 const explicit=declaredBasis(rec);
 if(explicit&&basis&&basis!==explicit)throw Error('The source expressly states dry-matter basis.');
 if(basis&&!['dm','as_fed'].includes(basis))throw Error('Choose dry-matter or as-fed source basis.');
 const resolvedBasis=explicit||basis;
 const source=sourceDM(rec);
 const d=source??(dmPct===''||dmPct==null?null:Number(dmPct));
 if(dmPct!=null&&dmPct!==''&&!Number.isFinite(Number(dmPct)))throw Error('Dry matter must be a number.');
 if(d!==null&&!(d>0&&d<=100))throw Error('Dry matter must be greater than 0 and at most 100%.');
 if(!resolvedBasis||d===null){
   return {name:rec.name,dmPct:d,basis:resolvedBasis||null,group,main:{},expanded:{},transferred:[],
     scope:applicable(rec,group)?'matched_animal':'shared_composition',
     missing:[...(!resolvedBasis?['source basis']:[]),...(d===null?['dry matter']:[])],
     source:{id:rec.id,workbook:rec.workbook,sheet:rec.sheet,row:rec.row,rights:'not confirmed',review:'not independently verified'}};
 }
 return {...convert(rec,{group,basis:resolvedBasis,dmPct:d,allowCommon:true}),missing:[]};
}
const api={convert,prepare,declaredBasis,sourceDM,applicable,sourceGroup,kcalToMJ};root.RationWorkbookIngredientTransfer=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
