import{runAssignmentCompletenessCheck}from'./assignmentPrecheck';
import type{CoachContext,CoachGuidance,CoachLink}from'./types';

const toolRules:Array<[RegExp,CoachLink]>=[
  [/\bdance\b|movement|choreo|stage presence/i,{label:'Practice with Choreo Mirror',to:'/studio/tools/choreo-mirror'}],
  [/pitch|tune|vocal|intonation/i,{label:'Practice with Smart Tuner',to:'/studio/tools/smart-tuner'}],
  [/tempo|timing|steady|rhythm/i,{label:'Practice with Smart Metronome',to:'/studio/tools/smart-metronome'}],
  [/beat|loop|groove|production/i,{label:'Build in Loop Builder',to:'/studio/tools/loop-builder'}],
  [/notation|staff|sight.?read|note name/i,{label:'Practice Notation Trainer',to:'/studio/tools/notation-trainer'}],
  [/guitar|fret|strum/i,{label:'Practice Virtual Guitar',to:'/studio/tools/virtual-guitar'}],
  [/piano|keyboard|keys/i,{label:'Practice Virtual Piano',to:'/studio/tools/virtual-piano'}],
  [/chord|harmony|song|melody|lyric/i,{label:'Explore Harmony Builder',to:'/studio/tools/harmony-builder'}],
];

export function recommendCreatorTool(text:string):CoachLink{return toolRules.find(([pattern])=>pattern.test(text))?.[1]||{label:'Open Creative Studio',to:'/studio'}}

export function buildTeacherFeedbackRevisionPlan(feedback?:string|null){
  const points=(feedback||'').split(/\r?\n|(?<=[.!?])\s+/).map(value=>value.replace(/^[-*\d.)\s]+/,'').trim()).filter(value=>value.length>4).slice(0,4);
  if(!points.length)return[];
  return[...points.map((point,index)=>`${index+1}. Revise: ${point}`),`${points.length+1}. Compare the revision with the teacher feedback before resubmitting.`];
}

export function getCoachGuidance(context:CoachContext):CoachGuidance{
  const source=[context.title,context.objective,context.summary,context.authoredInstructions].filter(Boolean).join(' ');
  const practiceLink=context.practiceLink||recommendCreatorTool(source);
  const revisionSteps=buildTeacherFeedbackRevisionPlan(context.teacherFeedback);
  const precheck=context.surface==='module'?runAssignmentCompletenessCheck({instructions:context.authoredInstructions,rubric:context.rubric,hasPreparedEvidence:context.hasPreparedEvidence}):undefined;
  const surfaceCopy:Record<CoachContext['surface'],[string,string,string]>={hub:['Your creative path is connected','Use this hub to return to the right learning, practice, or review step.','Open the recommended next step and focus on one clear action.'],dashboard:['Welcome back—let’s choose one next move','Continue from your authorized learning scope, then use practice tools when they support the lesson.','Choose Continue Learning or review your active course.'],course:['See the path before you begin','Move through published modules and lessons in order. Your teacher remains responsible for final review.','Open the next published lesson or module in your course.'],module:['Turn the mission into manageable steps','Review the module expectation, learn the material, practice, and prepare the required challenge yourself.','Work through the checklist before deciding whether your work is ready.'],lesson:['Learn, practice, then continue','Focus on the authored objective and lesson material. The coach can explain the path but cannot complete the lesson for you.','Review the objective, read each learning block, and use the lesson controls yourself.'],tool:['Practice with a clear purpose','Use this local practice tool to build skill. Tool work does not award XP or update course progress.','Follow the Creative Workflow, then copy or save your notes locally.'],extra_credit:['Prepare a clear teacher-review snapshot','Extra credit is a teacher-reviewed pathway. The coach can help organize your summary but cannot submit or review it.','Check the project summary, add your own note, and submit only when you choose.'],revision:['Use feedback as your next creative step','Turn teacher feedback into a short revision plan, make the changes yourself, and return to the review pathway.','Complete each revision step before choosing to resubmit.']};
  const copy=surfaceCopy[revisionSteps.length?'revision':context.surface];
  return{label:'JPAC Coach guidance',headline:copy[0],explanation:context.objective||context.summary||copy[1],nextStep:copy[2],nextLink:context.nextLink,practiceLink,checklist:precheck?.items||[],revisionSteps,precheck};
}
