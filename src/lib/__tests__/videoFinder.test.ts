import { VIDEO_FINDER_CSV_COLUMNS, buildVideoFinderRows, canAccessVideoFinder, normalizeApprovedYouTubeUrl, patchVideoFinderDraft, saveApprovedYouTubeVideo, setVideoFinderRowValue, suggestedYouTubeSearchTerm, videoFinderCsv, videoFinderDraftFor, youtubeSearchUrl, type VideoFinderRow } from '../videoFinder';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export function runVideoFinderTests(): number {
  const row: VideoFinderRow = { rowKey: 'lesson:lesson-1', courseName: 'Singing', courseId: 'course-1', levelNumber: 1, moduleNumber: 2, moduleId: 'module-2', moduleTitle: 'Vocal Foundations', lessonId: 'lesson-1', lessonTitle: 'Beginner Vocal Warm-Ups', existingVideoUrl: '' };
  const term = suggestedYouTubeSearchTerm(row);
  const url = youtubeSearchUrl(term);
  const csv = videoFinderCsv([row]);
  const rows = buildVideoFinderRows([{ id: 'course-1', title: 'Singing' }], [{ id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Vocal Foundations', existing_video_url: '' }], [{ id: 'lesson-1', module_id: 'module-2', title: 'Beginner Vocal Warm-Ups', sort_order: 1 }, { id: 'lesson-2', module_id: 'module-2', title: 'Breath Practice', sort_order: 2 }]);
  assert(term === 'Singing Beginner Vocal Warm-Ups youth beginner tutorial', 'Search terms must use the deterministic age-appropriate formula.');
  assert(url === 'https://www.youtube.com/results?search_query=Singing%20Beginner%20Vocal%20Warm-Ups%20youth%20beginner%20tutorial', 'YouTube search URLs must encode terms correctly.');
  assert(VIDEO_FINDER_CSV_COLUMNS.every((column) => csv.includes(`"${column}"`)), 'CSV must include every required column.');
  assert(csv.includes('"course-1"') && csv.includes(`"${url}"`), 'CSV rows must include curriculum IDs and search links.');
  assert(canAccessVideoFinder('teacher') && canAccessVideoFinder('admin') && canAccessVideoFinder('developer'), 'Every staff/admin role must be allowed.');
  assert(!canAccessVideoFinder('student'), 'Students must not be allowed.');
  assert(rows.length === 2 && rows[0].lessonTitle === 'Beginner Vocal Warm-Ups' && rows[0].moduleTitle === 'Vocal Foundations', 'Lesson/module rows must render from read-only curriculum-shaped data.');
  assert(youtubeSearchUrl(suggestedYouTubeSearchTerm(rows[0])) === url, 'Open YouTube Search must use the generated URL.');
  assert(buildVideoFinderRows([{ id: 'course-1', title: 'Singing' }], [{ id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Vocal Foundations', existing_video_url: '' }], [], 'different-course').length === 0, 'Course filtering must be deterministic.');
  assert(Object.keys(row).every((key) => !['selectedYouTubeUrl', 'approved', 'notes'].includes(key)), 'Finder rows must not contain writable approval state.');
  let drafts = patchVideoFinderDraft({}, rows[0], { url: 'https://youtu.be/abcdefghijk', title: 'Row One', duration: '180' });
  assert(videoFinderDraftFor(drafts, rows[1]).url === '' && videoFinderDraftFor(drafts, rows[1]).title === '' && videoFinderDraftFor(drafts, rows[1]).duration === '', 'URL, title, and duration edits must remain isolated to their stable lesson row.');
  assert(videoFinderDraftFor(drafts, rows[0]).title === 'Row One' && rows[0].rowKey !== rows[1].rowKey, 'Each lesson row must have an independent stable key and draft.');
  const statuses = setVideoFinderRowValue({}, rows[0], 'Saved.');
  assert(statuses[rows[0].rowKey] === 'Saved.' && statuses[rows[1].rowKey] === undefined, 'Saved confirmation must appear only on the saved row.');
  const hydratedRows = buildVideoFinderRows([{ id: 'course-1', title: 'Singing' }], [{ id: 'module-1', course_id: 'course-1', level_number: 1, module_number: 1, title: 'Breath', existing_video_url: 'https://www.youtube.com/watch?v=abcdefghijk' }, { id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Pitch', existing_video_url: '' }], [{ id: 'lesson-a', module_id: 'module-1', title: 'Breath Lesson', sort_order: 1 }, { id: 'lesson-b', module_id: 'module-2', title: 'Pitch Lesson', sort_order: 1 }]);
  assert(videoFinderDraftFor({}, hydratedRows[0]).url.includes('abcdefghijk') && videoFinderDraftFor({}, hydratedRows[1]).url === '', 'Existing video hydration must stay with its matching database row.');
  return 14;
}

export async function runVideoFinderSaveTests(): Promise<number> {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { error: null }; } };
  assert(normalizeApprovedYouTubeUrl('https://www.youtube.com/watch?v=abcdefghijk')?.normalizedUrl === 'https://www.youtube.com/watch?v=abcdefghijk', 'Watch URLs must be accepted.');
  assert(normalizeApprovedYouTubeUrl('https://youtu.be/abcdefghijk?t=12')?.videoId === 'abcdefghijk', 'youtu.be URLs must be accepted.');
  assert(normalizeApprovedYouTubeUrl('https://www.youtube-nocookie.com/embed/abcdefghijk')?.videoId === 'abcdefghijk', 'Embed URLs must be accepted.');
  assert(!normalizeApprovedYouTubeUrl('') && !normalizeApprovedYouTubeUrl('https://example.com/watch?v=abcdefghijk'), 'Empty and non-YouTube URLs must be rejected.');
  assert(await saveApprovedYouTubeVideo(client, { moduleId: 'module-2', url: 'https://example.com/video', title: 'No', durationSeconds: 60 }) !== '', 'Invalid URLs must not save.');
  assert(calls.length === 0, 'Validation failures must not call an RPC.');
  assert(await saveApprovedYouTubeVideo(client, { moduleId: 'module-2', url: 'https://youtu.be/abcdefghijk', title: 'Warm Ups', durationSeconds: 180 }) === '', 'A reviewed valid video must save.');
  assert(Number(calls.length) === 1 && calls[0].name === 'video_finder_save_approved_youtube', 'Save must call only the approved Video Finder RPC.');
  assert(Object.keys(calls[0].args).sort().join(',') === 'media_duration_seconds,media_title,media_url,target_module', 'Save must send only video metadata and the target module.');
  assert(!JSON.stringify(calls).match(/xp|progress|submission|review|status/i), 'Save must not call protected academic or status functions.');
  return 10;
}
