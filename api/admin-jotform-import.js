import{createServerSupabase,json,parseBody}from'./_lib/integration.js';
const FORM_ID='262598816503062';
const API='https://api.jotform.com';
async function jotform(path){
 const key=process.env.JOTFORM_API_KEY;
 if(!key)throw new Error('JOTFORM_API_KEY is not configured in production');
 const response=await fetch(API+path,{headers:{APIKEY:key,Accept:'application/json'}});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||payload.responseCode>=400)throw new Error(payload.message||'Jotform request failed');
 return payload.content;
}
function answer(sub,term){
 return Object.values(sub.answers||{}).find(v=>String(v?.text||'').toLowerCase().includes(term))?.answer||'';
}
function value(v){if(typeof v==='string')return v;if(v&&typeof v==='object')return [v.first,v.last].filter(Boolean).join(' ');return''}
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\\s+/i,'');
 if(!token)return json(res,401,{error:'Authentication required'});
 try{
  const admin=createServerSupabase();
  const{data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)return json(res,401,{error:'Invalid session'});
  const{data:caller}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(!['admin','developer'].includes(caller?.role))return json(res,403,{error:'Administrator access required'});
  if(req.method==='GET'){
   const submissions=await jotform('/form/'+FORM_ID+'/submissions?limit=100&orderby=created_at');
   const items=(Array.isArray(submissions)?submissions:[]).map(s=>({
    submission_id:String(s.id),display_name:[value(answer(s,'student first name')),value(answer(s,'student last name'))].filter(Boolean).join(' ')||'Unnamed student',
    email:value(answer(s,'student email'))||null,created_at:s.created_at||null
   })).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
   return json(res,200,{ok:true,applications:items});
  }
  const body=parseBody(req);const id=String(body.submission_id||'');
  if(!/^\\d{10,25}$/.test(id))return json(res,400,{error:'Valid Jotform submission ID required'});
  const submission=await jotform('/submission/'+id);
  if(String(submission.form_id)!==FORM_ID)return json(res,400,{error:'Submission does not belong to JPAC enrollment form'});
  const externalId='JF-'+id;
  const{data:existing}=await admin.from('pending_students').select('id,email,linked_profile_id').eq('external_student_id',externalId).maybeSingle();
  if(existing)return json(res,200,{ok:true,pending_student_id:existing.id,existing:true,message:'Existing application found. Ready for administrator review.'});
  const secret=process.env.JPAC_JOTFORM_WEBHOOK_SECRET;
  if(!secret)return json(res,500,{error:'Existing Jotform intake secret is not configured'});
  const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||req.headers.host;
  const scheme=String(host).includes('localhost')?'http':'https';
  const payload={formID:FORM_ID,submissionID:id,rawRequest:JSON.stringify({formID:FORM_ID,submissionID:id,...submission})};
  const response=await fetch(scheme+'://'+host+'/api/jotform-student-webhook',{method:'POST',headers:{'Content-Type':'application/json','x-jpac-jotform-secret':secret},body:JSON.stringify(payload)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return json(res,response.status,{error:result.error||'Existing intake failed to import submission'});
  const{data:created}=await admin.from('pending_students').select('id').eq('external_student_id',externalId).maybeSingle();
  return json(res,200,{ok:true,pending_student_id:created?.id||null,message:'Application imported. You may now activate the student account.'});
 }catch(error){return json(res,500,{error:error instanceof Error?error.message:'Jotform import failed'})}
}
