/* RationWise v1.7 scientifically governed, operator-supplied reference-grid interpolation.
 * This module contains NO published feed requirement values and NO feeding recommendations.
 * A reference grid is only a mathematical interpolation between supplied, documented anchors.
 */
(function(root){'use strict';
const Stages=(typeof module!=='undefined'&&module.exports)?require('./stages'):root.RationStages;
const Science=(typeof module!=='undefined'&&module.exports)?require('./science2'):root.RationScience2;
const MODEL_AXES=Object.freeze({
 cattle_dairy:['bodyWeightKg','milkKgPerDay','daysInMilk'], buffalo_dairy:['bodyWeightKg','milkKgPerDay','daysInMilk'],
 cattle_gestation:['bodyWeightKg','gestationDay'],buffalo_gestation:['bodyWeightKg','gestationDay'],
 chicken_broiler:['bodyWeightKg','ageDays'],chicken_broiler_starter:['bodyWeightKg','ageDays'],chicken_broiler_finisher:['bodyWeightKg','ageDays'],
 chicken_layer:['bodyWeightKg','eggMassGPerDay','ageWeeks'],
 pig_grower:['bodyWeightKg','dailyGainG'],pig_finisher:['bodyWeightKg','dailyGainG'],
 pig_gestation:['bodyWeightKg','gestationDay'],pig_lactation:['bodyWeightKg','litterSize','lactationDay']
});
const AXES=Object.freeze({
 bodyWeightKg:{label:'Body weight',unit:'kg',min:0.001,max:3000},
 milkKgPerDay:{label:'Milk yield',unit:'kg/day',min:0,max:150},
 daysInMilk:{label:'Days in milk',unit:'days',min:0,max:700},
 gestationDay:{label:'Gestation day',unit:'day',min:0,max:700},
 ageDays:{label:'Age',unit:'days',min:0,max:4000},
 ageWeeks:{label:'Age',unit:'weeks',min:0,max:600},
 eggMassGPerDay:{label:'Egg mass output',unit:'g/day',min:0,max:150},
 dailyGainG:{label:'Daily live-weight gain',unit:'g/day',min:0,max:3000},
 litterSize:{label:'Nursing litter size',unit:'piglets',min:0,max:30},
 lactationDay:{label:'Lactation day',unit:'day',min:0,max:120}
});
const RIGHTS=['commercial_permitted','restricted','unknown'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const goodString=(s)=>typeof s==='string'&&s.trim().length>0&&s.length<=500;
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const str=(s)=>String(s??'');
function knownModel(modelId){return own(MODEL_AXES,modelId);}
function makeTemplate(modelId,axisKeys){
 if(!knownModel(modelId))throw Error('Automatic estimates are not implemented for this stage');
 const stage=Stages.STAGES[modelId];
 if(!Array.isArray(axisKeys)||axisKeys.length<1||axisKeys.length>2||new Set(axisKeys).size!==axisKeys.length||axisKeys.some(k=>!MODEL_AXES[modelId].includes(k)))throw Error('Choose one or two supported physiological axes');
 const coords=(axisKeys.length===2?[[null,null],[null,null],[null,null],[null,null]]:[[null],[null]]);
 return {schema:'rationwise-requirement-grid-v1',id:'',revision:1,modelId,species:stage.species,stageName:stage.stage,
  dataStatus:'draft',sourceReference:'',methodDescription:'',countryOrPopulation:'',reviewer:'',reviewEvidence:'',rightsStatus:'unknown',rightsProof:'',
  concentrationBasis:'dry_matter',axes:axisKeys.slice(),points:coords.map(values=>({coordinates:Object.fromEntries(axisKeys.map((k,i)=>[k,values[i]])),targets:Object.fromEntries(stage.keys.map(k=>[k,null]))})),
  comment:'Enter independently established nutrient concentrations for each anchor point. Empty numeric values are rejected.'};
}
function validateGrid(grid){
 const e=[];if(!grid||typeof grid!=='object')return ['Requirement grid must be an object'];
 if(grid.schema!=='rationwise-requirement-grid-v1')e.push('Unsupported reference-grid schema');
 if(!knownModel(grid.modelId))return [...e,'Unsupported species and stage for this estimator'];
 const model=Stages.STAGES[grid.modelId];
 if(grid.species!==model.species)e.push('Species does not match selected stage');
 if(!goodString(grid.id))e.push('Named grid ID required');
 if(!Number.isInteger(grid.revision)||grid.revision<1)e.push('Positive grid revision required');
 if(!['draft','externally_reviewed'].includes(grid.dataStatus))e.push('Only draft or externally_reviewed states permitted');
 if(!goodString(grid.sourceReference)||!goodString(grid.methodDescription))e.push('Scientific source reference and interpolation methodology required');
 if(!goodString(grid.countryOrPopulation))e.push('Applicable population/breed/geography must be documented');
 if(!RIGHTS.includes(grid.rightsStatus))e.push('Data-rights status invalid');
 if(grid.dataStatus==='externally_reviewed'&&(!goodString(grid.reviewer)||!goodString(grid.reviewEvidence)))e.push('Externally reviewed grid requires reviewer identity and review evidence');
 if(grid.dataStatus==='externally_reviewed'&&grid.rightsStatus==='commercial_permitted'&&!goodString(grid.rightsProof))e.push('Externally reviewed calculation requires documented commercial data rights');
 if(grid.concentrationBasis!=='dry_matter')e.push('Grid target values must be concentrations on dry-matter basis');
 if(!Array.isArray(grid.axes)||grid.axes.length<1||grid.axes.length>2||new Set(grid.axes).size!==grid.axes.length||grid.axes.some(a=>!MODEL_AXES[grid.modelId].includes(a)))return [...e,'One or two different, model-compatible axes required'];
 if(!Array.isArray(grid.points)||grid.points.length<2||grid.points.length>100)return [...e,'Supply at least two and at most 100 reference points'];
 const coordinateTokens=new Set(),axisLevels=Object.fromEntries(grid.axes.map(a=>[a,new Set()]));
 for(let i=0;i<grid.points.length;i++){
  const p=grid.points[i];if(!p||typeof p!=='object'||!p.coordinates||!p.targets){e.push('Point '+(i+1)+' missing coordinates or targets');continue;}
  const coords=[];
  for(const axis of grid.axes){const v=p.coordinates[axis],spec=AXES[axis];if(!finite(v,spec.min,spec.max)){e.push('Point '+(i+1)+' has missing/out-of-range '+axis);continue;}coords.push(v);axisLevels[axis].add(v);}
  if(coords.length===grid.axes.length){const token=JSON.stringify(coords);if(coordinateTokens.has(token))e.push('Duplicate coordinate point '+token);coordinateTokens.add(token);}
  const targetKeys=Object.keys(p.targets);if(targetKeys.length!==model.keys.length||targetKeys.some(k=>!model.keys.includes(k)))e.push('Point '+(i+1)+' has missing/foreign nutrient keys');
  for(const k of model.keys){const nutrient=Science.NUTRIENTS[k],v=p.targets[k];if(!finite(v,0,nutrient?.kind==='energy'?60:100))e.push('Point '+(i+1)+' nutrient '+k+' missing/out of range');}
 }
 const counts=grid.axes.map(a=>axisLevels[a].size);
 if(counts.some(v=>v<2))e.push('Each selected axis needs at least two distinct anchor levels');
 const expected=counts.reduce((a,b)=>a*b,1);
 if(expected!==grid.points.length)e.push('Reference grid must be complete: expected '+expected+' cells for all selected axis levels; got '+grid.points.length);
 if(grid.points.length===expected&&coordinateTokens.size===expected){
  const lists=grid.axes.map(a=>[...axisLevels[a]].sort((x,y)=>x-y));
  for(const x of lists[0])for(const y of (lists[1]||[null]))if(!coordinateTokens.has(JSON.stringify(grid.axes.length===1?[x]:[x,y])))e.push('Missing reference grid cell '+x+(y===null?'':','+y));
 }
 return e;
}
function brackets(levels,value){
 if(value<levels[0]||value>levels[levels.length-1])throw Error('Input outside reviewed grid domain ('+levels[0]+'–'+levels.at(-1)+'); extrapolation is prohibited');
 for(let i=0;i<levels.length;i++)if(value===levels[i])return [[levels[i],1]];
 for(let i=1;i<levels.length;i++)if(value<levels[i]){
  const w=(value-levels[i-1])/(levels[i]-levels[i-1]);return [[levels[i-1],1-w],[levels[i],w]];
 }
 throw Error('Invalid interpolation value');
}
function interpolateGrid(grid,context,{allowDraftPreview=false}={}){
 const errs=validateGrid(grid);if(errs.length)throw Error(errs.join('; '));
 if(grid.dataStatus!=='externally_reviewed'&&!allowDraftPreview)throw Error('Draft/unreviewed grids can only be previewed, not applied to live-data targets');
 if(grid.rightsStatus!=='commercial_permitted'&&!allowDraftPreview)throw Error('Commercial data-use permission required before applying the grid');
 const byCoords=new Map(grid.points.map(p=>[JSON.stringify(grid.axes.map(a=>p.coordinates[a])),p]));
 const ranges={},axesWeights=[];
 for(const axis of grid.axes){const c=context?.[axis],spec=AXES[axis];if(!finite(c,spec.min,spec.max))throw Error(spec.label+' is required: '+spec.unit);
  const levels=[...new Set(grid.points.map(p=>p.coordinates[axis]))].sort((a,b)=>a-b);ranges[axis]=[levels[0],levels.at(-1)];
  try{axesWeights.push(brackets(levels,c));}catch(err){throw Error(spec.label+': '+err.message);}
 }
 const terms=[];for(const [x,wx] of axesWeights[0])for(const [y,wy] of (axesWeights[1]||[[null,1]])){
  const coords=grid.axes.length===1?[x]:[x,y],point=byCoords.get(JSON.stringify(coords));
  if(!point)throw Error('Reference grid has a missing interpolation corner');
  terms.push({coordinates:point.coordinates,weight:wx*wy,targets:point.targets});
 }
 const stage=Stages.STAGES[grid.modelId],targets=stage.keys.map((key,i)=>{
  const val=terms.reduce((sum,t)=>sum+t.weight*t.targets[key],0);
  const digits=Math.round(val*1e9)/1e9;
  return {key,mode:stage.directions[i],basis:'dm',value:digits};
 });
 return {modelId:grid.modelId,sourceReference:grid.sourceReference,sourceId:grid.id,revision:grid.revision,
  status:grid.dataStatus,licensed:grid.rightsStatus==='commercial_permitted',draftPreview:grid.dataStatus!=='externally_reviewed'||grid.rightsStatus!=='commercial_permitted',
  context:Object.fromEntries(grid.axes.map(a=>[a,context[a]])),ranges,terms:terms.map(t=>({coordinates:t.coordinates,weight:t.weight})),targets,
  warnings:['Interpolated targets are not independently authenticated by RationWise.','Concentration targets alone do not determine intake or complete ration adequacy.','No extrapolation outside recorded anchors.']};
}
const API=Object.freeze({AXES,MODEL_AXES,knownModel,makeTemplate,validateGrid,interpolateGrid});
root.RationRequirements17=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
