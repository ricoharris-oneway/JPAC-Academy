export type ProgressScope='pilot-module'|'published-learning'|'syncing';
export type ProgressPresentation={barPercent:number|null;numericPercent:number|null;scope:ProgressScope;scopeLabel:string;wording:string;started:boolean};
export type ProgressPresentationInput={progress:number|null|undefined;courseSlug?:string|null;publishedModuleCount?:number|null;level?:number|null};

const levelSuffix=(level:number|null|undefined):string=>typeof level==='number'&&Number.isFinite(level)?` · Level ${level}`:'';

export function presentStudentProgress({progress,courseSlug,publishedModuleCount,level}:ProgressPresentationInput):ProgressPresentation{
  const numeric=progress===null||progress===undefined?Number.NaN:Number(progress);
  const known=Number.isFinite(numeric)&&publishedModuleCount!==0;
  if(!known)return{barPercent:null,numericPercent:null,scope:'syncing',scopeLabel:'Progress syncing',wording:`Progress syncing${levelSuffix(level)}`,started:false};
  const percent=Math.max(0,Math.min(100,numeric));
  const rounded=Math.round(percent);
  const pilotScope=courseSlug==='singing'&&publishedModuleCount===1;
  if(pilotScope)return{barPercent:percent,numericPercent:rounded,scope:'pilot-module',scopeLabel:'Published pilot module progress',wording:percent>=100?`Pilot module complete${levelSuffix(level)}`:`${rounded}% published pilot module progress${levelSuffix(level)}`,started:percent>0};
  return{barPercent:percent,numericPercent:rounded,scope:'published-learning',scopeLabel:'Published learning progress',wording:`${rounded}% published learning progress${levelSuffix(level)}`,started:percent>0};
}
