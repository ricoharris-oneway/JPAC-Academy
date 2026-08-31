import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { approveSingingPilot, singingPilotInvitation, singingPilotStatus, SINGING_PILOT_PREVIEW, SINGING_PILOT_WARNING, validateSingingPilot, type SingingPilotForm } from '../lib/singingPilotEnrollment';
import '../styles/singing-pilot-enrollment.css';

const initialForm: SingingPilotForm = { learnerEmail: '', guardianEmail: '', firstName: '', lastName: '', paymentVerified: false, notes: '' };

export function SingingPilotEnrollmentPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const invitation = singingPilotInvitation(window.location.origin);
  const patch = (value: Partial<SingingPilotForm>) => setForm((current) => ({ ...current, ...value }));

  async function approve() {
    const validation = validateSingingPilot(form);
    if (validation) { setSuccess(false); setMessage(validation); return; }
    if (!supabase) { setSuccess(false); setMessage('Supabase configuration is required.'); return; }
    setBusy(true); setMessage(''); setSuccess(false);
    const response = await approveSingingPilot(supabase, form);
    setBusy(false);
    if (response.error || !response.result) { setMessage(response.error || 'Enrollment approval did not return a result.'); return; }
    setSuccess(['enrolled', 'activated', 'already_enrolled'].includes(response.result.status));
    setMessage(singingPilotStatus(response.result));
  }

  async function copyInvitation() {
    try { await navigator.clipboard.writeText(invitation); setSuccess(true); setMessage('Invitation instructions copied.'); }
    catch { setSuccess(false); setMessage('Copy was blocked by the browser. Select and copy the instructions manually.'); }
  }

  return <div className="singing-pilot-page">
    <header className="page-hero"><div><div className="eyebrow">Staff enrollment approval</div><h1 className="page-title">Singing Pilot Enrollment</h1><p className="muted">Grant one existing JPAC student account access to the reviewed Singing pilot.</p></div></header>
    <section className="card card-pad singing-pilot-warning" aria-label="Approval warning"><strong>{SINGING_PILOT_WARNING}</strong><span>No payment processing or Wix connection occurs on this page.</span></section>
    {message && <div className={`admin-message ${success ? 'singing-pilot-success' : ''}`} role="status">{message}</div>}
    <div className="singing-pilot-grid">
      <section className="card card-pad singing-pilot-form">
        <div><div className="eyebrow">Existing student</div><h2>Approve course access</h2></div>
        <label>Learner email<input type="email" required value={form.learnerEmail} onChange={(event) => patch({ learnerEmail: event.target.value })} placeholder="student@example.com" /></label>
        <div className="singing-pilot-name-grid"><label>Student first name <small>Optional reference</small><input value={form.firstName} onChange={(event) => patch({ firstName: event.target.value })} /></label><label>Student last name <small>Optional reference</small><input value={form.lastName} onChange={(event) => patch({ lastName: event.target.value })} /></label></div>
        <label>Parent or guardian email <small>Optional reference</small><input type="email" value={form.guardianEmail} onChange={(event) => patch({ guardianEmail: event.target.value })} /></label>
        <label>Staff notes <small>Optional; do not enter payment-card details</small><textarea value={form.notes} onChange={(event) => patch({ notes: event.target.value })} /></label>
        <label className="singing-pilot-confirm"><input type="checkbox" checked={form.paymentVerified} onChange={(event) => patch({ paymentVerified: event.target.checked })} /><span>I have verified Wix payment/sign-up.</span></label>
        <div className="singing-pilot-preview"><span>Access preview</span><strong>{SINGING_PILOT_PREVIEW}</strong><small>No other JPAC course will be enrolled.</small></div>
        <button className="button button-primary" type="button" disabled={busy || !form.paymentVerified} onClick={() => void approve()}>{busy ? 'Approving…' : 'Approve Singing Access'}</button>
      </section>
      <aside className="card card-pad singing-pilot-invite">
        <div className="eyebrow">Student instructions</div><h2>Copy after approval</h2><p>{invitation}</p><button className="button button-secondary" type="button" onClick={() => void copyInvitation()}>Copy invitation instructions</button>
        <div className="singing-pilot-boundaries"><strong>Pilot boundaries</strong><ul><li>Singing only</li><li>Existing JPAC student account required</li><li>No XP or progress initialization</li><li>No Wix API or payment automation</li></ul></div>
      </aside>
    </div>
  </div>;
}
