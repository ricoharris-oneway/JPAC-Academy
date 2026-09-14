import { supabase } from './supabase';
import { getStaffConsentLedger, type ConsentRecord } from './consentLedger';
import { getStudentPaymentLedger, type PaymentLedgerEntry } from './paymentLedger';
import type { StudentLookup } from './singleCourseEnrollment';

export type EnrollmentOverview = { id: string; course_id: string; status: string; course: { title: string } | { title: string }[] | null };
export type ReadResult<T> = { data: T; error: string };
export type OnboardingOverview = { enrollments: ReadResult<EnrollmentOverview[]>; consent: ReadResult<ConsentRecord[]>; payments: ReadResult<PaymentLedgerEntry[]> };

export async function findOnboardingStudent(email: string): Promise<StudentLookup | null> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid student email.');
  // Treat LIKE wildcards as literal email characters, then verify the returned identity.
  const literal = value.replace(/[\\%_]/g, character => `\\${character}`);
  const { data, error } = await supabase.from('profiles').select('id,display_name,email,role').ilike('email', literal).eq('role', 'student').maybeSingle();
  if (error) throw new Error(error.message);
  if (data && data.email?.trim().toLowerCase() !== value) throw new Error('Email did not match exactly. Recheck the student identity.');
  return data as StudentLookup | null;
}

async function readEnrollments(studentId: string): Promise<EnrollmentOverview[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const rows: EnrollmentOverview[] = [];
  for (;;) {
    const { data, error, count } = await supabase.from('enrollments').select('id,course_id,status,course:courses(title)', { count: 'exact' }).eq('student_id', studentId).order('id').range(rows.length, rows.length + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data || []) as unknown as EnrollmentOverview[]);
    if (count === null) throw new Error('Unable to confirm complete enrollment history.');
    if (rows.length >= count) return rows;
    if (!data?.length) throw new Error('Incomplete enrollment history; refresh status.');
  }
}

export async function loadOnboardingOverview(studentId: string): Promise<OnboardingOverview> {
  const [enrollments, consent, payments] = await Promise.allSettled([readEnrollments(studentId), getStaffConsentLedger(studentId), getStudentPaymentLedger(studentId)]);
  function result<T>(value: PromiseSettledResult<T>, fallback: T): ReadResult<T> {
    return value.status === 'fulfilled' ? { data: value.value, error: '' } : { data: fallback, error: value.reason instanceof Error ? value.reason.message : 'Status unavailable. Refresh or open the ledger.' };
  }
  return { enrollments: result(enrollments, []), consent: result(consent, []), payments: result(payments, []) };
}

export function learnerAgeGroup(record: ConsentRecord | undefined, today = new Date()): 'minor' | 'adult' | 'unknown' {
  if (record?.under_13) return 'minor';
  const value = record?.student_birthdate;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'unknown';
  const birth = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== value || birth > today) return 'unknown';
  const birthdayPending = today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  return today.getUTCFullYear() - birth.getUTCFullYear() - Number(birthdayPending) < 18 ? 'minor' : 'adult';
}

export function welcomeInstructions(age: 'minor' | 'adult' | 'unknown') {
  return 'Welcome to JPAC Academy. Please log in at https://jpac-academy.vercel.app, complete Policies & Parent Consent, then open My Academy to begin your assigned course. Contact JPAC staff if you need help accessing your course.' + (age === 'adult' ? '' : `\n\n${age === 'unknown' ? 'If the student is a minor, a' : 'A'} parent or guardian should review and complete the consent information before the student begins coursework.`);
}
