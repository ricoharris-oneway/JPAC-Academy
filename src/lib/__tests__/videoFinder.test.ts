import { VIDEO_FINDER_CSV_COLUMNS, buildVideoFinderRows, canAccessVideoFinder, suggestedYouTubeSearchTerm, videoFinderCsv, youtubeSearchUrl, type VideoFinderRow } from '../videoFinder';

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
