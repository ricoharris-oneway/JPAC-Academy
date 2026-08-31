import { VIDEO_FINDER_CSV_COLUMNS, buildVideoFinderRows, canAccessVideoFinder, normalizeApprovedYouTubeUrl, saveApprovedYouTubeVideo, suggestedYouTubeSearchTerm, videoFinderCsv, youtubeSearchUrl, type VideoFinderRow } from '../videoFinder';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export function runVideoFinderTests(): number {
  const row: VideoFinderRow = { courseName: 'Singing', courseId: 'course-1', levelNumber: 1, moduleNumber: 2, moduleId: 'module-2', moduleTitle: 'Vocal Foundations', lessonTitle: 'Beginner Vocal Warm-Ups', existingVideoUrl: '' };
  const term = suggestedYouTubeSearchTerm(row);
  const url = youtubeSearchUrl(term);
  const csv = videoFinderCsv([row]);
  const rows = buildVideoFinderRows([{ id: 'course-1', title: 'Singing' }], [{ id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Vocal Foundations', existing_video_url: '' }], [{ id: 'lesson-1', module_id: 'module-2', title: 'Beginner Vocal Warm-Ups', sort_order: 1 }]);
  assert(term === 'Singing Beginner Vocal Warm-Ups youth beginner tutorial', 'Search terms must use the deterministic age-appropriate formula.');
  assert(url === 'https://www.youtube.com/results?search_query=Singing%20Beginner%20Vocal%20Warm-Ups%20youth%20beginner%20tutorial', 'YouTube search URLs must encode terms correctly.');
  assert(VIDEO_FINDER_CSV_COLUMNS.every((column) => csv.includes(`"${column}"`)), 'CSV must include every required column.');
  assert(csv.includes('"course-1"') && csv.includes(`"${url}"`), 'CSV rows must include curriculum IDs and search links.');
  assert(canAccessVideoFinder('teacher') && canAccessVideoFinder('admin') && canAccessVideoFinder('developer'), 'Every staff/admin role must be allowed.');
  assert(!canAccessVideoFinder('student'), 'Students must not be allowed.');
  assert(rows.length === 1 && rows[0].lessonTitle === 'Beginner Vocal Warm-Ups' && rows[0].moduleTitle === 'Vocal Foundations', 'Lesson/module rows must render from read-only curriculum-shaped data.');
  assert(youtubeSearchUrl(suggestedYouTubeSearchTerm(rows[0])) === url, 'Open YouTube Search must use the generated URL.');
  assert(buildVideoFinderRows([{ id: 'course-1', title: 'Singing' }], [{ id: 'module-2', course_id: 'course-1', level_number: 1, module_number: 2, title: 'Vocal Foundations', existing_video_url: '' }], [], 'different-course').length === 0, 'Course filtering must be deterministic.');
  assert(Object.keys(row).every((key) => !['selectedYouTubeUrl', 'approved', 'notes'].includes(key)), 'Finder rows must not contain writable approval state.');
  return 10;
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
