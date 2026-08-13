import{buildCourseCurriculumExport,buildLevelCurriculumExport,buildModuleCurriculumExport,serializeCurriculumExport}from'./curriculumExport';
import type{CurriculumExportInput}from'../types/curriculumExport';

const moduleBase={sort_order:1,status:'draft',description:'Fixture module',short_intro:'Begin here.',career_connection:'Creative foundation',aria_coaching_targets:{focus:['safe technique']},career_mission_ideas:[],portfolio_moment:false,portfolio_ready_threshold:null,intro_core_xp:50,video_core_xp:100,assignment_core_xp:350,mastery_core_xp:125,core_xp:625,core_unlock_threshold:438,primary_video_url:null,video_provider:null,video_title:null,video_duration_seconds:null,video_brief:'Needs review',jpac_tool_activity:{status:'NEEDS CATALOG REVIEW'},real_world_activity:{title:'Independent practice'},lab_tool_id:null,review_notes:'Fixture only'};
const activityBase={description:'Fixture activity',instructions:'Submit approved evidence.',submission_type:'video',status:'draft',passing_score:70,allows_resubmission:true,portfolio_candidate:false};
const makeFixture=(slug:string,title:string,moduleTitle:string):CurriculumExportInput=>({
  course:{id:`${slug}-course-id`,slug,title,description:`${title} course`,status:'draft'},
  level:{id:`${slug}-level-id`,level_number:1,title:'Beginner',status:'draft'},
  module:{...moduleBase,id:`${slug}-module-id`,level_module_number:1,title:moduleTitle},
  lessons:[{id:`${slug}-lesson-id`,title:'Foundation Lesson',description:'Fixture lesson',status:'draft',sort_order:1,duration_minutes:10,short_summary:'Start safely.',learning_objective:'Demonstrate a safe foundation.',content_blocks:[{heading:'Concept',body:'Practice carefully.'}],technique_cues:['Stay relaxed'],common_mistakes:['Rushing'],self_check:'Can you repeat this comfortably?',wix_lesson_url:null}],
  activities:[
    {...activityBase,id:`${slug}-practice-id`,title:'Guided Practice',activity_type:'practice',xp_reward:0,xp_type:'bonus',required:false,rubric:{}},
    {...activityBase,id:`${slug}-challenge-id`,title:'Foundation Challenge',activity_type:'performance',xp_reward:350,xp_type:'core',required:true,rubric:{criteria:[{name:'Technique',weight:50},{name:'Preparation',weight:50}]}}
  ],media:[],tool:null
});

export const singingModule1ExportFixture=makeFixture('singing','Singing','Breath, Alignment & Vocal Health');
export const pianoModule1ExportFixture=makeFixture('piano','Piano','Piano Posture and Hand Position');
const pianoModule2ExportFixture:CurriculumExportInput={...makeFixture('piano','Piano','Finding Middle C'),module:{...moduleBase,id:'piano-module-2-id',level_module_number:2,sort_order:2,title:'Finding Middle C'},lessons:makeFixture('piano','Piano','Finding Middle C').lessons.map(lesson=>({...lesson,id:'piano-module-2-lesson-id'})),activities:makeFixture('piano','Piano','Finding Middle C').activities.map((activity,index)=>({...activity,id:`piano-module-2-activity-${index+1}-id`}))};
export const pianoLevel1ExportFixture={course:pianoModule1ExportFixture.course,level:pianoModule1ExportFixture.level,modules:[pianoModule2ExportFixture,pianoModule1ExportFixture]};
const pianoLevel2Module1ExportFixture:CurriculumExportInput={...makeFixture('piano','Piano','Chord Inversions'),level:{id:'piano-level-2-id',level_number:2,title:'Intermediate',status:'draft'},module:{...moduleBase,id:'piano-level-2-module-1-id',level_module_number:1,sort_order:13,title:'Chord Inversions'},lessons:makeFixture('piano','Piano','Chord Inversions').lessons.map(lesson=>({...lesson,id:'piano-level-2-module-1-lesson-id'})),activities:makeFixture('piano','Piano','Chord Inversions').activities.map((activity,index)=>({...activity,id:`piano-level-2-module-1-activity-${index+1}-id`}))};
export const pianoCourseExportFixture={course:pianoModule1ExportFixture.course,modules:[pianoLevel2Module1ExportFixture,pianoModule2ExportFixture,pianoModule1ExportFixture]};

export function verifyCurriculumExportFixtures(){
  const timestamp='2026-08-12T00:00:00.000Z';
  const modulesPass=[singingModule1ExportFixture,pianoModule1ExportFixture].every(fixture=>{
    const first=serializeCurriculumExport(buildModuleCurriculumExport(fixture,false,timestamp));
    const second=serializeCurriculumExport(buildModuleCurriculumExport(fixture,false,timestamp));
    const withIds=serializeCurriculumExport(buildModuleCurriculumExport(fixture,true,timestamp));
    return first===second&&buildModuleCurriculumExport(fixture,false,timestamp).contract_version==='1.2.0'&&!first.includes('"database_id":')&&withIds.includes('"database_id":');
  });
  const first=buildLevelCurriculumExport(pianoLevel1ExportFixture,false,timestamp);
  const second=buildLevelCurriculumExport(pianoLevel1ExportFixture,false,timestamp);
  const withIds=buildLevelCurriculumExport(pianoLevel1ExportFixture,true,timestamp);
  const moduleNumbers=first.level.modules.map(module=>module.module_number);
  const levelPass=serializeCurriculumExport(first)===serializeCurriculumExport(second)&&first.contract_version==='1.2.0'&&first.level.modules.length===2&&moduleNumbers[0]===1&&moduleNumbers[1]===2&&!serializeCurriculumExport(first).includes('"database_id":')&&serializeCurriculumExport(withIds).includes('"database_id":');
  const courseFirst=buildCourseCurriculumExport(pianoCourseExportFixture,false,timestamp);
  const courseSecond=buildCourseCurriculumExport(pianoCourseExportFixture,false,timestamp);
  const courseWithIds=buildCourseCurriculumExport(pianoCourseExportFixture,true,timestamp);
  const levels=courseFirst.course.levels;
  const coursePass=serializeCurriculumExport(courseFirst)===serializeCurriculumExport(courseSecond)&&courseFirst.contract_version==='1.2.0'&&courseFirst.summary.level_count===2&&courseFirst.summary.module_count===3&&courseFirst.summary.lesson_count===3&&courseFirst.summary.activity_count===6&&courseFirst.summary.warning_count===courseFirst.warnings.length&&levels[0].level_number===1&&levels[1].level_number===2&&levels[0].modules.map(module=>module.module_number).join(',')==='1,2'&&courseFirst.warnings.every(warning=>warning.course_slug==='piano'&&warning.level_number>0&&warning.module_number>0)&&!serializeCurriculumExport(courseFirst).includes('"database_id":')&&serializeCurriculumExport(courseWithIds).includes('"database_id":');
  return modulesPass&&levelPass&&coursePass;
}
