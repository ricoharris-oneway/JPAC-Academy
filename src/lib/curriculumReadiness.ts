export type ReadinessState='complete'|'pass'|'review'|'blocked'|'operational'|'not-checked';

export type CurriculumReadinessCategory={
  key:'structure'|'xp'|'draft_safety'|'media'|'tools'|'publication';
  title:string;
  label:string;
  state:ReadinessState;
  detail:string;
  complete?:number;
  total?:number;
};

type ReadinessModule={
  id:string;
  status:string;
  core_xp:number;
  intro_core_xp:number;
  video_core_xp:number;
  assignment_core_xp:number;
  mastery_core_xp:number;
  core_unlock_threshold:number;
  lab_tool_id:string|null;
  jpac_tool_activity:Record<string,unknown>;
};

type ReadinessLesson={module_id:string;status:string};
type ReadinessActivity={module_id:string|null;activity_type:string;required:boolean;status:string;xp_reward:number;xp_type:string;passing_score:number;rubric:unknown};
type ReadinessMedia={module_id:string;status:string};
type ReadinessTool={id:string;status:string;launch_url:string|null};

export type CurriculumReadinessInput={
  modules:ReadinessModule[];
  lessons:ReadinessLesson[];
  activities:ReadinessActivity[];
  media:ReadinessMedia[];
  tools:ReadinessTool[];
};

export type CurriculumReadinessResult={
  categories:CurriculumReadinessCategory[];
  publication:CurriculumReadinessCategory;
  accessLabel:'NOT CHECKED';
};

function rubricWeights(value:unknown):number[]{
  if(!value||typeof value!=='object')return[];
  const source=Array.isArray(value)?value:(value as{criteria?:unknown}).criteria;
  const criteria=Array.isArray(source)?source:source&&typeof source==='object'?Object.entries(source).map(([name,weight])=>({name,weight})):[];
  return criteria.map(item=>{
    if(!item||typeof item!=='object')return Number.NaN;
    const row=item as Record<string,unknown>;
    return Number(row.weight??row.percentage);
  });
}

function rubricIsComplete(value:unknown){
  const weights=rubricWeights(value);
  return weights.length>0&&weights.every(weight=>Number.isFinite(weight)&&weight>0)&&weights.reduce((sum,weight)=>sum+weight,0)===100;
}

export function buildCurriculumReadiness(input:CurriculumReadinessInput):CurriculumReadinessResult{
  const total=input.modules.length;
  const moduleIds=new Set(input.modules.map(module=>module.id));
  const lessons=input.lessons.filter(lesson=>moduleIds.has(lesson.module_id)&&lesson.status!=='archived');
  const activities=input.activities.filter(activity=>Boolean(activity.module_id&&moduleIds.has(activity.module_id))&&activity.status!=='archived');
  const media=input.media.filter(item=>moduleIds.has(item.module_id));

  const structureComplete=input.modules.filter(module=>{
    const moduleLessons=lessons.filter(lesson=>lesson.module_id===module.id);
    const moduleActivities=activities.filter(activity=>activity.module_id===module.id);
    const practice=moduleActivities.find(activity=>activity.activity_type==='practice'&&!activity.required);
    const challenge=moduleActivities.find(activity=>activity.required&&activity.xp_type==='core');
    return moduleLessons.length>0&&Boolean(practice)&&Boolean(challenge)&&rubricIsComplete(challenge?.rubric);
  }).length;

  const xpComplete=input.modules.filter(module=>{
    const challenge=activities.find(activity=>activity.module_id===module.id&&activity.required&&activity.xp_type==='core');
    return module.core_xp===625&&module.intro_core_xp===50&&module.video_core_xp===100&&module.assignment_core_xp===350&&module.mastery_core_xp===125&&module.core_unlock_threshold===438&&challenge?.xp_reward===350&&challenge.passing_score===70;
  }).length;

  const statuses=[...input.modules.map(item=>item.status),...lessons.map(item=>item.status),...activities.map(item=>item.status)];
  const allDraft=statuses.length>0&&statuses.every(status=>status==='draft');
  const allPublished=statuses.length>0&&statuses.every(status=>status==='published');
  const statusCategory:CurriculumReadinessCategory=allDraft
    ?{key:'draft_safety',title:'Draft safety',label:'DRAFT SAFE',state:'pass',detail:'All loaded records in this level are draft. Student access and enrollment are not checked by this screen.'}
    :allPublished
      ?{key:'draft_safety',title:'Status safety',label:'PUBLISHED / OPERATIONAL',state:'operational',detail:'All loaded records in this level are published. This screen does not change their operational state.'}
      :{key:'draft_safety',title:'Status safety',label:'MIXED STATUS — REVIEW',state:'review',detail:'The selected level contains mixed curriculum statuses. Review them before any publication action.'};

  const activeMediaModules=new Set(media.filter(item=>item.status==='active').map(item=>item.module_id));
  const mediaReady=total>0&&activeMediaModules.size===total;
  const mediaCategory:CurriculumReadinessCategory=mediaReady
    ?{key:'media',title:'Media',label:'READY',state:'complete',detail:`${activeMediaModules.size}/${total} modules have active approved instructional media.`,complete:activeMediaModules.size,total}
    :media.length>0
      ?{key:'media',title:'Media',label:'UNDER REVIEW',state:'review',detail:`${activeMediaModules.size}/${total} modules have active media; inactive media remains under review.`,complete:activeMediaModules.size,total}
      :{key:'media',title:'Media',label:'NEEDS REVIEW',state:'review',detail:'No active approved instructional media is loaded for this level.',complete:0,total};

  const readyToolModules=new Set(input.modules.filter(module=>{
    const tool=input.tools.find(item=>item.id===module.lab_tool_id);
    return Boolean(tool&&tool.status==='ready'&&tool.launch_url);
  }).map(module=>module.id));
  const configuredToolModules=new Set(input.modules.filter(module=>Boolean(module.lab_tool_id)||String(module.jpac_tool_activity?.review_status||'')!=='NEEDS CATALOG REVIEW').map(module=>module.id));
  const toolsReady=total>0&&readyToolModules.size===total;
  const toolCategory:CurriculumReadinessCategory=toolsReady
    ?{key:'tools',title:'Tools',label:'READY',state:'complete',detail:`${readyToolModules.size}/${total} modules have ready catalog tools.`,complete:readyToolModules.size,total}
    :configuredToolModules.size>0
      ?{key:'tools',title:'Tools',label:'CONFIGURED — INACTIVE',state:'review',detail:`${readyToolModules.size}/${total} modules have ready active tool mappings.`,complete:readyToolModules.size,total}
      :{key:'tools',title:'Tools',label:'NEEDS CATALOG REVIEW',state:'review',detail:'Tool references are unresolved or intentionally unbound.',complete:0,total};

  const structure:CurriculumReadinessCategory={key:'structure',title:'Structure',label:structureComplete===total&&total>0?'COMPLETE':'INCOMPLETE',state:structureComplete===total&&total>0?'complete':'blocked',detail:`${structureComplete}/${total} modules have lessons, an optional Practice, a required Core Challenge, and a valid 100-point rubric.`,complete:structureComplete,total};
  const xp:CurriculumReadinessCategory={key:'xp',title:'XP',label:xpComplete===total&&total>0?'COMPLETE':'REVIEW REQUIRED',state:xpComplete===total&&total>0?'complete':'blocked',detail:`${xpComplete}/${total} modules match the canonical 50/100/350/125/625 XP contract and 438 unlock threshold.`,complete:xpComplete,total};
  const teacherReviewed=total>0&&input.modules.every(module=>['approved','published'].includes(module.status));
  const alreadyOperational=allPublished;
  const publicationReady=alreadyOperational||(structureComplete===total&&xpComplete===total&&mediaReady&&toolsReady&&teacherReviewed&&total>0);
  const publication:CurriculumReadinessCategory=alreadyOperational
    ?{key:'publication',title:'Publication',label:'PUBLISHED / OPERATIONAL',state:'operational',detail:'This level is already published. Readiness reporting does not alter publication.'}
    :publicationReady
      ?{key:'publication',title:'Publication',label:'READY FOR CONTROLLED REVIEW',state:'complete',detail:'All tracked readiness categories pass. Publication still requires the authorized workflow.'}
      :{key:'publication',title:'Publication',label:'NOT READY',state:'blocked',detail:[structureComplete!==total?'structure':null,xpComplete!==total?'XP':null,!mediaReady?'media':null,!toolsReady?'tools':null,!teacherReviewed?'teacher review':null].filter(Boolean).join(', ')+' remain unresolved.'};

  return{categories:[structure,xp,statusCategory,mediaCategory,toolCategory,publication],publication,accessLabel:'NOT CHECKED'};
}
