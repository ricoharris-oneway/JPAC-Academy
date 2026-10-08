import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type QueueItem = { item_id: string; student_name: string; student_email: string; item_type: string; item_status: string; item_date: string; action_route: string };
type ExceptionItem={exception_key:string;severity:'high'|'medium'|'low'|string;title:string;detail:string;student_id:string|null;student_name:string|null;student_email:string|null;action_route:string;created_at:string};
type CommunityReviewItem={id:string;title:string|null;body:string;post_type:string;created_at:string;media_url:string|null;author:{display_name?:string|null}|{display_name?:string|null}[]|null;course:{title?:string|null}|{title?:string|null}[]|null};
const ACTIVE_STUDENT_KEY='jpac.activeStudentEmail';
const storagePath=(value:string|null)=>value?.startsWith('storage:')?value.slice('storage:'.length):null;
const fileNameFromPath=(value:string|null)=>{const path=storagePath(value);if(!path)return'';const raw=path.split('/').pop()||'Student file';return raw.replace(/^community-[0-9a-f-]+-/i,'')};
const attachmentKind=(value:string|null)=>{const name=fileNameFromPath(value).toLowerCase();if(/\.(mp3|wav|m4a|aac|ogg)$/.test(name))return'audio';if(/\.(mp4|mov|m4v|webm)$/.test(name))return'video';if(/\.(jpg|jpeg|png|webp)$/.test(name))return'image';if(/\.(xls|xlsx|csv)$/.test(name))return'spreadsheet';return'document'};
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
  const [communityUrls,setCommunityUrls]=useState<Record<string,string>>({});
  const [exceptions,setExceptions]=useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [{data,error},{data:exceptionData,error:exceptionError},{data:communityData,error:communityError}] = await Promise.all([
      supabase.rpc('jpac_staff_approval_queue'),
      supabase.rpc('jpac_staff_operational_exceptions_v1'),
      supabase.from('community_posts').select('id,title,body,post_type,created_at,media_url,author:profiles!community_posts_author_id_fkey(display_name),course:courses(title)').eq('status','pending_review').order('created_at',{ascending:true})
    ]);
    setItems((data as QueueItem[] | null) || []);
    setExceptions((exceptionData as ExceptionItem[]|null)||[]);
    const communityRows=(communityData as CommunityReviewItem[]|null)||[];
    setCommunityItems(communityRows);
    const secured=await Promise.all(communityRows.filter(item=>storagePath(item.media_url)).map(async item=>{
      const path=storagePath(item.media_url);
      if(!path||!supabase)return[item.id,'']as const;
      const{data:signed}=await supabase.storage.from('performance-submissions').createSignedUrl(path,900);
      return[item.id,signed?.signedUrl||'']as const;
    }));
    setCommunityUrls(Object.fromEntries(secured.filter(([,url])=>url)));
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
    setMessage(error?.message||(decision==='approved'?'Community submission approved and released.':'Community submission rejected.'));
    if(!error)await load();
  }
  function Attachment({item}:{item:CommunityReviewItem}){
    if(!item.media_url)return null;
    const path=storagePath(item.media_url);
    if(!path)return <div className="community-review-evidence"><div><span>🔗</span><strong>External project link</strong></div><a className="button button-secondary" href={item.media_url} target="_blank" rel="noreferrer">Open link ↗</a></div>;
    const url=communityUrls[item.id];
    const kind=attachmentKind(item.media_url);
    const name=fileNameFromPath(item.media_url)||'Student submission';
    return <div className="community-review-evidence"><div className="community-review-file"><span>{kind==='audio'?'🎵':kind==='video'?'🎬':kind==='image'?'🖼️':kind==='spreadsheet'?'📊':'📄'}</span><div><strong>{name}</strong><small>{kind.replace(/^./,c=>c.toUpperCase())} submission</small></div></div>{url&&kind==='audio'&&<audio controls preload="metadata" src={url}/>} {url&&kind==='video'&&<video controls preload="metadata" src={url}/>} {url&&kind==='image'&&<img src={url} alt={name}/>} {url?<a className="button button-secondary" href={url} target="_blank" rel="noreferrer">Open secure file ↗</a>:<small className="muted">Secure preview unavailable. Refresh to generate a new review link.</small>}</div>;
  }
  return <>
    <section className="card ops-panel approval-queue" aria-labelledby="community-review-title"><div className="section-head"><div><div className="eyebrow">Community moderation</div><h2 id="community-review-title">Student work awaiting release</h2><p className="muted">Review text and uploaded evidence before anything becomes visible to the program community.</p></div><button className="button button-secondary" onClick={()=>void load()}>Refresh</button></div>{loading?<p className="muted">Loading community submissions…</p>:communityItems.length===0?<p className="muted">No community submissions are waiting for review.</p>:<div className="community-review-list">{communityItems.map(item=><article key={item.id} className="community-review-card"><div className="community-review-main"><span className="eyebrow">{one(item.course)?.title||'JPAC Program'} · {item.post_type.replaceAll('_',' ')}</span><h3>{item.title||'Student community submission'}</h3>{item.body&&<p>{item.body}</p>}<Attachment item={item}/><small>{one(item.author)?.display_name||'Student'} · {new Date(item.created_at).toLocaleString()}</small></div><div className="community-review-actions"><button className="button button-primary" onClick={()=>void reviewCommunity(item.id,'approved')}>Approve & Release</button><button className="button button-secondary" onClick={()=>void reviewCommunity(item.id,'rejected')}>Reject</button></div></article>)}</div>}</section>
    <section className="card ops-panel approval-queue" aria-labelledby="workflow-exceptions-title"><div className="section-head"><div><div className="eyebrow">Operational exceptions</div><h2 id="workflow-exceptions-title">Resolve workflow blockers</h2><p className="muted">Resolve opens the exact workflow, keeps the student selected, and shows step-by-step instructions for clearing the blocker.</p></div><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div>
      <div className="admin-metrics" style={{marginBottom:18}}><div><strong>{exceptions.length}</strong><span>Total exceptions</span></div><div><strong>{high}</strong><span>High priority</span></div><div><strong>{medium}</strong><span>Needs follow-up</span></div></div>
      {message && <p className="admin-message">{message}</p>}{loading?<p className="muted">Checking student workflows…</p>:exceptions.length===0?<p className="muted">No workflow blockers detected.</p>:<div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student</b><b>Issue</b><b>Priority</b><b>Updated</b><b>Action</b></div>{exceptions.map((item,index)=><div className="approval-queue-row" role="row" key={`${item.exception_key}-${item.student_id||index}-${item.created_at}`}><span><strong>{item.student_name||'Student record'}</strong><small>{item.student_email||'No email'}</small></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.severity==='high'?'🔴 High':item.severity==='medium'?'🟡 Follow-up':'🟢 Low'}</span><time>{item.created_at?new Date(item.created_at).toLocaleDateString():'—'}</time><Link className="button button-primary" onClick={()=>startResolution(item)} to={resolutionRoute(item)}>Resolve</Link></div>)}</div>}
    </section>
    <section className="card ops-panel approval-queue" aria-labelledby="approval-queue-title"><div className="section-head"><div><div className="eyebrow">Staff only · actionable workflow</div><h2 id="approval-queue-title">Approval Queue</h2></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="button button-secondary" to="/staff/students">Student Profiles</Link><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div></div>{loading ? <p className="muted">Loading pending actions…</p> : items.length === 0 ? <p className="muted">No approval actions are waiting.</p> : <div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student / email</b><b>Type</b><b>Status</b><b>Date</b><b>Action</b></div>{items.map((item) => <div className="approval-queue-row" role="row" key={`${item.item_type}-${item.item_id}`}><span><strong>{item.student_name}</strong><small>{item.student_email}</small></span><span>{item.item_type}</span><span>{item.item_status}</span><time>{item.item_date ? new Date(item.item_date).toLocaleDateString() : '—'}</time><Link className="button button-secondary" to={item.action_route}>Open</Link></div>)}</div>}</section>
  </>;
}
