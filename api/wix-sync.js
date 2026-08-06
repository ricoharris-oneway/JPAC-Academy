import{json,text,dateOrNull,parseBody,requireIntegrationSecret,createServerSupabase,recordIntegrationEvent,markIntegrationEvent,findJpacProfile}from'./_lib/integration.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});

  let supabase;
  try{supabase=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const body=parseBody(req);const eventId=text(body.eventId||body.id);const eventType=text(body.eventType||body.type);const member=body.member||{};const email=text(member.email||body.email).toLowerCase();const wixMemberId=text(member.id||member.memberId||body.wixMemberId);
  if(!eventId||!eventType||(!email&&!wixMemberId))return json(res,400,{ok:false,error:'eventId, eventType, and a Wix member identity are required'});

  const{data:existing,error:existingError}=await supabase.from('integration_events').select('id,processing_status').eq('provider','wix').eq('external_event_id',eventId).maybeSingle();
  if(existingError)return json(res,500,{ok:false,error:existingError.message});
  if(existing?.processing_status==='processed')return json(res,200,{ok:true,duplicate:true,eventId});

  try{
    await recordIntegrationEvent(supabase,{eventId,eventType,payload:body});
    const profile=await findJpacProfile(supabase,{email,wixMemberId});
    if(!profile)throw new Error(`No JPAC profile matches Wix member ${email||wixMemberId}. The member must sign in once or be created by Admin before synchronization.`);

    const now=new Date().toISOString();
    const{error:memberError}=await supabase.from('wix_member_links').upsert({profile_id:profile.id,wix_member_id:wixMemberId||`email:${email}`,email:email||profile.email,display_name:text(member.displayName||member.name)||profile.display_name,sync_status:'active',last_synced_at:now,updated_at:now},{onConflict:'profile_id'});if(memberError)throw memberError;

    if(body.order){const o=body.order;const{error}=await supabase.from('wix_access_entitlements').upsert({profile_id:profile.id,wix_order_id:text(o.id||o.orderId),wix_plan_id:text(o.planId),plan_name:text(o.planName),status:text(o.status||'unknown').toLowerCase(),starts_at:dateOrNull(o.startsAt||o.startDate),ends_at:dateOrNull(o.endsAt||o.endDate),raw_payload:o,last_synced_at:now,updated_at:now},{onConflict:'wix_order_id'});if(error)throw error}
    if(body.programEnrollment){const p=body.programEnrollment;const{error}=await supabase.from('wix_program_enrollments').upsert({profile_id:profile.id,wix_participant_id:text(p.participantId||p.id),wix_program_id:text(p.programId),wix_program_title:text(p.programTitle||p.title),status:text(p.status||'active').toLowerCase(),progress:Number(p.progress||0),joined_at:dateOrNull(p.joinedAt),completed_at:dateOrNull(p.completedAt),raw_payload:p,last_synced_at:now,updated_at:now},{onConflict:'profile_id,wix_program_id'});if(error)throw error}
    if(body.assignment){const a=body.assignment;const assignmentId=text(a.id||a.assignmentId);const programId=text(a.programId||body.programEnrollment?.programId);if(!assignmentId||!programId)throw new Error('assignment.id and assignment.programId are required for assignment synchronization');const{error}=await supabase.from('wix_assignments').upsert({wix_assignment_id:assignmentId,wix_program_id:programId,wix_step_id:text(a.stepId||a.lessonId)||null,title:text(a.title)||'JPAC Assignment',description:text(a.description)||null,due_at:dateOrNull(a.dueAt||a.dueDate),submission_type:text(a.submissionType||'performance').toLowerCase(),status:text(a.status||'active').toLowerCase(),raw_payload:a,last_synced_at:now,updated_at:now},{onConflict:'wix_assignment_id'});if(error)throw error}

    await markIntegrationEvent(supabase,{eventId,status:'processed',profileId:profile.id});
    return json(res,200,{ok:true,profileId:profile.id,eventId,assignmentSynced:Boolean(body.assignment)});
  }catch(error){const message=error instanceof Error?error.message:'Unknown synchronization error';try{await markIntegrationEvent(supabase,{eventId,status:'error',errorMessage:message})}catch{}return json(res,500,{ok:false,error:message,eventId})}
}
