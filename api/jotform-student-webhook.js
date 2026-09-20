import crypto from'crypto';
import{createServerSupabase,json,parseBody,text,dateOrNull}from'./_lib/integration.js';

const FORM_ID='262598816503062';
const PROGRAM_ALIASES={
  'Guitar & Strings':'Guitar',
  'Voice':'Singing',
  'Digital Creator':'Digital AI Creator',
  'Music Business & Artist Development':'Music Business / Artist Development',
  'Music Production & Songwriting':'Music Production / Songwriting'
};

const norm=s=>text(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function answerValue(v){
  if(v==null)return'';
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);
  if(Array.isArray(v))return v.map(answerValue).filter(Boolean).join('; ');
  if(typeof v==='object'){
    const ordered=['first','middle','last','addr_line1','addr_line2','city','state','postal'];
    const vals=ordered.filter(k=>v[k]!=null&&text(v[k])).map(k=>text(v[k]));
    if(vals.length)return vals.join(' ');
    return Object.values(v).map(answerValue).filter(Boolean).join(' ');
  }
  return'';
}
function collectAnswers(raw){
  const map=new Map();
  const visit=(node,key='')=>{
    if(node==null)return;
    if(Array.isArray(node)){node.forEach((v,i)=>visit(v,`${key}.${i}`));return}
    if(typeof node!=='object')return;
    const label=text(node.text||node.label||node.question||node.name||key);
    if(Object.prototype.hasOwnProperty.call(node,'answer')&&label){map.set(norm(label),answerValue(node.answer))}
    for(const[k,v]of Object.entries(node)){
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean'){
        const nk=norm(k);if(nk&&!map.has(nk))map.set(nk,String(v));
      }else visit(v,k);
    }
  };
  visit(raw);return map;
}
function pick(map,...labels){for(const label of labels){const key=norm(label);if(map.has(key)&&text(map.get(key)))return text(map.get(key));for(const[k,v]of map.entries())if(k.includes(key)&&text(v))return text(v)}return''}
function yes(value){return['yes','true','1','i agree','agree'].includes(norm(value))}
function studentType(dob){if(!dob)return'adult';const d=new Date(dob);if(Number.isNaN(d.getTime()))return'adult';const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();const m=now.getUTCMonth()-d.getUTCMonth();if(m<0||(m===0&&now.getUTCDate()<d.getUTCDate()))age--;return age<18?'minor':'adult'}
function normalizeProgram(value){const name=text(value);return PROGRAM_ALIASES[name]||name}
async function validSecret(supabase,provided){if(!provided)return false;const hash=crypto.createHash('sha256').update(provided).digest('hex');const{data,error}=await supabase.from('integration_webhook_secrets').select('secret_hash,active').eq('provider','jotform').maybeSingle();if(error)throw error;return Boolean(data?.active&&data.secret_hash===hash)}
async function findCourseId(supabase,name){const title=normalizeProgram(name);if(!title)return null;const{data,error}=await supabase.from('courses').select('id').eq('title',title).maybeSingle();if(error)throw error;return data?.id||null}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const supabase=createServerSupabase();
    const supplied=text(req.query?.secret||req.headers['x-jpac-jotform-secret']);
    if(!await validSecret(supabase,supplied))return json(res,401,{error:'Unauthorized'});
    const body=parseBody(req);
    let raw=body;
    if(typeof body.rawRequest==='string'){try{raw=JSON.parse(body.rawRequest)}catch{raw=body}}
    else if(body.rawRequest&&typeof body.rawRequest==='object')raw=body.rawRequest;
    const formId=text(body.formID||body.formId||raw?.formID||raw?.formId);
    if(formId&&formId!==FORM_ID)return json(res,400,{error:'Unexpected form'});
    const answers=collectAnswers(raw);
    for(const[k,v]of Object.entries(body))if(typeof v!=='object'&&v!=null&&!answers.has(norm(k)))answers.set(norm(k),String(v));

    const submissionId=text(body.submissionID||body.submissionId||raw?.submissionID||raw?.submissionId)||pick(answers,'submission id');
    if(!submissionId)return json(res,400,{error:'Submission ID missing'});

    const first=pick(answers,'Student First Name','student first');
    const middle=pick(answers,'Student Middle Name','student middle');
    const last=pick(answers,'Student Last Name','student last');
    const preferred=pick(answers,'Preferred Name');
    const dob=pick(answers,'Date of Birth');
    const primary=pick(answers,'Primary Program');
    const secondary=pick(answers,'Secondary Program');
    const guardianFirst=pick(answers,'Guardian First Name');
    const guardianLast=pick(answers,'Guardian Last Name');
    const scholarshipChoice=pick(answers,'Which tuition option are you requesting?','scholarship or financial assistance','Would you like the student to be considered for a JPAC scholarship or financial assistance?');
    const scholarshipRequested=/scholarship|financial assistance/i.test(scholarshipChoice);
    const courseId=await findCourseId(supabase,primary);
    const transportation=pick(answers,'Will the student need after-school transportation to JPAC Academy?');
    const sourceUpdated=dateOrNull(pick(answers,'Date'))||new Date().toISOString();
    const externalId=`JF-${submissionId}`;
    const noteParts=[
      pick(answers,'Transportation Notes')&&`Transportation: ${pick(answers,'Transportation Notes')}`,
      pick(answers,'Please briefly explain why scholarship support would be helpful to your family.')&&`Scholarship reason: ${pick(answers,'Please briefly explain why scholarship support would be helpful to your family.')}`,
      pick(answers,'Is there anything else you would like JPAC to consider when reviewing this request?')&&`Scholarship consideration: ${pick(answers,'Is there anything else you would like JPAC to consider when reviewing this request?')}`,
      pick(answers,'Why would financial assistance be helpful for your family?')&&`Financial assistance: ${pick(answers,'Why would financial assistance be helpful for your family?')}`,
      pick(answers,'Are there any circumstances JPAC should consider?')&&`Circumstances: ${pick(answers,'Are there any circumstances JPAC should consider?')}`
    ].filter(Boolean).join('\n');

    const row={
      external_student_id:externalId,first_name:first,last_name:last,email:pick(answers,'Student Email')||null,phone:pick(answers,'Student Phone')||null,
      date_of_birth:dob||null,school_name:pick(answers,'School Name')||null,grade_level:pick(answers,'Grade Level')||null,
      address_line1:pick(answers,'Street Address')||null,address_line2:pick(answers,'Address Line 2')||null,city:pick(answers,'City')||null,state:pick(answers,'State')||null,postal_code:pick(answers,'ZIP Code')||null,
      course_id:courseId,enrollment_status:'pending',admissions_stage:'application',enrollment_source:'import',student_type:studentType(dob),academy_experience:norm(transportation)==='yes'?'campus':'online',
      creative_interests:[primary,secondary].filter(Boolean),experience_level:pick(answers,'Experience Level')||null,practice_availability:pick(answers,'Preferred Class Day / Time')||null,
      guardian_name:[guardianFirst,guardianLast].filter(Boolean).join(' ')||null,guardian_email:pick(answers,'Guardian Email')||null,guardian_phone:pick(answers,'Guardian Phone')||null,guardian_relationship:pick(answers,'Relationship to Student')||'guardian',
      secondary_program:secondary||null,transportation_needed:transportation||null,transportation_pickup:pick(answers,'School / Pickup Location')||null,authorized_pickup_names:pick(answers,'Authorized Pickup Persons')||null,
      scholarship_status:scholarshipRequested?'Requested':'Not Requested',scholarship_type:scholarshipRequested?'Financial Assistance':null,
      photo_release_consent:yes(pick(answers,'Photo / Video Release Consent')),digital_communication_consent:yes(pick(answers,'Digital Communication Consent')),
      medical_accessibility_notes:[pick(answers,'Medical, allergy, accessibility, learning, or support information JPAC should know'),pick(answers,'Accommodations or support strategies that help the student succeed')].filter(Boolean).join('\n')||null,
      source_updated_at:sourceUpdated,notes:noteParts,
      intake_payload:{submission_id:submissionId,preferred_name:preferred,middle_name:middle,primary_program:primary,secondary_program:secondary,student_interests_goals:pick(answers,'Student Interests and Goals'),secondary_guardian_name:pick(answers,'Secondary Guardian Name'),secondary_guardian_email:pick(answers,'Secondary Guardian Email'),secondary_guardian_phone:pick(answers,'Secondary Guardian Phone'),emergency_contact_name:pick(answers,'Emergency Contact Name'),emergency_contact_relationship:pick(answers,'Emergency Contact Relationship'),emergency_contact_phone:pick(answers,'Emergency Contact Phone'),typed_signature:pick(answers,'Typed Full Name / Electronic Signature'),tuition_option:scholarshipChoice},
      updated_at:new Date().toISOString()
    };
    if(!row.first_name||!row.last_name)return json(res,422,{error:'Student name fields could not be mapped',submission_id:submissionId});
    const{data,error}=await supabase.from('pending_students').upsert(row,{onConflict:'external_student_id'}).select('id,external_student_id,display_name,admissions_stage,scholarship_status,course_id').single();
    if(error)throw error;
    await supabase.from('integration_events').upsert({provider:'jotform',external_event_id:submissionId,event_type:'student.enrollment.submitted',processing_status:'processed',payload:{form_id:FORM_ID,external_student_id:externalId},processed_at:new Date().toISOString()},{onConflict:'provider,external_event_id'});
    return json(res,200,{ok:true,student:data});
  }catch(error){return json(res,500,{error:error instanceof Error?error.message:'Webhook processing failed'})}
}
