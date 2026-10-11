import{useEffect,useState}from'react';
import{supabase}from'../lib/supabase';
import{SubmissionReviewEvidence}from'./SubmissionReviewEvidence';

type Row={
  id:string;student_id:string;status:string;score:number|null;teacher_feedback:string|null;submitted_at:string;
  media_url:string|null;media_name:string|null;media_type:string|null;
  student:{display_name:string|null;email:string|null}|{display_name:string|null;email:string|null}[]|null;
  activity:{title:string;rubric:unknown;module:{title:string;course:{title:string}|{title:string}[]|null}|{title:string;course:{title:string}|{title:string}[]|null}[]|null}|{title:string;rubric:unknown;module:{title:string;course:{title:string}|{title:string}[]|null}|{title:string;course:{title:string}|{title:string}[]|null}[]|null}[]|null;
};
type Draft={score:string;feedback:string};
const one=<T,>(v:T|T[]|null|undefined):T|null=>Array.isArray(v)?v[0]||null:v||null;

export function AssignmentReviewQueue(){
  const[rows,setRows]=useState<Row[]>([]);
  const[urls,setUrls]=useState<Record<string,string>>({});
  const[drafts,setDrafts]=useState<Record<string,Draft>>({});
  const[busy,setBusy]=useState('');
  const[message,setMessage]=useState('');
  const[loading,setLoading]=useState(true);

  async function load(){
    if(!supabase)return;
    setLoading(true);
    const{data,error}=await supabase.from('submissions')
      .select('id,student_id,status,score,teacher_feedback,submitted_at,media_url,media_name,media_type,student:profiles!submissions_student_id_fkey(display_name,email),activity:activities(title,rubric,module:course_modules(title,course:courses(title)))')
      .in('status',['submitted','under_review'])
      .order('submitted_at',{ascending:true});
    const pending=(data as unknown as Row[])||[];
    setRows(pending);
    if(error){setMessage(error.message);setLoading(false);return}
    const signed=await Promise.all(pending.filter(x=>x.media_url).map(async x=>{
      const{data:file}=await supabase!.storage.from('performance-submissions').createSignedUrl(x.media_url as string,900);
      return[x.id,file?.signedUrl||'']as const;
    }));
    setUrls(Object.fromEntries(signed.filter(([,url])=>url)));
    setLoading(false);
  }

  useEffect(()=>{void load()},[]);

  const draftFor=(id:string)=>drafts[id]||{score:'',feedback:''};
  const patch=(id:string,next:Partial<Draft>)=>setDrafts(current=>({...current,[id]:{...draftFor(id),...next}}));

  async function review(row:Row,decision:'approved'|'revision_requested'){
    if(!supabase)return;
    const draft=draftFor(row.id);
    const score=Number(draft.score);
    if(decision==='approved'&&(!draft.score||!Number.isFinite(score)||score<0||score>100)){setMessage('Enter a score from 0 to 100 before approving.');return}
    if(decision==='revision_requested'&&!draft.feedback.trim()){setMessage('Add revision feedback before returning the assignment.');return}
    setBusy(row.id);
    const request=decision==='approved'
      ?supabase.rpc('jpac_review_module_submission',{submission_target:row.id,review_score:score,review_feedback:draft.feedback.trim()})
      :supabase.rpc('teacher_review_submission',{submission_target:row.id,review_status:'revision_requested',review_score:draft.score?score:null,review_feedback:draft.feedback.trim()});
    const{error}=await request;
    setBusy('');
    setMessage(error?.message||(decision==='approved'?'Assignment approved.':'Assignment returned for revision.'));
    if(!error){setDrafts(current=>{const next={...current};delete next[row.id];return next});await load()}
  }

  return <section className="card teacher-dashboard-card assignment-review-queue">
    <div className="section-head"><div><div className="eyebrow">Assignment review queue</div><h2>Submitted work waiting for review</h2><p className="muted">Every verified student submission appears here for authorized teachers and administrators.</p></div><button className="button button-secondary" onClick={()=>void load()}>Refresh</button></div>
    {message&&<div className="admin-message">{message}</div>}
    {loading?<p className="muted">Loading submitted assignments…</p>:rows.length===0?<p className="muted">No assignments are currently waiting for review.</p>:<div className="teacher-review-list">{rows.map(row=>{const student=one(row.student);const activity=one(row.activity);const module=one(activity?.module);const course=one(module?.course);const draft=draftFor(row.id);const validScore=draft.score!==''&&Number.isFinite(Number(draft.score))&&Number(draft.score)>=0&&Number(draft.score)<=100;return <article className="teacher-review-card" key={row.id}>
      <div><div className="eyebrow">{course?.title||'JPAC Course'} · {row.status.replaceAll('_',' ')}</div><h3>{activity?.title||'Creative submission'}</h3><p><strong>{student?.display_name||'Student'}</strong>{student?.email?' · '+student.email:''}</p><p className="muted">{module?.title?module.title+' · ':''}Submitted {new Date(row.submitted_at).toLocaleString()}</p>
      <SubmissionReviewEvidence signedUrl={urls[row.id]||null} mediaName={row.media_name} mediaType={row.media_type} storagePath={row.media_url} rubric={activity?.rubric}/>
      <section className="teacher-assessment-panel"><div className="eyebrow">Review and approval</div><div className="teacher-feedback-box"><label><span>Assessment score</span><input type="number" min="0" max="100" value={draft.score} onChange={e=>patch(row.id,{score:e.target.value})} placeholder="0–100"/></label><label><span>Instructor feedback</span><textarea value={draft.feedback} onChange={e=>patch(row.id,{feedback:e.target.value})} placeholder="Give the student clear feedback."/></label></div><div className="teacher-review-actions"><button className="button button-secondary" disabled={busy===row.id||!draft.feedback.trim()} onClick={()=>void review(row,'revision_requested')}>{busy===row.id?'Saving…':'Return for Revision'}</button><button className="button button-primary" disabled={busy===row.id||!validScore} onClick={()=>void review(row,'approved')}>{busy===row.id?'Saving…':'Approve Assignment'}</button></div></section></div>
    </article>})}</div>}
  </section>;
}
