import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { approvedYouTubeVideoValidation, buildVideoFinderRows, normalizeApprovedYouTubeUrl, patchVideoFinderDraft, saveApprovedYouTubeVideo, setVideoFinderRowValue, suggestedYouTubeSearchTerm, videoFinderCsv, videoFinderDraftFor, youtubeSearchUrl, type VideoFinderDrafts, type VideoFinderRow } from '../lib/videoFinder';
import '../styles/video-finder.css';
import '../styles/video-finder-save.css';

type Course = { id: string; title: string };
type Level = { level_number: number };
type Module = { id: string; course_id: string; level_module_number: number | null; title: string; primary_video_url: string | null; video_title: string | null; video_duration_seconds: number | null; course_level: Level | Level[] | null };
type Lesson = { id: string; module_id: string; title: string; sort_order: number };

const levelNumber = (module: Module) => {
  const level = Array.isArray(module.course_level) ? module.course_level[0] : module.course_level;
  return level?.level_number ?? null;
};

export function VideoFinderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<VideoFinderDrafts>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

  useEffect(() => { void (async () => {
    if (!supabase) { setMessage('Supabase configuration is required to load curriculum.'); setLoading(false); return; }
    const [courseQuery, moduleQuery, lessonQuery] = await Promise.all([
      supabase.from('courses').select('id,title').order('title'),
      supabase.from('course_modules').select('id,course_id,level_module_number,title,primary_video_url,video_title,video_duration_seconds,course_level:course_levels(level_number)').order('sort_order'),
      supabase.from('lessons').select('id,module_id,title,sort_order').order('sort_order'),
    ]);
    const error = courseQuery.error || moduleQuery.error || lessonQuery.error;
    setCourses((courseQuery.data as Course[]) || []);
    setModules((moduleQuery.data as unknown as Module[]) || []);
    setLessons((lessonQuery.data as Lesson[]) || []);
    setMessage(error?.message || '');
    setLoading(false);
  })(); }, []);

  const rows = useMemo(() => buildVideoFinderRows(courses, modules.map((module) => ({ id: module.id, course_id: module.course_id, level_number: levelNumber(module), module_number: module.level_module_number, title: module.title, existing_video_url: module.primary_video_url || '', existing_video_title: module.video_title || '', existing_duration_seconds: module.video_duration_seconds })), lessons, courseFilter), [courseFilter, courses, lessons, modules]);

  const copy = async (value: string, success: string) => {
    try { await navigator.clipboard.writeText(value); setMessage(success); }
    catch { setMessage('Copy was blocked by the browser. Select and copy the text manually.'); }
  };

  const draftFor = (row: VideoFinderRow) => videoFinderDraftFor(drafts, row);
  const patchDraft = (row: VideoFinderRow, patch: Partial<{ url: string; title: string; duration: string }>) => setDrafts((values) => patchVideoFinderDraft(values, row, patch));
  const saveVideo = async (row: VideoFinderRow) => {
    if (!supabase) return;
    const draft = draftFor(row);
    setSavingRows((values) => setVideoFinderRowValue(values, row, true));
    setSaveStatus((values) => setVideoFinderRowValue(values, row, ''));
    const error = await saveApprovedYouTubeVideo(supabase, { moduleId: row.moduleId, url: draft.url, title: draft.title, durationSeconds: Number(draft.duration) });
    setSavingRows((values) => setVideoFinderRowValue(values, row, false));
    if (error) { setSaveStatus((values) => setVideoFinderRowValue(values, row, error)); return; }
    const refresh = await supabase.from('course_modules').select('id,course_id,level_module_number,title,primary_video_url,video_title,video_duration_seconds,course_level:course_levels(level_number)').eq('id', row.moduleId).single();
    if (refresh.error || !refresh.data) { setSaveStatus((values) => setVideoFinderRowValue(values, row, refresh.error?.message || 'The save completed, but the saved module could not be refreshed. Refresh the page before trying again.')); return; }
    const hydrated = refresh.data as unknown as Module;
    setModules((values) => values.map((module) => module.id === row.moduleId ? hydrated : module));
    setDrafts((values) => ({ ...values, [row.rowKey]: { url: hydrated.primary_video_url || '', title: hydrated.video_title || '', duration: hydrated.video_duration_seconds ? String(hydrated.video_duration_seconds) : '' } }));
    setSaveStatus((values) => setVideoFinderRowValue(values, row, 'Saved. The approved video is now available on published student lessons in this module.'));
  };

  return <div className="video-finder-page">
    <header className="page-hero"><div><div className="eyebrow">Staff curriculum helper</div><h1 className="page-title">Video Finder Helper</h1><p className="muted">Approved videos are saved at the module level and appear on published lessons in that module. Saving a video never changes curriculum publication status.</p></div></header>
    <section className="card card-pad video-review-guide" aria-labelledby="video-review-title"><h2 id="video-review-title">Review every video before use</h2><p>Before approving a video, confirm:</p><ul><li>Age appropriate</li><li>Clean language</li><li>Skill level matches the lesson</li><li>Instruction is accurate</li><li>No confusing or inappropriate content</li><li>Video can be embedded or linked safely</li><li>Comments, ads, and branding risk is acceptable</li></ul></section>
    <section className="card card-pad video-finder-controls"><label>Filter by course<select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="">All courses</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button className="button button-secondary" type="button" disabled={!rows.length} onClick={() => void copy(videoFinderCsv(rows), 'CSV template copied. Paste it into a .csv file or spreadsheet.')}>Copy CSV Template</button><span>{rows.length} module rows</span></section>
    {message && <div className="admin-message" role="status">{message}</div>}
    {loading ? <div className="card card-pad">Loading curriculum…</div> : <div className="video-finder-table-wrap card"><table><thead><tr><th>Course</th><th>Level / Module</th><th>Module and included lessons</th><th>Existing video</th><th>Suggested search</th><th>Approved module video</th></tr></thead><tbody>{rows.map((row) => { const term = suggestedYouTubeSearchTerm(row); const url = youtubeSearchUrl(term); const draft = draftFor(row); const normalized = normalizeApprovedYouTubeUrl(draft.url); const validation = approvedYouTubeVideoValidation({ url: draft.url, title: draft.title, duration: draft.duration }); const status = saveStatus[row.rowKey]; const saving = Boolean(savingRows[row.rowKey]); return <tr key={row.rowKey}><td>{row.courseName}</td><td>{row.levelNumber ?? '—'} / {row.moduleNumber ?? '—'}</td><td><strong>{row.moduleTitle}</strong><small>Included lessons</small>{row.includedLessons.length ? <ul>{row.includedLessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul> : <small className="muted">No lessons configured</small>}</td><td>{row.existingVideoUrl ? <a href={row.existingVideoUrl} target="_blank" rel="noreferrer">Open existing</a> : <span className="muted">None</span>}</td><td><div>{term}</div><div className="video-finder-actions"><a className="button button-primary" href={url} target="_blank" rel="noreferrer">Open YouTube Search</a><button className="button button-secondary" type="button" onClick={() => void copy(term, 'Search term copied.')}>Copy Search Term</button></div></td><td><div className="video-save-form"><label>Selected YouTube URL<input type="url" value={draft.url} onChange={(event) => patchDraft(row, { url: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" /></label><label>Reviewed video title<input value={draft.title} onChange={(event) => patchDraft(row, { title: event.target.value })} /></label><label>Duration in seconds<input type="number" min="1" max="7200" value={draft.duration} onChange={(event) => patchDraft(row, { duration: event.target.value })} /></label>{validation && <small className="video-save-error">{validation}</small>}<div className="video-finder-actions">{normalized && <a className="button button-secondary" href={normalized.normalizedUrl} target="_blank" rel="noreferrer">Preview</a>}<button className="button button-primary" type="button" disabled={saving || Boolean(validation)} onClick={() => void saveVideo(row)}>{saving ? 'Saving…' : 'Save Video'}</button></div>{status && <small className={status.startsWith('Saved.') ? 'video-save-success' : 'video-save-error'} role="status">{status}</small>}<small>URL, reviewed title, and a duration from 1 to 7200 seconds are required.</small></div></td></tr>; })}</tbody></table>{!rows.length && <p className="video-finder-empty">No curriculum modules match this filter.</p>}</div>}
    <p className="video-finder-safety">Saving updates only approved instructional-video fields. No YouTube API, scraping, automatic approval, or curriculum publication occurs here.</p>
  </div>;
}
