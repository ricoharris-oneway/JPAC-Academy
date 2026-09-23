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
    const value=(localStorage.getItem(KEY)||new URLSearchParams(location.search).get('email')||'').trim().toLowerCase();
    setEmail(value);
    if(!value||!supabase){setStudent(null);return}
    const{data:profile}=await supabase.from('profiles').select('id,display_name,email').eq('role','student').ilike('email',value).maybeSingle();
    if(!profile){setStudent({id:'',display_name:null,email:value,courseTitle:null,status:null});return}
    const{data:enrollment}=await supabase.from('enrollments').select('status,courses(title)').eq('student_id',profile.id).eq('status','active').order('enrolled_at',{ascending:false}).limit(1).maybeSingle();
    const courses=enrollment?.courses as {title?:string}|{title?:string}[]|null|undefined;const course=Array.isArray(courses)?courses[0]:courses;
    setStudent({id:profile.id,display_name:profile.display_name,email:profile.email,courseTitle:course?.title||null,status:enrollment?.status||null});
  }
  function clear(){localStorage.removeItem(KEY);setEmail('');setStudent(null)}
  if(!email)return null;
  const encoded=encodeURIComponent(email);
  return <section className="active-student-bar" aria-label="Active student workflow"><div><span>Working with</span><strong>{student?.display_name||email}</strong><small>{student?.courseTitle||'No active course'}{student?.status?` · ${student.status}`:''}</small></div><nav><Link to={`/staff/course-enrollment?email=${encoded}`}>Enrollment</Link><Link to={`/staff/payment-ledger?email=${encoded}`}>Payment</Link><Link to={`/staff/consent-ledger?email=${encoded}`}>Consent</Link>{student?.id&&<Link to={`/staff/student-profiles/${student.id}`}>Profile</Link>}<Link to="/teacher">Teacher Studio</Link><button type="button" onClick={clear}>Change student</button></nav></section>;
}
