import { supabase } from './supabase';

export const SINGLE_COURSE_ENROLLMENT_RPC = 'jpac_staff_grant_single_course_enrollment_v1';
export const SINGLE_COURSE_ENROLLMENT_ROUTE = '/staff/course-enrollment';
export type PurchaseType = 'first_course_purchase' | 'additional_course_purchase';
export type PublishedCourse = { id: string; title: string; status: string };
export type StudentLookup = { id: string; display_name: string | null; email: string | null; role: string };

export function enrollmentAction(status: string | null | undefined) {
  if (status === 'already_enrolled' || status === 'already active') return 'already active';
  if (status === 'reactivated' || status === 'activated') return 'activated / reactivated';
  return 'enrolled / created';
}
export async function grantSingleCourseEnrollment(input: { learnerEmail: string; courseId: string; paymentVerified: boolean; purchaseType: PurchaseType; notes: string }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc(SINGLE_COURSE_ENROLLMENT_RPC, {
    learner_email: input.learnerEmail.trim(), target_course_id: input.courseId,
    payment_verified: input.paymentVerified, purchase_type: input.purchaseType,
    enrollment_notes: input.notes.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as { status?: string; message?: string };
}
