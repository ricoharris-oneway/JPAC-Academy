import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type QueueItem = { item_id: string; student_name: string; student_email: string; item_type: string; item_status: string; item_date: string; action_route: string };
type ExceptionItem={exception_key:string;severity:'high'|'medium'|'low'|string;title:string;detail:string;student_id:string|null;student_name:string|null;student_email:string|null;action_route:string;created_at:string};
type CommunityReviewItem={id:string;title:string|null;body:string;post_type:string;created_at:string;author:{display_name?:string|null}|{display_name?:string|null}[]|null;course:{title?:string|null}|{title?:string|null}[]|null};
const ACTIVE_STUDENT_KEY='jpac.activeStudentEmail';
function resolutionRoute(item:ExceptionItem){
  const raw=item.action_route||'/';
  const [path,query='']=raw.split('?');
  const params=new URLSearchParams(query);
  params.set('resolve',item.exception_key);
  if(item.student_email)params.set('email',item.student_email);
  if(item.student_name)params.set('student',item.student_name);
  return `${path}?${params.toString()}`;
}

export function ApprovalQueue() {
  const { profile } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [communityItems,setCommunityItems]=useState<CommunityReviewItem[]>([]);
  const [exceptions,setExceptions]=useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [{data,error},{data:exceptionData,error:exceptionError},{data:communityData,error:communityError}] = await Promise.all([
      supabase.rpc('jpac_staff_approval_queue'),
      supabase.rpc('jpac_staff_operational_exceptions_v1'),
      supabase.from('community_posts').select('id,title,body,post_type,created_at,author:profiles!community_posts_author_id_fkey(display_name),course:courses(title)').eq('status','pending_review').order('created_at',{ascending:true})
    ]);
    setItems((data as QueueItem[] | null) || []);
    setExceptions((exceptionData as ExceptionItem[]|null)||[]);
    setCommunityItems((communityData as CommunityReviewItem[]|null)||[]);
    setMessage(error?.message || exceptionError?.message || communityError?.message || '');
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  const high=exceptions.filter(item=>item.severity==='high').length;
  const medium=exceptions.filter(item=>item.severity==='medium').length;
  function startResolution(item:ExceptionItem){if(item.student_email)localStorage.setItem(ACTIVE_STUDENT_KEY,item.student_email.trim().toLowerCase())}
  const one=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]:value;
  async function reviewCommunity(id:string,decision:'approved'|'rejected'){
    if(!supabase||!profile)return;
    const note=decision==='rejected'?(window.prompt('Optional note for the student about why this was not approved:')||''):'';
    const now=new Date().toISOString();
    const{error}=await supabase.from('community_posts').update({status:decision,reviewed_by:profile.id,reviewed_at:now,published_at:decision==='approved'?now:null,review_note:note||null,updated_at:now}).eq('id',id);
    setMessage(error?.message||(decision==='approved'?'Community post approved and released.':'Community post rejected.'));
    if(!error)await load();
  }
  return <>
    <section className="card ops-panel approval-queue" aria-labelledby="community-review-title"><div className="section-head"><div><div className="eyebrow">Community moderation</div><h2 id="community-review-title">Student posts awaiting release</h2><p className="muted">Nothing submitted by students becomes visible to the community until a teacher or administrator approves it.</p></div><button className="button button-secondary" onClick={()=>void load()}>Refresh</button></div>{loading?<p className="muted">Loading community submissions…</p>:communityItems.length===0?<p className="muted">No community posts are waiting for review.</p>:<div className="community-review-list">{communityItems.map(item=><article key={item.id} className="community-review-card"><div><span className="eyebrow">{one(item.course)?.title||'JPAC Program'} · {item.post_type.replaceAll('_',' ')}</span><h3>{item.title||'Student community post'}</h3><p>{item.body}</p><small>{one(item.author)?.display_name||'Student'} · {new Date(item.created_at).toLocaleString()}</small></div><div className="community-review-actions"><button className="button button-primary" onClick={()=>void reviewCommunity(item.id,'approved')}>Approve & Release</button><button className="button button-secondary" onClick={()=>void reviewCommunity(item.id,'rejected')}>Reject</button></div></article>)}</div>}</section>
    <section className="card ops-panel approval-queue" aria-labelledby="workflow-exceptions-title"><div className="section-head"><div><div className="eyebrow">Operational exceptions</div><h2 id="workflow-exceptions-title">Resolve workflow blockers</h2><p className="muted">Resolve opens the exact workflow, keeps the student selected, and shows step-by-step instructions for clearing the blocker.</p></div><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div>
      <div className="admin-metrics" style={{marginBottom:18}}><div><strong>{exceptions.length}</strong><span>Total exceptions</span></div><div><strong>{high}</strong><span>High priority</span></div><div><strong>{medium}</strong><span>Needs follow-up</span></div></div>
      {message && <p className="admin-message">{message}</p>}{loading?<p className="muted">Checking student workflows…</p>:exceptions.length===0?<p className="muted">No workflow blockers detected.</p>:<div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student</b><b>Issue</b><b>Priority</b><b>Updated</b><b>Action</b></div>{exceptions.map((item,index)=><div className="approval-queue-row" role="row" key={`${item.exception_key}-${item.student_id||index}-${item.created_at}`}><span><strong>{item.student_name||'Student record'}</strong><small>{item.student_email||'No email'}</small></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.severity==='high'?'🔴 High':item.severity==='medium'?'🟡 Follow-up':'🟢 Low'}</span><time>{item.created_at?new Date(item.created_at).toLocaleDateString():'—'}</time><Link className="button button-primary" onClick={()=>startResolution(item)} to={resolutionRoute(item)}>Resolve</Link></div>)}</div>}
    </section>
    <section className="card ops-panel approval-queue" aria-labelledby="approval-queue-title"><div className="section-head"><div><div className="eyebrow">Staff only · actionable workflow</div><h2 id="approval-queue-title">Approval Queue</h2></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="button button-secondary" to="/staff/students">Student Profiles</Link><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div></div>{loading ? <p className="muted">Loading pending actions…</p> : items.length === 0 ? <p className="muted">No approval actions are waiting.</p> : <div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student / email</b><b>Type</b><b>Status</b><b>Date</b><b>Action</b></div>{items.map((item) => <div className="approval-queue-row" role="row" key={`${item.item_type}-${item.item_id}`}><span><strong>{item.student_name}</strong><small>{item.student_email}</small></span><span>{item.item_type}</span><span>{item.item_status}</span><time>{item.item_date ? new Date(item.item_date).toLocaleDateString() : '—'}</time><Link className="button button-secondary" to={item.action_route}>Open</Link></div>)}</div>}</section>
  </>;
}
