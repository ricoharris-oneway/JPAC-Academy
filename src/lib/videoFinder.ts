export const VIDEO_FINDER_CSV_COLUMNS = [
  'course_name', 'course_id', 'level_number', 'module_number', 'module_id', 'module_title',
  'included_lessons', 'existing_video_url', 'suggested_youtube_search_term', 'youtube_search_url',
  'selected_youtube_url', 'selected_video_title', 'approved', 'notes',
] as const;

export type VideoFinderRow = {
  rowKey: string;
  courseName: string;
  courseId: string;
  levelNumber: number | null;
  moduleNumber: number | null;
  moduleId: string;
  moduleTitle: string;
  includedLessons: string[];
  existingVideoUrl: string;
  existingVideoTitle: string;
  existingDurationSeconds: number | null;
};

export const VIDEO_FINDER_ROLES = ['teacher', 'admin', 'developer'] as const;
export const canAccessVideoFinder = (role: string) => VIDEO_FINDER_ROLES.some((allowed) => allowed === role);

export type VideoFinderCourse = { id: string; title: string };
export type VideoFinderModule = { id: string; course_id: string; level_number: number | null; module_number: number | null; title: string; existing_video_url: string; existing_video_title: string; existing_duration_seconds: number | null };
export type VideoFinderLesson = { id: string; module_id: string; title: string; sort_order: number };

export function buildVideoFinderRows(courses: VideoFinderCourse[], modules: VideoFinderModule[], lessons: VideoFinderLesson[], courseFilter = ''): VideoFinderRow[] {
  return modules.flatMap<VideoFinderRow>((module) => {
    const course = courses.find((item) => item.id === module.course_id);
    if (!course || (courseFilter && course.id !== courseFilter)) return [];
    const moduleLessons = lessons.filter((lesson) => lesson.module_id === module.id).sort((a, b) => a.sort_order - b.sort_order);
    return [{ rowKey: `module:${module.id}`, courseName: course.title, courseId: course.id, levelNumber: module.level_number, moduleNumber: module.module_number, moduleId: module.id, moduleTitle: module.title, includedLessons: moduleLessons.map((lesson) => lesson.title), existingVideoUrl: module.existing_video_url, existingVideoTitle: module.existing_video_title, existingDurationSeconds: module.existing_duration_seconds }];
  });
}

export type VideoFinderDraft = { url: string; title: string; duration: string };
export type VideoFinderDrafts = Record<string, VideoFinderDraft>;

export function videoFinderDraftFor(drafts: VideoFinderDrafts, row: Pick<VideoFinderRow, 'rowKey' | 'existingVideoUrl' | 'existingVideoTitle' | 'existingDurationSeconds'>): VideoFinderDraft {
  return drafts[row.rowKey] || { url: row.existingVideoUrl, title: row.existingVideoTitle, duration: row.existingDurationSeconds ? String(row.existingDurationSeconds) : '' };
}

export function patchVideoFinderDraft(drafts: VideoFinderDrafts, row: Pick<VideoFinderRow, 'rowKey' | 'existingVideoUrl' | 'existingVideoTitle' | 'existingDurationSeconds'>, patch: Partial<VideoFinderDraft>): VideoFinderDrafts {
  return { ...drafts, [row.rowKey]: { ...videoFinderDraftFor(drafts, row), ...patch } };
}

export function setVideoFinderRowValue<T>(values: Record<string, T>, row: Pick<VideoFinderRow, 'rowKey'>, value: T): Record<string, T> {
  return { ...values, [row.rowKey]: value };
}

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export function suggestedYouTubeSearchTerm(row: Pick<VideoFinderRow, 'courseName' | 'moduleTitle'>): string {
  const topic = clean(row.moduleTitle);
  return clean(`${row.courseName} ${topic} youth beginner tutorial`);
}

export function youtubeSearchUrl(searchTerm: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(clean(searchTerm))}`;
}

export type ApprovedYouTubeVideo = { normalizedUrl: string; videoId: string };

export function approvedYouTubeVideoValidation(input: { url: string; title: string; duration: string | number }): string {
  if (!normalizeApprovedYouTubeUrl(input.url)) return 'Enter a valid YouTube watch, youtu.be, or YouTube embed URL.';
  if (!input.title.trim()) return 'Enter the reviewed video title.';
  const durationSeconds = Number(input.duration);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 7200) return 'Enter a duration between 1 and 7200 seconds.';
  return '';
}

export function normalizeApprovedYouTubeUrl(value: string): ApprovedYouTubeVideo | null {
  const source = value.trim();
  if (!source || /[<>]/.test(source)) return null;
  let url: URL;
  try { url = new URL(source); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host) && url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
  else if (host === 'youtu.be' && url.pathname.split('/').filter(Boolean).length === 1) videoId = url.pathname.slice(1);
  else if (['youtube.com', 'www.youtube.com', 'www.youtube-nocookie.com'].includes(host) && /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)) videoId = url.pathname.split('/')[2] || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return { normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`, videoId };
}

export type VideoFinderRpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> };

export async function saveApprovedYouTubeVideo(client: VideoFinderRpcClient, input: { moduleId: string; url: string; title: string; durationSeconds: number }): Promise<string> {
  const validation = approvedYouTubeVideoValidation({ url: input.url, title: input.title, duration: input.durationSeconds });
  if (validation) return validation;
  const normalized = normalizeApprovedYouTubeUrl(input.url)!;
  const { error } = await client.rpc('video_finder_save_approved_youtube', { target_module: input.moduleId, media_url: normalized.normalizedUrl, media_title: input.title.trim(), media_duration_seconds: input.durationSeconds });
  return error?.message || '';
}

const csvCell = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function videoFinderCsv(rows: VideoFinderRow[]): string {
  const body = rows.map((row) => {
    const term = suggestedYouTubeSearchTerm(row);
    return [row.courseName, row.courseId, row.levelNumber, row.moduleNumber, row.moduleId, row.moduleTitle,
      row.includedLessons.join(' | '), row.existingVideoUrl, term, youtubeSearchUrl(term), '', '', '', ''].map(csvCell).join(',');
  });
  return [VIDEO_FINDER_CSV_COLUMNS.map(csvCell).join(','), ...body].join('\r\n');
}
