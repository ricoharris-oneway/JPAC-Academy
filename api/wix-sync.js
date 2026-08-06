import{createClient}from'@supabase/supabase-js';

const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))};
const text=v=>typeof v==='string'?v.trim():'';
const dateOrNull=v=>v?new Date(v).toISOString():null;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const secret=req.headers['x-jpac-wix-secret'];
  if(!process.env.JPAC_WIX_SYNC_SECRET||secret!==process.env.JPAC_WIX_SYNC_SECRET)return json(res,401,{ok:false,error:'Unauthorized'});
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return json(res,500,{ok:false,error:'Server sync configuration is incomplete'});

  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const eventId=text(body.eventId||body.id);
  const eventType=text(body.eventType||body.type);
  const member=body.member||{};
  const email=text(member.email||body.email).toLowerCase();
  const wixMemberId=text(member.id||member.memberId||body.wixMemberId);
  if(!eventId||!eventType||(!email&&!ixMemberId))return json(res,400,{ok:false,error:'eventId, eventType, and a Wix member identity are required'});

  const{data:existing}=await supabase.from('integration_events').select('id,processing_status').eq('provider','wix').eq('external_event_id',eventId).maybeSingle();
  if(existing?.processing_status==='processed')return json(res,200,{ok:true,duplicate:true});

  await supabase.from('integration_events').upsert({provider:'wix',external_event_id:eventId,event_type:eventType,processing_status:'received',payload:body,error_message:null},{onConflict:'provider,external_event_id'});

  try{
    let profile=null;
    if(email){const result=await supabase.from('profiles').select('id,display_name,email,role').ilike('email',email).maybeSingle();profile=result.data}
    if(!profile&&wixMemberId){const result=await supabase.from('wix_member_links').select('profile:profiles(id,display_name,email,role)').eq('wix_member_id',wixMemberId).maybeSingle();profile=Array.isArray(result.data?.profile)?result.data.profile[0]:result.data?.profile}
    if(!profile)throw new Error(`No JPAC profile matches Wix member ${email||wixMemberId}. The member must sign in once or be created by Admin before synchronization.`);

    await supabase.from('wix_member_links').upsert({profile_id:profile.id,wix_member_id:wixMemberId||`email:${email}`,email:email||profile.email,display_name:text(member.displayName||member.name)||profile.display_name,sync_status:'active',last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'profile_id'});

    if(body.order){const o=body.order;await supabase.from('wix_access_entitlements').upsert({profile_id:profile.id,wix_order_id:text(o.id||o.orderId),wix_plan_id:text(o.planId),plan_name:text(o.planName),status:text(o.status||'unknown').toLowerCase(),starts_at:dateOrNull(o.startsAt||o.startDate),ends_at:dateOrNull(o.endsAt||o.endDate),raw_payload:o,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'wix_order_id'})}

    if(body.programEnrollment){const p=body.programEnrollment;await supabase.from('wix_program_enrollments').upsert({profile_id:profile.id,wix_participant_id:text(p.participantId||p.id),wix_program_id:text(p.programId),wix_program_title:text(p.programTitle||p.title),status:text(p.status||'active').toLowerCase(),progress:Number(p.progress||0),joined_at:dateOrNull(p.joinedAt),completed_at:dateOrNull(p.completedAt),raw_payload:p,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'profile_id,wix_program_id'})}

    if(body.assignment){
      const a=body.assignment;
      const assignmentId=text(a.id||a.assignmentId);
      const programId=text(a.programId||body.programEnrollment?.programId);
      if(!assignmentId||!programId)throw new Error('assignment.id and assignment.programId are required for assignment synchronization');
      const{error:assignmentError}=await supabase.from('wix_assignments').upsert({wix_assignment_id:assignmentId,wix_program_id:programId,wix_step_id:text(a.stepId||a.lessonId)||null,title:text(a.title)||'JPAC Assignment',description:text(a.description)||null,due_at:dateOrNull(a.dueAt||a.dueDate),submission_type:text(a.submissionType||'performance').toLowerCase(),status:text(a.status||'active').toLowerCase(),raw_payload:a,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'wix_assignment_id'});
      if(assignmentError)throw assignmentError;
    }

    await supabase.from('integration_events').update({profile_id:profile.id,processing_status:'processed',processed_at:new Date().toISOString(),error_message:null}).eq('provider','wix').eq('external_event_id',eventId);
    return json(res,200,{ok:true,profileId:profile.id,eventId,assignmentSynced:Boolean(body.assignment)});
  }catch(error){
    const message=error instanceof Error?error.message:'Unknown synchronization error';
    await supabase.from('integration_events').update({processing_status:'error',error_message:message,processed_at:new Date().toISOString()}).eq('provider','wix').eq('external_event_id',eventId);
    return json(res,500,{ok:false,error:message,eventId});
  }
}
