import{presentStudentProgress}from'../progressPresentation';
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
export function runProgressPresentationUnitTests():number{
  const pilot=presentStudentProgress({progress:100,courseSlug:'singing',publishedModuleCount:1,level:1});
  assert(pilot.wording==='Pilot module complete · Level 1','A completed Singing pilot must not imply full-program completion.');
  assert(pilot.barPercent===100&&pilot.scope==='pilot-module','Pilot presentation may retain the full published-scope bar.');
  const partial=presentStudentProgress({progress:42.4,courseSlug:'singing',publishedModuleCount:1,level:1});
  assert(partial.wording==='42% published pilot module progress · Level 1','Partial pilot wording must identify its published scope.');
  const published=presentStudentProgress({progress:100,courseSlug:'piano',publishedModuleCount:3,level:2});
  assert(published.wording==='100% published learning progress · Level 2','Non-pilot completion must identify published learning scope.');
  const missing=presentStudentProgress({progress:null,courseSlug:'singing',publishedModuleCount:1,level:1});
  assert(missing.wording==='Progress syncing · Level 1'&&missing.barPercent===null,'Unknown progress must not display a misleading percentage.');
  const emptyScope=presentStudentProgress({progress:0,courseSlug:'piano',publishedModuleCount:0});
  assert(emptyScope.wording==='Progress syncing'&&emptyScope.numericPercent===null,'A course without published scope must not display zero percent.');
  return 6;
}
