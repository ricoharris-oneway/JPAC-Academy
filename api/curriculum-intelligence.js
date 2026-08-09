import{createServerSupabase,json,parseBody}from'./_lib/integration.js';
import{curriculumProvider,supportedCurriculumActions}from'./_lib/curriculum-intelligence.js';

const one=value=>Array.isArray(value)?value[0]:value;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return json(res,401,{error:'Authentication required'});
  try{
    const supabase=createServerSupabase();
    const{data:userData,error:userError}=await supabase.auth.getUser(token);
    if(userError||!userData.user)return json(res,401,{error:'Invalid session'});
    const{data:profile,error:profileError}=await supabase.from('profiles').select('id,role').eq('id',userData.user.id).single();
    if(profileError||!profile||!['admin','developer'].includes(profile.role))return json(res,403,{error:'Administrator access required'});
    const body=parseBody(req);const action=body.action;const courseId=body.courseId;const moduleId=body.moduleId;const lessonId=body.lessonId;const activityId=body.activityId;
    if(!supportedCurriculumActions.includes(action)||!courseId)return json(res,400,{error:'Unsupported curriculum intelligence request'});
    const[courseResult,moduleResult,lessonResult,activityResult,lessonsResult,activitiesResult,toolsResult]=await Promise.all([
      supabase.from('courses').select('id,title,slug,description,status').eq('id',courseId).single(),
      moduleId?supabase.from('course_modules').select('id,course_id,level_module_number,title,description,status,short_intro,career_connection,primary_video_url,core_xp,core_unlock_threshold,lab_tool_id,aria_coaching_targets').eq('id',moduleId).eq('course_id',courseId).single():Promise.resolve({data:null,error:null}),
      lessonId?supabase.from('lessons').select('id,module_id,title,status,sort_order,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check').eq('id',lessonId).single():Promise.resolve({data:null,error:null}),
      activityId?supabase.from('activities').select('id,module_id,title,description,instructions,activity_type,submission_type,xp_reward,xp_type,required,status,passing_score,rubric').eq('id',activityId).single():Promise.resolve({data:null,error:null}),
      moduleId?supabase.from('lessons').select('id,module_id,title,status,sort_order,learning_objective').eq('module_id',moduleId).order('sort_order'):Promise.resolve({data:[],error:null}),
      moduleId?supabase.from('activities').select('id,module_id,title,status,required,xp_type,xp_reward,passing_score').eq('module_id',moduleId):Promise.resolve({data:[],error:null}),
      supabase.from('lab_tools').select('id,name,status,launch_url').eq('status','ready')
    ]);
    const error=courseResult.error||moduleResult.error||lessonResult.error||activityResult.error||lessonsResult.error||activitiesResult.error||toolsResult.error;
    if(error)return json(res,400,{error:error.message});
    const module=one(moduleResult.data);const lesson=one(lessonResult.data);const activity=one(activityResult.data);
    if(module&&module.course_id!==courseId)return json(res,400,{error:'Module is outside selected course'});
    if(lesson&&lesson.module_id!==moduleId)return json(res,400,{error:'Lesson is outside selected module'});
    if(activity&&activity.module_id!==moduleId)return json(res,400,{error:'Activity is outside selected module'});
    const provider=curriculumProvider();
    const proposal=await provider.generate({action,course:courseResult.data,module,lesson,activity,neighbors:lessonsResult.data||[],activities:activitiesResult.data||[],tools:toolsResult.data||[],knownIssues:['Beginner Module 1 reviewed E3 Core Challenge is missing; retain the published legacy challenge and do not manufacture a replacement.']});
    return json(res,200,{provider:provider.id,model:provider.model,lifecycle:'generated',label:'PROPOSAL / NOT PUBLISHED',proposal});
  }catch(error){return json(res,500,{error:error instanceof Error?error.message:'Curriculum intelligence failed'});}
}
