import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type QueueItem = { item_id: string; student_name: string; student_email: string; item_type: string; item_status: string; item_date: string; action_route: string };
type ExceptionItem={exception_key:string;severity:'high'|'medium'|'low'|string;title:string;detail:string;student_id:string|null;student_name:string|null;student_email:string|null;action_route:string;created_at:string};

export function ApprovalQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [exceptions,setExceptions]=useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [{data,error},{data:exceptionData,error:exceptionError}] = await Promise.all([
      supabase.rpc('jpac_staff_approval_queue'),
      supabase.rpc('jpac_staff_operational_exceptions_v1')
    ]);
    setItems((data as QueueItem[] | null) || []);
    setExceptions((exceptionData as ExceptionItem[]|null)||[]);
    setMessage(error?.message || exceptionError?.message || '');
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  const high=exceptions.filter(item=>item.severity==='high').length;
  const medium=exceptions.filter(item=>item.severity==='medium').length;
  return <>
    <section className="card ops-panel approval-queue" aria-labelledby="workflow-exceptions-title"><div className="section-head"><div><div className="eyebrow">Operational exceptions</div><h2 id="workflow-exceptions-title">Resolve workflow blockers</h2><p className="muted">JPAC surfaces students who cannot move forward so staff can resolve the exact missing step.</p></div><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div>
      <div className="admin-metrics" style={{marginBottom:18}}><div><strong>{exceptions.length}</strong><span>Total exceptions</span></div><div><strong>{high}</strong><span>High priority</span></div><div><strong>{medium}</strong><span>Needs follow-up</span></div></div>
      {message && <p className="admin-message">{message}</p>}{loading?<p className="muted">Checking student workflows…</p>:exceptions.length===0?<p className="muted">No workflow blockers detected.</p>:<div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student</b><b>Issue</b><b>Priority</b><b>Updated</b><b>Action</b></div>{exceptions.map((item,index)=><div className="approval-queue-row" role="row" key={`${item.exception_key}-${item.student_id||index}-${item.created_at}`}><span><strong>{item.student_name||'Student record'}</strong><small>{item.student_email||'No email'}</small></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span>{item.severity==='high'?'🔴 High':item.severity==='medium'?'🟡 Follow-up':'🟢 Low'}</span><time>{item.created_at?new Date(item.created_at).toLocaleDateString():'—'}</time><Link className="button button-primary" to={item.action_route}>Resolve</Link></div>)}</div>}
    </section>
    <section className="card ops-panel approval-queue" aria-labelledby="approval-queue-title"><div className="section-head"><div><div className="eyebrow">Staff only · actionable workflow</div><h2 id="approval-queue-title">Approval Queue</h2></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="button button-secondary" to="/staff/students">Student Profiles</Link><button className="button button-secondary" onClick={() => void load()}>Refresh</button></div></div>{loading ? <p className="muted">Loading pending actions…</p> : items.length === 0 ? <p className="muted">No approval actions are waiting.</p> : <div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student / email</b><b>Type</b><b>Status</b><b>Date</b><b>Action</b></div>{items.map((item) => <div className="approval-queue-row" role="row" key={`${item.item_type}-${item.item_id}`}><span><strong>{item.student_name}</strong><small>{item.student_email}</small></span><span>{item.item_type}</span><span>{item.item_status}</span><time>{item.item_date ? new Date(item.item_date).toLocaleDateString() : '—'}</time><Link className="button button-secondary" to={item.action_route}>Open</Link></div>)}</div>}</section>
  </>;
}
