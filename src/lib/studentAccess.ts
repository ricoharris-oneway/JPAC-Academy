import{supabase}from'./supabase';

export type AcademyCourse={course_id:string;slug:string;title:string;description:string;difficulty:string;total_xp:number;wix_program_url:string|null;enrollment_id:string;enrollment_status:string;enrollment_start_date:string|null;enrollment_end_date:string|null;enrollment_level:number;enrollment_source:string;progress:number|null;published_module_count?:number;last_accessed_at:string|null;next_lesson_id:string|null;next_module_id:string|null;resume_module_id?:string|null;resume_module_title?:string|null;resume_level_number?:number|null;resume_level_module_number?:number|null;resume_module_complete?:boolean|null};
export type CourseModule={id:string;course_id:string;title:string;description:string;sort_order:number;xp_value:number;level_number:number|null;level_title:string|null;level_module_number?:number|null;short_intro?:string;primary_video_url?:string|null;core_xp?:number;bonus_xp_available?:number;jpac_tool_activity?:Record<string,string>;real_world_activity?:Record<string,string>;career_connection?:string};
export type LessonContentBlock={heading?:string;body?:string};
export type CourseLesson={id:string;module_id:string;title:string;description:string;lesson_type:string;duration_minutes:number|null;sort_order:number;xp_value:number;wix_lesson_url:string|null;short_summary?:string|null;learning_objective?:string|null;content_blocks?:(LessonContentBlock|string)[]|null;technique_cues?:string[]|null;common_mistakes?:string[]|null;self_check?:string|null;resource_brief?:string|null};
export type LessonProgress={lesson_id:string;status:string;percent_complete:number;updated_at:string};

type ModuleRow={id:string;course_id:string;sort_order:number};
type LessonRow={id:string;module_id:string;sort_order:number};

async function authenticatedUserId(){
  if(!supabase)return{userId:'',error:'Supabase is not configured.'};
  const{data,error}=await supabase.auth.getUser();
  return{userId:data.user?.id||'',error:error?.message||(!data.user?'Your session has expired. Please sign in again.':'')};
}

export async function loadMyCourses(){
  if(!supabase)return{data:[]as AcademyCourse[],error:'Supabase is not configured.'};
  const[{data,error},identity]=await Promise.all([supabase.rpc('jpac_my_academy_courses'),authenticatedUserId()]);
  const courses=((data as AcademyCourse[]|null)||[]).map(course=>({...course,next_lesson_id:null,next_module_id:null}));
  if(error||identity.error||!courses.length)return{data:courses,error:error?.message||identity.error||''};

  const[{data:moduleData,error:moduleError},{data:resumeData,error:resumeError}]=await Promise.all([
    supabase.from('course_modules').select('id,course_id,sort_order').in('course_id',courses.map(course=>course.course_id)).eq('status','published').order('sort_order'),
    supabase.rpc('jpac_my_course_resume_points')
  ]);
  const modules=(moduleData as ModuleRow[]|null)||[];
  if(moduleError)return{data:courses,error:moduleError.message};
  const resumeRows=((resumeData as Array<{course_id:string;module_id:string;module_title:string;level_number:number|null;level_module_number:number|null;module_complete:boolean}>|null)||[]);
  const resumeByCourse=new Map(resumeRows.map(row=>[row.course_id,row]));
  const scopedCourses=courses.map(course=>{const resume=resumeByCourse.get(course.course_id);return{...course,published_module_count:modules.filter(module=>module.course_id===course.course_id).length,resume_module_id:resume?.module_id||null,resume_module_title:resume?.module_title||null,resume_level_number:resume?.level_number||null,resume_level_module_number:resume?.level_module_number||null,resume_module_complete:resume?.module_complete??null}});
  if(resumeError)return{data:scopedCourses,error:resumeError.message};
  if(!modules.length)return{data:scopedCourses,error:''};
  const{data:lessonData,error:lessonError}=await supabase.from('lessons').select('id,module_id,sort_order').in('module_id',modules.map(module=>module.id)).eq('status','published').order('sort_order');
  const lessons=(lessonData as LessonRow[]|null)||[];
  if(lessonError||!lessons.length)return{data:scopedCourses,error:lessonError?.message||''};
  const{data:progressData,error:progressError}=await supabase.from('lesson_progress').select('lesson_id,status,percent_complete,updated_at').eq('student_id',identity.userId).in('lesson_id',lessons.map(lesson=>lesson.id));
  const progress=(progressData as LessonProgress[]|null)||[];const progressByLesson=new Map(progress.map(item=>[item.lesson_id,item]));const moduleById=new Map(modules.map(item=>[item.id,item]));

  const enriched=scopedCourses.map(course=>{
    const courseLessons=lessons.filter(lesson=>moduleById.get(lesson.module_id)?.course_id===course.course_id).sort((a,b)=>{const am=moduleById.get(a.module_id)?.sort_order||0;const bm=moduleById.get(b.module_id)?.sort_order||0;return am-bm||a.sort_order-b.sort_order});
    if(!courseLessons.length)return course;
    const states=courseLessons.map(lesson=>progressByLesson.get(lesson.id));
    const canonicalProgress=states.reduce((sum,state)=>sum+Math.max(0,Math.min(100,Number(state?.percent_complete||0))),0)/courseLessons.length;
    const latest=states.filter(Boolean).sort((a,b)=>String(b!.updated_at).localeCompare(String(a!.updated_at)))[0];
    let next=latest?courseLessons.find(lesson=>lesson.id===latest.lesson_id):undefined;
    if(latest?.status==='completed'){
      const position=courseLessons.findIndex(lesson=>lesson.id===latest.lesson_id);
      next=courseLessons.slice(position+1).find(lesson=>progressByLesson.get(lesson.id)?.status!=='completed');
    }
    if(!next||progressByLesson.get(next.id)?.status==='completed')next=courseLessons.find(lesson=>progressByLesson.get(lesson.id)?.status!=='completed');
    return{...course,progress:canonicalProgress,last_accessed_at:latest?.updated_at||course.last_accessed_at,next_lesson_id:next?.id||null,next_module_id:next?.module_id||null};
  });
  return{data:enriched,error:progressError?.message||''};
}

export function continueDestination(courses:AcademyCourse[]){
  if(!courses.length)return{to:'/courses',label:'View My Courses',courseTitle:'',moduleTitle:'',levelNumber:null as number|null,moduleNumber:null as number|null};
  const withActivity=[...courses].filter(course=>course.last_accessed_at).sort((a,b)=>String(b.last_accessed_at).localeCompare(String(a.last_accessed_at)));
  const recent=withActivity[0]||courses[0];
  const resumeCourse=(recent.resume_module_id?recent:courses.find(course=>course.resume_module_id))||recent;
  if(resumeCourse.resume_module_id)return{
    to:`/courses/${resumeCourse.course_id}/modules/${resumeCourse.resume_module_id}#guided-workflow`,
    label:resumeCourse.resume_module_complete?'Review Completed Module':'Pick Up Where You Left Off',
    courseTitle:resumeCourse.title,
    moduleTitle:resumeCourse.resume_module_title||'Current module',
    levelNumber:resumeCourse.resume_level_number??resumeCourse.enrollment_level??null,
    moduleNumber:resumeCourse.resume_level_module_number??null
  };
  return{to:`/courses/${resumeCourse.course_id}`,label:'Open Course',courseTitle:resumeCourse.title,moduleTitle:'Course overview',levelNumber:resumeCourse.enrollment_level??null,moduleNumber:null as number|null};
}

export async function loadCourseContent(courseId:string){
  if(!supabase)return{course:null,modules:[]as CourseModule[],lessons:[]as CourseLesson[],progress:[]as LessonProgress[],courseProgress:0,error:'Supabase is not configured.'};
  const identity=await authenticatedUserId();
  if(identity.error)return{course:null,modules:[],lessons:[],progress:[],courseProgress:0,error:identity.error};
  const access=await supabase.rpc('jpac_student_has_course_access',{target_course:courseId});
  if(access.error||!access.data)return{course:null,modules:[],lessons:[],progress:[],courseProgress:0,error:access.error?.message||'This course is locked because your account does not have an active entitlement.'};
  const[courseResult,moduleResult]=await Promise.all([supabase.from('courses').select('id,title,slug,description,difficulty,total_xp,wix_program_url').eq('id',courseId).maybeSingle(),supabase.from('course_modules').select('id,course_id,title,description,sort_order,xp_value,level_module_number,short_intro,primary_video_url,core_xp,bonus_xp_available,jpac_tool_activity,real_world_activity,career_connection,course_level:course_levels(level_number,title)').eq('course_id',courseId).eq('status','published').order('sort_order')]);
  const modules=((moduleResult.data as unknown as Array<Omit<CourseModule,'level_number'|'level_title'>&{course_level:{level_number:number;title:string}|Array<{level_number:number;title:string}>|null}>)||[]).map(item=>{const level=Array.isArray(item.course_level)?item.course_level[0]:item.course_level;return{...item,level_number:level?.level_number||null,level_title:level?.title||null}});
  const lessonResult=modules.length?await supabase.from('lessons').select('id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,wix_lesson_url,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check,resource_brief').in('module_id',modules.map(item=>item.id)).eq('status','published').order('sort_order'):{data:[],error:null};
  const moduleOrder=new Map(modules.map(module=>[module.id,module.sort_order]));
  const lessons=((lessonResult.data as CourseLesson[]|null)||[]).sort((a,b)=>{
    const moduleDifference=(moduleOrder.get(a.module_id)??0)-(moduleOrder.get(b.module_id)??0);
    return moduleDifference||a.sort_order-b.sort_order;
  });
  const progressResult=lessons.length?await supabase.from('lesson_progress').select('lesson_id,status,percent_complete,updated_at').eq('student_id',identity.userId).in('lesson_id',lessons.map(item=>item.id)):{data:[],error:null};
  const progress=(progressResult.data as LessonProgress[]|null)||[];const progressByLesson=new Map(progress.map(item=>[item.lesson_id,item]));
  const courseProgress=lessons.length?lessons.reduce((sum,lesson)=>sum+Number(progressByLesson.get(lesson.id)?.percent_complete||0),0)/lessons.length:0;
  const combinedError=courseResult.error||moduleResult.error||lessonResult.error||progressResult.error;
  return{course:courseResult.data,modules,lessons,progress,courseProgress,error:combinedError?.message||''};
}

export async function markLessonProgress(lessonId:string,status:'in_progress'|'completed'){
  if(!supabase)return'Supabase is not configured.';
  const identity=await authenticatedUserId();if(identity.error)return identity.error;
  const now=new Date().toISOString();
  const{error}=await supabase.from('lesson_progress').upsert({student_id:identity.userId,lesson_id:lessonId,status,percent_complete:status==='completed'?100:1,source:'jpac',started_at:now,completed_at:status==='completed'?now:null,updated_at:now},{onConflict:'student_id,lesson_id'});
  return error?.message||'';
}
