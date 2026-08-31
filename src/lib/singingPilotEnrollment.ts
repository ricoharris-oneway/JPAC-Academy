export const SINGING_PILOT_ROUTE = '/staff/singing-pilot-enrollment';
export const SINGING_PILOT_RPC = 'jpac_singing_pilot_enroll_existing_student';
export const SINGING_PILOT_WARNING = 'Only approve after confirming Wix payment or authorized scholarship access.';
export const SINGING_PILOT_PREVIEW = 'This will grant Singing Pilot access only.';

export type SingingPilotRole = 'student' | 'teacher' | 'admin' | 'developer';
export type SingingPilotForm = {
  learnerEmail: string;
  guardianEmail: string;
  firstName: string;
  lastName: string;
  paymentVerified: boolean;
  notes: string;
};
export type SingingPilotResult = {
  status: 'enrolled' | 'activated' | 'already_enrolled' | 'student_missing' | 'student_role_blocked';
  message?: string;
  enrollment_id?: string;
  course_id?: string;
};
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

export function canAccessSingingPilot(role: string): role is Exclude<SingingPilotRole, 'student'> {
  return role === 'teacher' || role === 'admin' || role === 'developer';
}

export function singingPilotInvitation(appOrigin: string): string {
  const loginUrl = `${appOrigin.replace(/\/$/, '')}/login`;
  return `Welcome to JPAC Academy. Use the same email submitted during enrollment to sign in at ${loginUrl}. Aria will guide you through your first steps, and your Singing course access will appear in My Academy.`;
}

export function validateSingingPilot(form: SingingPilotForm): string {
  const email = form.learnerEmail.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid learner email.';
  if (form.guardianEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.guardianEmail.trim())) return 'Enter a valid guardian email or leave it blank.';
  if (!form.paymentVerified) return 'Confirm Wix payment/sign-up or authorized scholarship access before approval.';
  return '';
}

export async function approveSingingPilot(client: RpcClient, form: SingingPilotForm): Promise<{ result: SingingPilotResult | null; error: string }> {
  const validation = validateSingingPilot(form);
  if (validation) return { result: null, error: validation };
  const { data, error } = await client.rpc(SINGING_PILOT_RPC, {
    learner_email: form.learnerEmail.trim().toLowerCase(),
    guardian_email: form.guardianEmail.trim().toLowerCase() || null,
    student_first_name: form.firstName.trim() || null,
    student_last_name: form.lastName.trim() || null,
    payment_verified: form.paymentVerified,
    enrollment_notes: form.notes.trim() || null,
  });
  if (error) return { result: null, error: error.message };
  return { result: data as SingingPilotResult, error: '' };
}

export function singingPilotStatus(result: SingingPilotResult): string {
  if (result.status === 'student_missing') return 'Student must create/sign into the JPAC app with this email before access can be granted.';
  if (result.status === 'student_role_blocked') return 'This email belongs to a non-student account. No enrollment was created.';
  if (result.status === 'already_enrolled') return 'Already enrolled. Active Singing Pilot access is confirmed.';
  if (result.status === 'activated') return 'Existing Singing enrollment activated. No progress or XP was changed.';
  return 'Singing Pilot access approved.';
}
