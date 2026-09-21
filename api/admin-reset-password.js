import{json,parseBody,createServerSupabase}from'./_lib/integration.js';

const uuid=/^[0-9a-f-]{36}$/i;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return json(res,401,{ok:false,error:'Authentication required'});

  let admin;
  try{admin=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const{data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user)return json(res,401,{ok:false,error:'Invalid or expired session'});
  const{data:caller}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(!caller||!['admin','developer'].includes(caller.role))return json(res,403,{ok:false,error:'Administrator access required'});

  const body=parseBody(req);
  const action=typeof body.action==='string'?body.action:'reset_password';

  if(action==='invite_pending_student'){
    const pendingStudentId=typeof body.pendingStudentId==='string'?body.pendingStudentId:'';
    if(!uuid.test(pendingStudentId))return json(res,400,{ok:false,error:'A valid admissions record is required'});

    const{data:pending,error:pendingError}=await admin.from('pending_students').select('*').eq('id',pendingStudentId).maybeSingle();
    if(pendingError)return json(res,400,{ok:false,error:pendingError.message});
    if(!pending)return json(res,404,{ok:false,error:'Admissions record not found'});
    if(!pending.email)return json(res,400,{ok:false,error:'Student email is required before account activation'});

    const{data:existing}=await admin.from('profiles').select('id,email,role').ilike('email',pending.email).maybeSingle();
    if(existing){
      if(existing.role!=='student')return json(res,409,{ok:false,error:'That email already belongs to a non-student JPAC account'});
      await admin.from('pending_students').update({linked_profile_id:existing.id,invitation_status:'accepted',admissions_stage:'active',activated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',pending.id);
      await admin.from('admissions_activity').insert({pending_student_id:pending.id,activity_type:'account_linked',title:'Existing JPAC account linked',details:'Existing student profile matched by email.',created_by:user.id});
      return json(res,200,{ok:true,linked:true,profileId:existing.id,message:'Existing JPAC student account linked. You can now grant course access.'});
    }

    const academyUrl=process.env.ACADEMY_SITE_URL||'https://jpac-academy.vercel.app';
    const{data:invite,error:inviteError}=await admin.auth.admin.inviteUserByEmail(pending.email,{redirectTo:`${academyUrl}/auth/callback`,data:{display_name:pending.display_name,first_name:pending.first_name,last_name:pending.last_name,role:'student'}});
    if(inviteError)return json(res,400,{ok:false,error:inviteError.message});
    const profileId=invite?.user?.id;
    if(!profileId)return json(res,500,{ok:false,error:'Invitation was created but no user ID was returned'});

    const displayName=pending.display_name||`${pending.first_name||''} ${pending.last_name||''}`.trim();
    const{error:profileError}=await admin.from('profiles').upsert({id:profileId,email:pending.email,display_name:displayName,first_name:pending.first_name,last_name:pending.last_name,full_name:displayName,role:'student',updated_at:new Date().toISOString()},{onConflict:'id'});
    if(profileError)return json(res,500,{ok:false,error:profileError.message});

    await admin.from('student_profiles').upsert({user_id:profileId,guardian_name:pending.guardian_name,guardian_email:pending.guardian_email,guardian_phone:pending.guardian_phone,birth_date:pending.date_of_birth,school_name:pending.school_name,grade_level:pending.grade_level,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    await admin.from('pending_students').update({linked_profile_id:profileId,invitation_status:'sent',admissions_stage:'invited',updated_at:new Date().toISOString()}).eq('id',pending.id);
    await admin.from('admissions_activity').insert({pending_student_id:pending.id,activity_type:'invitation_sent',title:'JPAC account invitation sent',details:`Invitation sent to ${pending.email}.`,created_by:user.id});
    await admin.from('system_audit_events').insert({actor_id:user.id,action:'invite_pending_student',entity_type:'pending_student',entity_id:pending.id,result:'success',detail:{student_email:pending.email,profile_id:profileId}});
    return json(res,200,{ok:true,linked:true,profileId,message:'JPAC account invitation sent. The student profile is now available for course enrollment.'});
  }

  const studentId=typeof body.studentId==='string'?body.studentId:'';
  const password=typeof body.password==='string'?body.password:'';
  if(!uuid.test(studentId)||password.length<8)return json(res,400,{ok:false,error:'A valid student and password of at least 8 characters are required'});
  const{data:target}=await admin.from('profiles').select('id,email,role').eq('id',studentId).maybeSingle();
  if(!target||target.role!=='student')return json(res,404,{ok:false,error:'Academy student not found'});
  const{error}=await admin.auth.admin.updateUserById(studentId,{password});
  const{error:auditError}=await admin.from('system_audit_events').insert({actor_id:user.id,action:'admin_reset_student_password',entity_type:'auth_user',entity_id:studentId,result:error?'error':'success',detail:{student_email:target.email}});
  if(error)return json(res,400,{ok:false,error:error.message});
  if(auditError)return json(res,500,{ok:false,error:'Password was changed, but the required audit record could not be written'});
  return json(res,200,{ok:true});
}
