import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { careerMoveForDate, careerPaths, careerPracticeTools, type CareerCategory } from '../features/career-pathing/careerPathing';
import { CareerCatalog, CareerFilters, CareerTools, categoryLabel, focusCareerDetail } from '../features/career-pathing/CareerCatalog';
import { useMemberJourney } from '../context/MemberJourneyContext';
import { continueDestination, loadMyCourses, type AcademyCourse } from '../lib/studentAccess';
import { supabase } from '../lib/supabase';
import '../styles/career-pathing.css';

type CareerMetrics={
  path_slug:string;
  connected_courses:number;
  accessible_courses:number;
  total_modules:number;
  completed_modules:number;
  approved_submissions:number;
  reviewed_growth:number;
  average_score:number;
  portfolio_items:number;
  career_xp:number;
};

type RoadmapStop={stop:number;course:string;level:number;first_module:number;last_module:number;required:number;completed:number;done:boolean;modules:{id:string;title:string;completed:boolean}[]};

const emptyMetrics:CareerMetrics={path_slug:'',connected_courses:0,accessible_courses:0,total_modules:0,completed_modules:0,approved_submissions:0,reviewed_growth:0,average_score:0,portfolio_items:0,career_xp:0};

function programMatches(course:AcademyCourse,program:string){
  const a=course.title.toLowerCase();
  const b=program.toLowerCase();
  return a===b||a.startsWith(b)||b.startsWith(a);
}

const careerMilestoneNames:Record<string,[string,string,string,string,string,string]>={
  'independent-recording-artist':['Define Your Artist Identity','Build Vocal & Song Skills','Record Your First Original','Refine Your Signature Sound','Create an Artist Portfolio','Plan Your First Release'],
  'vocal-performer':['Choose Your Vocal Direction','Master Breath & Pitch','Build Your Repertoire','Refine Stage Presence','Record a Vocal Showcase','Prepare for Auditions'],
  'session-live-instrumentalist':['Choose Your Instrument','Build Technique & Timing','Learn Session Repertoire','Rehearse With Feedback','Record a Performance Reel','Prepare for Live Sessions'],
  'songwriter-composer':['Find Your Writing Voice','Master Melody & Structure','Write an Original Song','Revise Lyrics & Harmony','Build a Song Catalog','Pitch Your Composition'],
  'music-producer':['Define Your Producer Sound','Build Beats & Arrangements','Produce an Original Track','Mix & Refine Production','Build a Producer Reel','Deliver a Finished Master'],
  'audio-engineer':['Learn Signal Flow','Practice Clean Recording','Edit & Organize Sessions','Mix With Critical Listening','Build a Mix Portfolio','Deliver Professional Audio'],
  'music-director':['Choose Your Musical Focus','Build Theory & Musicianship','Arrange for Performers','Lead a Rehearsal','Direct a Performance','Build a Direction Portfolio'],
  'actor':['Discover Your Character Voice','Build Acting Foundations','Perform a Scripted Scene','Develop With Direction','Record an Acting Reel','Prepare an Audition'],
  'voice-actor':['Explore Vocal Characters','Practice Diction & Delivery','Record a Voice Script','Refine With Direction','Produce a Voice Reel','Prepare for Casting'],
  'professional-dancer':['Choose Your Dance Style','Master Timing & Technique','Learn Full Choreography','Improve Performance Quality','Record a Dance Reel','Prepare for Auditions'],
  'choreographer-movement-director':['Find Your Movement Style','Develop Eight-Count Phrases','Create Original Choreography','Direct a Rehearsal','Film a Choreography Reel','Present a Directed Work'],
  'film-video-content-creator':['Develop Your Story Concept','Learn Camera & Composition','Capture Your First Scene','Edit & Refine Your Story','Build a Video Portfolio','Publish a Finished Project'],
  'creative-business-entrepreneurship':['Define Your Creative Venture','Identify Audience & Value','Build a Business Plan','Test Your Creative Offer','Create Brand Evidence','Prepare Your Launch'],
  'creative-arts-educator':['Choose Your Teaching Discipline','Build Subject Mastery','Design a Creative Lesson','Practice Teaching & Feedback','Create a Teaching Portfolio','Lead a Learning Session']
};
const careerMilestoneDetails:Record<string,[string,string,string,string,string,string]>={
 'film-video-content-creator':['Describe the audience, story, and purpose of a short video.','Practice framing, camera movement, lighting, and shot composition.','Plan and capture usable footage with intentional coverage.','Edit the sequence, sound, pacing, and visual continuity; revise using feedback.','Collect approved video projects demonstrating your creative and technical growth.','Present a polished film or content piece with clear production credits.'],
 'vocal-performer':['Choose the vocal style and performance goals you want to pursue.','Practice healthy breathing, pitch accuracy, phrasing, and vocal control.','Learn and rehearse contrasting songs appropriate for your voice.','Use instructor feedback to strengthen expression and stage confidence.','Record approved vocal performances demonstrating technique and interpretation.','Prepare a performance set or audition recording for review.'],
 'music-producer':['Identify the genre, mood, and musical identity of your productions.','Build rhythmic foundations, harmonic progressions, and arrangements.','Produce an original track from idea to structured session.','Use critical listening and instructor feedback to refine the production.','Collect approved tracks showing your production range and growth.','Prepare and deliver a complete production with organized project files.'],
 'songwriter-composer':['Identify your themes, influences, and songwriting goals.','Practice lyric writing, melody, harmony, and song structure.','Draft an original song with complete sections.','Revise the composition using instructor critique and musical experimentation.','Compile reviewed original songs and supporting demos.','Present a polished composition for performance, recording, or pitching.']
};
function pathMilestoneData(pathId:string,metrics:CareerMetrics){
 const generic=milestoneData(metrics);
 const names=careerMilestoneNames[pathId]||careerMilestoneNames['independent-recording-artist'];
 const details=careerMilestoneDetails[pathId];
 return generic.map((step,index)=>({...step,title:names[index],description:details?.[index]||(index===0?'Define your professional goal and the creative work you want to pursue.':index===1?'Complete relevant lessons and develop the essential techniques for this career.':index===2?'Demonstrate this career skill in an original practical assignment.':index===3?'Use instructor review to improve the quality and consistency of your work.':index===4?'Collect approved evidence of your progress in this professional discipline.':'Prepare a polished demonstration of your skills and professional readiness.')}));
}

function milestoneData(metrics:CareerMetrics){
  const portfolioReady=metrics.portfolio_items>0||metrics.approved_submissions>=3;
  const readiness=Math.min(1,metrics.completed_modules/Math.max(1,Math.min(metrics.total_modules,12)));
  return[
    {title:'Choose Your Direction',description:'You selected a career direction and gave your learning a purpose.',done:true},
    {title:'Build Real Skills',description:'Complete your first career-connected module and prove you can finish what you start.',done:metrics.completed_modules>=1},
    {title:'Prove Your Craft',description:'Earn approval on real creative work that demonstrates your developing skill.',done:metrics.approved_submissions>=1},
    {title:'Grow From Feedback',description:'Use instructor feedback as professional coaching and keep improving your work.',done:metrics.reviewed_growth>=1},
    {title:'Build Portfolio Evidence',description:'Collect strong reviewed work that shows what you can actually do.',done:portfolioReady},
    {title:'Career Readiness',description:'Keep building skill, evidence, consistency, and confidence toward your next real opportunity.',done:portfolioReady&&metrics.reviewed_growth>=3&&readiness>=.5},
  ];
}

export function CareerPathingPage(): JSX.Element {
  const { selectedPath: persistedPath, loading: journeyLoading, error: journeyError, selectPath } = useMemberJourney();
  const [category, setCategory] = useState<'all' | CareerCategory>('all');
  const [selectedPathId, setSelectedPathId] = useState(careerPaths[0].id);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [metrics,setMetrics]=useState<CareerMetrics>(emptyMetrics);
  const [roadmapStops,setRoadmapStops]=useState<RoadmapStop[]>([]);
  const [courses,setCourses]=useState<AcademyCourse[]>([]);
  const [metricsLoading,setMetricsLoading]=useState(true);
  const [popup,setPopup]=useState<{title:string;message:string}|null>(null);
  const [experienceTab,setExperienceTab]=useState<'growth'|'lab'|'spotlight'|'games'>('growth');
  const [explorePathId,setExplorePathId]=useState(careerPaths[0].id);
  const [spotlightCompleted,setSpotlightCompleted]=useState(false);
  const [rhythmHits,setRhythmHits]=useState(0);
  const [rhythmSequence,setRhythmSequence]=useState<number[]>([]);
  const [rhythmStatus,setRhythmStatus]=useState('');
  const [focusedMilestone,setFocusedMilestone]=useState<number|null>(null);


  useEffect(() => { if (persistedPath) setSelectedPathId(persistedPath); }, [persistedPath]);

  useEffect(()=>{
    let active=true;
    async function loadJourney(){
      if(!persistedPath||!supabase){setRoadmapStops([]);setMetricsLoading(false);return}
      setMetricsLoading(true);
      const[{data,error},courseResult,roadmapResult]=await Promise.all([
        supabase.rpc('jpac_my_career_journey',{target_path_slug:persistedPath}),
        loadMyCourses(),
        supabase.rpc('jpac_my_career_roadmap',{target_path_slug:persistedPath})
      ]);
      if(!active)return;
      if(!error&&data)setMetrics(data as CareerMetrics);
      setCourses(courseResult.data);
      setRoadmapStops(!roadmapResult.error&&Array.isArray(roadmapResult.data)?roadmapResult.data as RoadmapStop[]:[]);
      setMetricsLoading(false);
    }
    void loadJourney();
    return()=>{active=false};
  },[persistedPath]);

  const visiblePaths = careerPaths.filter(path => category === 'all' || path.category === category);
  const selectedPath = careerPaths.find(path => path.id === selectedPathId) ?? careerPaths[0];
  const primaryPath = careerPaths.find(path=>path.id===persistedPath)||selectedPath;
  const milestones=useMemo(()=>pathMilestoneData(primaryPath.id,metrics).map((item,index)=>({...item,done:roadmapStops[index]?.done===true,description:roadmapStops[index]?`${item.description} Required: ${roadmapStops[index].course}, Level ${roadmapStops[index].level}, Modules ${roadmapStops[index].first_module}–${roadmapStops[index].last_module}. Completed ${roadmapStops[index].completed} of ${roadmapStops[index].required} published modules.`:item.description})),[primaryPath.id,metrics,roadmapStops]);
  const completedMilestones=milestones.filter(item=>item.done).length;
  const activeMilestone=Math.min(milestones.length-1,milestones.findIndex(item=>!item.done)===-1?milestones.length-1:milestones.findIndex(item=>!item.done));
  const relevantCourses=courses.filter(course=>primaryPath.connectedPrograms.some(program=>programMatches(course,program)));
  const resume=continueDestination(relevantCourses.length?relevantCourses:courses);
  const progressPercent=Math.round(completedMilestones/milestones.length*100);

  const spotlightChallenges=[
    {name:'Sing the Hook',icon:'🎤',task:'Create a 20-second original vocal hook. Practice your breath, pitch, and expression.',skill:'Singing · Performance'},
    {name:'Beat Builder',icon:'🥁',task:'Tap out a four-bar rhythm, then experiment with changing its groove.',skill:'Music Production · Rhythm'},
    {name:'Dance in Eight',icon:'💃',task:'Create an original eight-count combination and repeat it with confidence.',skill:'Dance · Movement'},
    {name:'Write Four Bars',icon:'✍️',task:'Write four original bars around one emotion or story. Try two different flows.',skill:'Songwriting · Storytelling'},
    {name:'Scene Switch',icon:'🎭',task:'Deliver one short line in three different emotions. Notice what changes.',skill:'Acting · Expression'},
    {name:'Sound Detective',icon:'🎧',task:'Listen to a favorite clean song and identify the kick, snare, bass, and melody.',skill:'Audio Engineering · Listening'},
    {name:'Director for a Day',icon:'🎬',task:'Storyboard three camera shots that could tell a 15-second story.',skill:'Video Production · Storytelling'}
  ];
  const dayIndex=Math.floor(Date.now()/86400000)%spotlightChallenges.length;
  const spotlight=spotlightChallenges[dayIndex];
  const spotlightKey='jpac-spotlight-'+new Date().toISOString().slice(0,10);
  const exploredPath=careerPaths.find(path=>path.id===explorePathId)||careerPaths[0];
  function playRhythm(){
    const pattern=Array.from({length:4},()=>Math.floor(Math.random()*4));
    setRhythmSequence(pattern);setRhythmHits(0);setRhythmStatus('Repeat the four-beat pattern by tapping the pads in order.');
  }
  function tapRhythm(pad:number){
    if(!rhythmSequence.length)return;
    if(rhythmSequence[rhythmHits]!==pad){setRhythmSequence([]);setRhythmStatus('Not quite! Try a new pattern.');return;}
    if(rhythmHits===rhythmSequence.length-1){setRhythmSequence([]);setRhythmHits(0);setRhythmStatus('Perfect groove! You matched all four beats.');return;}
    setRhythmHits(value=>value+1);
  }


  useEffect(()=>{
    if(metricsLoading||!persistedPath)return;
    const key=`jpac-career-milestone-${persistedPath}`;
    const previous=Number(window.localStorage.getItem(key)||0);
    if(completedMilestones>previous){
      const milestone=milestones[Math.max(0,completedMilestones-1)];
      setPopup({
        title:previous===0?'Your Career Journey Is Active':`Milestone Reached: ${milestone.title}`,
        message:previous===0
          ?`JPAC will now connect your learning, approved work, feedback, and portfolio growth to your goal of becoming a ${primaryPath.title}.`
          :`You are moving closer to becoming a ${primaryPath.title}. Keep building evidence, accepting coaching, and getting better.`
      });
      window.localStorage.setItem(key,String(completedMilestones));
    }
  },[completedMilestones,metricsLoading,persistedPath,primaryPath.title,milestones]);

  async function saveSelectedPath(): Promise<void> {
    setSaving(true); setSaveMessage('');
    try {
      await selectPath(selectedPath.id);
      setSaveMessage('Your Career Path is saved.');
      setPopup({title:'Career Direction Updated',message:`Your JPAC experience will now center recommendations and career-development guidance on ${selectedPath.title}.`});
    }
    catch (error) { setSaveMessage(error instanceof Error ? error.message : 'Your Career Path could not be saved.'); }
    finally { setSaving(false); }
  }

  return <div className={`career-pathing-page career-experience-v2${paused ? ' career-motion-paused' : ''}`}>
    {popup&&<div className="career-popup-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPopup(null)}}><section className="career-milestone-popup" role="dialog" aria-modal="true" aria-labelledby="career-popup-title"><button className="career-popup-close" aria-label="Close career milestone" onClick={()=>setPopup(null)}>×</button><span>JPAC CAREER JOURNEY</span><div className="career-popup-icon">✦</div><h2 id="career-popup-title">{popup.title}</h2><p>{popup.message}</p><button className="button button-primary career-popup-action" onClick={()=>setPopup(null)}>Keep Going →</button></section></div>}

    <header className="career-pathing-hero">
      <div className="career-hero-copy"><span>JPAC Academy · Build the professional, not just the grade</span><h1>Build Your<br/><em>Creative Future</em></h1><p>Your course workflow remains your academic path. Career Pathing is the second layer that keeps you connected to who you are becoming, what your work proves, and what opportunity you are preparing for next.</p><div className="career-pathing-actions"><Link className="button button-primary career-primary-action" to={resume.to}>▶ CONTINUE MY ACADEMIC WORK</Link><a className="button button-secondary" href="#career-selected-path">See My Career Roadmap ↓</a><button className="button button-secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div></div>
      <div className="career-orbit" aria-hidden="true"><div className="career-orbit-ring"/><div className="career-orbit-ring inner"/><div className="career-orbit-core"><b>✦</b><strong>{progressPercent}%<br/>Career Journey</strong></div><i className="career-float one">♬</i><i className="career-float two">◐</i><i className="career-float three">✎</i></div>
      <article className="career-daily-move"><span>Career Motivation for Your Next Academic Move</span><strong>{metricsLoading?'Building your career guidance…':milestones[activeMilestone]?.description||careerMoveForDate(new Date())}</strong><Link className="button button-primary career-next-big" to={resume.to}>RETURN TO MY GUIDED WORKFLOW →</Link></article>
    </header>

    <section aria-label="My Creative Journey interactive hub" style={{margin:'24px 0',padding:'24px',border:'1px solid #694281',borderRadius:24,background:'linear-gradient(130deg,#211032,#10091c)'}}>
      <span style={{color:'#f5c86d',fontWeight:800,letterSpacing:2}}>MY CREATIVE JOURNEY · INTERACTIVE HUB</span>
      <h2 style={{fontSize:'clamp(1.8rem,4vw,2.8rem)',margin:'12px 0'}}>Grow your craft. Explore your future.</h2>
      <p>See your real progress, try other creative directions, and build your skills with short challenges.</p>
      <div role="tablist" aria-label="Creative Journey sections" style={{display:'flex',flexWrap:'wrap',gap:10,margin:'20px 0'}}>
        {([{id:'growth',label:'📈 My Growth'},{id:'lab',label:'🧪 Career Lab'},{id:'spotlight',label:'🌟 Daily Spotlight'},{id:'games',label:'🎵 Music Games'}] as const).map(tab=><button key={tab.id} type="button" role="tab" aria-selected={experienceTab===tab.id} onClick={()=>setExperienceTab(tab.id)} className={experienceTab===tab.id?'button button-primary':'button button-secondary'}>{tab.label}</button>)}
      </div>
      {experienceTab==='growth'&&<div role="tabpanel">
        <h3>Your personal growth dashboard</h3>
        <p>These figures come from your Academy learning records, not simulated activity.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,margin:'18px 0'}}>
          {[{label:'Career XP',value:metrics.career_xp,icon:'⚡'},{label:'Journey Progress',value:progressPercent+'%',icon:'🧭'},{label:'Modules Completed',value:metrics.completed_modules,icon:'📚'},{label:'Approved Work',value:metrics.approved_submissions,icon:'🏆'},{label:'Coached Improvements',value:metrics.reviewed_growth,icon:'✨'},{label:'Portfolio Items',value:metrics.portfolio_items,icon:'🎬'}].map(item=><article key={item.label} style={{background:'#2c193c',border:'1px solid #614375',borderRadius:16,padding:16}}><div style={{fontSize:24}}>{item.icon}</div><strong style={{fontSize:28,color:'#f8d17d'}}>{metricsLoading?'…':item.value}</strong><div>{item.label}</div></article>)}
        </div>
        <h3>Your achievement trail</h3>
        <div style={{display:'flex',flexWrap:'wrap',gap:10}}>{milestones.map((item,index)=><button type="button" key={item.title} onClick={()=>setPopup({title:item.title,message:item.description})} style={{padding:'12px 14px',borderRadius:14,border:'1px solid #78588b',background:item.done?'#294a41':'#291a39',color:'white',cursor:'pointer'}}>{item.done?'🏅':'🔒'} {item.title}</button>)}</div>
        <p style={{marginTop:16}}><Link className="button button-primary" to={resume.to}>Continue learning →</Link></p>
      </div>}
      {experienceTab==='lab'&&<div role="tabpanel">
        <h3>Career Lab: try a different future</h3>
        <p>Experiment freely. Your saved career path and course access will not change.</p>
        <label htmlFor="career-lab-select">Explore a career</label>
        <select id="career-lab-select" value={explorePathId} onChange={event=>setExplorePathId(event.target.value)} style={{display:'block',width:'100%',maxWidth:560,padding:14,margin:'10px 0 18px',borderRadius:12,background:'#29173b',color:'white',border:'1px solid #85629c'}}>{careerPaths.map(path=><option key={path.id} value={path.id}>{path.icon} {path.title}</option>)}</select>
        <article style={{padding:20,borderRadius:18,background:'#29183d',border:'1px solid #78588b'}}>
          <div style={{fontSize:36}}>{exploredPath.icon}</div><h3>{exploredPath.title}</h3><p>{exploredPath.description}</p><strong>Imagine yourself: {exploredPath.outcome}</strong>
          <h4>Skills and programs to try</h4><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{exploredPath.connectedPrograms.map(program=><span key={program} style={{border:'1px solid #79549a',borderRadius:18,padding:'7px 12px'}}>{program}</span>)}</div>
          <p style={{marginTop:16}}>Your current direction: <strong>{primaryPath.title}</strong>. Exploring this alternative does not change it.</p>
          <Link className="button button-secondary" to="/studio">Experiment in Creator Studio →</Link>
        </article>
      </div>}
      {experienceTab==='spotlight'&&<div role="tabpanel">
        <h3>🌟 Today's JPAC Spotlight</h3>
        <p>One creative challenge each day · About 5–10 minutes · Practice at your own pace</p>
        <article style={{padding:22,border:'1px solid #9062ad',borderRadius:20,background:'#301a43'}}>
          <div style={{fontSize:48}}>{spotlight.icon}</div><h3>{spotlight.name}</h3><p>{spotlight.task}</p><small>{spotlight.skill}</small>
          <div style={{marginTop:18}}><button className="button button-primary" type="button" onClick={()=>{window.localStorage.setItem(spotlightKey,'complete');setSpotlightCompleted(true)}}>{spotlightCompleted||window.localStorage.getItem(spotlightKey)==='complete'?'✓ Practiced today':'I completed today’s practice ✓'}</button></div>
          <p style={{marginTop:12,fontSize:13}}>Practice check-ins are saved on this device only. Official XP and achievement credit require verified Academy activity.</p>
        </article>
      </div>}
      {experienceTab==='games'&&<div role="tabpanel">
        <h3>🥁 Rhythm Recall</h3><p>A quick music-memory game. Watch the beat sequence, then repeat it using the four pads. This is a practice game, not a graded assignment.</p>
        <button className="button button-primary" type="button" onClick={playRhythm}>Generate four-beat challenge</button>
        {rhythmSequence.length>0&&<p style={{marginTop:14}}>Beat pattern: <strong>{rhythmSequence.map(i=>['Kick','Snare','Hi-hat','Clap'][i]).join(' · ')}</strong></p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(100px,180px))',gap:12,margin:'18px 0'}}>{['🥁 Kick','👏 Snare','✨ Hi-hat','🎶 Clap'].map((name,i)=><button key={name} type="button" disabled={!rhythmSequence.length} onClick={()=>tapRhythm(i)} style={{padding:'22px 12px',background:'#3d2457',border:'2px solid #aa77ca',borderRadius:16,color:'white',fontWeight:700,cursor:'pointer'}}>{name}</button>)}</div>
        <p role="status">{rhythmStatus}</p>
        <p><strong>Next game concepts:</strong> Build a Hook, Producer's Ear, and Career Quest. These require audio/content testing before being released.</p>
      </div>}
    </section>

    <section className="career-path-roadmap career-path-roadmap-featured" id="career-selected-path" tabIndex={-1} aria-labelledby="career-roadmap-title">
      <div><span>Your professional development roadmap</span><h2 id="career-roadmap-title">{primaryPath.icon} {primaryPath.title}</h2><p className="career-detail-meta">{categoryLabel(primaryPath.category)} · ACTIVE CAREER JOURNEY</p><p>{primaryPath.description}</p><strong>{primaryPath.outcome}</strong><h3>Career-building JPAC programs</h3><div className="career-program-list">{primaryPath.connectedPrograms.map(program => <span key={program}>{program}</span>)}</div><p className="career-roadmap-note">Your coursework is the primary path. Career Pathing interprets that academic progress as professional growth: finishing work, accepting feedback, improving your craft, building evidence, and preparing for opportunity.</p></div>
      <div className="career-roadmap-grid" aria-label={`${primaryPath.title} roadmap`}>
        <div className="career-progress"><span>Career Journey progress</span><strong>{completedMilestones} of {milestones.length} professional milestones</strong><div role="progressbar" aria-valuemin={0} aria-valuemax={milestones.length} aria-valuenow={completedMilestones}><i style={{ width: `${progressPercent}%` }} /></div></div>
        <div className="career-stat-grid"><article><strong>{metrics.completed_modules}</strong><span>Modules Mastered</span></article><article><strong>{metrics.approved_submissions}</strong><span>Approved Creative Works</span></article><article><strong>{metrics.reviewed_growth}</strong><span>Teacher-Coached Wins</span></article><article><strong>{metrics.portfolio_items||Math.floor(metrics.approved_submissions/3)}</strong><span>Portfolio Evidence</span></article></div>
        <div className="career-journey-map" aria-label="Interactive six-stop career journey">
          <div className="journey-map-heading"><span>YOUR CREATIVE ROAD</span><strong>Follow the road to your next milestone</strong><small>Select any stop to see what it takes to get there.</small></div>
          <div className="journey-map-canvas">
            <svg className="journey-map-road" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <path className="journey-road-shadow" d="M 70 108 H 825 Q 940 108 940 220 Q 940 310 825 310 H 175 Q 60 310 60 420 Q 60 530 175 530 H 930"/>
              <path className="journey-road-base" d="M 70 108 H 825 Q 940 108 940 220 Q 940 310 825 310 H 175 Q 60 310 60 420 Q 60 530 175 530 H 930"/>
              <path className="journey-road-dashes" d="M 70 108 H 825 Q 940 108 940 220 Q 940 310 825 310 H 175 Q 60 310 60 420 Q 60 530 175 530 H 930"/>
            </svg>
            {milestones.map((item,index)=>{
              const status=item.done?'completed':index===activeMilestone?'active':'upcoming';
              return <button type="button" key={item.title} className={`journey-stop journey-stop-${index} ${status} ${focusedMilestone===index?'selected':''}`} aria-label={`Stop ${index+1}: ${item.title}. ${status}. View details`} aria-pressed={focusedMilestone===index} onClick={()=>setFocusedMilestone(index)}><span className="journey-stop-pin"><span>{item.done?'✓':['🧭','🎯','🎤','💡','🎬','🏆'][index]}</span></span><span className="journey-stop-copy"><small>STOP {index+1} · {item.done?'COMPLETED':status==='active'?'YOU ARE HERE':'UP AHEAD'}</small><strong>{item.title}</strong></span></button>;
            })}
            <span className="journey-map-start">START</span><span className="journey-map-finish">YOUR FUTURE →</span>
          </div>
          <div className="journey-stop-details" role="status">
            <div><span>{focusedMilestone===null?'YOUR NEXT DESTINATION':`MILESTONE ${focusedMilestone+1} OF ${milestones.length}`}</span><h3>{milestones[focusedMilestone??activeMilestone].title}</h3><p>{milestones[focusedMilestone??activeMilestone].description}</p>{roadmapStops[focusedMilestone??activeMilestone]&&<div style={{marginTop:12}}><strong>Required modules ({roadmapStops[focusedMilestone??activeMilestone].completed}/{roadmapStops[focusedMilestone??activeMilestone].required})</strong><ul style={{margin:'8px 0',paddingLeft:20}}>{roadmapStops[focusedMilestone??activeMilestone].modules.map(module=><li key={module.id}>{module.completed?'✓':'○'} {module.title}</li>)}</ul></div>}</div>
            <strong>{milestones[focusedMilestone??activeMilestone].done?'✓ Milestone completed':(focusedMilestone??activeMilestone)===activeMilestone?'✦ You are here':'○ Future milestone'}</strong>
          </div>
        </div>
        <Link className="button button-primary career-roadmap-cta" to={resume.to}>▶ CONTINUE COURSEWORK WITH CAREER PURPOSE</Link>
      </div>
    </section>

    <section className="career-path-choice" aria-labelledby="career-path-choice-title">
      <div><span>14 paths · 5 creative directions</span><h2 id="career-path-choice-title">{persistedPath ? 'Your chosen path, with room to evolve' : 'Find a future that sounds like you'}</h2><p>{persistedPath ? 'Your selected path is your primary professional-development journey. You can explore and change direction as your goals become clearer.' : 'Select the creative future you want JPAC to help you build toward.'}</p>{journeyLoading ? <p className="career-save-status" role="status">Loading your saved path…</p> : null}{journeyError ? <p className="career-save-status" role="alert">{journeyError}</p> : null}</div>
      <CareerFilters category={category} onChange={setCategory}/>
      <p className="career-results-count" aria-live="polite">Showing {visiblePaths.length} of {careerPaths.length} career paths</p>
      <CareerCatalog paths={visiblePaths} selectedId={selectedPathId} detailId="career-selected-path" onSelect={id => { setSelectedPathId(id); focusCareerDetail('career-selected-path'); }}/>
    </section>

    <section className="career-path-save" aria-label="Save career path"><div><strong>{persistedPath === selectedPath.id ? 'Primary path selected ✓' : 'Make this my professional path'}</strong><p>{persistedPath === selectedPath.id ? 'JPAC is connecting your learning and professional-growth guidance to this path.' : 'Changing your path updates future recommendations without erasing completed coursework.'}</p></div><button className="button button-primary career-save-big" type="button" disabled={saving || journeyLoading} onClick={() => void saveSelectedPath()}>{saving ? 'Saving…' : 'MAKE THIS MY CAREER PATH'}</button>{saveMessage ? <p role="status">{saveMessage}</p> : null}</section>

    <section className="career-tools-section"><div className="section-head"><div><span>Recommended for {primaryPath.title}</span><h2>Practice like the professional you are becoming</h2></div><Link to="/studio">View all Creator Tools →</Link></div><CareerTools path={primaryPath}/></section>
    <section className="career-all-tools"><h2>Every tool strengthens a professional habit</h2><div>{careerPracticeTools.map(tool => <span key={tool.slug}>{tool.icon} {tool.title} · {tool.skills}</span>)}</div></section>
    <aside className="career-safety-note"><div><strong>Your path grows with you</strong><p>Career Pathing is a second-layer motivation and guidance system. It does not replace, gate, or reorder the academic workflow. Course access, completion, grades, and academic records remain controlled by the Academy learning system.</p></div><Link className="button button-secondary" to="/coach">Ask JPAC Coach About My Career →</Link></aside>
  </div>;
}
