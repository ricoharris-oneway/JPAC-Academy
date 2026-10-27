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

const emptyMetrics:CareerMetrics={path_slug:'',connected_courses:0,accessible_courses:0,total_modules:0,completed_modules:0,approved_submissions:0,reviewed_growth:0,average_score:0,portfolio_items:0,career_xp:0};

function programMatches(course:AcademyCourse,program:string){
  const a=course.title.toLowerCase();
  const b=program.toLowerCase();
  return a===b||a.startsWith(b)||b.startsWith(a);
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
  const [courses,setCourses]=useState<AcademyCourse[]>([]);
  const [metricsLoading,setMetricsLoading]=useState(true);
  const [popup,setPopup]=useState<{title:string;message:string}|null>(null);

  useEffect(() => { if (persistedPath) setSelectedPathId(persistedPath); }, [persistedPath]);

  useEffect(()=>{
    let active=true;
    async function loadJourney(){
      if(!persistedPath||!supabase){setMetricsLoading(false);return}
      setMetricsLoading(true);
      const[{data,error},courseResult]=await Promise.all([
        supabase.rpc('jpac_my_career_journey',{target_path_slug:persistedPath}),
        loadMyCourses()
      ]);
      if(!active)return;
      if(!error&&data)setMetrics(data as CareerMetrics);
      setCourses(courseResult.data);
      setMetricsLoading(false);
    }
    void loadJourney();
    return()=>{active=false};
  },[persistedPath]);

  const visiblePaths = careerPaths.filter(path => category === 'all' || path.category === category);
  const selectedPath = careerPaths.find(path => path.id === selectedPathId) ?? careerPaths[0];
  const primaryPath = careerPaths.find(path=>path.id===persistedPath)||selectedPath;
  const milestones=useMemo(()=>milestoneData(metrics),[metrics]);
  const completedMilestones=milestones.filter(item=>item.done).length;
  const activeMilestone=Math.min(milestones.length-1,milestones.findIndex(item=>!item.done)===-1?milestones.length-1:milestones.findIndex(item=>!item.done));
  const relevantCourses=courses.filter(course=>primaryPath.connectedPrograms.some(program=>programMatches(course,program)));
  const resume=continueDestination(relevantCourses.length?relevantCourses:courses);
  const progressPercent=Math.round(completedMilestones/milestones.length*100);

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
      <div className="career-hero-copy"><span>JPAC Academy · Build the professional, not just the grade</span><h1>Build Your<br/><em>Creative Future</em></h1><p>Your courses teach the craft. Your Career Journey connects that work to who you are becoming, what you can prove, and what opportunity you are preparing for next.</p><div className="career-pathing-actions"><Link className="button button-primary career-primary-action" to={resume.to}>▶ DO MY NEXT CAREER STEP</Link><a className="button button-secondary" href="#career-selected-path">See My Career Roadmap ↓</a><button className="button button-secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div></div>
      <div className="career-orbit" aria-hidden="true"><div className="career-orbit-ring"/><div className="career-orbit-ring inner"/><div className="career-orbit-core"><b>✦</b><strong>{progressPercent}%<br/>Career Journey</strong></div><i className="career-float one">♬</i><i className="career-float two">◐</i><i className="career-float three">✎</i></div>
      <article className="career-daily-move"><span>Your Next Career Move</span><strong>{metricsLoading?'Building your career guidance…':milestones[activeMilestone]?.description||careerMoveForDate(new Date())}</strong><Link className="button button-primary career-next-big" to={resume.to}>DO THIS NEXT →</Link></article>
    </header>

    <section className="career-path-roadmap career-path-roadmap-featured" id="career-selected-path" tabIndex={-1} aria-labelledby="career-roadmap-title">
      <div><span>Your professional development roadmap</span><h2 id="career-roadmap-title">{primaryPath.icon} {primaryPath.title}</h2><p className="career-detail-meta">{categoryLabel(primaryPath.category)} · ACTIVE CAREER JOURNEY</p><p>{primaryPath.description}</p><strong>{primaryPath.outcome}</strong><h3>Career-building JPAC programs</h3><div className="career-program-list">{primaryPath.connectedPrograms.map(program => <span key={program}>{program}</span>)}</div><p className="career-roadmap-note">Completing coursework matters, but JPAC is also tracking the habits of a creative professional: finishing work, accepting feedback, improving your craft, building evidence, and preparing for opportunity.</p></div>
      <div className="career-roadmap-grid" aria-label={`${primaryPath.title} roadmap`}>
        <div className="career-progress"><span>Career Journey progress</span><strong>{completedMilestones} of {milestones.length} professional milestones</strong><div role="progressbar" aria-valuemin={0} aria-valuemax={milestones.length} aria-valuenow={completedMilestones}><i style={{ width: `${progressPercent}%` }} /></div></div>
        <div className="career-stat-grid"><article><strong>{metrics.completed_modules}</strong><span>Modules Mastered</span></article><article><strong>{metrics.approved_submissions}</strong><span>Approved Creative Works</span></article><article><strong>{metrics.reviewed_growth}</strong><span>Teacher-Coached Wins</span></article><article><strong>{metrics.portfolio_items||Math.floor(metrics.approved_submissions/3)}</strong><span>Portfolio Evidence</span></article></div>
        <ol className="career-node-grid">{milestones.map((item,index)=>{const status=item.done?'completed':index===activeMilestone?'active':'locked';return <li className={`roadmap-node ${status}`} data-state={status} key={item.title}><span className="roadmap-node-marker" aria-hidden="true">{status==='completed'?'✓':status==='active'?'✦':'○'}</span><div><strong>{item.title}</strong><small>{item.description}</small><em>{status==='active'?'YOU ARE HERE':status==='completed'?'Completed':'Coming next'}</em></div></li>})}</ol>
        <Link className="button button-primary career-roadmap-cta" to={resume.to}>▶ CONTINUE BUILDING MY CAREER</Link>
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
    <aside className="career-safety-note"><div><strong>Your path grows with you</strong><p>Career Pathing guides development and motivation. Course access, grades, and academic records remain controlled by the Academy learning system.</p></div><Link className="button button-secondary" to="/coach">Ask JPAC Coach About My Career →</Link></aside>
  </div>;
}
