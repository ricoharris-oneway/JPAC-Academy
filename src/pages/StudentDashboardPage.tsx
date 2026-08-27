import{useEffect,useMemo,useState}from'react';
import{Link}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{continueDestination,loadMyCourses,type AcademyCourse}from'../lib/studentAccess';
import{WorkspaceHero}from'../components/WorkspaceHero';
import{resolveDisplayName}from'../lib/displayName';
import{JPACCoachPanel}from'../features/ai-instructor/components/JPACCoachPanel';
import{buildDashboardCoachContext}from'../features/ai-instructor/contextBuilder';
import{CareerPathingPanel}from'../features/career-pathing/CareerPathingPanel';
import{presentStudentProgress}from'../lib/progressPresentation';

export function StudentDashboardPage(){
  const{profile,user}=useAuth();const[courses,setCourses]=useState<AcademyCourse[]>([]);const[loading,setLoading]=useState(true);const[message,setMessage]=useState('');
  useEffect(()=>{void loadMyCourses().then(result=>{setCourses(result.data);setMessage(result.error);setLoading(false)})},[]);
  const recent=useMemo(()=>[...courses].filter(item=>item.last_accessed_at).sort((a,b)=>String(b.last_accessed_at).localeCompare(String(a.last_accessed_at)))[0],[courses]);
  const destination=useMemo(()=>continueDestination(courses),[courses]);
  const displayName=resolveDisplayName(profile,user);const welcomeName=displayName.includes('@')?displayName:displayName.split(' ')[0];const xp=profile?.total_xp||0;
  return <div className="student-access-page"><WorkspaceHero eyebrow="JPAC Academy" title={`Welcome back, ${welcomeName}.`} description="Start with your creative career path, then continue the learning and practice that move you toward it." environment="lobby" actions={<Link className="button button-primary" to="/career-pathing">Explore My Career Path</Link>} stats={[{icon:'🎓',value:courses.length,label:'Active programs'},{icon:'✨',value:xp.toLocaleString(),label:'Canonical XP'}]}/>{message&&<div className="admin-message">{message}</div>}<CareerPathingPanel/><JPACCoachPanel context={buildDashboardCoachContext(courses,destination)} compact/><section className="card card-pad dashboard-access-section"><div className="section-head"><div><div className="eyebrow">Active programs</div><h2>Your learning</h2></div><Link className="text-link" to="/courses">View all →</Link></div>{loading?<p className="muted">Loading your programs…</p>:courses.length?<div className="dashboard-course-list">{courses.slice(0,4).map(course=>{const progress=presentStudentProgress({progress:course.progress,courseSlug:course.slug,publishedModuleCount:course.published_module_count,level:course.enrollment_level});return <article key={course.course_id}><div><strong>{course.title}</strong><small>{progress.wording}</small></div>{progress.barPercent!==null?<div className="access-progress"><i style={{width:`${progress.barPercent}%`}}/></div>:null}<Link className="button button-secondary" to={`/courses/${course.course_id}`}>{progress.started?'Continue':'Open'}</Link></article>})}</div>:<div className="access-empty"><span>🔒</span><h3>No active courses yet</h3><p className="muted">Your programs will appear after an active Academy enrollment is synchronized or created by JPAC staff.</p></div>}</section>{recent&&<section className="card card-pad recent-course"><div className="eyebrow">Recently accessed</div><h2>{recent.title}</h2><p className="muted">Last opened {new Date(recent.last_accessed_at!).toLocaleString()}</p><Link className="button button-primary" to={destination.to}>{destination.label}</Link></section>}</div>;
}
