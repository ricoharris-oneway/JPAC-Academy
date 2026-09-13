import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');

const bundle = await build({ entryPoints: ['src/lib/moduleReadiness.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { assessModule, generateModuleDraft } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const module = { id: 'm', course_id: 'c', title: 'Creative phrasing', status: 'published', sort_order: 2, level_module_number: 2, description: 'Explore phrasing.', ai_summary: 'Phrasing summary', learning_objectives: ['Explain phrasing'], career_connection: 'Rehearsal', primary_video_url: 'https://www.youtube.com/watch?v=abcdefghijk', active_instructional_media_id: null };
const lessons = [{ id: 'l', module_id: 'm', title: 'Phrase shapes', status: 'published' }];
const activities = [{ id: 'a', module_id: null, lesson_id: 'l', title: 'Try a phrase', status: 'published' }];
assert.equal(assessModule(module, lessons, activities, []).ready, true);
assert.equal(assessModule({ ...module, status: 'draft' }, lessons, activities, []).ready, false);
assert.equal(assessModule(module, lessons, [...activities, { ...activities[0], id: 'draft', status: 'draft' }], []).activityCount, 1);
assert.equal(assessModule(module, [], activities, []).activityCount, 0);
assert.equal(assessModule({ ...module, active_instructional_media_id: 'broken' }, lessons, activities, []).hasVideo, false);
const media = { id: 'v', module_id: 'm', status: 'active', normalized_url: module.primary_video_url, title: 'Approved phrasing', provider: 'youtube' };
assert.equal(assessModule({ ...module, primary_video_url: null }, lessons, activities, [media]).hasVideo, true);
assert.equal(assessModule({ ...module, primary_video_url: null }, lessons, activities, [{ ...media, status: 'retired' }]).hasVideo, false);
const empty = { ...module, description: ' ', ai_summary: '', learning_objectives: [' '], career_connection: null, primary_video_url: 'not a video' };
const row = assessModule(empty, [], [], []);
assert.equal(row.missing.length, 7);
const course = { id: 'c', title: 'Singing', slug: 'singing' };
const before = JSON.stringify({ course, row });
const draft = generateModuleDraft(course, row);
assert.equal(draft.length, 10); // Nine requested content sections plus staff context.
assert.deepEqual(generateModuleDraft(course, row), draft);
assert.equal(JSON.stringify({ course, row }), before);
assert.equal(generateModuleDraft(course, assessModule(module, lessons, activities, [])).length, 1);
for (const file of ['src/lib/moduleReadiness.ts', 'src/lib/moduleReadinessData.ts', 'src/pages/ModuleReadinessPage.tsx']) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /\.(insert|update|upsert|delete|rpc)\s*\(|localStorage|sessionStorage/);
}
const app = readFileSync('src/App.tsx', 'utf8');
assert.match(app, /path="\/staff\/module-readiness" element=\{<RequireRole roles=\{staff\}><ModuleReadinessPage\/>/);
assert.match(app, /const staff:AppRole\[\]=\['teacher','admin','developer'\]/);
console.log('Module readiness checks passed: publication, associations, media, empty fields, deterministic drafts, immutability, write boundary, route guard.');

// Exercise the actual loader against a read-only query double, including a server cap smaller than the requested page.
globalThis.readinessFixture = {
  tables: { courses: [course], course_modules: [module], lessons: Array.from({ length: 501 }, (_, id) => ({ ...lessons[0], id: String(id) })), activities, module_instructional_media: [] },
  calls: [], errorTable: '',
};
const loaderBundle = await build({ entryPoints: ['src/lib/moduleReadinessData.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'read-only-fixture', setup(builder) {
  builder.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: 'fixture', namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const supabase = { from(table) {
    let start = 0, end = 0;
    const query = { select() { return query; }, order() { return query; }, eq() { return query; }, range(a,b) { start=a; end=b; return query; },
      then(resolve) { const f=globalThis.readinessFixture; f.calls.push({table,start,end}); const rows=f.tables[table]; return Promise.resolve({data:rows.slice(start,Math.min(end+1,start+200)),count:rows.length,error:f.errorTable===table?{message:'fixture failure'}:null}).then(resolve); } };
    return query;
  } };`, loader: 'js' }));
} }] });
const { loadModuleReadiness } = await import(`data:text/javascript;base64,${Buffer.from(loaderBundle.outputFiles[0].text).toString('base64')}`);
assert.equal((await loadModuleReadiness()).lessons.length, 501);
assert.deepEqual(globalThis.readinessFixture.calls.filter(call => call.table === 'lessons').map(call => call.start), [0, 200, 400]);
globalThis.readinessFixture.errorTable = 'activities';
await assert.rejects(loadModuleReadiness(), /Unable to read activities/);
delete globalThis.readinessFixture;
console.log('Loader checks passed: all five tables, capped pagination, query failure rejects incomplete readiness.');
