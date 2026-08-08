import{json,parseBody,requireIntegrationSecret,createServerSupabase}from'./_lib/integration.js';

async function deliver(row){
  const endpoint=process.env.JPAC_NOTIFICATION_WEBHOOK_URL;
  if(!endpoint)return{ok:false,configurationPending:true,error:'JPAC_NOTIFICATION_WEBHOOK_URL is not configured'};
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-jpac-notification-secret':process.env.JPAC_NOTIFICATION_WEBHOOK_SECRET||''},body:JSON.stringify({eventType:'jpac_certificate_notification',queueId:row.id,to:String(row.recipient_email||'').split(',').map(value=>value.trim()).filter(Boolean),templateKey:row.template_key,payload:row.payload})});
    return{ok:response.ok,configurationPending:false,error:response.ok?'':`Notification endpoint returned ${response.status}`}
  }catch(error){return{ok:false,configurationPending:false,error:error instanceof Error?error.message:'Notification delivery failed'}}
}

export default async function handler(req,res){
  if(!['POST','GET'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});
  if(!process.env.JPAC_NOTIFICATION_WEBHOOK_URL)return json(res,503,{ok:false,error:'JPAC_NOTIFICATION_WEBHOOK_URL is not configured'});
  let supabase;try{supabase=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}
  const body=parseBody(req);const requested=Number(req.query?.limit||body.limit||20);const limit=Math.max(1,Math.min(Number.isFinite(requested)?requested:20,100));
  const{data:rows,error:claimError}=await supabase.rpc('jpac_claim_certificate_email_queue',{batch_size:limit});if(claimError)return json(res,500,{ok:false,error:claimError.message});
  const results=[];for(const row of rows||[]){const result=await deliver(row);await supabase.rpc('jpac_complete_certificate_email_delivery',{target_id:row.id,delivered:result.ok,error_text:result.error});results.push({id:row.id,delivered:result.ok,configurationPending:result.configurationPending,error:result.error||null})}
  return json(res,200,{ok:true,claimed:(rows||[]).length,delivered:results.filter(item=>item.delivered).length,waitingForConfiguration:results.filter(item=>item.configurationPending).length,results})
}
