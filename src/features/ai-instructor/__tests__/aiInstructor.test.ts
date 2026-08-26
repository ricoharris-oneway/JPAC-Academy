import{runAssignmentCompletenessCheck}from'../assignmentPrecheck';
import{isCoachActionAllowed,PROTECTED_COACH_ACTIONS}from'../coachPolicy';
import{buildTeacherFeedbackRevisionPlan,getCoachGuidance,recommendCreatorTool}from'../ruleBasedCoach';

function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}

export function runAIInstructorUnitTests(){
  assert(PROTECTED_COACH_ACTIONS.every(action=>!isCoachActionAllowed(action)),'Every protected academic action must be blocked.');
  const precheck=runAssignmentCompletenessCheck({instructions:'Record one complete performance. Review your timing.',rubric:{criteria:[{name:'Timing and control'}]},hasPreparedEvidence:true});
  assert(precheck.label==='Completeness check only','Precheck must be labeled as completeness-only.');
  assert(precheck.items.some(item=>item.source==='rubric'),'Precheck must use authored rubric criteria.');
  assert(recommendCreatorTool('Practice steady rhythm and tempo').to==='/studio/tools/smart-metronome','Next-step recommendations must be deterministic.');
  const first=getCoachGuidance({surface:'lesson',title:'Steady Rhythm',objective:'Keep a steady tempo.'});const second=getCoachGuidance({surface:'lesson',title:'Steady Rhythm',objective:'Keep a steady tempo.'});
  assert(JSON.stringify(first)===JSON.stringify(second),'Identical context must produce identical guidance.');
  const revision=buildTeacherFeedbackRevisionPlan('Slow down the ending. Hold the final note longer.');
  assert(revision.length===3&&revision[0].includes('Slow down the ending'),'Teacher feedback must become deterministic revision steps.');
  const fallback=getCoachGuidance({surface:'lesson',title:'Lesson guidance'});
  assert(Boolean(fallback.explanation)&&fallback.practiceLink?.to==='/studio','Incomplete page context must produce safe generic guidance.');
  return 5;
}
