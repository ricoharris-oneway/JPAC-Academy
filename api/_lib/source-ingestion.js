import{createHash}from'node:crypto';

export const allowedFormats={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown'};
export const sourceTypes=['curriculum','teaching_standard','aria_standard','rubric_standard','practice_method','performance_standard','career_pathway','certificate_requirement','instructor_guidance','terminology','reference_material'];
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function validateSignature(buffer,format){
  if(format==='pdf'&&buffer.subarray(0,5).toString('ascii')!=='%PDF-')throw new Error('The uploaded file is not a valid PDF signature.');
  if(format==='docx'&&!(buffer[0]===0x50&&buffer[1]===0x4b&&buffer[2]===0x03&&buffer[3]===0x04))throw new Error('The uploaded file is not a valid DOCX container.');
  if((format==='txt'||format==='md')&&buffer.includes(0))throw new Error('Text sources must be UTF-8 text, not binary data.');
}
export function normalizeText(value){return String(value||'').replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
export async function extractDocument(buffer,format){
  if(format==='txt'||format==='md')return normalizeText(buffer.toString('utf8'));
  if(format==='docx'){const mammoth=await import('mammoth');const result=await mammoth.default.extractRawText({buffer});return normalizeText(result.value)}
  if(format==='pdf'){const{extractText}=await import('unpdf');const result=await extractText(new Uint8Array(buffer),{mergePages:true});return normalizeText(result.text)}
  throw new Error('Unsupported source format');
}
export function sanitizeProcessingError(error){
  const raw=error instanceof Error?error.message:String(error||'Source processing failed');
  return raw.replace(/(?:[A-Za-z]:\\|\/(?:var|tmp|home)\/)[^\s]*/g,'[server path]').replace(/(service[_-]?role|authorization|apikey|token)\s*[:=]\s*[^\s,;]+/gi,'$1=[redacted]').slice(0,500)||'Source processing failed';
}
export function sectionDocument(text){
  const paragraphs=normalizeText(text).split(/\n\s*\n/).filter(Boolean);const sections=[];let heading='Source Overview',content=[];
  const flush=()=>{const body=content.join('\n\n').trim();if(body)sections.push({heading,content:body});content=[]};
  for(const paragraph of paragraphs){const line=paragraph.trim();const headingLike=line.length<=100&&!/[.!?]$/.test(line)&&line.split(/\s+/).length<=12;if(headingLike){flush();heading=line.replace(/^#{1,6}\s*/,'')}else{content.push(line);if(content.join('\n\n').length>=2200)flush()}}
  flush();return sections.slice(0,200).map((section,index)=>({...section,sectionKey:`section-${String(index+1).padStart(3,'0')}`,sortOrder:index,contentHash:sha256(section.content)}));
}
