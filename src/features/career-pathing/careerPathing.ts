export type CareerPath={id:string;title:string;icon:string;description:string;toolSlugs:string[]};
export type CareerPracticeTool={slug:string;title:string;icon:string;skills:string};

export const careerPaths:CareerPath[]=[
  {id:'vocalist-performer',title:'Vocalist & Performer',icon:'🎤',description:'Build pitch, timing, confidence, and stage-ready performance habits.',toolSlugs:['smart-tuner','smart-metronome','choreo-mirror']},
  {id:'musician-songwriter',title:'Musician & Songwriter',icon:'🎶',description:'Strengthen music literacy, harmony, instrument skills, and original ideas.',toolSlugs:['virtual-piano','virtual-guitar','harmony-builder','notation-trainer']},
  {id:'producer-creator',title:'Producer & Creative Technologist',icon:'🎛️',description:'Shape beats, arrangements, musical ideas, and creative production skills.',toolSlugs:['loop-builder','harmony-builder','virtual-piano']},
  {id:'dancer-stage-artist',title:'Dancer & Stage Artist',icon:'💃',description:'Develop movement control, timing, stage presence, and rehearsal discipline.',toolSlugs:['choreo-mirror','smart-metronome']},
];

export const careerPracticeTools:CareerPracticeTool[]=[
  {slug:'smart-tuner',title:'Smart Tuner',icon:'🎙️',skills:'Vocalist, musician, and performer skills'},
  {slug:'virtual-piano',title:'Virtual Piano',icon:'🎹',skills:'Musician, producer, and songwriter skills'},
  {slug:'virtual-guitar',title:'Virtual Guitar',icon:'🎸',skills:'Musician and songwriter skills'},
  {slug:'smart-metronome',title:'Smart Metronome',icon:'⏱️',skills:'Timing and live performance skills'},
  {slug:'loop-builder',title:'Loop Builder',icon:'🥁',skills:'Producer and songwriter skills'},
  {slug:'harmony-builder',title:'Harmony Builder',icon:'🎼',skills:'Songwriter and producer skills'},
  {slug:'choreo-mirror',title:'Choreo Mirror',icon:'🕺',skills:'Dancer and performer skills'},
  {slug:'notation-trainer',title:'Notation Trainer',icon:'🎵',skills:'Musician and music-literacy skills'},
];

const dailyCareerMoves=['Practice pitch accuracy like a studio vocalist.','Build timing like a confident live performer.','Create one portfolio-ready project step today.','Use a Creator Tool for 10 minutes to strengthen your path.','Connect today’s lesson to one skill your future career needs.','Turn teacher feedback into one focused creative revision.','Practice one small skill until it feels more dependable.']as const;

export function careerMoveForDate(date:Date):string{const day=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86_400_000);return dailyCareerMoves[((day%dailyCareerMoves.length)+dailyCareerMoves.length)%dailyCareerMoves.length]}
export function toolsForCareerPath(pathId:string):CareerPracticeTool[]{const path=careerPaths.find(item=>item.id===pathId)??careerPaths[0];return path.toolSlugs.map(slug=>careerPracticeTools.find(tool=>tool.slug===slug)).filter((tool):tool is CareerPracticeTool=>Boolean(tool))}
