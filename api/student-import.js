import{createServerSupabase,json,parseBody,requireIntegrationSecret,text,dateOrNull}from'./_lib/integration.js';

const PROGRAM_ALIASES={
  'Guitar & Strings':'Guitar',
  'Voice':'Singing',
  'Digital Creator':'Digital AI Creator',
  'Music Business & Artist Development':'Music Business / Artist Development',
  'Music Production & Songwriting':'Music Production / Songwriting'
};

function yes(value){return ['yes','true','1'].includes(text(value).toLowerCase())}
function studentType(row){const dob=text(row.date_of_birth);if(!dob)return'adult';const d=new Date(dob);if(Number.isNaN(d.getTime()))return'adult';const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();const m=now.getUTCMonth()-d.getUTCMonth();if(m<0||(m===0&&now.getUTCDate()<d.getUTCDate()))age--;return age<18?'minor':'adult'}
function academyExperience(row){return text(row.transportation_needed).toLowerCase()==='yes'?'campus':'online'}
function normalizeProgram(value){const name=text(value);return PROGRAM_ALIASES[name]||name}

async function findCourseId(supabase,name){const title=normalizeProgram(name);if(!title)return null;const{data,error}=await supabase.from('courses').select('id').eq('title',title).maybeSingle();if(error)throw error;return data?.id||null}

async function upsertRow(supabase,row){
  const externalId=text(row.external_student_id);if(!externalId)throw new Error('external_student_id is required');
  const first=text(row.first_name);const last=text(row.last_name);if(!first||!last)throw new Error(`first_name and last_name are required for ${externalId}`);
  const courseId=await findCourseId(supabase,row.primary_program);
  const sourceUpdated=dateOrNull(row.source_updated_at)||new Date().toISOString();
  const scholarship=text(row.scholarship_status)||'Not Requested';
  const payload={
    external_student_id:externalId,first_name:first,last_name:last,email:text(row.student_email)||null,phone:text(row.student_phone)||null,
    date_of_birth:text(row.date_of_birth)||null,school_name:text(row.school_name)||null,grade_level:text(row.grade_level)||null,
    address_line1:text(row.address_1)||null,address_line2:text(row.address_2)||null,city:text(row.city)||null,state:text(row.state)||null,postal_code:text(row.postal_code)||null,
    course_id:courseId,enrollment_status:'pending',admissions_stage:'application',enrollment_source:'import',student_type:studentType(row),academy_experience:academyExperience(row),
    creative_interests:[text(row.primary_program),text(row.secondary_program)].filter(Boolean),experience_level:text(row.experience_level)||null,practice_availability:text(row.class_day_time)||null,
    guardian_name:[text(row.guardian_1_first_name),text(row.guardian_1_last_name)].filter(Boolean).join(' ')||null,guardian_email:text(row.guardian_1_email)||null,guardian_phone:text(row.guardian_1_phone)||null,guardian_relationship:text(row.guardian_1_relationship)||'guardian',
    secondary_program:text(row.secondary_program)||null,transportation_needed:text(row.transportation_needed)||null,transportation_pickup:text(row.transportation_school_pickup)||null,authorized_pickup_names:text(row.authorized_pickup_names)||null,
    scholarship_status:scholarship,scholarship_type:text(row.scholarship_type)||null,photo_release_consent:yes(row.photo_release_consent),digital_communication_consent:yes(row.digital_communication_consent),medical_accessibility_notes:text(row.medical_or_accessibility_notes)||null,
    source_updated_at:sourceUpdated,profile_completeness_pct:Number(row.profile_completeness_pct)||null,notes:text(row.notes)||'',
    intake_payload:row,updated_at:new Date().toISOString()
  };
  const{data,error}=await supabase.from('pending_students').upsert(payload,{onConflict:'external_student_id'}).select('id,external_student_id,display_name,admissions_stage,scholarship_status,course_id').single();
  if(error)throw error;return data;
}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{error:'Unauthorized'});
  try{
    const body=parseBody(req);const rows=Array.isArray(body.rows)?body.rows:Array.isArray(body)?body:[body];
    if(!rows.length)return json(res,400,{error:'No student rows supplied'});
    const supabase=createServerSupabase();const imported=[];const errors=[];
    for(const row of rows){try{imported.push(await upsertRow(supabase,row))}catch(error){errors.push({external_student_id:text(row?.external_student_id)||null,error:error instanceof Error?error.message:'Import failed'})}}
    return json(res,errors.length?207:200,{imported_count:imported.length,error_count:errors.length,imported,errors});
  }catch(error){return json(res,500,{error:error instanceof Error?error.message:'Student import failed'})}
}
