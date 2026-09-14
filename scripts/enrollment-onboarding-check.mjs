import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const fixture = globalThis.onboardingCheck = { email: 'learner_name@example.com', pattern: '', mode: 'normal' };
const bundle = await build({ entryPoints: ['src/lib/enrollmentOnboarding.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'fixture-only', setup(builder) {
  builder.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: 'fixture', namespace: 'mock' }));
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ loader: 'js', contents: `
    export const supabase = {
      from(table) { const f=globalThis.onboardingCheck; const q={select(){return q},eq(){return q},order(){return q},range(){return q},maybeSingle(){return q},ilike(key,value){f.pattern=value;return q},then(resolve){return Promise.resolve({data:table==='profiles'?(f.mode==='missing'?null:{id:'s',email:f.mode==='mismatch'?'other@example.com':f.email,role:'student'}):[],error:null,count:0}).then(resolve)}};return q; },
      async rpc(name){ if(!['jpac_staff_get_consent_ledger_v1','jpac_staff_get_student_payment_ledger_v1'].includes(name))throw Error('Unexpected RPC');return {data:[],error:globalThis.onboardingCheck.mode==='error'?{message:'fixture failure'}:null}; }
    };` }));
} }] });
const { findOnboardingStudent, loadOnboardingOverview, learnerAgeGroup, welcomeInstructions } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal((await findOnboardingStudent(' LEARNER_NAME@example.com ')).email, fixture.email);
assert.equal(fixture.pattern, 'learner\\_name@example.com');
fixture.mode = 'mismatch'; await assert.rejects(findOnboardingStudent(fixture.email), /exactly/);
fixture.mode = 'missing'; assert.equal(await findOnboardingStudent(fixture.email), null);
await assert.rejects(findOnboardingStudent(''), /valid student email/);
fixture.mode = 'error'; const failed = await loadOnboardingOverview('s');
assert.equal(failed.enrollments.error, ''); assert.equal(failed.consent.error, 'fixture failure'); assert.equal(failed.payments.error, 'fixture failure');
fixture.mode = 'normal'; assert.deepEqual((await loadOnboardingOverview('s')).payments, { data: [], error: '' });
const today = new Date('2026-09-14T12:00:00Z');
assert.equal(learnerAgeGroup({ student_birthdate: '2008-09-14' }, today), 'adult');
assert.equal(learnerAgeGroup({ student_birthdate: '2008-09-15' }, today), 'minor');
assert.equal(learnerAgeGroup({ student_birthdate: '2026-02-30' }, today), 'unknown');
assert.equal(learnerAgeGroup(undefined, today), 'unknown');
assert.match(welcomeInstructions('minor'), /A parent or guardian/);
assert.match(welcomeInstructions('unknown'), /If the student is a minor/);
assert.doesNotMatch(welcomeInstructions('adult'), /parent or guardian/);
assert.doesNotMatch(readFileSync('src/lib/enrollmentOnboarding.ts', 'utf8'), /\.(insert|update|upsert|delete)\s*\(|auth\.admin|localStorage/);
delete globalThis.onboardingCheck;
console.log('Onboarding checks passed: exact identity, missing/error states, independent reads, age boundaries, welcome copy, read-only helper.');
