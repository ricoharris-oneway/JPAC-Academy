import{json,parseBody,requireIntegrationSecret,createServerSupabase,postToWix}from'./_lib/integration.js';

export default async function handler(req,res){
  if(!['POST','GET'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});

  let supabase;
  try{supabase=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const body=parseBody(req);const requested=Number(req.query?.limit||body.limit||20);const limit=Math.max(1,Math.min(Number.isFinite(requested)?requested:20,100));
  const{data:rows,error:claimError}=await supabase.rpc('jpac_claim_integration_outbox',{batch_size:limit});
  if(claimError)return json(res,500,{ok:false,error:claimError.message});

  const results=[];
  for(const row of rows||[]){
    const delivery=await postToWix(row.payload);
    if(!delivery.configured){results.push({id:row.id,delivered:false,status:null,error:delivery.errorText,configurationPending:true});continue}
    const{error:completeError}=await supabase.rpc('jpac_complete_integration_delivery',{target_id:row.id,delivered:delivery.delivered,http_status:delivery.status,response_text:delivery.responseText,error_text:delivery.errorText});
    results.push({id:row.id,delivered:delivery.delivered,status:delivery.status,error:completeError?.message||delivery.errorText||null});
  }

  return json(res,200,{ok:true,configured:Boolean(process.env.WIX_PROGRESS_WEBHOOK_URL),claimed:(rows||[]).length,delivered:results.filter(x=>x.delivered).length,failed:results.filter(x=>!x.delivered&&!x.configurationPending).length,waitingForWix:results.filter(x=>x.configurationPending).length,results});
}
