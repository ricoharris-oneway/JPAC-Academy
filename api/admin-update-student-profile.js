import{json,parseBody,createServerSupabase}from'./_lib/integration.js';

const uuid=/^[0-9a-f-]{36}$/i;
const text=v=>typeof v==='string'?(v.trim()||null):null;
const boolOrNull=v=>v===true?true:v===false?false:null;
const allowedExperience=new Set(['online','campus','hybrid']);
const allowedScholarship=new Set(['Not Requested','Requested','Under Review','Awarded','Not Awarded']);

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

  const body=parseBody(req);const studentId=typeof body.studentId==='string'?body.studentId:'';const changes=body.changes&&typeof body.changes==='object'?body.changes:{};
  if(!uuid.test(studentId))return json(res,400,{ok:false,error:'A valid student is required'});
  const{data:student,error:studentError}=await admin.from('profiles').select('id,email,role').eq('id',studentId).maybeSingle();
  if(studentError)return json(res,400,{ok:false,error:studentError.message});
  if(!student||student.role!=='student')return json(res,404,{ok:false,error:'Student not found'});

  const firstName=text(changes.first_name);const lastName=text(changes.last_name);const displayName=text(changes.display_name)||[firstName,lastName].filter(Boolean).join(' ')||null;const email=text(changes.email)?.toLowerCase()||null;
  if(email&&!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{ok:false,error:'Enter a valid student email address'});
  if(email&&email!==student.email){const{error:authError}=await admin.auth.admin.updateUserById(studentId,{email});if(authError)return json(res,400,{ok:false,error:authError.message})}

  const profilePatch={updated_at:new Date().toISOString()};
  if(firstName!==null)profilePatch.first_name=firstName;if(lastName!==null)profilePatch.last_name=lastName;if(displayName!==null){profilePatch.display_name=displayName;profilePatch.full_name=displayName}if(email!==null)profilePatch.email=email;
  const{error:profileError}=await admin.from('profiles').update(profilePatch).eq('id',studentId);if(profileError)return json(res,400,{ok:false,error:profileError.message});

  const studentProfilePatch={user_id:studentId,guardian_name:text(changes.guardian_name),guardian_email:text(changes.guardian_email)?.toLowerCase()||null,guardian_phone:text(changes.guardian_phone),birth_date:text(changes.birth_date),school_name:text(changes.school_name),grade_level:text(changes.grade_level),primary_goal:text(changes.primary_goal),onboarding_complete:changes.onboarding_complete===true,updated_at:new Date().toISOString()};
  const{error:spError}=await admin.from('student_profiles').upsert(studentProfilePatch,{onConflict:'user_id'});if(spError)return json(res,400,{ok:false,error:spError.message});

  const{data:pending}=await admin.from('pending_students').select('id').eq('linked_profile_id',studentId).maybeSingle();
  if(pending?.id){
    const pendingPatch={updated_at:new Date().toISOString(),experience_level:text(changes.experience_level),transportation_needed:text(changes.transportation_needed),transportation_pickup:text(changes.transportation_pickup),authorized_pickup_names:text(changes.authorized_pickup_names),medical_accessibility_notes:text(changes.medical_accessibility_notes),scholarship_type:text(changes.scholarship_type),photo_release_consent:boolOrNull(changes.photo_release_consent),digital_communication_consent:boolOrNull(changes.digital_communication_consent)};
    const academyExperience=text(changes.academy_experience);if(academyExperience&&allowedExperience.has(academyExperience))pendingPatch.academy_experience=academyExperience;
    const scholarship=text(changes.scholarship_status);if(scholarship&&allowedScholarship.has(scholarship))pendingPatch.scholarship_status=scholarship;
    if(email!==null)pendingPatch.email=email;if(firstName!==null)pendingPatch.first_name=firstName;if(lastName!==null)pendingPatch.last_name=lastName;
    const{error:pError}=await admin.from('pending_students').update(pendingPatch).eq('id',pending.id);if(pError)return json(res,400,{ok:false,error:pError.message});
    await admin.from('admissions_activity').insert({pending_student_id:pending.id,activity_type:'profile_updated',title:'Student profile updated',details:'Student profile information updated by administrator. Student type is calculated automatically from date of birth.',created_by:user.id});
  }

  await admin.from('system_audit_events').insert({actor_id:user.id,action:'admin_update_student_profile',entity_type:'profile',entity_id:studentId,result:'success',detail:{fields:Object.keys(changes),student_type_source:'date_of_birth'}});
  return json(res,200,{ok:true,message:'Student profile updated successfully. Student type is calculated automatically from date of birth.'});
}
