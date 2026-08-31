// @ts-expect-error Node's built-in type-strip test runner requires the explicit TypeScript extension.
import { approveSingingPilot, canAccessSingingPilot, singingPilotInvitation, singingPilotStatus, SINGING_PILOT_PREVIEW, SINGING_PILOT_RPC, validateSingingPilot, type SingingPilotForm } from '../singingPilotEnrollment.ts';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const valid: SingingPilotForm = { learnerEmail: 'Student@Example.com', guardianEmail: '', firstName: 'Jamie', lastName: 'Student', paymentVerified: true, notes: '' };

export async function runSingingPilotEnrollmentTests(): Promise<number> {
  assert(canAccessSingingPilot('teacher') && canAccessSingingPilot('admin') && canAccessSingingPilot('developer'), 'All staff roles must be allowed.');
  assert(!canAccessSingingPilot('student'), 'Students must be blocked.');
  assert(validateSingingPilot({ ...valid, paymentVerified: false }).includes('Confirm Wix'), 'Payment verification must be required.');
  assert(SINGING_PILOT_PREVIEW === 'This will grant Singing Pilot access only.', 'The UI must present the Singing-only access boundary.');
  assert(validateSingingPilot({ ...valid, guardianEmail: 'bad' }).includes('guardian'), 'Invalid optional guardian email must be blocked.');
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: { status: 'already_enrolled' }, error: null }; } };
  const response = await approveSingingPilot(client, valid);
  assert(calls.length === 1 && calls[0].name === SINGING_PILOT_RPC, 'Approval must call only the narrow Singing pilot RPC.');
  assert(!JSON.stringify(calls).match(/xp_ledger|lesson_progress|mastery|certificate|submission|review|awardxp/i), 'Approval must not call protected academic paths.');
  assert(response.result?.status === 'already_enrolled' && singingPilotStatus(response.result).startsWith('Already enrolled'), 'Duplicate enrollment must return an already-enrolled status.');
  assert(singingPilotStatus({ status: 'student_missing' }).startsWith('Student must create/sign into'), 'Missing students must receive the safe blocked instruction.');
  assert(singingPilotInvitation('https://jpac.example/').includes('https://jpac.example/login'), 'Invitation copy must contain the JPAC login route.');
  assert(!JSON.stringify(calls).match(/bronze|silver|gold|acting|dance|video.production/i), 'No package or non-Singing behavior may be introduced.');
  return 10;
}
