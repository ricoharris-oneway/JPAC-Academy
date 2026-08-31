import { VIDEO_FINDER_CSV_COLUMNS, buildVideoFinderRows, canAccessVideoFinder, normalizeApprovedYouTubeUrl, patchVideoFinderDraft, saveApprovedYouTubeVideo, setVideoFinderRowValue, suggestedYouTubeSearchTerm, videoFinderCsv, videoFinderDraftFor, youtubeSearchUrl } from '../videoFinder';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const courses = [{ id: 'course-1', title: 'Singing' }];
const modules = [
  { id: 'module-1', course_id: 'course-1', level_number: 1, module_number: 1, title: 'Breath and Alignment', existing_video_url: 'https://www.youtube.com/watch?v=abcdefghijk', existing_video_title: 'Breath Support', existing_duration_seconds: 180 },
  { id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Pitch and Listening', existing_video_url: '', existing_video_title: '', existing_duration_seconds: null },
];
const lessons = [
  { id: 'lesson-1', module_id: 'module-1', title: 'Singer Alignment and Breath', sort_order: 1 },
  { id: 'lesson-2', module_id: 'module-1', title: 'Healthy Warm-Up Routine', sort_order: 2 },
  { id: 'lesson-3', module_id: 'module-2', title: 'Pitch Matching', sort_order: 1 },
];

export function runVideoFinderTests(): number {
  const rows = buildVideoFinderRows(courses, modules, lessons);
  const first = rows[0];
  const term = suggestedYouTubeSearchTerm(first);
  const url = youtubeSearchUrl(term);
  const csv = videoFinderCsv(rows);
  assert(rows.length === 2, 'Module-based Video Finder must render exactly one save row per module.');
  assert(new Set(rows.map(row => row.moduleId)).size === rows.length && rows.every(row => row.rowKey === `module:${row.moduleId}`), 'No module save target may render a duplicate form.');
  assert(first.includedLessons.join('|') === 'Singer Alignment and Breath|Healthy Warm-Up Routine', 'Lessons must be read-only context inside their module row.');
  assert(term === 'Singing Breath and Alignment youth beginner tutorial' && url.includes('Breath%20and%20Alignment'), 'Search terms must describe the module-level target.');
  assert(VIDEO_FINDER_CSV_COLUMNS.includes('included_lessons') && csv.includes('Singer Alignment and Breath | Healthy Warm-Up Routine'), 'CSV output must communicate included lessons without independent lesson save rows.');
  assert(canAccessVideoFinder('teacher') && canAccessVideoFinder('admin') && canAccessVideoFinder('developer') && !canAccessVideoFinder('student'), 'Only staff roles may access Video Finder.');
  const hydrated = videoFinderDraftFor({}, first);
  assert(hydrated.url.endsWith('abcdefghijk') && hydrated.title === 'Breath Support' && hydrated.duration === '180', 'Saved URL, title, and duration must hydrate into their matching module row.');
  assert(videoFinderDraftFor({}, rows[1]).url === '' && videoFinderDraftFor({}, rows[1]).title === '' && videoFinderDraftFor({}, rows[1]).duration === '', 'Saved media must not hydrate into another module.');
  const drafts = patchVideoFinderDraft({}, first, { url: 'https://youtu.be/zyxwvutsrqp', title: 'Updated Breath', duration: '240' });
  assert(videoFinderDraftFor(drafts, rows[1]).url === '' && videoFinderDraftFor(drafts, rows[1]).title === '', 'Editing one module must not edit another module.');
  const statuses = setVideoFinderRowValue({}, first, 'Saved.');
  assert(statuses[first.rowKey] === 'Saved.' && statuses[rows[1].rowKey] === undefined, 'Save success must appear only on the saved module.');
  assert(buildVideoFinderRows(courses, modules, lessons, 'different-course').length === 0, 'Course filtering must remain deterministic.');
  assert(!('lessonId' in first) && !('lessonTitle' in first), 'Module-level rows must not pretend to expose independent lesson save targets.');
  return 12;
}

export async function runVideoFinderSaveTests(): Promise<number> {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { error: null }; } };
  assert(normalizeApprovedYouTubeUrl('https://www.youtube.com/watch?v=abcdefghijk')?.normalizedUrl === 'https://www.youtube.com/watch?v=abcdefghijk', 'Watch URLs must be accepted.');
  assert(normalizeApprovedYouTubeUrl('https://youtu.be/abcdefghijk?t=12')?.videoId === 'abcdefghijk', 'youtu.be URLs must be accepted.');
  assert(normalizeApprovedYouTubeUrl('https://www.youtube-nocookie.com/embed/abcdefghijk')?.videoId === 'abcdefghijk', 'Embed URLs must be accepted.');
  assert(!normalizeApprovedYouTubeUrl('') && !normalizeApprovedYouTubeUrl('https://example.com/watch?v=abcdefghijk'), 'Empty and non-YouTube URLs must be rejected.');
  assert(await saveApprovedYouTubeVideo(client, { moduleId: 'module-1', url: 'https://example.com/video', title: 'No', durationSeconds: 60 }) !== '', 'Invalid URLs must show a validation error.');
  assert(calls.length === 0, 'Validation failures must not call an RPC.');
  assert(await saveApprovedYouTubeVideo(client, { moduleId: 'module-1', url: 'https://youtu.be/abcdefghijk', title: 'Warm Ups', durationSeconds: 180 }) === '', 'A reviewed valid module video must save.');
  assert(Number(calls.length) === 1 && calls[0].name === 'video_finder_save_approved_youtube' && calls[0].args.target_module === 'module-1', 'Save must call the existing helper with only the selected module ID.');
  assert(Object.keys(calls[0].args).sort().join(',') === 'media_duration_seconds,media_title,media_url,target_module', 'Save payload must remain unchanged.');
  const failingClient = { rpc: async () => ({ error: { message: 'Staff access required' } }) };
  assert(await saveApprovedYouTubeVideo(failingClient, { moduleId: 'module-1', url: 'https://youtu.be/abcdefghijk', title: 'Warm Ups', durationSeconds: 180 }) === 'Staff access required', 'RPC failures must return useful error text and must not appear successful.');
  assert(!JSON.stringify(calls).match(/xp|progress|submission|review|status/i), 'Save must not call protected academic or status functions.');
  return 11;
}
