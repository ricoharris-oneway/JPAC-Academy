import { supabase } from './supabase';

export type PaymentStatus = 'pending' | 'verified' | 'waived' | 'refunded' | 'voided';
export type PaymentMethod = 'wix_online' | 'cash' | 'in_person_card' | 'check' | 'scholarship' | 'comped' | 'manual_approval' | 'other';
export type LedgerPurchaseType = 'first_course_purchase' | 'additional_course_purchase' | 'scholarship_access' | 'comped_access' | 'correction';

export type PaymentLedgerEntry = {
  id: string; student_id?: string; course_id: string | null; enrollment_id: string | null;
  course_title: string | null; enrollment_status: string | null; payment_status: PaymentStatus;
  payment_method: PaymentMethod; purchase_type: LedgerPurchaseType; amount: number | null;
  currency: string; payment_date: string; access_start_date: string | null; access_end_date: string | null;
  reference_number: string | null; external_source?: string | null; external_reference?: string | null;
  student_visible_note: string | null; internal_note?: string | null; verified_at: string | null;
  created_at: string; updated_at?: string;
};

export type LedgerForm = {
  id: string | null; courseId: string; enrollmentId: string; paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod; purchaseType: LedgerPurchaseType; amount: string; currency: string;
  paymentDate: string; accessStartDate: string; accessEndDate: string; referenceNumber: string;
  externalSource: string; externalReference: string; studentVisibleNote: string; internalNote: string;
};

export const paymentStatusLabels: Record<PaymentStatus, string> = { pending: 'Pending', verified: 'Verified', waived: 'Waived', refunded: 'Refunded', voided: 'Voided' };
export const paymentMethodLabels: Record<PaymentMethod, string> = { wix_online: 'Wix online', cash: 'Cash', in_person_card: 'In-person card', check: 'Check', scholarship: 'Scholarship', comped: 'Comped', manual_approval: 'Manual approval', other: 'Other' };
export const purchaseTypeLabels: Record<LedgerPurchaseType, string> = { first_course_purchase: 'First course purchase', additional_course_purchase: 'Additional course purchase', scholarship_access: 'Scholarship access', comped_access: 'Comped access', correction: 'Correction' };

function requireClient() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; }
export async function getMyPaymentLedger() { const { data, error } = await requireClient().rpc('jpac_get_my_payment_ledger_v1'); if (error) throw new Error(error.message); return (data || []) as PaymentLedgerEntry[]; }
export async function getStudentPaymentLedger(studentId: string) { const { data, error } = await requireClient().rpc('jpac_staff_get_student_payment_ledger_v1', { target_student_id: studentId }); if (error) throw new Error(error.message); return (data || []) as PaymentLedgerEntry[]; }
export async function savePaymentLedgerEntry(studentId: string, form: LedgerForm) {
  const amount = form.amount.trim() === '' ? null : Number(form.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error('Enter a valid non-negative amount.');
  const { data, error } = await requireClient().rpc('jpac_staff_upsert_payment_ledger_entry_v1', {
    target_student_id: studentId, target_entry_id: form.id, target_course_id: form.courseId || null,
    target_enrollment_id: form.enrollmentId || null, target_payment_status: form.paymentStatus,
    target_payment_method: form.paymentMethod, target_purchase_type: form.purchaseType,
    target_amount: amount, target_currency: form.currency.trim().toUpperCase(), target_payment_date: form.paymentDate,
    target_access_start_date: form.accessStartDate || null, target_access_end_date: form.accessEndDate || null,
    target_reference_number: form.referenceNumber, target_external_source: form.externalSource,
    target_external_reference: form.externalReference, target_student_visible_note: form.studentVisibleNote,
    target_internal_note: form.internalNote,
  });
  if (error) throw new Error(error.message);
  return data as PaymentLedgerEntry;
}
