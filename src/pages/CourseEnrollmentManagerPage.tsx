import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { enrollmentAction, grantSingleCourseEnrollment, type PublishedCourse, type PurchaseType, type StudentLookup } from '../lib/singleCourseEnrollment';
import { findOnboardingStudent, learnerAgeGroup, loadOnboardingOverview, welcomeInstructions, type OnboardingOverview } from '../lib/enrollmentOnboarding';
import { paymentStatusLabels } from '../lib/paymentLedger';
import '../styles/course-enrollment-manager.css';

type JotformApplicant={submission_id:string;display_name:string;email:string|null;created_at:string|null};
const ACTIVE_STUDENT_KEY='jpac.activeStudentEmail';

export function CourseEnrollmentManagerPage() {
  const { profile, session } = useAuth();
  const [searchParams,setSearchParams]=useSearchParams();
  const [showJotform,setShowJotform]=useState(false);
  const [jotformApplicants,setJotformApplicants]=useState<JotformApplicant[]>([]);
  const [importingId,setImportingId]=useState('');
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
  async function showJotformApplications(){
    if(!session?.access_token)return setError('Administrator sign-in required.');
    setError('');setShowJotform(true);setBusy(true);
    try{const response=await fetch('/api/admin-reset-password?action=jotform_list',{headers:{Authorization:`Bearer ${session.access_token}`}});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to retrieve Jotform applications');setJotformApplicants(result.applications||[])}
    catch(reason){setError(reason instanceof Error?reason.message:'Unable to load Jotform applications.')}finally{setBusy(false)}
  }
  async function importJotformStudent(applicant:JotformApplicant){
    if(!session?.access_token)return setError('Administrator sign-in required.');
    setImportingId(applicant.submission_id);setBusy(true);setError('');setMessage('');
    try{const response=await fetch('/api/admin-reset-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'jotform_import',submission_id:applicant.submission_id})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not import student');setMessage(result.message||'Application imported for administrator review.');setShowJotform(false);if(applicant.email)await lookup(applicant.email)}
    catch(reason){setError(reason instanceof Error?reason.message:'Could not import student.')}finally{setBusy(false);setImportingId('')}
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
  async function grantAllCourses() {
    setError(''); setMessage(''); if (busy) return;
    if (!student?.email || student.email.trim().toLowerCase() !== email.trim().toLowerCase()) return setError('Look up and confirm the student email first.');
    if (!paymentVerified) return setError('Confirm payment, scholarship, or approved access before granting all published courses.');
    const activeIds = new Set((overview?.enrollments.data || []).filter(entry => entry.status === 'active').map(entry => entry.course_id));
    const targets = courses.filter(course => !activeIds.has(course.id));
    if (!targets.length) return setMessage('All published courses are already active for this student.');
    const token = request.current; setBusy(true);
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        await grantSingleCourseEnrollment({ learnerEmail: student.email, courseId: target.id, paymentVerified: true, purchaseType: index === 0 ? purchaseType : 'additional_course_purchase', notes: notes.trim() ? notes.trim() + ' · All-course access grant' : 'All-course access grant' });
      }
      if (token !== request.current) return;
      setMessage('All-course access updated. ' + targets.length + ' course' + (targets.length === 1 ? '' : 's') + ' activated.');
      setGrantedCourse('all'); setPaymentVerified(false);
      const updated = await loadOnboardingOverview(student.id); if (token === request.current) setOverview(updated);
    } catch (reason) { if (token === request.current) setError(reason instanceof Error ? reason.message : 'Unable to grant all-course access.'); }
    finally { if (token === request.current) setBusy(false); }
  }
  async function sendStudentEmail(action:'send_welcome_email'|'resend_login_email'){
    if(!student?.id||!session?.access_token)return setError('Select a student and confirm your staff session first.');
    setBusy(true);setError('');setMessage(action==='send_welcome_email'?'Sending welcome email…':'Generating a fresh login setup link…');
    try{const response=await fetch('/api/admin-reset-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,studentId:student.id})});const result=await response.json();if(!response.ok)throw new Error(result?.error||'Email could not be sent.');setMessage(result?.message||'Email sent successfully.')}catch(reason){setError(reason instanceof Error?reason.message:'Email could not be sent.');setMessage('')}finally{setBusy(false)}
  }
  const selected = courses.find(course => course.id === courseId);
  const activeCourseIds = new Set((overview?.enrollments.data || []).filter(entry => entry.status === 'active').map(entry => entry.course_id));
  const activePublishedCount = courses.filter(course => activeCourseIds.has(course.id)).length;
  const allPublishedActive = Boolean(courses.length) && activePublishedCount === courses.length;
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
    <header className="page-hero"><div><div className="eyebrow">Staff operations · Student onboarding</div><h1 className="page-title">Enrollment & Course Access</h1><p>Confirm the student, then grant access to one selected course or all published JPAC Academy courses.</p><p className="muted">Existing active enrollments are preserved and are not duplicated.</p></div></header>
    <nav className="onboarding-links" aria-label="Onboarding workspaces"><Link className="button button-secondary" to={`/staff/payment-ledger${studentQuery}`}>Payment Ledger</Link><Link className="button button-secondary" to={`/staff/consent-ledger${studentQuery}`}>Consent Ledger</Link>{profile && ['admin', 'developer'].includes(profile.role) && <Link className="button button-secondary" to="/manual-student">Admissions Center</Link>}</nav>
    {(error || message) && <div className={error ? 'admin-message error' : 'admin-message'} role="status">{error || message}</div>}
    <section className="card card-pad course-enrollment-form"><h2>1. Confirm student profile</h2><div style={{marginBottom:16}}><button type="button" className="button button-primary" disabled={busy} onClick={()=>{if(showJotform)setShowJotform(false);else void showJotformApplications()}}>{showJotform?'Close Jotform applications':'Import from Jotform'}</button></div>{showJotform&&<div className="card card-pad" style={{marginBottom:18}}><h3>Jotform applications</h3><p className="muted">Choose a submitted application to create or link the Academy student profile. Course access remains locked until staff approval.</p>{jotformApplicants.length===0?<p>No Jotform applications have reached Academy intake yet. Check the Jotform integration if a submission is missing.</p>:<div style={{display:'grid',gap:10}}>{jotformApplicants.map(applicant=><div key={applicant.submission_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:10,border:'1px solid #665071',borderRadius:10}}><div><strong>{applicant.display_name}</strong><div className="muted">{applicant.email||'Email missing'} · {applicant.created_at?new Date(applicant.created_at).toLocaleDateString():'Date unavailable'}</div></div><button type="button" className="button button-secondary" disabled={busy||!applicant.email} onClick={()=>void importJotformStudent(applicant)}>{importingId===applicant.submission_id?'Importing…':'Import Student'}</button></div>)}</div>}</div>}<form onSubmit={event => { event.preventDefault(); void lookup(); }}><label>Student email<div className="email-lookup"><input type="email" required disabled={busy} value={email} onChange={event => { resetStudent(); setEmail(event.target.value); }} placeholder="student@example.com"/><button className="button button-secondary" type="submit" disabled={busy}>{busy ? 'Working…' : 'Look up'}</button></div></label></form>{student && <div className="lookup-result">Student: <strong>{student.display_name || 'No display name'}</strong> · {student.email}<p>A profile exists. Use the actions below to refresh login access or send onboarding instructions.</p><div className="onboarding-links"><button className="button button-secondary" disabled={busy} onClick={() => void refresh()}>Refresh status</button><button className="button button-secondary" disabled={busy||!student.email} onClick={()=>void sendStudentEmail('resend_login_email')}>Resend login email</button><button className="button button-primary" disabled={busy||!student.email} onClick={()=>void sendStudentEmail('send_welcome_email')}>Send welcome email</button></div></div>}</section>
    {missing && <section className="card card-pad onboarding-account"><h2>Account setup required</h2><p>No student profile was found for this email. Create the admissions record, then complete account activation before enrollment.</p>{profile && ['admin', 'developer'].includes(profile.role) ? <Link className="button button-primary" to="/manual-student">Open Admissions Center</Link> : <p>Ask an admin or developer to open Admissions Center.</p>}</section>}
    <section className="card card-pad"><h2>Onboarding checklist</h2><p className="muted">The selected student now follows you between Enrollment Manager, Payment Ledger, and Consent Ledger.</p><ol className="onboarding-checklist">{checklist.map(([title, status]) => <li key={title}><strong>{title}</strong><span>{status}</span></li>)}</ol></section>
    {student && <>
      <div className="onboarding-status-grid">
        <section className="card card-pad"><h2>Current enrollments</h2>{!overview ? <p>Loading…</p> : overview.enrollments.error ? <p role="alert">Unavailable: {overview.enrollments.error}</p> : overview.enrollments.data.length ? <ul>{overview.enrollments.data.map(item => <li key={item.id}>{(Array.isArray(item.course) ? item.course[0] : item.course)?.title || item.course_id} · {item.status}</li>)}</ul> : <p>No enrollment records found.</p>}</section>
        <section className="card card-pad"><h2>Consent status</h2><strong>{consentLabel}</strong>{overview?.consent.error && <p role="alert">{overview.consent.error}</p>}<p>Consent review does not automatically block enrollment or revoke access.</p><Link to={`/staff/consent-ledger${studentQuery}`}>Review in Consent Ledger →</Link><label className="onboarding-confirm"><input type="checkbox" checked={minorConfirmed} onChange={event => { setMinorConfirmed(event.target.checked); setCopied(false); }}/> Student is a minor (staff confirmation)</label><label className="onboarding-confirm"><input type="checkbox" checked={guardianCaptured} onChange={event => setGuardianCaptured(event.target.checked)}/> Guardian information captured in the approved record</label></section>
        <section className="card card-pad"><h2>Payment ledger summary</h2>{!overview ? <p>Loading…</p> : overview.payments.error ? <p role="alert">Unavailable: {overview.payments.error}</p> : <><strong>{overview.payments.data.length} payment ledger records</strong><p>{overview.payments.data.filter(item => item.payment_status === 'verified').length} verified records across all courses.</p>{courseId && <p>Selected course: {coursePayments.length ? coursePayments.map(entry => paymentStatusLabels[entry.payment_status]).join(', ') : 'No linked payment records'}</p>}</>}<Link to={`/staff/payment-ledger${studentQuery}`}>Add or confirm payment ledger record →</Link></section>
      </div>
      <section className="card card-pad course-access-overview" aria-labelledby="course-access-overview-title">
        <div className="course-access-overview-head"><div><div className="eyebrow">Student course access</div><h2 id="course-access-overview-title">Published course access</h2><p className="muted">Use the existing single-course selector below, or grant every published course at once.</p></div><div className="course-access-count"><strong>{activePublishedCount}/{courses.length}</strong><span>active</span></div></div>
        <div className="course-access-status-grid">{courses.map(course => { const active = activeCourseIds.has(course.id); return <article className={active ? 'active' : ''} key={course.id}><span>{active ? '✓' : '○'}</span><div><strong>{course.title}</strong><small>{active ? 'Active access' : 'Not active'}</small></div></article>; })}</div>
      </section>
      <div className="course-enrollment-grid"><section className="card card-pad course-enrollment-form"><h2>2. Grant course access</h2><p className="muted">Select one course below, or use Grant All Published Courses.</p><label>Published course<select value={courseId} disabled={loading || busy} onChange={event => { setCourseId(event.target.value); setPaymentVerified(false); setNotes(''); }}><option value="">{loading ? 'Loading published courses…' : 'Select one course'}</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><fieldset disabled={busy}><legend>Purchase type</legend><label className="radio"><input type="radio" checked={purchaseType === 'first_course_purchase'} onChange={() => { setPurchaseType('first_course_purchase'); setPaymentVerified(false); }}/> First course purchase</label><label className="radio"><input type="radio" checked={purchaseType === 'additional_course_purchase'} onChange={() => { setPurchaseType('additional_course_purchase'); setPaymentVerified(false); }}/> Additional course purchase</label></fieldset><label className="payment-confirm"><input type="checkbox" disabled={busy || !courseId} checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)}/> Payment verified <small>Required</small></label><label>Internal note<textarea disabled={busy} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional staff note"/></label><div className="course-access-actions"><button className="button button-primary" disabled={busy || !student || !courseId || !paymentVerified} onClick={() => void submit()}>{busy ? 'Working…' : 'Grant Selected Course'}</button><button className="button button-secondary grant-all-courses" disabled={busy || !student || !paymentVerified || allPublishedActive || !courses.length} onClick={() => void grantAllCourses()}>{busy ? 'Working…' : allPublishedActive ? 'All Courses Active' : 'Grant All Published Courses'}</button></div></section><aside className="card card-pad enrollment-preview"><h2>Review before granting</h2><dl><div><dt>Student</dt><dd>{student.email}</dd></div><div><dt>Course</dt><dd>{selected?.title || 'Select one published course'}</dd></div><div><dt>Payment</dt><dd>{paymentVerified ? 'Staff verified' : 'Verification required'}</dd></div></dl><p>The existing single-course RPC creates, reactivates, or confirms existing access. It prevents duplicate active enrollments.</p><p>After success: <Link to={`/staff/payment-ledger${studentQuery}`}>Add or confirm payment ledger record.</Link></p></aside></div>
      <section className="card card-pad onboarding-welcome"><h2>3. Welcome & login emails</h2><p>Send a fresh login setup link whenever needed, then send the branded welcome email when onboarding is ready.</p><label>Welcome message<textarea readOnly rows={7} value={welcome}/></label><div className="onboarding-links"><button className="button button-secondary" disabled={busy} onClick={() => void copyWelcome()}>Copy welcome instructions</button><button className="button button-secondary" disabled={busy} onClick={()=>void sendStudentEmail('resend_login_email')}>Resend login email</button><button className="button button-primary" disabled={busy} onClick={()=>void sendStudentEmail('send_welcome_email')}>Send welcome email</button></div></section>
    </>}
  </div>;
}
