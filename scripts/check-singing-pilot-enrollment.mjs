import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/202608310001_singing_pilot_enrollment.sql', 'utf8').toLowerCase();
const app = readFileSync('src/App.tsx', 'utf8');
const nav = readFileSync('src/layouts/AppLayout.tsx', 'utf8');
const page = readFileSync('src/pages/SingingPilotEnrollmentPage.tsx', 'utf8');
const helper = readFileSync('src/lib/singingPilotEnrollment.ts', 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(migration.includes("c.slug = 'singing'") && !migration.match(/c\.slug\s*=\s*'(acting|dance|video-production)'/), 'RPC must target only the canonical Singing slug.');
check(migration.includes('on conflict(student_id, course_id) do nothing'), 'RPC must use the canonical unique key for duplicate prevention.');
check(migration.includes("'student_missing'") && migration.includes("'already_enrolled'"), 'RPC must return safe missing and duplicate statuses.');
check(migration.includes('not public.is_staff()'), 'RPC must enforce the staff role helper.');
check(migration.includes('from public, anon, authenticated, service_role') && migration.includes('to authenticated'), 'RPC permissions must revoke broad roles and grant authenticated only.');
check(!migration.match(/\b(insert into|update|delete from)\s+public\.(xp_ledger|lesson_progress|mastery|certificates|submissions|reviews|student_timeline|teacher_assignments|student_intelligence)/), 'RPC must not write protected academic or intelligence records.');
check(!migration.match(/update\s+public\.(courses|course_modules|lessons)/), 'RPC must not update curriculum records.');
check(app.includes('path="/staff/singing-pilot-enrollment"') && app.includes('<RequireRole roles={staff}><SingingPilotEnrollmentPage/></RequireRole>'), 'Route must use the staff-only guard.');
check(nav.includes("['Singing Pilot Enrollment', '/staff/singing-pilot-enrollment', '🎤', ['teacher', 'admin', 'developer']]"), 'Navigation must exclude students.');
check(page.includes('I have verified Wix payment/sign-up.') && page.includes('SINGING_PILOT_PREVIEW') && helper.includes('This will grant Singing Pilot access only.'), 'UI must show verification and Singing-only boundaries.');

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join('\n'));
  process.exit(1);
}
console.log('Singing pilot source contract checks passed: 10');
