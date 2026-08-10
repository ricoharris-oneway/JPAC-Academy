import{json,parseBody}from'./_lib/integration.js';
import{requireCurriculumAdmin}from'./_lib/curriculum-context.js';
import{allowedFormats,extractDocument,sanitizeProcessingError,sectionDocument,sha256,sourceTypes,validateSignature}from'./_lib/source-ingestion.js';

export const config={api:{bodyParser:{sizeLimit:'10mb'}}};
const safeName=value=>String(value||'source').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,100);

async function processSource(supabase,source,buffer,scope={}){
  try{
    const text=await extractDocument(buffer,source.file_format);if(text.length<20)throw new Error('The document did not contain enough extractable text. Scanned PDFs require a future approved OCR workflow.');
    const sections=sectionDocument(text);if(!sections.length)throw new Error('No source sections could be produced.');
    const existing=await supabase.from('curriculum_source_sections').select('course_id,level_number,topic,keywords,metadata').eq('source_id',source.id).order('sort_order').limit(1).maybeSingle();if(existing.error)throw existing.error;
    const requestedCourseId=scope.courseId||existing.data?.course_id||null;
    const course=requestedCourseId?await supabase.from('courses').select('id').eq('id',requestedCourseId).maybeSingle():{data:null,error:null};if(course.error)throw course.error;if(requestedCourseId&&!course.data)throw new Error('The selected course no longer exists.');
    const levelNumber=scope.levelNumber?Number(scope.levelNumber):existing.data?.level_number||null;
    const topic=String(scope.topic||existing.data?.topic||'').trim()||null;
    const keywords=Array.isArray(existing.data?.keywords)&&existing.data.keywords.length?existing.data.keywords:String(scope.keywords||'').split(',').map(item=>item.trim().toLowerCase()).filter(Boolean);
    const metadata=existing.data?.metadata||{original_file_name:scope.fileName||null,source_hash:source.source_hash};
    const rows=sections.map(section=>({source_id:source.id,course_id:course.data?.id||null,level_number:levelNumber,topic,section_key:section.sectionKey,heading:section.heading,content:section.content,content_hash:section.contentHash,classification:source.source_type,keywords,sort_order:section.sortOrder,metadata}));
    const removed=await supabase.from('curriculum_source_sections').delete().eq('source_id',source.id);if(removed.error)throw removed.error;
    const inserted=await supabase.from('curriculum_source_sections').insert(rows);if(inserted.error)throw inserted.error;
    const ready=await supabase.from('curriculum_sources').update({processing_status:'ready',ready_at:new Date().toISOString(),processing_error:null,updated_at:new Date().toISOString()}).eq('id',source.id);if(ready.error)throw ready.error;
    return rows.length;
  }catch(error){
    await supabase.from('curriculum_source_sections').delete().eq('source_id',source.id);
    const message=sanitizeProcessingError(error);await supabase.from('curriculum_sources').update({processing_status:'failed',processing_error:message,ready_at:null,updated_at:new Date().toISOString()}).eq('id',source.id);throw Object.assign(new Error(message),{status:400});
  }
}

export default async function handler(req,res){
  try{
    const{supabase,user}=await requireCurriculumAdmin(req);
    if(req.method==='GET'){
      if(req.query?.sourceId){
        const source=await supabase.from('curriculum_sources').select('id,title,source_type,discipline,version,approval_status,file_format,file_size,source_hash,processing_status,processing_error,ready_at,approved_at,created_at,updated_at').eq('id',String(req.query.sourceId)).maybeSingle();if(source.error)return json(res,400,{error:source.error.message});if(!source.data)return json(res,404,{error:'Source not found'});
        const sections=await supabase.from('curriculum_source_sections').select('id,source_id,course_id,level_number,topic,section_key,heading,content,content_hash,classification,keywords,metadata,sort_order,created_at,updated_at,course:courses(id,title)').eq('source_id',source.data.id).order('sort_order',{ascending:true});if(sections.error)return json(res,400,{error:sections.error.message});
        const rows=sections.data||[];return json(res,200,{source:{...source.data,section_count:rows.length,character_count:rows.reduce((total,item)=>total+String(item.content||'').length,0)},sections:rows.map(item=>({...item,token_estimate:Math.ceil(String(item.content||'').length/4)}))});
      }
      const result=await supabase.from('curriculum_sources').select('id,title,source_type,discipline,version,approval_status,file_format,file_size,source_hash,processing_status,processing_error,ready_at,created_at,updated_at').order('created_at',{ascending:false}).limit(100);
      return result.error?json(res,400,{error:result.error.message}):json(res,200,{sources:result.data||[]});
    }
    const body=parseBody(req);
    if(req.method==='PATCH'){
      if(body.action==='retry'){
        if(!body.id)return json(res,400,{error:'A source ID is required for retry.'});
        const claimed=await supabase.from('curriculum_sources').update({processing_status:'processing',processing_error:null,ready_at:null,updated_at:new Date().toISOString()}).eq('id',body.id).eq('processing_status','failed').select('id,source_type,file_format,source_hash,storage_path').maybeSingle();
        if(claimed.error)return json(res,400,{error:sanitizeProcessingError(claimed.error)});if(!claimed.data)return json(res,409,{error:'Only a failed source can be retried.'});
        try{const downloaded=await supabase.storage.from('curriculum-sources').download(claimed.data.storage_path);if(downloaded.error)throw downloaded.error;const buffer=Buffer.from(await downloaded.data.arrayBuffer());validateSignature(buffer,claimed.data.file_format);const sectionCount=await processSource(supabase,claimed.data,buffer,body);return json(res,200,{sourceId:body.id,sectionCount,status:'ready'});}
        catch(error){const message=sanitizeProcessingError(error);await supabase.from('curriculum_source_sections').delete().eq('source_id',body.id);await supabase.from('curriculum_sources').update({processing_status:'failed',processing_error:message,ready_at:null,updated_at:new Date().toISOString()}).eq('id',body.id);return json(res,400,{error:message,sourceId:body.id});}
      }
      if(!body.id||!['approved','retired'].includes(body.approvalStatus))return json(res,400,{error:'Invalid source review request'});
      const now=new Date().toISOString();const approving=body.approvalStatus==='approved';const patch=approving?{approval_status:'approved',updated_at:now,approved_by:user.id,approved_at:now}:{approval_status:'retired',updated_at:now};
      let update=supabase.from('curriculum_sources').update(patch).eq('id',body.id).eq('approval_status',approving?'draft':'approved');if(approving)update=update.eq('processing_status','ready');
      const result=await update.select('id,approval_status,approved_at').maybeSingle();if(result.error)return json(res,400,{error:result.error.message});if(!result.data)return json(res,409,{error:approving?'Only a ready draft source can be approved.':'Only an approved source can be archived.'});return json(res,200,{source:result.data});
    }
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
    const format=String(body.format||'').toLowerCase();const type=String(body.sourceType||'');
    if(!allowedFormats[format]||!sourceTypes.includes(type)||!body.title||!body.version||!body.contentBase64)return json(res,400,{error:'Title, type, version, format, and file are required'});
    const buffer=Buffer.from(body.contentBase64,'base64');if(!buffer.length||buffer.length>10485760)return json(res,413,{error:'Source file must be between 1 byte and 10 MB'});validateSignature(buffer,format);
    const hash=sha256(buffer);const duplicate=await supabase.from('curriculum_sources').select('id,title').eq('source_hash',hash).maybeSingle();if(duplicate.data)return json(res,409,{error:`This exact source is already stored as ${duplicate.data.title}.`});
    const storagePath=`${user.id}/${hash}-${safeName(body.fileName||body.title)}.${format}`;
    const upload=await supabase.storage.from('curriculum-sources').upload(storagePath,buffer,{contentType:allowedFormats[format],upsert:false});if(upload.error)return json(res,400,{error:upload.error.message});
    let sourceId=null;
    try{
      const source=await supabase.from('curriculum_sources').insert({source_type:type,title:String(body.title).trim(),discipline:String(body.discipline||'').trim()||null,version:String(body.version).trim(),approval_status:'draft',created_by:user.id,file_format:format,mime_type:allowedFormats[format],file_size:buffer.length,source_hash:hash,storage_path:storagePath,processing_status:'processing'}).select('id').single();if(source.error)throw source.error;sourceId=source.data.id;
      const sectionCount=await processSource(supabase,{id:sourceId,source_type:type,file_format:format,source_hash:hash},buffer,body);
      return json(res,201,{sourceId,sectionCount,sourceHash:hash,status:'ready'});
    }catch(error){const message=sanitizeProcessingError(error);if(sourceId)await supabase.from('curriculum_sources').update({processing_status:'failed',processing_error:message,updated_at:new Date().toISOString()}).eq('id',sourceId);return json(res,400,{error:message,sourceId});}
  }catch(error){return json(res,error.status||500,{error:error instanceof Error?error.message:'Source ingestion failed'});}
}
