import{json,text,dateOrNull,parseBody,requireIntegrationSecret,createServerSupabase,recordIntegrationEvent,markIntegrationEvent,findJpacProfile}from'./_lib/integration.js';

async function provisionProfile(supabase,{email,displayName,wixMemberId}){
  if(!email)throw new Error('A Wix member email is required to provision a JPAC Academy account.');

  let user=null;
  const{data:inviteData,error:inviteError}=await supabase.auth.admin.inviteUserByEmail(email,{redirectTo:'https://jpac-academy.vercel.app',data:{display_name:displayName||email,wix_member_id:wixMemberId||null,source:'wix'}});
  if(inviteError){
    const{data:listData,error:listError}=await supabase.auth.admin.listUsers({page:1,perPage:1000});
    if(listError)throw inviteError;
    user=(listData?.users||[]).find(item=>text(item.email).toLowerCase()===email)||null;
    if(!user)throw inviteError;
  }else user=inviteData?.user||null;

  if(!user?.id)throw new Error(`Unable to provision JPAC Academy access for ${email}.`);

  const profileRow={id:user.id,email,display_name:displayName||email,wix_member_id:wixMemberId||null,role:'student'};
  const{data:profile,error:profileError}=await supabase.from('profiles').upsert(profileRow,{onConflict:'id'}).select('id,display_name,email,role').single();
  if(profileError)throw profileError;
  return profile;
}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});

  let supabase;
  try{supabase=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const body=parseBody(req);const eventId=text(body.eventId||body.id);const eventType=text(body.eventType||body.type);const member=body.member||{};const email=text(member.email||body.email).toLowerCase();const wixMemberId=text(member.id||member.memberId||body.wixMemberId);const displayName=text(member.displayName||member.name)||email;
  if(!eventId||!eventType||(!email&&!wixMemberId))return json(res,400,{ok:false,error:'eventId, eventType, and a Wix member identity are required'});

  const{data:existing,error:existingError}=await supabase.from('integration_events').select('id,processing_status').eq('provider','wix').eq('external_event_id',eventId).maybeSingle();
  if(existingError)return json(res,500,{ok:false,error:existingError.message});
  if(existing?.processing_status==='processed')return json(res,200,{ok:true,duplicate:true,eventId});

  try{
    await recordIntegrationEvent(supabase,{eventId,eventType,payload:body});
    let profile=await findJpacProfile(supabase,{email,wixMemberId});
    let provisioned=false;
    if(!profile){profile=await provisionProfile(supabase,{email,displayName,wixMemberId});provisioned=true}

    const now=new Date().toISOString();
    const{error:memberError}=await supabase.from('wix_member_links').upsert({profile_id:profile.id,wix_member_id:wixMemberId||`email:${email}`,email:email||profile.email,display_name:displayName||profile.display_name,sync_status:'active',last_synced_at:now,updated_at:now},{onConflict:'profile_id'});if(memberError)throw memberError;
    await supabase.from('profiles').update({wix_member_id:wixMemberId||null,display_name:displayName||profile.display_name}).eq('id',profile.id);

    if(body.order){const o=body.order;const{error}=await supabase.from('wix_access_entitlements').upsert({profile_id:profile.id,wix_order_id:text(o.id||o.orderId),wix_plan_id:text(o.planId),plan_name:text(o.planName),status:text(o.status||'unknown').toLowerCase(),starts_at:dateOrNull(o.startsAt||o.startDate),ends_at:dateOrNull(o.endsAt||o.endDate),raw_payload:o,last_synced_at:now,updated_at:now},{onConflict:'wix_order_id'});if(error)throw error}
    if(body.programEnrollment){const p=body.programEnrollment;const{error}=await supabase.from('wix_program_enrollments').upsert({profile_id:profile.id,wix_participant_id:text(p.participantId||p.id),wix_program_id:text(p.programId),wix_program_title:text(p.programTitle||p.title),status:text(p.status||'active').toLowerCase(),progress:Number(p.progress||0),joined_at:dateOrNull(p.joinedAt),completed_at:dateOrNull(p.completedAt),raw_payload:p,last_synced_at:now,updated_at:now},{onConflict:'profile_id,wix_program_id'});if(error)throw error}
    if(body.assignment){const a=body.assignment;const assignmentId=text(a.id||a.assignmentId);const programId=text(a.programId||body.programEnrollment?.programId);if(!assignmentId||!programId)throw new Error('assignment.id and assignment.programId are required for assignment synchronization');const rawSequence=Number(a.sequenceNumber??a.order??a.position??a.index);const sequenceNumber=Number.isFinite(rawSequence)?Math.max(0,Math.trunc(rawSequence)):null;const{error}=await supabase.from('wix_assignments').upsert({wix_assignment_id:assignmentId,wix_program_id:programId,wix_step_id:text(a.stepId||a.lessonId)||null,title:text(a.title)||'JPAC Assignment',description:text(a.description)||null,due_at:dateOrNull(a.dueAt||a.dueDate),submission_type:text(a.submissionType||'performance').toLowerCase(),status:text(a.status||'active').toLowerCase(),sequence_number:sequenceNumber,raw_payload:a,last_synced_at:now,updated_at:now},{onConflict:'wix_assignment_id'});if(error)throw error}

    await markIntegrationEvent(supabase,{eventId,status:'processed',profileId:profile.id});
    return json(res,200,{ok:true,profileId:profile.id,eventId,provisioned,invitationSent:provisioned,assignmentSynced:Boolean(body.assignment)});
  }catch(error){const message=error instanceof Error?error.message:'Unknown synchronization error';try{await markIntegrationEvent(supabase,{eventId,status:'error',errorMessage:message})}catch{}return json(res,500,{ok:false,error:message,eventId})}
}
