import{json,requireIntegrationSecret,createServerSupabase}from'./_lib/integration.js';

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  if(!requireIntegrationSecret(req))return json(res,401,{ok:false,error:'Unauthorized'});

  let supabase;
  try{supabase=createServerSupabase()}catch(error){return json(res,500,{ok:false,error:error instanceof Error?error.message:'Server configuration is incomplete'})}

  const{data,error}=await supabase.rpc('jpac_validate_block_a');
  if(error)return json(res,500,{ok:false,error:error.message});
  return json(res,200,data||{ok:false,status:'No validation result'});
}
