import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { legalPolicies, policyMeta, type LegalPolicy as StaticPolicy } from '../data/legalPolicies';
import '../styles/member-launch.css';

type StoredPolicy = { slug: string; title: string; effective_date: string | null; body: string; published: boolean };
const aliases: Record<string,string> = { refund: 'refund-policy', ai: 'ai-policy' };
const bodyFromPolicy=(policy:StaticPolicy)=>policy.sections.map(section=>[
  section.heading,
  ...(section.paragraphs||[]),
  ...(section.bullets||[]).map(item=>`• ${item}`)
].join('\n\n')).join('\n\n');

export function LegalPoliciesPage({ editable = false }: { editable?: boolean }) {
  const params = useParams<{ slug?: string; policySlug?: string }>();
  const rawSlug = params.slug || params.policySlug || 'terms';
  const policySlug = aliases[rawSlug] || rawSlug;
  const { profile } = useAuth();
  const canEdit = editable && !!profile && ['admin', 'developer'].includes(profile.role);
  const staticPolicy = legalPolicies.find(policy => policy.slug === policySlug);
  const fallback: StoredPolicy | null = staticPolicy ? {
    slug: staticPolicy.slug,
    title: staticPolicy.title,
    effective_date: '2026-10-07',
    body: bodyFromPolicy(staticPolicy),
    published: false
  } : null;

  const [record, setRecord] = useState<StoredPolicy | null>(null);
  const [draft, setDraft] = useState<StoredPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setRecord(null); setDraft(null); setLoading(true); setMessage('');
    async function load() {
      if (!supabase || !staticPolicy) { if (active) setLoading(false); return; }
      try {
        let query = supabase.from('legal_policies').select('slug,title,effective_date,body,published').eq('slug', policySlug);
        if (!canEdit) query = query.eq('published', true);
        const { data, error } = await query.maybeSingle();
        if (!active) return;
        if (error) setMessage(canEdit ? 'Policy storage is unavailable. The prepared Academy text is shown below.' : '');
        else if (data) { setRecord(data as StoredPolicy); setDraft(data as StoredPolicy); }
      } catch { if (active) setMessage(''); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [policySlug, canEdit, staticPolicy]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const value = draft || fallback;
    if (!supabase || !canEdit || !value) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.from('legal_policies').upsert({
        ...value,
        title: value.title.trim(),
        body: value.body.trim()
      }, { onConflict: 'slug' }).select('slug,title,effective_date,body,published').single();
      if (error) throw error;
      setRecord(data as StoredPolicy); setDraft(data as StoredPolicy);
      setMessage(value.published ? 'Policy published. Public and member pages now show this version.' : 'Policy draft saved.');
    } catch {
      setMessage('Policy could not be saved. Check administrator access and policy storage, then retry.');
    } finally { setBusy(false); }
  }

  if (rawSlug !== policySlug) return <Navigate replace to={`${canEdit?'/admin/policies':'/legal'}/${policySlug}`} />;

  const value = record || fallback;
  const editing = draft || fallback;
  const base = canEdit ? '/admin/policies' : '/legal';
  const isFinal = Boolean(value?.published);
  const formattedBody = useMemo(()=>value?.body||'',[value?.body]);

  return <main className="legal-page">
    <Link to="/">← Academy Home</Link>
    <header><div className="eyebrow">JPAC Academy</div><h1>Legal & Policies</h1><p>Review Academy policies and parent/guardian instructions.</p></header>
    <nav className="legal-links" aria-label="Legal policies">
      {legalPolicies.map(policy => <Link key={policy.slug} to={`${base}/${policy.slug}`} aria-current={policySlug === policy.slug ? 'page' : undefined}>{policy.title}</Link>)}
      <Link to="/legal/consent" aria-current={policySlug==='consent'?'page':undefined}>Policies & Parent Consent</Link>
    </nav>

    {!isFinal && policySlug!=='consent' && <div className="policy-warning">
      <strong>Prepared policy draft.</strong> The policy text is complete for JPAC review but is not yet marked published. Before final publication of the Privacy and Children’s Privacy notices, add JPAC’s public business mailing address and public telephone number.
    </div>}
    {message && <p role="status">{message}</p>}

    {policySlug === 'consent' ? <section className="card card-pad">
      <h2>Policies & Parent Consent</h2>
      <p>JPAC Academy uses a guided consent process so students and families can review the policies that apply to accounts, privacy, course participation, creative submissions, AI-supported learning, and media permissions.</p>
      <h3>Minor students</h3>
      <p>A parent or legal guardian must provide required acknowledgments and consent for a minor student. For a child under 13, the Children’s Privacy / COPPA Notice and verifiable parental-consent requirements also apply before personal information is collected except where law permits a limited exception.</p>
      <h3>Media choices</h3>
      <p>Internal educational use of student media may be necessary for assignments, feedback, assessment, portfolios, or showcase preparation. Public or promotional media permission is separate and optional.</p>
      <h3>How consent is recorded</h3>
      <p>Consent is recorded in the student’s Academy consent record. Reading a policy page by itself does not create consent.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Link className="button button-primary" to="/account/consents">Open consent form</Link>
        <a className="button button-secondary" href="mailto:admissions@jmonespac.org?subject=JPAC%20Parent%20Consent%20Question">Ask JPAC a consent question</a>
      </div>
    </section>
    : !value ? <section className="card card-pad"><h2>Policy not found</h2><Link to="/legal">View available policies</Link></section>
    : loading ? <p role="status">Loading policy…</p>
    : <article className="card card-pad">
      <h2>{value.title}</h2>
      <p>{value.published ? 'Published policy' : 'Prepared draft'} · Effective date: {value.effective_date ? new Date(`${value.effective_date}T12:00:00`).toLocaleDateString() : 'Pending publication'}</p>
      {record
        ? <div className="policy-body" style={{whiteSpace:'pre-wrap',lineHeight:1.65}}>{formattedBody}</div>
        : <div className="policy-sections">{staticPolicy?.sections.map(section=><section key={section.heading} style={{marginTop:24}}><h3>{section.heading}</h3>{section.paragraphs?.map(paragraph=><p key={paragraph}>{paragraph}</p>)}{section.bullets?.length?<ul>{section.bullets.map(item=><li key={item}>{item}</li>)}</ul>:null}</section>)}</div>}
    </article>}

    {canEdit && editing && !loading && <form className="card card-pad policy-editor" onSubmit={save}>
      <h2>Edit policy</h2>
      <label>Title<input required maxLength={200} value={editing.title} onChange={e => setDraft({ ...editing, title: e.target.value })} /></label>
      <label>Effective date<input type="date" required={editing.published} value={editing.effective_date || ''} onChange={e => setDraft({ ...editing, effective_date: e.target.value || null })} /></label>
      <label>Policy body<textarea required maxLength={100000} value={editing.body} onChange={e => setDraft({ ...editing, body: e.target.value })} /></label>
      <label className="policy-publish"><input type="checkbox" checked={editing.published} onChange={e => setDraft({ ...editing, published: e.target.checked })} /> Publish this policy for public and member pages</label>
      <p>Review the legal text, effective date, and required operator contact details before publication.</p>
      <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : editing.published ? 'Save & Publish Policy' : 'Save Draft'}</button>
    </form>}
  </main>;
}
