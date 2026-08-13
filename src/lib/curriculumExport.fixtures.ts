import{buildModuleCurriculumExport,serializeCurriculumExport}from'./curriculumExport';
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

export function verifyCurriculumExportFixtures(){
  const timestamp='2026-08-12T00:00:00.000Z';
  return [singingModule1ExportFixture,pianoModule1ExportFixture].every(fixture=>{
    const first=serializeCurriculumExport(buildModuleCurriculumExport(fixture,false,timestamp));
    const second=serializeCurriculumExport(buildModuleCurriculumExport(fixture,false,timestamp));
    const withIds=serializeCurriculumExport(buildModuleCurriculumExport(fixture,true,timestamp));
    return first===second&&!first.includes('"database_id":')&&withIds.includes('"database_id":');
  });
}
