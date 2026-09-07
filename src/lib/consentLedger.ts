import { supabase } from './supabase';

export type ConsentStatus = 'incomplete' | 'complete' | 'revoked' | 'needs_review';
export type ConsentRecord = {
  id: string; student_id: string; student_email?: string | null; student_name: string | null;
  guardian_name: string | null; guardian_email: string | null; student_birthdate: string | null;
  student_age_confirmed: boolean; under_13: boolean; terms_accepted: boolean;
  privacy_acknowledged: boolean; children_privacy_acknowledged: boolean;
  acceptable_use_accepted: boolean; refund_policy_acknowledged: boolean;
  internal_learning_media_consent: boolean; promotional_media_consent: boolean;
  ai_usage_acknowledged: boolean; parent_guardian_consent: boolean;
  consent_status: ConsentStatus; consent_version: string; signed_by_name: string | null;
  signed_by_relationship: string | null; signed_at: string | null;
  student_visible_note: string | null; internal_note?: string | null;
  created_at: string; updated_at: string;
};

export type ConsentForm = {
  guardianName: string; guardianEmail: string; birthdate: string; ageConfirmed: boolean;
  termsAccepted: boolean; privacyAcknowledged: boolean; childrenPrivacyAcknowledged: boolean;
  acceptableUseAccepted: boolean; refundPolicyAcknowledged: boolean;
  internalLearningMediaConsent: boolean; promotionalMediaConsent: boolean;
  aiUsageAcknowledged: boolean; parentGuardianConsent: boolean;
  signedByName: string; signedByRelationship: string; studentVisibleNote: string;
};

function client() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase; }
export async function getMyConsentStatus() { const { data, error } = await client().rpc('jpac_get_my_consent_status_v1'); if (error) throw new Error(error.message); return ((data || [])[0] || null) as ConsentRecord | null; }
export async function submitStudentConsent(form: ConsentForm) {
  const { data, error } = await client().rpc('jpac_submit_student_consent_v1', {
    target_guardian_name: form.guardianName, target_guardian_email: form.guardianEmail,
    target_student_birthdate: form.birthdate || null, target_student_age_confirmed: form.ageConfirmed,
    target_terms_accepted: form.termsAccepted, target_privacy_acknowledged: form.privacyAcknowledged,
    target_children_privacy_acknowledged: form.childrenPrivacyAcknowledged,
    target_acceptable_use_accepted: form.acceptableUseAccepted,
    target_refund_policy_acknowledged: form.refundPolicyAcknowledged,
    target_internal_learning_media_consent: form.internalLearningMediaConsent,
    target_promotional_media_consent: form.promotionalMediaConsent,
    target_ai_usage_acknowledged: form.aiUsageAcknowledged,
    target_parent_guardian_consent: form.parentGuardianConsent,
    target_signed_by_name: form.signedByName, target_signed_by_relationship: form.signedByRelationship,
    target_student_visible_note: form.studentVisibleNote,
  });
  if (error) throw new Error(error.message);
  return ((data || [])[0] || null) as Pick<ConsentRecord, 'consent_status' | 'under_13' | 'signed_at'> | null;
}
export async function getStaffConsentLedger(studentId?: string) { const { data, error } = await client().rpc('jpac_staff_get_consent_ledger_v1', { target_student_id: studentId || null }); if (error) throw new Error(error.message); return (data || []) as ConsentRecord[]; }
export async function updateConsentReview(consentId: string, status: 'needs_review' | 'revoked', internalNote: string) { const { data, error } = await client().rpc('jpac_staff_update_consent_review_v1', { target_consent_id: consentId, target_status: status, target_internal_note: internalNote }); if (error) throw new Error(error.message); return data as ConsentRecord; }
