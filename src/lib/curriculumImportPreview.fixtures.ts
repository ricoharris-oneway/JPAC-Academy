import{parseCurriculumImportPreview,validateCurriculumImportFile}from'./curriculumImportPreview';
import{CURRICULUM_IMPORT_MAX_BYTES}from'../types/curriculumImportPreview';
import type{ImportPreviewContext}from'../types/curriculumImportPreview';

const lesson=(title='Lesson')=>({sort_order:1,title,learning_objective:'Learn safely <script>alert(1)</script>'});
const activity=(title:string,role:string)=>({role,title,activity_type:role==='practice'?'practice':'performance',status:'draft'});
const module=(number:number,title=`Module ${number}`)=>({module_number:number,sort_order:number,title,status:'draft',lessons:[lesson()],activities:{practice:[activity('Practice','practice')],core_challenge:[activity('Challenge','core_challenge')],other:[]},media:{review_status:'NEEDS_REVIEW'},tool:{review_status:'NEEDS_CATALOG_REVIEW'},career_path_attachments:{status:'NOT_CONFIGURED',items:[]}});
const level=(number:number,count=2)=>({level_number:number,title:`Level ${number}`,status:'draft',modules:Array.from({length:count},(_,index)=>module(index+1))});
const envelope=(scope:Record<string,unknown>)=>({contract:'jpac-curriculum-export',contract_version:'1.2.0',export_scope:scope,warnings:[{code:'MEDIA_NEEDS_REVIEW',message:'Review media'}],course:{course_slug:'piano',title:'Piano',description:'<img src=x onerror=alert(1)>',status:'draft'}});
export const validModuleImportFixture={...envelope({type:'module',course_slug:'piano',level_number:1,module_number:1}),level:{level_number:1,title:'Beginner',status:'draft'},module:module(1,'Piano Posture')};
export const validLevelImportFixture={...envelope({type:'level',course_slug:'piano',level_number:1}),level:level(1)};
export const validCourseImportFixture={...envelope({type:'course',course_slug:'piano'}),summary:{level_count:99,module_count:99,lesson_count:99,activity_count:99,warning_count:99},course:{...envelope({}).course,database_id:'course-id',levels:[level(2),level(1)]}};
export const piano48ImportFixture={...envelope({type:'course',course_slug:'piano'}),course:{...envelope({}).course,levels:Array.from({length:4},(_,index)=>level(index+1,12))}};
const context:ImportPreviewContext={selected_course_slug:'piano',modules:[{level_number:1,module_number:1,title:'Piano Posture'}]};
const code=(value:unknown,ctx=context)=>{const result=parseCurriculumImportPreview(typeof value==='string'?value:JSON.stringify(value),ctx);return result.ok?'OK':result.findings[0]?.code};

export function verifyCurriculumImportPreviewFixtures(){
  const reused=parseCurriculumImportPreview(JSON.stringify(validModuleImportFixture),context);
  const created=parseCurriculumImportPreview(JSON.stringify({...validModuleImportFixture,export_scope:{type:'module',course_slug:'piano',level_number:1,module_number:2},module:module(2)}),context);
  const conflict=parseCurriculumImportPreview(JSON.stringify({...validModuleImportFixture,module:module(1,'Different title')}),context);
  const mismatch=parseCurriculumImportPreview(JSON.stringify({...validModuleImportFixture,export_scope:{type:'module',course_slug:'guitar',level_number:1,module_number:1},course:{...validModuleImportFixture.course,course_slug:'guitar'}}),context);
  const course=parseCurriculumImportPreview(JSON.stringify(validCourseImportFixture),context);
  const piano=parseCurriculumImportPreview(JSON.stringify(piano48ImportFixture),context);
  const duplicate={...validLevelImportFixture,level:{...validLevelImportFixture.level,modules:[module(1),module(1)]}};
  const malformed={...validModuleImportFixture,module:{...validModuleImportFixture.module,lessons:{}}};
  const missingIdentifiers={...validModuleImportFixture,export_scope:{type:'module',course_slug:'piano'}};
  const ids=course.ok&&course.preview.contains_database_ids;
  return reused.ok&&reused.preview.levels[0].modules[0].comparison_status==='WOULD_REUSE'&&created.ok&&created.preview.levels[0].modules[0].comparison_status==='WOULD_CREATE'&&conflict.ok&&conflict.preview.levels[0].modules[0].comparison_status==='POSSIBLE_CONFLICT'&&mismatch.ok&&mismatch.preview.levels[0].modules[0].comparison_status==='COURSE_MISMATCH'&&course.ok&&course.preview.levels[0].level_number===1&&course.preview.findings.some(item=>item.code==='SUMMARY_MISMATCH')&&ids&&piano.ok&&piano.preview.counts.levels===4&&piano.preview.counts.modules===48&&piano.preview.counts.lessons===48&&piano.preview.counts.activities===96&&code('{')==='INVALID_JSON'&&code([])==='TOP_LEVEL_OBJECT_REQUIRED'&&code({...validModuleImportFixture,contract:'wrong'})==='UNSUPPORTED_CONTRACT'&&code({...validModuleImportFixture,contract_version:'1.1.0'})==='UNSUPPORTED_VERSION'&&code({...validModuleImportFixture,export_scope:{type:'unknown',course_slug:'piano'}})==='INVALID_SCOPE'&&code(missingIdentifiers)==='LEVEL_NUMBER_MISSING'&&code(malformed)==='LESSONS_ARRAY_INVALID'&&code(duplicate)==='OK'&&parseCurriculumImportPreview(JSON.stringify(duplicate),context).ok&&validateCurriculumImportFile('course.txt',1)?.code==='FILE_TYPE_UNSUPPORTED'&&validateCurriculumImportFile('course.json',CURRICULUM_IMPORT_MAX_BYTES+1)?.code==='FILE_TOO_LARGE'&&code('x'.repeat(CURRICULUM_IMPORT_MAX_BYTES+1))==='PASTE_TOO_LARGE'&&reused.preview.course.description.includes('<img');
}
