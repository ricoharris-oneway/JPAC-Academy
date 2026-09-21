import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { enrollmentAction, grantSingleCourseEnrollment, type PublishedCourse, type PurchaseType, type StudentLookup } from '../lib/singleCourseEnrollment';
import { findOnboardingStudent, learnerAgeGroup, loadOnboardingOverview, welcomeInstructions, type OnboardingOverview } from '../lib/enrollmentOnboarding';
import { paymentStatusLabels } from '../lib/paymentLedger';
import '../styles/course-enrollment-manager.css';

const ACTIVE_STUDENT_KEY='jpac.activeStudentEmail';

export function CourseEnrollmentManagerPage() {
  const { profile, session } = useAuth();
  const [searchParams,setSearchParams]=useSearchParams();
  const [email, setEmail] = useState(''); const [student, setStudent] = useState<StudentLookup | null>(null);
  const [courses, setCourses] = useState<PublishedCourse[]>([]); const [courseId, setCourseId] = useState('');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('first_course_purchase'); const [paymentVerified, setPaymentVerified] = useState(false); const [notes, setNotes] = useState('');
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false); const [overview, setOverview] = useState<OnboardingOverview | null>(null);
  const [copied, setCopied] = useState(false); const [guardianCaptured, setGuardianCaptured] = useState(false); const [minorConfirmed, setMinorConfirmed] = useState(false);
  const [grantedCourse, setGrantedCourse] = useState(''); const request = useRef(0);

  useEffect(() => { let active = true; void (async () => { try { if (!supabase) throw new Error('Supabase is not configured.'); const { data, error: loadError } = await supabase.from('courses').select('id,title,status').eq('status', 'published').order('title'); if (loadError) throw new Error(loadError.message); if (active) setCourses((data as PublishedCourse[]) || []); } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load courses.'); } finally { if (active) setLoading(false); } })(); return () => { active = false; request.current++; }; }, []);

  useEffect(()=>{const fromUrl=(searchParams.get('email')||'').trim().toLowerCase();const remembered=(localStorage.getItem(ACTIVE_STUDENT_KEY)||'').trim().toLowerCase();const target=fromUrl||remembered;if(target&&!student&&target!==email){setEmail(target);void lookup(target)}},[]);

  function rememberStudent(found:StudentLookup){if(found.email){const value=found.email.trim().toLowerCase();localStorage.setItem(ACTIVE_STUDENT_KEY,value);setSearchParams({email:value},{replace:true})}}
  function resetStudent() { request.current++; setStudent(null); setOverview(null); setMissing(false); setPaymentVerified(false); setNotes(''); setCourseId(''); setPurchaseType('first_course_purchase'); setCopied(false); setGuardianCaptured(false); setMinorConfirmed(false); setGrantedCourse(''); setMessage(''); setError(''); }
  async function lookup(targetEmail?:string) {
    const value=(targetEmail??email).trim().toLowerCase(); if(!value)return;
    resetStudent(); setEmail(value); const token = request.current; setBusy(true);
    try { const found = await findOnboardingStudent(value); if (token !== request.current) return; if (!found) { setMissing(true); return; } setStudent(found); rememberStudent(found); const result = await loadOnboardingOverview(found.id); if (token === request.current) setOverview(result); }
    catch (reason) { if (token === request.current) setError(reason instanceof Error ? reason.message : 'Unable to look up student.'); }
    finally { if (token === request.current) setBusy(false); }
  }
  async function refresh() { if (!student || busy) return; setBusy(true); const token = request.current; try { const result = await loadOnboardingOverview(student.id); if (token === request.current) setOverview(result); } finally { if (token === request.current) setBusy(false); } }
  async function submit() {
    setError(''); setMessage(''); if (busy) return;
    if (!student?.email || student.email.trim().toLowerCase() !== email.trim().toLowerCase()) return setError('Look up and confirm the student email first.');
    if (!courseId) return setError('Select exactly one published course.'); if (!paymentVerified) return setError('Payment verification is required before submission.');
    const token = request.current; setBusy(true);
    try { const result = await grantSingleCourseEnrollment({ learnerEmail: student.email, courseId, paymentVerified, purchaseType, notes }); if (token !== request.current) return; setMessage(`${enrollmentAction(result.status)}${result.message ? ` — ${result.message}` : ''}. Next: Add or confirm payment ledger record.`); setGrantedCourse(courseId); setPaymentVerified(false); const updated = await loadOnboardingOverview(student.id); if (token === request.current) setOverview(updated); }
    catch (reason) { if (token === request.current) setError(reason instanceof Error ? reason.message : 'Unable to grant enrollment.'); }
    finally { if (token === request.current) setBusy(false); }
  }
  async function sendStudentEmail(action:'send_welcome_email'|'resend_login_email'){
    if(!student?.id||!session?.access_token)return setError('Select a student and confirm your staff session first.');
    setBusy(true);setError('');setMessage(action==='send_welcome_email'?'Sending welcome email…':'Generating a fresh login setup link…');
    try{const response=await fetch('/api/admin-reset-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,studentId:student.id})});const result=await response.json();if(!response.ok)throw new Error(result?.error||'Email could not be sent.');setMessage(result?.message||'Email sent successfully.')}catch(reason){setError(reason instanceof Error?reason.message:'Email could not be sent.');setMessage('')}finally{setBusy(false)}
  }
  const selected = courses.find(course => course.id === courseId);
  const consent = overview?.consent.data[0]; const age = minorConfirmed ? 'minor' : learnerAgeGroup(consent);
  const welcome = welcomeInstructions(age);
  const consentLabel = !overview ? 'Not checked' : overview.consent.error ? 'Unavailable' : consent?.consent_status === 'complete' ? 'Consent complete' : `Consent pending${consent ? ` — ${consent.consent_status.replace('_', ' ')}` : ' — no record'}`;
  const coursePayments = overview?.payments.data.filter(entry => entry.course_id === courseId) || [];
  const activeCourse = overview?.enrollments.data.some(entry => entry.course_id === courseId && entry.status === 'active');
  const studentQuery=student?.email?`?email=${encodeURIComponent(student.email)}`:'';
  const checklist = [
    ['Student account/profile confirmed', student ? 'Profile found; login activation is not verified here' : 'Look up student first'],
    ['Parent/guardian info captured, if minor', age === 'adult' ? 'Adult birthdate on consent record' : consent?.guardian_name && consent.guardian_email ? 'Guardian name and email recorded in Consent Ledger' : guardianCaptured ? 'Staff confirmed this session; not saved here' : 'Pending — confirm age and guardian information'],
    ['Consent completed or pending', consentLabel],
    ['Payment verified', paymentVerified ? 'Staff verified for this selected course' : 'Staff verification required for each grant'],
    ['Course access granted', !courseId ? 'Select a course' : grantedCourse === courseId ? 'Grant confirmed by existing RPC' : overview?.enrollments.error ? 'Unavailable' : activeCourse ? 'Selected course is active' : 'Not confirmed for selected course'],
    ['Payment ledger recorded', !student ? 'Look up student first' : !overview ? 'Loading' : overview.payments.error ? 'Unavailable' : !courseId ? `${overview.payments.data.length} records; select a course to check linkage` : `${coursePayments.length} records linked to selected course — review status`],
    ['Welcome instructions sent/copied', copied ? 'Copied this session; delivery not confirmed' : 'Use Send welcome email when onboarding is ready'],
  ];
  async function copyWelcome() { const token = request.current; try { await navigator.clipboard.writeText(welcome); if (token === request.current) { setCopied(true); setMessage('Welcome instructions copied.'); } } catch { if (token === request.current) setError('Clipboard unavailable. Select and copy the welcome text manually.'); } }
  return <div className="course-enrollment-page onboarding-page">
    <header className="page-hero"><div><div className="eyebrow">Staff operations · Student onboarding</div><h1 className="page-title">Enrollment Manager</h1><p>Confirm the student, review consent and payment documentation, then grant one selected course.</p><p className="muted">JPAC Academy is the learning platform. Wix may support website/payment verification. Each additional course requires another verified payment or approved access reason under the existing grant workflow.</p></div></header>
    <nav className="onboarding-links" aria-label="Onboarding workspaces"><Link className="button button-secondary" to={`/staff/payment-ledger${studentQuery}`}>Payment Ledger</Link><Link className="button button-secondary" to={`/staff/consent-ledger${studentQuery}`}>Consent Ledger</Link>{profile && ['admin', 'developer'].includes(profile.role) && <Link className="button button-secondary" to="/manual-student">Admissions Center</Link>}</nav>
    {(error || message) && <div className={error ? 'admin-message error' : 'admin-message'} role="status">{error || message}</div>}
    <section className="card card-pad course-enrollment-form"><h2>1. Confirm student profile</h2><form onSubmit={event => { event.preventDefault(); void lookup(); }}><label>Student email<div className="email-lookup"><input type="email" required disabled={busy} value={email} onChange={event => { resetStudent(); setEmail(event.target.value); }} placeholder="student@example.com"/><button className="button button-secondary" type="submit" disabled={busy}>{busy ? 'Working…' : 'Look up'}</button></div></label></form>{student && <div className="lookup-result">Student: <strong>{student.display_name || 'No display name'}</strong> · {student.email}<p>A profile exists. Use the actions below to refresh login access or send onboarding instructions.</p><div className="onboarding-links"><button className="button button-secondary" disabled={busy} onClick={() => void refresh()}>Refresh status</button><button className="button button-secondary" disabled={busy||!student.email} onClick={()=>void sendStudentEmail('resend_login_email')}>Resend login email</button><button className="button button-primary" disabled={busy||!student.email} onClick={()=>void sendStudentEmail('send_welcome_email')}>Send welcome email</button></div></div>}</section>
    {missing && <section className="card card-pad onboarding-account"><h2>Account setup required</h2><p>No student profile was found for this email. Create the admissions record, then complete account activation before enrollment.</p>{profile && ['admin', 'developer'].includes(profile.role) ? <Link className="button button-primary" to="/manual-student">Open Admissions Center</Link> : <p>Ask an admin or developer to open Admissions Center.</p>}</section>}
    <section className="card card-pad"><h2>Onboarding checklist</h2><p className="muted">The selected student now follows you between Enrollment Manager, Payment Ledger, and Consent Ledger.</p><ol className="onboarding-checklist">{checklist.map(([title, status]) => <li key={title}><strong>{title}</strong><span>{status}</span></li>)}</ol></section>
    {student && <>
      <div className="onboarding-status-grid">
        <section className="card card-pad"><h2>Current enrollments</h2>{!overview ? <p>Loading…</p> : overview.enrollments.error ? <p role="alert">Unavailable: {overview.enrollments.error}</p> : overview.enrollments.data.length ? <ul>{overview.enrollments.data.map(item => <li key={item.id}>{(Array.isArray(item.course) ? item.course[0] : item.course)?.title || item.course_id} · {item.status}</li>)}</ul> : <p>No enrollment records found.</p>}</section>
        <section className="card card-pad"><h2>Consent status</h2><strong>{consentLabel}</strong>{overview?.consent.error && <p role="alert">{overview.consent.error}</p>}<p>Consent review does not automatically block enrollment or revoke access.</p><Link to={`/staff/consent-ledger${studentQuery}`}>Review in Consent Ledger →</Link><label className="onboarding-confirm"><input type="checkbox" checked={minorConfirmed} onChange={event => { setMinorConfirmed(event.target.checked); setCopied(false); }}/> Student is a minor (staff confirmation)</label><label className="onboarding-confirm"><input type="checkbox" checked={guardianCaptured} onChange={event => setGuardianCaptured(event.target.checked)}/> Guardian information captured in the approved record</label></section>
        <section className="card card-pad"><h2>Payment ledger summary</h2>{!overview ? <p>Loading…</p> : overview.payments.error ? <p role="alert">Unavailable: {overview.payments.error}</p> : <><strong>{overview.payments.data.length} payment ledger records</strong><p>{overview.payments.data.filter(item => item.payment_status === 'verified').length} verified records across all courses.</p>{courseId && <p>Selected course: {coursePayments.length ? coursePayments.map(entry => paymentStatusLabels[entry.payment_status]).join(', ') : 'No linked payment records'}</p>}</>}<Link to={`/staff/payment-ledger${studentQuery}`}>Add or confirm payment ledger record →</Link></section>
      </div>
      <div className="course-enrollment-grid"><section className="card card-pad course-enrollment-form"><h2>2. Grant one selected course</h2><label>Published course<select value={courseId} disabled={loading || busy} onChange={event => { setCourseId(event.target.value); setPaymentVerified(false); setNotes(''); }}><option value="">{loading ? 'Loading published courses…' : 'Select one course'}</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><fieldset disabled={busy}><legend>Purchase type</legend><label className="radio"><input type="radio" checked={purchaseType === 'first_course_purchase'} onChange={() => { setPurchaseType('first_course_purchase'); setPaymentVerified(false); }}/> First course purchase</label><label className="radio"><input type="radio" checked={purchaseType === 'additional_course_purchase'} onChange={() => { setPurchaseType('additional_course_purchase'); setPaymentVerified(false); }}/> Additional course purchase</label></fieldset><label className="payment-confirm"><input type="checkbox" disabled={busy || !courseId} checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)}/> Payment verified <small>Required</small></label><label>Internal note<textarea disabled={busy} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional staff note"/></label><button className="button button-primary" disabled={busy || !student || !courseId || !paymentVerified} onClick={() => void submit()}>{busy ? 'Working…' : 'Grant course access'}</button></section><aside className="card card-pad enrollment-preview"><h2>Review before granting</h2><dl><div><dt>Student</dt><dd>{student.email}</dd></div><div><dt>Course</dt><dd>{selected?.title || 'Select one published course'}</dd></div><div><dt>Payment</dt><dd>{paymentVerified ? 'Staff verified' : 'Verification required'}</dd></div></dl><p>The existing single-course RPC creates, reactivates, or confirms existing access. It prevents duplicate active enrollments.</p><p>After success: <Link to={`/staff/payment-ledger${studentQuery}`}>Add or confirm payment ledger record.</Link></p></aside></div>
      <section className="card card-pad onboarding-welcome"><h2>3. Welcome & login emails</h2><p>Send a fresh login setup link whenever needed, then send the branded welcome email when onboarding is ready.</p><label>Welcome message<textarea readOnly rows={7} value={welcome}/></label><div className="onboarding-links"><button className="button button-secondary" disabled={busy} onClick={() => void copyWelcome()}>Copy welcome instructions</button><button className="button button-secondary" disabled={busy} onClick={()=>void sendStudentEmail('resend_login_email')}>Resend login email</button><button className="button button-primary" disabled={busy} onClick={()=>void sendStudentEmail('send_welcome_email')}>Send welcome email</button></div></section>
    </>}
  </div>;
}
