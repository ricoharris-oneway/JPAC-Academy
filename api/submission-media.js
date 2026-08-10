import{createServerSupabase,json,parseBody}from'./_lib/integration.js';

const SIGNED_URL_LIFETIME_SECONDS=300;
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return json(res,401,{ok:false,error:'Authentication required'});

  let admin;
  try{admin=createServerSupabase()}
  catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const{data:{user},error:userError}=await admin.auth.getUser(token);
  if(userError||!user)return json(res,401,{ok:false,error:'Invalid or expired session'});

  const{data:caller,error:callerError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(callerError)return json(res,500,{ok:false,error:'Unable to verify staff access'});
  if(!caller||!['teacher','admin','developer'].includes(caller.role))return json(res,403,{ok:false,error:'Teacher, Admin, or Developer access required'});

  const body=parseBody(req);
  const submissionId=typeof body.submissionId==='string'?body.submissionId:'';
  if(!UUID_PATTERN.test(submissionId))return json(res,400,{ok:false,error:'A valid submission is required'});

  const{data:submission,error:submissionError}=await admin
    .from('submissions')
    .select('id,student_id,media_url,media_type,activity:activities(submission_type)')
    .eq('id',submissionId)
    .maybeSingle();
  if(submissionError)return json(res,400,{ok:false,error:'Unable to load submission evidence'});
  if(!submission)return json(res,404,{ok:false,error:'Submission not found'});

  const storagePath=typeof submission.media_url==='string'?submission.media_url:'';
  const pathParts=storagePath.split('/');
  if(!storagePath||storagePath.startsWith('/')||storagePath.includes('://')||pathParts[0]!==submission.student_id){
    return json(res,400,{ok:false,error:'Submission does not contain valid private evidence'});
  }

  const folder=pathParts.slice(0,-1).join('/');const objectName=pathParts.at(-1)||'';
  const{data:objects,error:objectError}=await admin.storage.from('performance-submissions').list(folder,{limit:2,search:objectName});
  const object=objects?.find(item=>item.name===objectName);
  if(objectError||!object)return json(res,404,{ok:false,error:'Private submission evidence is unavailable'});

  const{data:signed,error:signedError}=await admin.storage
    .from('performance-submissions')
    .createSignedUrl(storagePath,SIGNED_URL_LIFETIME_SECONDS);
  if(signedError||!signed?.signedUrl)return json(res,404,{ok:false,error:'Private submission evidence is unavailable'});

  const activity=Array.isArray(submission.activity)?submission.activity[0]:submission.activity;
  const metadata=object.metadata&&typeof object.metadata==='object'?object.metadata:{};
  const declaredType=String(metadata.mimetype||submission.media_type||activity?.submission_type||'').toLowerCase();
  const mediaType=declaredType.includes('video')?'video':declaredType.includes('audio')?'audio':'unsupported';
  if(mediaType==='unsupported')return json(res,415,{ok:false,error:'This submission does not contain supported audio or video evidence'});

  return json(res,200,{
    ok:true,
    submissionId:submission.id,
    mediaType,
    signedUrl:signed.signedUrl,
    expiresIn:SIGNED_URL_LIFETIME_SECONDS
  });
}
