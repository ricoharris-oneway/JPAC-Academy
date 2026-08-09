import{json,parseBody}from'./_lib/integration.js';
import{requireCurriculumAdmin}from'./_lib/curriculum-context.js';
import{allowedFormats,extractDocument,sectionDocument,sha256,sourceTypes,validateSignature}from'./_lib/source-ingestion.js';

export const config={api:{bodyParser:{sizeLimit:'10mb'}}};
const safeName=value=>String(value||'source').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(0,100);

export default async function handler(req,res){
  try{
    const{supabase,user}=await requireCurriculumAdmin(req);
    if(req.method==='GET'){
      const result=await supabase.from('curriculum_sources').select('id,title,source_type,discipline,version,approval_status,file_format,file_size,source_hash,processing_status,processing_error,ready_at,created_at,updated_at').order('created_at',{ascending:false}).limit(100);
      return result.error?json(res,400,{error:result.error.message}):json(res,200,{sources:result.data||[]});
    }
    const body=parseBody(req);
    if(req.method==='PATCH'){
      if(!body.id||!['approved','retired'].includes(body.approvalStatus))return json(res,400,{error:'Invalid source review request'});
      const patch={approval_status:body.approvalStatus,updated_at:new Date().toISOString(),approved_by:body.approvalStatus==='approved'?user.id:null,approved_at:body.approvalStatus==='approved'?new Date().toISOString():null};
      const result=await supabase.from('curriculum_sources').update(patch).eq('id',body.id).select('id,approval_status').single();return result.error?json(res,400,{error:result.error.message}):json(res,200,{source:result.data});
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
      const text=await extractDocument(buffer,format);if(text.length<20)throw new Error('The document did not contain enough extractable text. Scanned PDFs require a future approved OCR workflow.');
      const sections=sectionDocument(text);if(!sections.length)throw new Error('No source sections could be produced.');
      const course=body.courseId?await supabase.from('courses').select('id').eq('id',body.courseId).maybeSingle():{data:null,error:null};if(course.error)throw course.error;
      const rows=sections.map(section=>({source_id:sourceId,course_id:course.data?.id||null,level_number:body.levelNumber?Number(body.levelNumber):null,topic:String(body.topic||'').trim()||null,section_key:section.sectionKey,heading:section.heading,content:section.content,content_hash:section.contentHash,classification:type,keywords:String(body.keywords||'').split(',').map(item=>item.trim().toLowerCase()).filter(Boolean),sort_order:section.sortOrder,metadata:{original_file_name:body.fileName||null,source_hash:hash}}));
      const inserted=await supabase.from('curriculum_source_sections').insert(rows);if(inserted.error)throw inserted.error;
      const ready=await supabase.from('curriculum_sources').update({processing_status:'ready',ready_at:new Date().toISOString(),processing_error:null,updated_at:new Date().toISOString()}).eq('id',sourceId);if(ready.error)throw ready.error;
      return json(res,201,{sourceId,sectionCount:rows.length,sourceHash:hash,status:'ready'});
    }catch(error){if(sourceId)await supabase.from('curriculum_sources').update({processing_status:'failed',processing_error:String(error.message||error).slice(0,1000),updated_at:new Date().toISOString()}).eq('id',sourceId);return json(res,400,{error:error.message||'Source processing failed',sourceId});}
  }catch(error){return json(res,error.status||500,{error:error instanceof Error?error.message:'Source ingestion failed'});}
}
