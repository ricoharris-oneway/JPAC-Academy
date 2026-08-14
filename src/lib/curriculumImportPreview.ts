import{CURRICULUM_IMPORT_MAX_BYTES}from'../types/curriculumImportPreview';
import type{CurriculumImportPreview,CurriculumImportPreviewResult,ImportPreviewActivity,ImportPreviewContext,ImportPreviewDecisionSummary,ImportPreviewFinding,ImportPreviewLevel,ImportPreviewModule,ImportPreviewStatus}from'../types/curriculumImportPreview';

type Row=Record<string,unknown>;
const object=(value:unknown):value is Row=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string'?value:'';
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
const error=(code:string,message:string):CurriculumImportPreviewResult=>({ok:false,findings:[{severity:'ERROR',code,message}]});
const activityGroups=(value:unknown):ImportPreviewActivity[]=>{
  if(!object(value))return[];
  return(['practice','core_challenge','other']as const).flatMap(role=>Array.isArray(value[role])?(value[role]as unknown[]).filter(object).map(item=>({role,title:text(item.title),activity_type:text(item.activity_type),status:text(item.status)})):[]);
};
const hasDatabaseId=(value:unknown):boolean=>object(value)?Object.entries(value).some(([key,item])=>key==='database_id'||hasDatabaseId(item)):Array.isArray(value)&&value.some(hasDatabaseId);
export function validateCurriculumImportFile(name:string,size:number):ImportPreviewFinding|null{
  if(!name.toLowerCase().endsWith('.json'))return{severity:'ERROR',code:'FILE_TYPE_UNSUPPORTED',message:'Choose a .json file.'};
  if(size>CURRICULUM_IMPORT_MAX_BYTES)return{severity:'ERROR',code:'FILE_TOO_LARGE',message:'The selected file exceeds the 10 MB preview limit.'};
  return null;
}
export function summarizeImportPreviewDecisions(preview:Pick<CurriculumImportPreview,'levels'|'counts'>):ImportPreviewDecisionSummary{
  const summary={would_reuse:0,would_create:0,possible_conflicts:0,course_mismatch:0,not_checked:0};
  preview.levels.flatMap(level=>level.modules).forEach(module=>{switch(module.comparison_status){case'WOULD_REUSE':summary.would_reuse++;break;case'WOULD_CREATE':summary.would_create++;break;case'POSSIBLE_CONFLICT':summary.possible_conflicts++;break;case'COURSE_MISMATCH':summary.course_mismatch++;break;default:summary.not_checked++}});
  const total=Object.values(summary).reduce((sum,value)=>sum+value,0);
  return{...summary,total,complete:total===preview.counts.modules};
}

function comparison(courseSlug:string,level:number,module:number,title:string,context:ImportPreviewContext):{status:ImportPreviewStatus;reason:string}{
  if(!context.selected_course_slug)return{status:'NOT_CHECKED',reason:'No selected course context is available.'};
  if(courseSlug!==context.selected_course_slug)return{status:'COURSE_MISMATCH',reason:`Imported course ${courseSlug} does not match selected course ${context.selected_course_slug}.`};
  const matches=context.modules.filter(item=>item.level_number===level&&item.module_number===module);
  if(matches.length===0)return{status:'WOULD_CREATE',reason:'No loaded module has this level and module number.'};
  if(matches.length>1)return{status:'POSSIBLE_CONFLICT',reason:'Multiple loaded modules share this semantic identity.'};
  return matches[0].title.trim()===title.trim()?{status:'WOULD_REUSE',reason:'Loaded module identity and title match. Full compatibility is not checked.'}:{status:'POSSIBLE_CONFLICT',reason:`Loaded module title is “${matches[0].title}”.`};
}

function normalizeModule(value:unknown,levelNumber:number,courseSlug:string,context:ImportPreviewContext,findings:ImportPreviewFinding[]):ImportPreviewModule|null{
  if(!object(value)){findings.push({severity:'ERROR',code:'MODULE_PAYLOAD_INVALID',message:'A module payload is not an object.',level_number:levelNumber});return null}
  const moduleNumber=number(value.module_number);if(moduleNumber===null){findings.push({severity:'ERROR',code:'MODULE_NUMBER_MISSING',message:'A module is missing its numeric module_number.',level_number:levelNumber});return null}
  if(!Array.isArray(value.lessons)){findings.push({severity:'ERROR',code:'LESSONS_ARRAY_INVALID',message:'Module lessons must be an array.',level_number:levelNumber,module_number:moduleNumber});return null}
  if(!object(value.activities)||!['practice','core_challenge','other'].every(key=>Array.isArray((value.activities as Row)[key]))){findings.push({severity:'ERROR',code:'ACTIVITIES_STRUCTURE_INVALID',message:'Module activities must contain practice, core_challenge, and other arrays.',level_number:levelNumber,module_number:moduleNumber});return null}
  const title=text(value.title);const match=comparison(courseSlug,levelNumber,moduleNumber,title,context);
  const media=object(value.media)?value.media:{};const tool=object(value.tool)?value.tool:{};const career=object(value.career_path_attachments)?value.career_path_attachments:{};
  return{level_number:levelNumber,module_number:moduleNumber,title,status:text(value.status),lessons:value.lessons.filter(object).map(item=>({sort_order:number(item.sort_order),title:text(item.title),objective:text(item.learning_objective)})),activities:activityGroups(value.activities),media_review_status:text(media.review_status)||'NOT_CHECKED',tool_review_status:text(tool.review_status)||'NOT_CHECKED',career_path_status:text(career.status)||'NOT_CHECKED',comparison_status:match.status,comparison_reason:match.reason};
}

export function parseCurriculumImportPreview(source:string,context:ImportPreviewContext):CurriculumImportPreviewResult{
  if(new TextEncoder().encode(source).byteLength>CURRICULUM_IMPORT_MAX_BYTES)return error('PASTE_TOO_LARGE','Curriculum JSON exceeds the 10 MB preview limit.');
  let parsed:unknown;try{parsed=JSON.parse(source)}catch{return error('INVALID_JSON','The supplied text is not valid JSON.')}
  if(!object(parsed))return error('TOP_LEVEL_OBJECT_REQUIRED','The curriculum export must be a top-level JSON object.');
  if(parsed.contract!=='jpac-curriculum-export')return error('UNSUPPORTED_CONTRACT','Contract must equal jpac-curriculum-export.');
  if(parsed.contract_version!=='1.2.0')return error('UNSUPPORTED_VERSION','Only curriculum export contract version 1.2.0 is supported.');
  if(!object(parsed.export_scope))return error('INVALID_SCOPE','export_scope must be an object.');
  const scopeType=parsed.export_scope.type;if(!['module','level','course'].includes(String(scopeType)))return error('INVALID_SCOPE','export_scope.type must be module, level, or course.');
  const courseSlug=text(parsed.export_scope.course_slug);if(!courseSlug)return error('COURSE_SLUG_MISSING','export_scope.course_slug is required.');
  const levelNumber=number(parsed.export_scope.level_number),moduleNumber=number(parsed.export_scope.module_number);
  if((scopeType==='module'||scopeType==='level')&&levelNumber===null)return error('LEVEL_NUMBER_MISSING','This export scope requires a numeric level_number.');
  if(scopeType==='module'&&moduleNumber===null)return error('MODULE_NUMBER_MISSING','Module scope requires a numeric module_number.');
  if(!object(parsed.course))return error('COURSE_PAYLOAD_MISSING','A course payload is required.');
  if(!Array.isArray(parsed.warnings))return error('WARNINGS_ARRAY_INVALID','The export warnings container must be an array.');
  const findings:ImportPreviewFinding[]=[];const levels:ImportPreviewLevel[]=[];
  const addLevel=(value:unknown)=>{if(!object(value)){findings.push({severity:'ERROR',code:'LEVEL_PAYLOAD_INVALID',message:'A level payload is not an object.'});return}const level=number(value.level_number);if(level===null){findings.push({severity:'ERROR',code:'LEVEL_NUMBER_MISSING',message:'A level payload is missing level_number.'});return}if(!Array.isArray(value.modules)){findings.push({severity:'ERROR',code:'MODULES_ARRAY_INVALID',message:'Level modules must be an array.',level_number:level});return}const modules=value.modules.map(item=>normalizeModule(item,level,courseSlug,context,findings)).filter((item):item is ImportPreviewModule=>item!==null);levels.push({level_number:level,title:text(value.title),status:text(value.status),modules})};
  if(scopeType==='module'){
    if(!object(parsed.level)||!object(parsed.module))return error('MODULE_PAYLOAD_MISSING','Module scope requires level and module payloads.');
    const level=number(parsed.level.level_number);if(level===null)return error('LEVEL_NUMBER_MISSING','Level payload requires level_number.');
    const module=normalizeModule(parsed.module,level,courseSlug,context,findings);if(module)levels.push({level_number:level,title:text(parsed.level.title),status:text(parsed.level.status),modules:[module]});
  }else if(scopeType==='level')addLevel(parsed.level);
  else{if(!Array.isArray(parsed.course.levels))return error('LEVELS_ARRAY_INVALID','Course scope requires course.levels as an array.');parsed.course.levels.forEach(addLevel)}
  const identities=new Set<string>();levels.flatMap(level=>level.modules).forEach(module=>{const key=`${module.level_number}.${module.module_number}`;if(identities.has(key)){module.comparison_status='POSSIBLE_CONFLICT';module.comparison_reason='Duplicate imported module identity.';findings.push({severity:'WARNING',code:'DUPLICATE_MODULE_IDENTITY',message:`Duplicate imported identity ${key}.`,level_number:module.level_number,module_number:module.module_number})}identities.add(key)});
  if(findings.some(item=>item.severity==='ERROR'))return{ok:false,findings};
  const modules=levels.flatMap(level=>level.modules);const sourceWarnings=Array.isArray(parsed.warnings)?parsed.warnings:[];
  const counts={levels:levels.length,modules:modules.length,lessons:modules.reduce((sum,item)=>sum+item.lessons.length,0),activities:modules.reduce((sum,item)=>sum+item.activities.length,0),warnings:sourceWarnings.length};
  const suppliedSummary=object(parsed.summary)?parsed.summary:null;
  if(suppliedSummary&&(['level_count','module_count','lesson_count','activity_count','warning_count']as const).some((key,index)=>number(suppliedSummary[key])!==[counts.levels,counts.modules,counts.lessons,counts.activities,counts.warnings][index]))findings.push({severity:'WARNING',code:'SUMMARY_MISMATCH',message:'Supplied summary differs from counts derived from the curriculum payload.'});
  if(sourceWarnings.length)findings.push({severity:'WARNING',code:'SOURCE_WARNINGS_PRESENT',message:`The export contains ${sourceWarnings.length} source warning(s).`});
  if(hasDatabaseId(parsed))findings.push({severity:'INFO',code:'DATABASE_IDS_PRESENT',message:'Database IDs are present for administrative reference only.'});
  const preview:CurriculumImportPreview={contract:'jpac-curriculum-export',contract_version:'1.2.0',scope:{type:scopeType as 'module'|'level'|'course',course_slug:courseSlug,...(levelNumber===null?{}:{level_number:levelNumber}),...(moduleNumber===null?{}:{module_number:moduleNumber})},course:{course_slug:text(parsed.course.course_slug)||courseSlug,title:text(parsed.course.title),description:text(parsed.course.description),status:text(parsed.course.status)},levels:levels.sort((a,b)=>a.level_number-b.level_number||a.title.localeCompare(b.title)),counts,source_warnings:sourceWarnings,findings,contains_database_ids:hasDatabaseId(parsed)};
  if(!summarizeImportPreviewDecisions(preview).complete)preview.findings.push({severity:'WARNING',code:'DECISION_SUMMARY_INCOMPLETE',message:'Local comparison totals do not match the normalized module count.'});
  return{ok:true,preview};
}
