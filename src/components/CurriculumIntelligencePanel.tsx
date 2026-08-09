import{useState}from'react';
import{supabase}from'../lib/supabase';

type Action='improve_lesson'|'regenerate_activity'|'modernize_module'|'analyze_course';
type RecordLike=Record<string,unknown>;
type Proposal={scope:string;current:RecordLike|null;proposed:RecordLike;changes:Array<{section:string;kind:string;summary:string}>;rationale:string;validation:RecordLike};
type Response={provider:string;model:string;lifecycle:string;label:string;proposal:Proposal};
type Props={
  role:string;
  course?:{id:string;title:string;slug:string};
  module?:{id:string;title:string;status:string;level_module_number:number};
  lesson?:{id:string;title:string;status:string};
  activity?:{id:string;title:string;status:string};
};

const label=(key:string)=>key.replaceAll('_',' ').replace(/\b\w/g,value=>value.toUpperCase());
const display=(value:unknown):string=>Array.isArray(value)?value.map(item=>typeof item==='object'?Object.values(item as RecordLike).filter(Boolean).join(' — '):String(item)).join('\n'):value&&typeof value==='object'?Object.entries(value as RecordLike).map(([key,item])=>`${label(key)}: ${display(item)}`).join('\n'):String(value??'Not configured');
const comparableKeys=['title','learning_objective','content_blocks','practice','aria_evidence_targets','jpac_lab_integration','career_connection','assessment_relationship','description','instructions','xp_type','xp_reward','passing_score','submission_type','rubric','plan','health'];

function Comparison({proposal}:{proposal:Proposal}){
  const current=proposal.current||{};const proposed=proposal.proposed||{};const keys=comparableKeys.filter(key=>key in current||key in proposed);
  return <div className="ci-comparison">{keys.map(key=>{const before=display(current[key]);const after=display(proposed[key]);const state=!(key in current)?'added':!(key in proposed)?'removed':before===after?'unchanged':'modified';return <article key={key} className={`ci-diff ${state}`}><header><b>{label(key)}</b><span>{state}</span></header><div><section><small>Current</small><p>{before}</p></section><section><small>Proposed</small><p>{after}</p></section></div></article>})}</div>
}

export function CurriculumIntelligencePanel({role,course,module,lesson,activity}:Props){
  const[result,setResult]=useState<Response|null>(null);const[busy,setBusy]=useState<Action|null>(null);const[message,setMessage]=useState('');
  if(!['admin','developer'].includes(role))return null;
  async function generate(action:Action){
    if(!course)return;setBusy(action);setMessage('');setResult(null);
    const{data}=await supabase!.auth.getSession();
    const response=await fetch('/api/curriculum-intelligence',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({action,courseId:course.id,moduleId:module?.id,lessonId:lesson?.id,activityId:activity?.id})});
    const payload=await response.json();setBusy(null);
    if(!response.ok){setMessage(payload.error||'Unable to generate curriculum proposal.');return}setResult(payload as Response);
  }
  const moduleOne=course?.slug==='singing'&&module?.level_module_number===1;
  return <section className="card ci-panel">
    <div className="section-head"><div><div className="eyebrow">Administrative proposal workspace</div><h2>Curriculum Intelligence</h2><p>Analyze canonical curriculum and prepare reviewable drafts. Nothing here publishes or changes student records.</p></div><span className="ci-safety">PROPOSAL ONLY</span></div>
    {moduleOne&&<div className="ci-known-issue"><b>Known Module 1 state</b><span>The reviewed E3 Core Challenge is missing. Analysis retains the published legacy challenge and will not manufacture or publish the missing record.</span></div>}
    <div className="ci-actions">
      <button disabled={!lesson||Boolean(busy)} onClick={()=>void generate('improve_lesson')}><b>Improve Lesson</b><span>{lesson?.title||'Select a lesson'}</span></button>
      <button disabled={!activity||Boolean(busy)} onClick={()=>void generate('regenerate_activity')}><b>Regenerate Activity</b><span>{activity?.title||'Select an activity'}</span></button>
      <button disabled={!module||Boolean(busy)} onClick={()=>void generate('modernize_module')}><b>Modernize Module</b><span>{module?.title||'Select a module'}</span></button>
      <button disabled={!course||Boolean(busy)} onClick={()=>void generate('analyze_course')}><b>Analyze Course</b><span>{course?.title||'Select a course'}</span></button>
      <button disabled className="coming-soon"><b>Full Course Rebuild</b><span>Coming in next phase</span></button>
    </div>
    {busy&&<div className="ci-loading">Assembling canonical context and validation constraints…</div>}{message&&<div className="admin-message">{message}</div>}
    {result&&<div className="ci-result"><div className="ci-result-head"><div><span>{result.label}</span><h3>{label(result.proposal.scope)} proposal</h3></div><small>{result.provider} · {result.model}</small></div><Comparison proposal={result.proposal}/><section className="ci-rationale"><div className="eyebrow">Why ARIA recommends this</div><p>{result.proposal.rationale}</p></section><div className="ci-change-list"><h3>Change plan</h3>{result.proposal.changes.length?result.proposal.changes.map((change,index)=><article key={`${change.section}-${index}`}><span>{change.kind}</span><div><b>{change.section}</b><p>{change.summary}</p></div></article>):<p>Analysis only — no curriculum change set was generated.</p>}</div><footer><span>Lifecycle: GENERATED</span><b>Review required · approval would not publish</b></footer></div>}
  </section>
}
