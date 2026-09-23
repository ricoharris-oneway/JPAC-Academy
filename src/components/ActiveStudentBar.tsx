import{useEffect,useState}from'react';
import{Link,useLocation}from'react-router-dom';
import{supabase}from'../lib/supabase';

const KEY='jpac.activeStudentEmail';
type ActiveStudent={id:string;display_name:string|null;email:string|null;courseTitle:string|null;status:string|null};

export function ActiveStudentBar(){
  const location=useLocation();
  const[student,setStudent]=useState<ActiveStudent|null>(null);
  const[email,setEmail]=useState('');
  useEffect(()=>{void load()},[location.pathname,location.search]);
  async function load(){
    if(!supabase)return;
    const params=new URLSearchParams(location.search);let value=(params.get('email')||localStorage.getItem(KEY)||'').trim().toLowerCase();
    const profileRoute=location.pathname.match(/^\/staff\/student-profiles\/([0-9a-f-]{36})$/i);
    let profile:any=null;
    if(profileRoute){const{data}=await supabase.from('profiles').select('id,display_name,email').eq('id',profileRoute[1]).eq('role','student').maybeSingle();profile=data;if(profile?.email)value=String(profile.email).trim().toLowerCase()}
    if(!value){setEmail('');setStudent(null);return}
    localStorage.setItem(KEY,value);setEmail(value);
    if(!profile){const{data}=await supabase.from('profiles').select('id,display_name,email').eq('role','student').ilike('email',value).maybeSingle();profile=data}
    if(!profile){setStudent({id:'',display_name:null,email:value,courseTitle:null,status:null});return}
    const{data:enrollment}=await supabase.from('enrollments').select('status,courses(title)').eq('student_id',profile.id).eq('status','active').order('enrolled_at',{ascending:false}).limit(1).maybeSingle();
    const courses=enrollment?.courses as {title?:string}|{title?:string}[]|null|undefined;const course=Array.isArray(courses)?courses[0]:courses;
    setStudent({id:profile.id,display_name:profile.display_name,email:profile.email,courseTitle:course?.title||null,status:enrollment?.status||null});
  }
  function clear(){localStorage.removeItem(KEY);setEmail('');setStudent(null)}
  if(!email)return null;
  const encoded=encodeURIComponent(email);
  return <section className="card active-student-bar" aria-label="Active student workflow" style={{padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}><div style={{display:'grid',gap:2}}><span className="eyebrow">Working with</span><strong>{student?.display_name||email}</strong><small className="muted">{student?.courseTitle||'No active course'}{student?.status?` · ${student.status}`:''}</small></div><nav style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="button button-secondary" to={`/staff/course-enrollment?email=${encoded}`}>Enrollment</Link><Link className="button button-secondary" to={`/staff/payment-ledger?email=${encoded}`}>Payment</Link><Link className="button button-secondary" to={`/staff/consent-ledger?email=${encoded}`}>Consent</Link>{student?.id&&<Link className="button button-secondary" to={`/staff/student-profiles/${student.id}`}>Profile</Link>}<Link className="button button-secondary" to="/teacher">Teacher Studio</Link><button className="button button-secondary" type="button" onClick={clear}>Change student</button></nav></section>;
}
