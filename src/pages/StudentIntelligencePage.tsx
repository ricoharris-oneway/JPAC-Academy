import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { WorkspaceHero } from '../components/WorkspaceHero';
import { ProgressRing, Timeline, EmptyState, SkeletonCards } from '../components/CreativeComponents';

type Student={id:string;display_name:string;email:string|null;total_xp:number};
type Twin={student_id:string;creative_health:number;course_progress_score:number;practice_consistency:number;confidence_score:number;technique_score:number;creativity_score:number;professionalism_score:number;portfolio_score:number;goal_progress_score:number;performance_readiness:number;career_readiness:number;learning_velocity:number;risk_level:string;trend:string;summary:string;next_best_action:string;calculated_at:string};
type Preference={student_id:string;visual_score:number;auditory_score:number;kinesthetic_score:number;reading_score:number;preferred_pace:string;preferred_feedback:string};
type Strength={id:string;student_id:string;skill_name:string;confidence:number};
type Recommendation={id:string;student_id:string;title:string;rationale:string;priority:number;status:string;recommendation_type:string};
type JourneyEvent={id:string;student_id:string;event_type:string;title:string;description:string;occurred_at:string};
const blankTwin:Omit<Twin,'student_id'|'calculated_at'>={creative_health:0,course_progress_score:0,practice_consistency:0,confidence_score:0,technique_score:0,creativity_score:0,professionalism_score:0,portfolio_score:0,goal_progress_score:0,performance_readiness:0,career_readiness:0,learning_velocity:0,risk_level:'unknown',trend:'not calculated',summary:'No production learning analysis is available yet.',next_best_action:''};

export function StudentIntelligencePage(){
  const{user,profile}=useAuth();
  const[students,setStudents]=useState<Student[]>([]);const[twins,setTwins]=useState<Twin[]>([]);const[preferences,setPreferences]=useState<Preference[]>([]);const[strengths,setStrengths]=useState<Strength[]>([]);const[recommendations,setRecommendations]=useState<Recommendation[]>([]);const[timeline,setTimeline]=useState<JourneyEvent[]>([]);const[selected,setSelected]=useState('');const[message,setMessage]=useState('');const[loading,setLoading]=useState(true);
  const isStaff=Boolean(profile&&['teacher','admin','developer'].includes(profile.role));
  async function load(){
    if(!supabase||!user)return;
    setLoading(true);
    const studentFilter=isStaff?supabase.from('profiles').select('id,display_name,email,total_xp').eq('role','student').order('display_name'):supabase.from('profiles').select('id,display_name,email,total_xp').eq('id',user.id);
    const[{data:s},{data:t},{data:p},{data:st},{data:r},{data:tl}]=await Promise.all([
      studentFilter,
      supabase.from('student_digital_twins').select('*'),
      supabase.from('student_learning_preferences').select('student_id,visual_score,auditory_score,kinesthetic_score,reading_score,preferred_pace,preferred_feedback'),
      supabase.from('student_strengths').select('id,student_id,skill_name,confidence').order('confidence',{ascending:false}),
      supabase.from('aria_recommendations').select('id,student_id,title,rationale,priority,status,recommendation_type').eq('status','active').order('priority',{ascending:false}),
      supabase.from('student_timeline').select('id,student_id,event_type,title,description,occurred_at').order('occurred_at',{ascending:false}).limit(60),
    ]);
    const studentRows=(s as Student[])||[];setStudents(studentRows);setTwins((t as Twin[])||[]);setPreferences((p as Preference[])||[]);setStrengths((st as Strength[])||[]);setRecommendations((r as Recommendation[])||[]);setTimeline((tl as JourneyEvent[])||[]);if(!selected&&studentRows[0])setSelected(studentRows[0].id);setLoading(false);
  }
  useEffect(()=>{void load()},[user?.id,profile?.role]);
  const student=students.find(item=>item.id===selected);
  const storedTwin=twins.find(item=>item.student_id===selected);
  const twin=storedTwin||({...blankTwin,student_id:selected,calculated_at:''}as Twin);
  const pref=preferences.find(item=>item.student_id===selected);
  const studentStrengths=strengths.filter(item=>item.student_id===selected).slice(0,6);
  const studentRecommendations=recommendations.filter(item=>item.student_id===selected).slice(0,4);
  const studentTimeline=timeline.filter(item=>item.student_id===selected).slice(0,8);
  const dimensions=useMemo(()=>[['Course progress',twin.course_progress_score],['Creative flame',twin.practice_consistency],['Confidence',twin.confidence_score],['Technique',twin.technique_score],['Creativity',twin.creativity_score],['Professionalism',twin.professionalism_score],['Portfolio',twin.portfolio_score],['Career readiness',twin.career_readiness]] as [string,number][],[twin]);
  async function refreshTwin(){if(!supabase||!selected)return;setMessage('Refreshing production learning evidence…');const{error}=await supabase.rpc('refresh_student_digital_twin',{target_student:selected,refresh_reason:'Staff evidence refresh'});setMessage(error?.message||'Learning evidence refreshed.');if(!error)await load()}
  if(loading)return <SkeletonCards count={5}/>;
  if(!student)return <EmptyState icon="🌟" title="No creative journey available yet" detail={isStaff?'Create or enroll a student before learning evidence can be analyzed.':'Your learning evidence will appear here after you begin an enrolled course.'} actionLabel={isStaff?'Open Admissions':undefined} actionTo={isStaff?'/manual-student':undefined}/>;
  const firstName=student.display_name.split(' ')[0];
  return <div className="creative-journey">
    <WorkspaceHero eyebrow={isStaff?'Student Intelligence · Creative Journey':'My Growth · Creative Journey'} title={isStaff?`${student.display_name}'s Creative Journey`:`Welcome back, ${firstName}.`} description="Verified Academy evidence about progress, practice, strengths, and next opportunities." environment="student" ariaLabel="Learning evidence" ariaMessage={twin.summary||blankTwin.summary} actions={<>{isStaff&&<button className="button button-primary" onClick={()=>void refreshTwin()}>Refresh evidence</button>}<Link className="button button-secondary" to="/courses">Continue learning</Link></>} stats={[{icon:'✨',value:student.total_xp.toLocaleString(),label:'Total XP'},{icon:'🚀',value:`${Math.round(twin.performance_readiness)}%`,label:'Performance ready'},{icon:'💼',value:`${Math.round(twin.career_readiness)}%`,label:'Career ready'}]}><ProgressRing value={twin.creative_health} label="Creative Health" size={132}/></WorkspaceHero>
    {message&&<div className="admin-message">{message}</div>}
    {isStaff&&<div className="journey-selector">{students.map(item=><button key={item.id} className={selected===item.id?'active':''} onClick={()=>setSelected(item.id)}><span>{item.display_name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><strong>{item.display_name}</strong></button>)}</div>}
    <section className="card journey-profile"><div className="journey-identity"><span className="journey-avatar">{student.display_name.split(' ').map(part=>part[0]).join('').slice(0,2)}</span><div><div className="eyebrow">Artist profile</div><h2>{student.display_name}</h2><p>{student.email||'JPAC creator'} · {twin.trend} momentum</p></div></div><ProgressRing value={twin.creative_health} label="Creative Health" size={112}/><span className={`journey-risk ${twin.risk_level}`}>{twin.risk_level} support need</span></section>
    <div className="journey-primary"><section className="card journey-section"><div className="eyebrow">Progress toward greatness</div><h2>Your creative development</h2><div className="journey-dimensions">{dimensions.map(([label,value])=><div className="journey-dimension" key={label}><div><strong>{label}</strong><small>{Math.round(value)}%</small></div><div className="journey-dimension-track"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div></div>)}</div></section><aside className="card journey-mission"><span className="journey-mission-icon">🎯</span><div className="eyebrow">Next opportunity</div>{studentRecommendations[0]?<><h2>{studentRecommendations[0].title}</h2><p>{studentRecommendations[0].rationale}</p></>:<><h2>No recommendation available</h2><p>Recommendations appear only when a production record has been generated from Academy evidence.</p></>}</aside></div>
    <div className="journey-lower"><section className="card journey-section"><div className="eyebrow">Learning DNA</div><h2>How you learn best</h2>{pref?<><div className="learning-bars"><span style={{height:`${Math.max(28,pref.visual_score*100)}%`}}>Visual<b>{Math.round(pref.visual_score*100)}</b></span><span style={{height:`${Math.max(28,pref.auditory_score*100)}%`}}>Audio<b>{Math.round(pref.auditory_score*100)}</b></span><span style={{height:`${Math.max(28,pref.kinesthetic_score*100)}%`}}>Hands-on<b>{Math.round(pref.kinesthetic_score*100)}</b></span><span style={{height:`${Math.max(28,pref.reading_score*100)}%`}}>Reading<b>{Math.round(pref.reading_score*100)}</b></span></div><p className="muted">Best pace: {pref.preferred_pace} · Best feedback: {pref.preferred_feedback}</p></>:<p className="muted">No production learning-preference record is available yet.</p>}</section><section className="card journey-section"><div className="eyebrow">Your strongest lights</div><h2>Creative strengths</h2>{studentStrengths.length?<div className="strength-chips">{studentStrengths.map(item=><span key={item.id}>{item.skill_name}<b>{Math.round(item.confidence*100)}%</b></span>)}</div>:<div className="journey-empty">No verified strength observations are available yet.</div>}</section><section className="card journey-section"><div className="eyebrow">Insights</div><h2>Next opportunities</h2><div className="journey-actions">{studentRecommendations.length?studentRecommendations.map(item=><article className="journey-action" key={item.id}><span>{item.recommendation_type}</span><strong>{item.title}</strong><p>{item.rationale}</p></article>):<div className="journey-empty">No active production recommendations are available.</div>}</div></section></div>
    <section className="card journey-timeline-wrap"><div className="eyebrow">Your story so far</div><h2>Creative Journey</h2>{studentTimeline.length?<Timeline items={studentTimeline.map((item,index)=>({icon:index===0?'✨':'●',title:item.title,detail:item.description,time:new Date(item.occurred_at).toLocaleDateString(),status:index===0?'current':'complete'}))}/>:<EmptyState icon="🚀" title="Your journey is beginning" detail="Verified enrollments, practice, certificates, performances, and portfolio milestones will build this story."/>}</section>
  </div>;
}
