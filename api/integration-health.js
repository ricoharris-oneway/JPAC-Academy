import{json,requireIntegrationSecret,configuration,createServerSupabase}from'./_lib/integration.js';

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});

  const config=configuration();
  let database={connected:false,error:null};
  let queues={incomingErrors:0,outboundPending:0,outboundFailed:0};
  try{
    const supabase=createServerSupabase();
    const[{count:incomingErrors,error:incomingError},{count:outboundPending,error:pendingError},{count:outboundFailed,error:failedError}]=await Promise.all([
      supabase.from('integration_events').select('id',{count:'exact',head:true}).eq('processing_status','error'),
      supabase.from('integration_outbox').select('id',{count:'exact',head:true}).in('delivery_status',['pending','retry']),
      supabase.from('integration_outbox').select('id',{count:'exact',head:true}).eq('delivery_status','failed')
    ]);
    const firstError=incomingError||pendingError||failedError;
    database={connected:!firstError,error:firstError?.message||null};
    queues={incomingErrors:incomingErrors||0,outboundPending:outboundPending||0,outboundFailed:outboundFailed||0};
  }catch(error){database={connected:false,error:error instanceof Error?error.message:'Unknown database health error'}}

  const required=config.SUPABASE_URL&&config.SUPABASE_SERVICE_ROLE_KEY&&config.JPAC_WIX_SYNC_SECRET;
  return json(res,required&&database.connected?200:503,{ok:required&&database.connected,status:required&&database.connected?'operational':'configuration_required',configuration:config,database,queues,wixProgressReturn:config.WIX_PROGRESS_WEBHOOK_URL?'configured':'waiting_for_wix_endpoint',checkedAt:new Date().toISOString()});
}
