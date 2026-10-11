import{useEffect,useState}from'react';
import{supabase}from'../lib/supabase';

type SubmissionRow={id:string;status:string;submitted_at:string;media_name:string|null;activity:{title:string;module:{title:string;course:{title:string}|{title:string}[]|null}|{title:string;course:{title:string}|{title:string}[]|null}[]|null}|{title:string;module:{title:string;course:{title:string}|{title:string}[]|null}|{title:string;course:{title:string}|{title:string}[]|null}[]|null}[]|null};
const one=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]||null:value||null;

export function RecentAssignmentSubmissions(){
  const[rows,setRows]=useState<SubmissionRow[]>([]);
  useEffect(()=>{let active=true;async function load(){if(!supabase)return;const{data}=await supabase.from('submissions').select('id,status,submitted_at,media_name,activity:activities(title,module:course_modules(title,course:courses(title)))').order('submitted_at',{ascending:false}).limit(5);if(active)setRows((data as unknown as SubmissionRow[])||[])}void load();return()=>{active=false}},[]);
  if(!rows.length)return null;
  return <section className="member-section"><header><h2>Recent Assignment Submissions</h2></header><div className="card card-pad"><div className="ops-feed">{rows.map(item=>{const activity=one(item.activity);const module=one(activity?.module);const course=one(module?.course);const pending=['submitted','under_review'].includes(item.status);return <article key={item.id}><span>📝</span><div><strong>{activity?.title||'Assignment submission'}</strong><small>{course?.title||'JPAC Course'}{module?.title?' · '+module.title:''} · {new Date(item.submitted_at).toLocaleString()}</small><small>{item.media_name||'Submitted file'} · {item.status.replaceAll('_',' ')}</small></div><b>{pending?'Awaiting Review':item.status==='approved'?'Approved':'Revision'}</b></article>})}</div></div></section>;
}
