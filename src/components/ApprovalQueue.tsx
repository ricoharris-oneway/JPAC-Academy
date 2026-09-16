import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type QueueItem = { item_id: string; student_name: string; student_email: string; item_type: string; item_status: string; item_date: string; action_route: string };

export function ApprovalQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('jpac_staff_approval_queue');
      const rows = (data as QueueItem[] | null) || [];
      if (active) { setItems(rows); setMessage(error?.message || ''); setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  return <section className="card ops-panel approval-queue" aria-labelledby="approval-queue-title"><div className="section-head"><div><div className="eyebrow">Staff only · read-only aggregation</div><h2 id="approval-queue-title">Approval Queue</h2></div><button className="button button-secondary" onClick={() => window.location.reload()}>Refresh</button></div>{message && <p className="admin-message">{message}</p>}{loading ? <p className="muted">Loading pending actions…</p> : items.length === 0 ? <p className="muted">No approval actions are waiting.</p> : <div className="approval-queue-table" role="table"><div className="approval-queue-row approval-queue-head" role="row"><b>Student / email</b><b>Type</b><b>Status</b><b>Date</b><b>Action</b></div>{items.map((item) =>   <div className="approval-queue-row" role="row" key={`${item.item_type}-${item.item_id}`}><span><strong>{item.student_name}</strong><small>{item.student_email}</small></span><span>{item.item_type}</span><span>{item.item_status}</span><time>{item.item_date ? new Date(item.item_date).toLocaleDateString() : '—'}</time><Link className="button button-secondary" to={item.action_route}>Open</Link></div>)}</div>}</section>;
}
