import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getStudentPaymentLedger, paymentMethodLabels, paymentStatusLabels, purchaseTypeLabels, savePaymentLedgerEntry, type LedgerForm, type LedgerPurchaseType, type PaymentLedgerEntry, type PaymentMethod, type PaymentStatus } from '../lib/paymentLedger';
import type { PublishedCourse, StudentLookup } from '../lib/singleCourseEnrollment';
import '../styles/payment-ledger.css';

type EnrollmentChoice = { id: string; course_id: string; status: string };
const today = () => new Date().toISOString().slice(0, 10);
const blankForm = (): LedgerForm => ({ id: null, courseId: '', enrollmentId: '', paymentStatus: 'verified', paymentMethod: 'manual_approval', purchaseType: 'first_course_purchase', amount: '', currency: 'USD', paymentDate: today(), accessStartDate: '', accessEndDate: '', referenceNumber: '', externalSource: '', externalReference: '', studentVisibleNote: '', internalNote: '' });

export function PaymentLedgerPage() {
  const [email, setEmail] = useState(''); const [student, setStudent] = useState<StudentLookup | null>(null);
  const [courses, setCourses] = useState<PublishedCourse[]>([]); const [enrollments, setEnrollments] = useState<EnrollmentChoice[]>([]);
  const [entries, setEntries] = useState<PaymentLedgerEntry[]>([]); const [form, setForm] = useState<LedgerForm>(blankForm);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { void (async () => { if (!supabase) return; const { data, error: courseError } = await supabase.from('courses').select('id,title,status').order('title'); if (courseError) setError(courseError.message); else setCourses((data || []) as PublishedCourse[]); })(); }, []);
  const update = <K extends keyof LedgerForm>(key: K, value: LedgerForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const linkedEnrollments = useMemo(() => form.courseId ? enrollments.filter((item) => item.course_id === form.courseId) : enrollments, [enrollments, form.courseId]);

  async function loadLedger(found: StudentLookup) {
    if (!supabase) return;
    const [{ data: enrollmentRows, error: enrollmentError }, ledger] = await Promise.all([
      supabase.from('enrollments').select('id,course_id,status').eq('student_id', found.id).order('enrolled_at', { ascending: false }),
      getStudentPaymentLedger(found.id),
    ]);
    if (enrollmentError) throw new Error(enrollmentError.message);
    setEnrollments((enrollmentRows || []) as EnrollmentChoice[]); setEntries(ledger);
  }

  async function lookup() {
    setError(''); setMessage(''); setStudent(null); setEntries([]); setEnrollments([]); setForm(blankForm());
    const value = email.trim().toLowerCase(); if (!value) return setError('Enter a student email before looking up a profile.'); if (!supabase) return setError('Supabase is not configured.');
    setBusy(true);
    try { const { data, error: lookupError } = await supabase.from('profiles').select('id,display_name,email,role').ilike('email', value).eq('role', 'student').maybeSingle(); if (lookupError) throw lookupError; if (!data) return setError('student_missing: No existing student profile was found for that email.'); const found = data as StudentLookup; setStudent(found); await loadLedger(found); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load the student payment ledger.'); }
    finally { setBusy(false); }
  }

  function edit(entry: PaymentLedgerEntry) {
    setForm({ id: entry.id, courseId: entry.course_id || '', enrollmentId: entry.enrollment_id || '', paymentStatus: entry.payment_status, paymentMethod: entry.payment_method, purchaseType: entry.purchase_type, amount: entry.amount === null ? '' : String(entry.amount), currency: entry.currency, paymentDate: entry.payment_date, accessStartDate: entry.access_start_date || '', accessEndDate: entry.access_end_date || '', referenceNumber: entry.reference_number || '', externalSource: entry.external_source || '', externalReference: entry.external_reference || '', studentVisibleNote: entry.student_visible_note || '', internalNote: entry.internal_note || '' });
    setError(''); setMessage('Editing the selected payment record.');
  }

  async function save() {
    setError(''); setMessage(''); if (!student) return setError('Look up an existing student first.');
    setBusy(true); try { await savePaymentLedgerEntry(student.id, form); await loadLedger(student); setForm(blankForm()); setMessage('Payment ledger record saved. Course access was not changed.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save the payment record.'); } finally { setBusy(false); }
  }

  return <div className="payment-ledger-page"><header className="page-hero"><div><div className="eyebrow">Staff operations</div><h1 className="page-title">Student Payment Ledger</h1><p className="muted">Payment ledger records do not grant course access by themselves. Use Course Enrollment Manager to grant access after payment is verified.</p></div></header>
    {(error || message) && <div className={error ? 'admin-message error' : 'admin-message'} role="status">{error || message}</div>}
    <section className="card card-pad ledger-lookup"><label>Student email<div className="email-lookup"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com"/><button className="button button-secondary" type="button" disabled={busy} onClick={() => void lookup()}>{busy ? 'Loading…' : 'Look up'}</button></div></label>{student && <p className="lookup-result">Student: <strong>{student.display_name || 'No display name'}</strong> · {student.email}</p>}</section>
    {student && <div className="payment-ledger-grid"><section className="card card-pad ledger-form"><div className="ledger-entry-heading"><h2>{form.id ? 'Edit payment record' : 'Add payment record'}</h2>{form.id && <button className="button button-secondary" type="button" onClick={() => setForm(blankForm())}>Cancel edit</button>}</div>
      <div className="ledger-form-grid"><label>Course<select value={form.courseId} onChange={(event) => { update('courseId', event.target.value); update('enrollmentId', ''); }}><option value="">Not linked</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <label>Enrollment<select value={form.enrollmentId} onChange={(event) => update('enrollmentId', event.target.value)}><option value="">Not linked</option>{linkedEnrollments.map((item) => <option key={item.id} value={item.id}>{courses.find((course) => course.id === item.course_id)?.title || item.course_id} · {item.status}</option>)}</select></label>
      <label>Payment status<select value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value as PaymentStatus)}>{Object.entries(paymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Payment method<select value={form.paymentMethod} onChange={(event) => update('paymentMethod', event.target.value as PaymentMethod)}>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Purchase type<select value={form.purchaseType} onChange={(event) => update('purchaseType', event.target.value as LedgerPurchaseType)}>{Object.entries(purchaseTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} placeholder="Optional"/></label><label>Currency<input maxLength={3} value={form.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())}/></label><label>Payment date<input type="date" required value={form.paymentDate} onChange={(event) => update('paymentDate', event.target.value)}/></label><label>Access start date<input type="date" value={form.accessStartDate} onChange={(event) => update('accessStartDate', event.target.value)}/></label><label>Access end date<input type="date" value={form.accessEndDate} onChange={(event) => update('accessEndDate', event.target.value)}/></label><label>Reference number<input value={form.referenceNumber} onChange={(event) => update('referenceNumber', event.target.value)}/></label><label>External source<input value={form.externalSource} onChange={(event) => update('externalSource', event.target.value)} placeholder="Optional, e.g. Wix"/></label><label className="wide">External reference<input value={form.externalReference} onChange={(event) => update('externalReference', event.target.value)}/></label><label className="wide">Student-visible note<textarea value={form.studentVisibleNote} onChange={(event) => update('studentVisibleNote', event.target.value)}/></label><label className="wide">Internal staff note<textarea value={form.internalNote} onChange={(event) => update('internalNote', event.target.value)}/></label></div>
      <button className="button button-primary" type="button" disabled={busy || !student || !form.paymentDate || form.currency.length !== 3} onClick={() => void save()}>{busy ? 'Saving…' : form.id ? 'Update payment record' : 'Add payment record'}</button>
    </section><section className="ledger-list"><h2>Payment history</h2>{entries.length === 0 ? <div className="card card-pad"><p className="muted">No payment records found for this student.</p></div> : entries.map((entry) => <article className="card card-pad ledger-entry" key={entry.id}><div className="ledger-entry-heading"><div><div className="eyebrow">{purchaseTypeLabels[entry.purchase_type]}</div><h3>{entry.course_title || 'Course not linked'}</h3></div><span className={`ledger-status status-${entry.payment_status}`}>{paymentStatusLabels[entry.payment_status]}</span></div><p>{paymentMethodLabels[entry.payment_method]} · {entry.amount === null ? 'Amount not recorded' : `${entry.currency} ${Number(entry.amount).toFixed(2)}`} · {entry.payment_date}</p>{entry.internal_note && <p className="ledger-note"><strong>Internal:</strong> {entry.internal_note}</p>}<button className="button button-secondary" type="button" onClick={() => edit(entry)}>Edit</button></article>)}</section></div>}
  </div>;
}
