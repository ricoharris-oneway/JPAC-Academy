import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildVideoFinderRows, suggestedYouTubeSearchTerm, videoFinderCsv, youtubeSearchUrl } from '../lib/videoFinder';
import '../styles/video-finder.css';

type Course = { id: string; title: string };
type Level = { level_number: number };
type Module = { id: string; course_id: string; level_module_number: number | null; title: string; primary_video_url: string | null; course_level: Level | Level[] | null };
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

  useEffect(() => { void (async () => {
    if (!supabase) { setMessage('Supabase configuration is required to load curriculum.'); setLoading(false); return; }
    const [courseQuery, moduleQuery, lessonQuery] = await Promise.all([
      supabase.from('courses').select('id,title').order('title'),
      supabase.from('course_modules').select('id,course_id,level_module_number,title,primary_video_url,course_level:course_levels(level_number)').order('sort_order'),
      supabase.from('lessons').select('id,module_id,title,sort_order').order('sort_order'),
    ]);
    const error = courseQuery.error || moduleQuery.error || lessonQuery.error;
    setCourses((courseQuery.data as Course[]) || []);
    setModules((moduleQuery.data as unknown as Module[]) || []);
    setLessons((lessonQuery.data as Lesson[]) || []);
    setMessage(error?.message || '');
    setLoading(false);
  })(); }, []);

  const rows = useMemo(() => buildVideoFinderRows(courses, modules.map((module) => ({ id: module.id, course_id: module.course_id, level_number: levelNumber(module), module_number: module.level_module_number, title: module.title, existing_video_url: module.primary_video_url || '' })), lessons, courseFilter), [courseFilter, courses, lessons, modules]);

  const copy = async (value: string, success: string) => {
    try { await navigator.clipboard.writeText(value); setMessage(success); }
    catch { setMessage('Copy was blocked by the browser. Select and copy the text manually.'); }
  };

  return <div className="video-finder-page">
    <header className="page-hero"><div><div className="eyebrow">Staff curriculum helper · read only</div><h1 className="page-title">Video Finder Helper</h1><p className="muted">Generate ready-to-review YouTube searches for lesson topics. This helper never saves or publishes a video.</p></div></header>
    <section className="card card-pad video-review-guide" aria-labelledby="video-review-title"><h2 id="video-review-title">Review every video before use</h2><p>Before approving a video, confirm:</p><ul><li>Age appropriate</li><li>Clean language</li><li>Skill level matches the lesson</li><li>Instruction is accurate</li><li>No confusing or inappropriate content</li><li>Video can be embedded or linked safely</li><li>Comments, ads, and branding risk is acceptable</li></ul></section>
    <section className="card card-pad video-finder-controls"><label>Filter by course<select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="">All courses</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button className="button button-secondary" type="button" disabled={!rows.length} onClick={() => void copy(videoFinderCsv(rows), 'CSV template copied. Paste it into a .csv file or spreadsheet.')}>Copy CSV Template</button><span>{rows.length} lesson/module rows</span></section>
    {message && <div className="admin-message" role="status">{message}</div>}
    {loading ? <div className="card card-pad">Loading curriculum…</div> : <div className="video-finder-table-wrap card"><table><thead><tr><th>Course</th><th>Level / module</th><th>Lesson or module</th><th>Existing video</th><th>Suggested search</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => { const term = suggestedYouTubeSearchTerm(row); const url = youtubeSearchUrl(term); return <tr key={`${row.moduleId}:${row.lessonTitle}`}><td>{row.courseName}</td><td>{row.levelNumber ?? '—'} / {row.moduleNumber ?? '—'}</td><td><strong>{row.lessonTitle || row.moduleTitle}</strong>{row.lessonTitle && <small>Module: {row.moduleTitle}</small>}</td><td>{row.existingVideoUrl ? <a href={row.existingVideoUrl} target="_blank" rel="noreferrer">Open existing</a> : <span className="muted">None</span>}</td><td>{term}</td><td><div className="video-finder-actions"><a className="button button-primary" href={url} target="_blank" rel="noreferrer">Open YouTube Search</a><button className="button button-secondary" type="button" onClick={() => void copy(term, 'Search term copied.')}>Copy Search Term</button></div></td></tr>; })}</tbody></table>{!rows.length && <p className="video-finder-empty">No curriculum rows match this filter.</p>}</div>}
    <p className="video-finder-safety">Searches open YouTube in a new tab. No YouTube API, scraping, database writes, video selection, or publishing occurs here.</p>
  </div>;
}
