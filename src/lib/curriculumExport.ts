import type{CurriculumExportActivityInput,CurriculumExportActivityRole,CurriculumExportInput,CurriculumExportWarning,CurriculumModuleExport}from'../types/curriculumExport';

const isCoreChallenge=(activity:CurriculumExportActivityInput)=>activity.required&&activity.xp_type==='core'||activity.xp_type==='core'&&activity.xp_reward>0&&['performance','assignment','quiz'].includes(activity.activity_type);
const isPractice=(activity:CurriculumExportActivityInput)=>activity.activity_type==='practice'||!activity.required&&activity.xp_type!=='core';
export const classifyCurriculumActivity=(activity:CurriculumExportActivityInput):CurriculumExportActivityRole=>isCoreChallenge(activity)?'core_challenge':isPractice(activity)?'practice':'other';

function rubricTotal(rubric:unknown):number|null{
  if(!rubric||typeof rubric!=='object')return null;
  const source=(rubric as{criteria?:unknown}).criteria;
  const criteria=Array.isArray(source)?source:Array.isArray(rubric)?rubric:null;
  if(!criteria?.length)return null;
  const weights=criteria.map(item=>item&&typeof item==='object'?Number((item as Record<string,unknown>).weight??(item as Record<string,unknown>).percentage):NaN);
  return weights.every(Number.isFinite)?weights.reduce((sum,value)=>sum+value,0):null;
}
const withId=(include:boolean,id:string)=>include?{database_id:id}:{};
const orderedObject=<T>(value:T):T=>value;

export function buildModuleCurriculumExport(input:CurriculumExportInput,includeDatabaseIds=false,exportedAt=new Date().toISOString()):CurriculumModuleExport{
  const activities=input.activities.map(activity=>({activity,role:classifyCurriculumActivity(activity)}));
  const core=activities.filter(item=>item.role==='core_challenge');
  const practice=activities.filter(item=>item.role==='practice');
  const warnings:CurriculumExportWarning[]=[];
  const xp=[input.module.intro_core_xp,input.module.video_core_xp,input.module.assignment_core_xp,input.module.mastery_core_xp,input.module.core_xp,input.module.core_unlock_threshold];
  if(xp.some(value=>!Number.isFinite(value)))warnings.push({code:'MISSING_XP_COMPONENTS',message:'One or more locked JPAC XP components are missing.'});
  if(core.length===0)warnings.push({code:'MISSING_CORE_CHALLENGE',message:'No Core Challenge candidate was found.'});
  if(core.length>1)warnings.push({code:'MULTIPLE_CORE_CHALLENGES',message:'More than one Core Challenge candidate was found.'});
  if(practice.length===0)warnings.push({code:'MISSING_PRACTICE',message:'No practice activity was found.'});
  core.forEach(({activity})=>{const total=rubricTotal(activity.rubric);if(total!==null&&total!==100)warnings.push({code:'RUBRIC_TOTAL_INVALID',message:`${activity.title} rubric totals ${total}, not 100.`})});
  if(!input.media.some(item=>item.status==='active'))warnings.push({code:'MEDIA_NEEDS_REVIEW',message:'No active approved instructional media is configured.'});
  if(!input.tool||input.tool.status!=='ready')warnings.push({code:'TOOL_NEEDS_CATALOG_REVIEW',message:'The module tool is missing or not catalog-ready.'});
  warnings.push({code:'CAREER_ATTACHMENTS_NOT_CONFIGURED',message:'Career Path attachments are not configured in Curriculum Export v1.'});
  const exportActivity=({activity,role}:{activity:CurriculumExportActivityInput;role:CurriculumExportActivityRole})=>orderedObject({
    ...withId(includeDatabaseIds,activity.id),role,title:activity.title,description:activity.description,instructions:activity.instructions,
    activity_type:activity.activity_type,submission_type:activity.submission_type,status:activity.status,required:activity.required,
    xp_reward:activity.xp_reward,xp_type:activity.xp_type,passing_score:activity.passing_score,
    allows_resubmission:activity.allows_resubmission,portfolio_candidate:activity.portfolio_candidate,rubric:activity.rubric
  });
  const mediaVersions=[...input.media].sort((a,b)=>a.version_number-b.version_number).map(item=>({
    ...withId(includeDatabaseIds,item.id),version_number:item.version_number,provider:item.provider,provider_media_id:item.provider_media_id,
    source_url:item.source_url,normalized_url:item.normalized_url,title:item.title,duration_seconds:item.duration_seconds,status:item.status,
    created_at:item.created_at,activated_at:item.activated_at,retired_at:item.retired_at,
    ...(includeDatabaseIds?{replaces_media_id:item.replaces_media_id}:{})
  }));
  const level=input.level,module=input.module,course=input.course;
  return orderedObject({
    contract:'jpac-curriculum-export',contract_version:'1.0.0',exported_at:exportedAt,
    export_scope:{type:'module',course_slug:course.slug,level_number:level.level_number,module_number:module.level_module_number},
    options:{include_database_ids:includeDatabaseIds},warnings,
    course:{...withId(includeDatabaseIds,course.id),course_slug:course.slug,title:course.title,description:course.description,status:course.status},
    level:{...withId(includeDatabaseIds,level.id),level_number:level.level_number,title:level.title,status:level.status},
    module:{...withId(includeDatabaseIds,module.id),module_number:module.level_module_number,sort_order:module.sort_order,title:module.title,
      description:module.description,status:module.status,mission:{short_intro:module.short_intro,career_connection:module.career_connection,
        real_world_activity:module.real_world_activity,
        aria_coaching_targets:module.aria_coaching_targets,career_mission_ideas:module.career_mission_ideas,
        portfolio_moment:module.portfolio_moment,portfolio_ready_threshold:module.portfolio_ready_threshold,review_notes:module.review_notes},
      xp:{intro:module.intro_core_xp,instructional_media:module.video_core_xp,core_challenge:module.assignment_core_xp,
        mastery:module.mastery_core_xp,module_total:module.core_xp,unlock_threshold:module.core_unlock_threshold,
        passing_score:core[0]?.activity.passing_score??null},
      lessons:[...input.lessons].sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title)).map(lesson=>({
        ...withId(includeDatabaseIds,lesson.id),sort_order:lesson.sort_order,title:lesson.title,description:lesson.description,status:lesson.status,
        duration_minutes:lesson.duration_minutes,short_summary:lesson.short_summary,learning_objective:lesson.learning_objective,
        content_blocks:lesson.content_blocks,technique_cues:lesson.technique_cues,common_mistakes:lesson.common_mistakes,
        self_check:lesson.self_check,resource_url:lesson.wix_lesson_url})),
      activities:{practice:practice.map(exportActivity),core_challenge:core.map(exportActivity),other:activities.filter(item=>item.role==='other').map(exportActivity)},
      media:{review_status:input.media.some(item=>item.status==='active')?'VALID_CANDIDATE':'NEEDS_REVIEW',
        legacy_projection:{url:module.primary_video_url,provider:module.video_provider,title:module.video_title,
          duration_seconds:module.video_duration_seconds,brief:module.video_brief},versions:mediaVersions},
      tool:{review_status:input.tool?.status==='ready'?'READY':'NEEDS_CATALOG_REVIEW',
        activity_configuration:module.jpac_tool_activity,catalog_reference:input.tool?{
          ...withId(includeDatabaseIds,input.tool.id),slug:input.tool.slug??null,name:input.tool.name,status:input.tool.status,
          tool_type:input.tool.tool_type,launch_url:input.tool.launch_url}:null},
      career_path_attachments:{status:'NOT_CONFIGURED',items:[]}
    }
  });
}

export const serializeCurriculumExport=(value:CurriculumModuleExport)=>JSON.stringify(value,null,2)+'\n';
export const curriculumExportFilename=(value:CurriculumModuleExport)=>`jpac-${value.export_scope.course_slug}-level-${value.export_scope.level_number}-module-${value.export_scope.module_number}-v${value.contract_version}.json`;
export async function copyCurriculumExport(text:string){await navigator.clipboard.writeText(text)}
export function downloadCurriculumExport(filename:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url)}
