import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { legalPolicyTemplates, type LegalPolicy } from '../data/legalPolicies';
import '../styles/member-launch.css';

export function LegalPoliciesPage({ editable = false }: { editable?: boolean }) {
  const { policySlug = 'terms' } = useParams();
  const { profile } = useAuth();
  const canEdit = editable && !!profile && ['admin', 'developer'].includes(profile.role);
  const template = legalPolicyTemplates.find(policy => policy.slug === policySlug);
  const fallback: LegalPolicy | null = template ? { ...template, effective_date: null, published: false } : null;
  const [record, setRecord] = useState<LegalPolicy | null>(null);
  const [draft, setDraft] = useState<LegalPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setRecord(null); setDraft(null); setLoading(true); setMessage('');
    async function load() {
      if (!supabase || !template) { if (active) setLoading(false); return; }
      try {
        let query = supabase.from('legal_policies').select('slug,title,effective_date,body,published').eq('slug', policySlug);
        if (!canEdit) query = query.eq('published', true);
        const { data, error } = await query.maybeSingle();
        if (!active) return;
        if (error) setMessage(canEdit ? 'Policy storage is unavailable. Apply the launch database migration before saving.' : 'Published content is unavailable. The template below is shown instead.');
        else if (data) { setRecord(data as LegalPolicy); setDraft(data as LegalPolicy); }
      } catch { if (active) setMessage('Published content is unavailable. The template below is shown instead.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [policySlug, canEdit, template]);
  async function save(event: FormEvent) {
    event.preventDefault();
    const value = draft || fallback;
    if (!supabase || !canEdit || !value) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.from('legal_policies').upsert({ ...value, title: value.title.trim(), body: value.body.trim() }, { onConflict: 'slug' }).select('slug,title,effective_date,body,published').single();
      if (error) throw error;
      setRecord(data as LegalPolicy); setDraft(data as LegalPolicy);
      setMessage(value.published ? 'Policy published. Public pages now show this content.' : 'Draft saved. Public pages show the template until this policy is published.');
    } catch { setMessage('Policy could not be saved. Check your administrator access and policy storage, then retry.'); }
    finally { setBusy(false); }
  }
  const value = record || fallback;
  const editing = draft || fallback;
  const base = canEdit ? '/admin/policies' : '/legal';
  return <main className="legal-page"><Link to="/">← Academy Home</Link><header><div className="eyebrow">JPAC Academy</div><h1>Legal & Policies</h1><p>Review Academy policies and parent/guardian instructions.</p></header><nav className="legal-links" aria-label="Legal policies">{legalPolicyTemplates.map(policy => <Link key={policy.slug} to={`${base}/${policy.slug}`} aria-current={policySlug === policy.slug ? 'page' : undefined}>{policy.title}</Link>)}<Link to="/legal/consent">Policies & Parent Consent</Link></nav><div className="policy-warning">Policy templates require review and finalization by JPAC. A template or unpublished placeholder is not a finalized policy. Reading this page does not record consent.</div>{message && <p role="status">{message}</p>}
    {policySlug === 'consent' ? <section className="card card-pad"><h2>Policies & Parent Consent</h2><p>Please review the published Academy policies. If parent or guardian consent applies, contact JPAC staff for the approved form and instructions before coursework.</p><p>Consent is recorded through the existing staff consent process. This page does not mark consent complete.</p><a className="button button-primary" href="mailto:admissions@jmonespac.org?subject=JPAC%20Parent%20Consent%20Instructions">Request consent instructions</a></section> : !value ? <section className="card card-pad"><h2>Policy not found</h2><Link to="/legal">View available policies</Link></section> : loading ? <p role="status">Loading policy…</p> : <article className="card card-pad"><h2>{value.title}</h2><p>{value.published ? 'Published policy' : 'Template / draft'} · Effective date: {value.effective_date || 'Not finalized'}</p><div className="policy-body">{value.body}</div></article>}
    {canEdit && editing && !loading && <form className="card card-pad policy-editor" onSubmit={save}><h2>Edit policy</h2><label>Title<input required maxLength={200} value={editing.title} onChange={e => setDraft({ ...editing, title: e.target.value })} /></label><label>Effective date<input type="date" required={editing.published} value={editing.effective_date || ''} onChange={e => setDraft({ ...editing, effective_date: e.target.value || null })} /></label><label>Policy body<textarea required maxLength={100000} value={editing.body} onChange={e => setDraft({ ...editing, body: e.target.value })} /></label><label className="policy-publish"><input type="checkbox" checked={editing.published} onChange={e => setDraft({ ...editing, published: e.target.checked })} /> Publish this policy for public and member pages</label><p>Saving an unpublished draft replaces any published version with the static template. Review the text and effective date before publishing.</p><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : editing.published ? 'Save & Publish Policy' : 'Save Draft'}</button></form>}
  </main>;
}
