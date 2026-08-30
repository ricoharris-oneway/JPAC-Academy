export const VIDEO_FINDER_CSV_COLUMNS = [
  'course_name', 'course_id', 'level_number', 'module_number', 'module_id', 'module_title',
  'lesson_title', 'existing_video_url', 'suggested_youtube_search_term', 'youtube_search_url',
  'selected_youtube_url', 'selected_video_title', 'approved', 'notes',
] as const;

export type VideoFinderRow = {
  courseName: string;
  courseId: string;
  levelNumber: number | null;
  moduleNumber: number | null;
  moduleId: string;
  moduleTitle: string;
  lessonTitle: string;
  existingVideoUrl: string;
};

export const VIDEO_FINDER_ROLES = ['teacher', 'admin', 'developer'] as const;
export const canAccessVideoFinder = (role: string) => VIDEO_FINDER_ROLES.some((allowed) => allowed === role);

export type VideoFinderCourse = { id: string; title: string };
export type VideoFinderModule = { id: string; course_id: string; level_number: number | null; module_number: number | null; title: string; existing_video_url: string };
export type VideoFinderLesson = { id: string; module_id: string; title: string; sort_order: number };

export function buildVideoFinderRows(courses: VideoFinderCourse[], modules: VideoFinderModule[], lessons: VideoFinderLesson[], courseFilter = ''): VideoFinderRow[] {
  return modules.flatMap((module) => {
    const course = courses.find((item) => item.id === module.course_id);
    if (!course || (courseFilter && course.id !== courseFilter)) return [];
    const moduleLessons = lessons.filter((lesson) => lesson.module_id === module.id).sort((a, b) => a.sort_order - b.sort_order);
    const base = { courseName: course.title, courseId: course.id, levelNumber: module.level_number, moduleNumber: module.module_number, moduleId: module.id, moduleTitle: module.title, existingVideoUrl: module.existing_video_url };
    return moduleLessons.length ? moduleLessons.map((lesson) => ({ ...base, lessonTitle: lesson.title })) : [{ ...base, lessonTitle: '' }];
  });
}

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export function suggestedYouTubeSearchTerm(row: Pick<VideoFinderRow, 'courseName' | 'moduleTitle' | 'lessonTitle'>): string {
  const topic = clean(row.lessonTitle || row.moduleTitle);
  return clean(`${row.courseName} ${topic} youth beginner tutorial`);
}

export function youtubeSearchUrl(searchTerm: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(clean(searchTerm))}`;
}

const csvCell = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function videoFinderCsv(rows: VideoFinderRow[]): string {
  const body = rows.map((row) => {
    const term = suggestedYouTubeSearchTerm(row);
    return [row.courseName, row.courseId, row.levelNumber, row.moduleNumber, row.moduleId, row.moduleTitle,
      row.lessonTitle, row.existingVideoUrl, term, youtubeSearchUrl(term), '', '', '', ''].map(csvCell).join(',');
  });
  return [VIDEO_FINDER_CSV_COLUMNS.map(csvCell).join(','), ...body].join('\r\n');
}
