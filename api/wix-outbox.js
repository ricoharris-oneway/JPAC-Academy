import{createClient}from'@supabase/supabase-js';

const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))};

export default async function handler(req,res){
  if(!['POST','GET'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
  const supplied=req.headers['x-jpac-wix-secret']||req.headers.authorization?.replace(/^Bearer\s+/i,'');
  if(!process.env.JPAC_WIX_SYNC_SECRET||supplied!==process.env.JPAC_WIX_SYNC_SECRET)return json(res,401,{ok:false,error:'Unauthorized'});
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return json(res,500,{ok:false,error:'Server configuration is incomplete'});
  if(!process.env.WIX_PROGRESS_WEBHOOK_URL)return json(res,503,{ok:false,error:'WIX_PROGRESS_WEBHOOK_URL is not configured'});

  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const requested=Number(req.query?.limit||req.body?.limit||20);
  const limit=Math.max(1,Math.min(Number.isFinite(requested)?requested:20,100));
  const{data:rows,error:claimError}=await supabase.rpc('jpac_claim_integration_outbox',{batch_size:limit});
  if(claimError)return json(res,500,{ok:false,error:claimError.message});

  const results=[];
  for(const row of rows||[]){
    let delivered=false,status=null,responseText='',errorText='';
    try{
      const response=await fetch(process.env.WIX_PROGRESS_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json','x-jpac-wix-secret':process.env.JPAC_WIX_SYNC_SECRET},body:JSON.stringify(row.payload)});
      status=response.status;responseText=await response.text();delivered=response.ok;
      if(!response.ok)errorText=`Wix endpoint returned ${response.status}`;
    }catch(error){errorText=error instanceof Error?error.message:'Unknown Wix delivery error'}

    const{error:completeError}=await supabase.rpc('jpac_complete_integration_delivery',{target_id:row.id,delivered,http_status:status,response_text:responseText,error_text:errorText});
    results.push({id:row.id,delivered,status,error:completeError?.message||errorText||null});
  }

  return json(res,200,{ok:true,claimed:(rows||[]).length,delivered:results.filter(x=>x.delivered).length,failed:results.filter(x=>!x.delivered).length,results});
}
