import{supabase}from'./supabase';

export type EntitledCourse={course_id:string;slug:string;title:string;description:string;difficulty:string;total_xp:number;wix_program_url:string|null;entitlement_id:string;plan_name:string;entitlement_status:string;entitlement_ends_at:string|null;progress:number;last_accessed_at:string|null};
export type CourseModule={id:string;course_id:string;title:string;description:string;sort_order:number;xp_value:number};
export type CourseLesson={id:string;module_id:string;title:string;description:string;lesson_type:string;duration_minutes:number|null;sort_order:number;xp_value:number;wix_lesson_url:string|null};
export type LessonProgress={lesson_id:string;status:string;percent_complete:number;updated_at:string};

export async function loadMyCourses(){
  if(!supabase)return{data:[]as EntitledCourse[],error:'Supabase is not configured.'};
  const{data,error}=await supabase.rpc('jpac_my_entitled_courses');
  return{data:(data as EntitledCourse[]|null)||[],error:error?.message||''};
}

export async function loadCourseContent(courseId:string,userId:string){
  if(!supabase)return{course:null,modules:[]as CourseModule[],lessons:[]as CourseLesson[],progress:[]as LessonProgress[],error:'Supabase is not configured.'};
  const access=await supabase.rpc('jpac_student_has_course_access',{target_course:courseId});
  if(access.error||!access.data)return{course:null,modules:[],lessons:[],progress:[],error:access.error?.message||'This course is locked because your account does not have an active entitlement.'};
  const[courseResult,moduleResult]=await Promise.all([supabase.from('courses').select('id,title,slug,description,difficulty,total_xp,wix_program_url').eq('id',courseId).maybeSingle(),supabase.from('course_modules').select('id,course_id,title,description,sort_order,xp_value').eq('course_id',courseId).eq('status','published').order('sort_order')]);
  const modules=(moduleResult.data as CourseModule[]|null)||[];
  const lessonResult=modules.length?await supabase.from('lessons').select('id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,wix_lesson_url').in('module_id',modules.map(item=>item.id)).eq('status','published').order('sort_order'):{data:[],error:null};
  const lessons=(lessonResult.data as CourseLesson[]|null)||[];
  const progressResult=lessons.length?await supabase.from('lesson_progress').select('lesson_id,status,percent_complete,updated_at').eq('student_id',userId).in('lesson_id',lessons.map(item=>item.id)):{data:[],error:null};
  const error=courseResult.error||moduleResult.error||lessonResult.error||progressResult.error;
  return{course:courseResult.data,modules,lessons,progress:(progressResult.data as LessonProgress[]|null)||[],error:error?.message||''};
}

export async function markLessonProgress(userId:string,lessonId:string,status:'in_progress'|'completed'){
  if(!supabase)return'Supabase is not configured.';
  const now=new Date().toISOString();
  const{error}=await supabase.from('lesson_progress').upsert({student_id:userId,lesson_id:lessonId,status,percent_complete:status==='completed'?100:1,source:'jpac',started_at:now,completed_at:status==='completed'?now:null,updated_at:now},{onConflict:'student_id,lesson_id'});
  return error?.message||'';
}
