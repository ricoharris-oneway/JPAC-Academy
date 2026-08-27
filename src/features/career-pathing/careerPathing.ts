export type CareerCategory='performance'|'music-creation'|'stage-screen'|'creative-business'|'education-leadership';
export type CareerPathStatus='PARTIAL PATH'|'COMING LATER'|'UNDER REVIEW';
export type CareerPath={id:string;title:string;category:CareerCategory;icon:string;description:string;outcome:string;connectedPrograms:string[];toolSlugs:string[];status:CareerPathStatus};
export type CareerPracticeTool={slug:string;title:string;icon:string;skills:string};

export const careerCategories:ReadonlyArray<{id:'all'|CareerCategory;label:string}>=[
  {id:'all',label:'All 14 paths'},
  {id:'performance',label:'Performance'},
  {id:'music-creation',label:'Music creation & production'},
  {id:'stage-screen',label:'Stage & screen'},
  {id:'creative-business',label:'Creative business'},
  {id:'education-leadership',label:'Education & leadership'},
];

// Source: the reviewed 14-path catalog first defined in repository commit d448a849996b2e6222d956d20a854ddfc298c501.
export const careerPaths:CareerPath[]=[
  {id:'independent-recording-artist',title:'Independent Recording Artist',category:'music-creation',icon:'✦',outcome:'Develop, record, present, and support your own original artistic work.',description:'Connect vocal performance, original music, artist business, and visual storytelling in one cross-program journey.',connectedPrograms:['Singing','Music Production / Songwriting','Music Business','Video Production'],status:'PARTIAL PATH',toolSlugs:['smart-tuner','harmony-builder','loop-builder','smart-metronome']},
  {id:'vocal-performer',title:'Vocal Performer',category:'performance',icon:'◉',outcome:'Build the technique, confidence, and evidence for live and recorded vocal performance.',description:'Move from healthy foundations to advanced performance evidence and a reviewed vocal portfolio.',connectedPrograms:['Singing','Acting','Dance','Audio Engineering'],status:'UNDER REVIEW',toolSlugs:['smart-tuner','smart-metronome','choreo-mirror']},
  {id:'session-live-instrumentalist',title:'Session & Live Instrumentalist',category:'performance',icon:'♬',outcome:'Perform prepared instrumental material reliably in sessions, ensembles, and live events.',description:'Build instrumental technique, timing, repertoire, session preparation, and a professional performance reel.',connectedPrograms:['Piano','Guitar','Audio Engineering'],status:'COMING LATER',toolSlugs:['virtual-piano','virtual-guitar','smart-metronome','notation-trainer']},
  {id:'songwriter-composer',title:'Songwriter & Composer',category:'music-creation',icon:'✎',outcome:'Create original songs, arrangements, or scores and present a reviewed body of work.',description:'Develop songcraft from foundations through revision and an original-works portfolio.',connectedPrograms:['Music Production / Songwriting','Piano','Guitar','Singing'],status:'COMING LATER',toolSlugs:['harmony-builder','virtual-piano','virtual-guitar','notation-trainer']},
  {id:'music-producer',title:'Music Producer',category:'music-creation',icon:'◫',outcome:'Develop recordings from creative concept through arrangement, production, and delivery.',description:'Combine production and audio foundations with a finished-track project and producer portfolio.',connectedPrograms:['Music Production / Songwriting','Audio Engineering','Piano','Singing'],status:'COMING LATER',toolSlugs:['loop-builder','harmony-builder','virtual-piano','smart-metronome']},
  {id:'audio-engineer',title:'Audio Engineer',category:'music-creation',icon:'⌁',outcome:'Record, edit, mix, evaluate, and deliver technically reliable audio.',description:'Build recording fundamentals, clean-capture evidence, mixing skills, and an engineering portfolio.',connectedPrograms:['Audio Engineering','Music Production / Songwriting','Video Production'],status:'COMING LATER',toolSlugs:['smart-tuner','loop-builder','smart-metronome']},
  {id:'music-director',title:'Music Director',category:'education-leadership',icon:'◆',outcome:'Lead rehearsals, arrangements, performers, and musical preparation.',description:'Combine musicianship with arrangement, rehearsal leadership, and directed-performance evidence.',connectedPrograms:['Piano','Guitar','Singing','Music Production / Songwriting'],status:'COMING LATER',toolSlugs:['virtual-piano','virtual-guitar','harmony-builder','smart-metronome']},
  {id:'actor',title:'Actor',category:'stage-screen',icon:'◐',outcome:'Prepare and perform credible character, scene, monologue, audition, and camera work.',description:'Progress from acting foundations to scene development and an audition-ready portfolio.',connectedPrograms:['Acting','Singing','Dance','Video Production'],status:'COMING LATER',toolSlugs:['choreo-mirror','smart-metronome']},
  {id:'voice-actor',title:'Voice Actor',category:'stage-screen',icon:'◖',outcome:'Deliver character, commercial, narration, and recorded voice performances.',description:'Join voice performance, acting, recording technique, and a reviewed voice reel.',connectedPrograms:['Acting','Singing','Audio Engineering'],status:'COMING LATER',toolSlugs:['smart-tuner','smart-metronome']},
  {id:'professional-dancer',title:'Professional Dancer',category:'performance',icon:'◇',outcome:'Perform choreography with technique, timing, consistency, and presence.',description:'Build dance foundations, performance consistency, and a reviewed dance reel.',connectedPrograms:['Dance','Acting','Video Production'],status:'COMING LATER',toolSlugs:['choreo-mirror','smart-metronome']},
  {id:'choreographer-movement-director',title:'Choreographer & Movement Director',category:'education-leadership',icon:'⌘',outcome:'Design, teach, rehearse, and direct purposeful movement.',description:'Develop movement foundations into original choreography, safe rehearsal leadership, and a directed portfolio.',connectedPrograms:['Dance','Acting','Video Production'],status:'COMING LATER',toolSlugs:['choreo-mirror','smart-metronome','loop-builder']},
  {id:'film-video-content-creator',title:'Film, Video & Content Creator',category:'stage-screen',icon:'▣',outcome:'Plan, capture, direct, edit, and present coherent visual stories.',description:'Move from video foundations through direction and editing skills to a reviewed film or content portfolio.',connectedPrograms:['Video Production','Acting','Audio Engineering','Music Business'],status:'COMING LATER',toolSlugs:['loop-builder','smart-metronome','choreo-mirror']},
  {id:'creative-business-entrepreneurship',title:'Creative Business & Entrepreneurship',category:'creative-business',icon:'△',outcome:'Plan and operate a responsible creative venture, release, service, or brand.',description:'Connect an artistic foundation to business knowledge, professional operations, and evidence of a creative venture.',connectedPrograms:['Music Business','Video Production','Music Production / Songwriting'],status:'COMING LATER',toolSlugs:['loop-builder','harmony-builder']},
  {id:'creative-arts-educator',title:'Creative Arts Educator',category:'education-leadership',icon:'✺',outcome:'Teach an artistic discipline with competence, safety, clarity, and reflection.',description:'Pair verified discipline development with lesson planning, authorized teaching demonstration, and educator evidence.',connectedPrograms:['Any approved artistic discipline','Music Business','Video Production'],status:'COMING LATER',toolSlugs:['smart-metronome','notation-trainer','choreo-mirror']},
];

export const careerPracticeTools:CareerPracticeTool[]=[
  {slug:'smart-tuner',title:'Smart Tuner',icon:'🎙️',skills:'Pitch, listening, and performance preparation'},
  {slug:'virtual-piano',title:'Virtual Piano',icon:'🎹',skills:'Keyboard, harmony, songwriting, and arranging'},
  {slug:'virtual-guitar',title:'Virtual Guitar',icon:'🎸',skills:'Fretboard, chords, songwriting, and live playing'},
  {slug:'smart-metronome',title:'Smart Metronome',icon:'⏱️',skills:'Timing, rehearsal discipline, and ensemble readiness'},
  {slug:'loop-builder',title:'Loop Builder',icon:'🥁',skills:'Beat creation, production, rhythm, and content scoring'},
  {slug:'harmony-builder',title:'Harmony Builder',icon:'🎼',skills:'Chord progressions, songwriting, and arranging'},
  {slug:'choreo-mirror',title:'Choreo Mirror',icon:'🕺',skills:'Movement, stage presence, rehearsal, and direction'},
  {slug:'notation-trainer',title:'Notation Trainer',icon:'🎵',skills:'Music literacy, arranging, and teaching foundations'},
];

const dailyCareerMoves=['Practice pitch accuracy like a studio vocalist.','Build timing like a confident live performer.','Create one portfolio-ready project step today.','Use a Creator Tool for 10 minutes to strengthen your path.','Connect today’s lesson to one skill your future career needs.','Turn teacher feedback into one focused creative revision.','Practice one small skill until it feels more dependable.']as const;
const toolBySlug=new Map(careerPracticeTools.map(tool=>[tool.slug,tool]));

export function careerMoveForDate(date:Date):string{const day=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86_400_000);return dailyCareerMoves[((day%dailyCareerMoves.length)+dailyCareerMoves.length)%dailyCareerMoves.length]}
export function toolsForCareerPath(pathId:string):CareerPracticeTool[]{const path=careerPaths.find(item=>item.id===pathId)??careerPaths[0];return path.toolSlugs.map(slug=>toolBySlug.get(slug)).filter((tool):tool is CareerPracticeTool=>Boolean(tool))}
