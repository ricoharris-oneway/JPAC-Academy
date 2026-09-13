import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessModule, generateModuleDraft, missingLabels, type DraftSection, type Missing } from '../lib/moduleReadiness';
import { loadModuleReadiness } from '../lib/moduleReadinessData';
import '../styles/module-readiness.css';

export function ModuleReadinessPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadModuleReadiness>> | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [courseId, setCourseId] = useState('');
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, DraftSection[]>>({});
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let current = true;
    setError('');
    void loadModuleReadiness().then(result => { if (current) setData(result); }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'Unable to load readiness.'); });
    return () => { current = false; };
  }, [attempt]);
  const rows = useMemo(() => data ? data.modules.filter(module => data.courses.some(course => course.id === module.course_id)).map(module => assessModule(module, data.lessons, data.activities, data.media)) : [], [data]);
  const visible = rows.filter(row => (!courseId || row.module.course_id === courseId) && (filter === 'all' || (filter === 'ready' ? row.ready : filter === 'review' ? !row.ready : row.missing.includes(filter as Missing))));
  const selectedRow = rows.find(row => row.module.id === selected);
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMessage('Draft copied. Review and apply it manually in Curriculum Studio.'); }
    catch { setMessage('Copy was blocked. Select the editable text and copy it manually.'); }
  };
  return <div className="module-readiness">
    <header><p className="muted">JPAC · Staff workspace</p><h1>Module Readiness</h1><p>Review published curriculum and prepare suggestions for staff approval.</p>
      <p>Draft Assist uses templates. Edits stay in this page and are lost when you leave or refresh. Nothing is saved or published.</p>
      <div className="mr-actions"><Link className="button button-secondary" to="/staff/video-finder">Open Video Finder</Link><Link className="button button-secondary" to="/curriculum">Open Curriculum Studio</Link></div>
    </header>
    {error ? <div role="alert"><p>{error}</p><p>Readiness is unavailable until all curriculum reads succeed.</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : !data ? <p role="status">Loading curriculum readiness…</p> : <>
      <section aria-label="Course readiness summaries" className="mr-summary">{data.courses.map(course => {
        const courseRows = rows.filter(row => row.module.course_id === course.id);
        const ready = courseRows.filter(row => row.ready).length;
        return <article className="mr-card" key={course.id}><h2>{course.title}</h2><p><strong>{ready} / {courseRows.length}</strong> published modules ready</p><p>{courseRows.length ? `${courseRows.length - ready} need review · ${courseRows.filter(row => !row.hasVideo).length} missing video` : 'No published modules'}</p></article>;
      })}</section>
      {!data.courses.length && <p>No published courses found.</p>}
      <div className="mr-filters"><label>Course<select value={courseId} onChange={event => setCourseId(event.target.value)}><option value="">All courses</option>{data.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Readiness filter<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All modules</option>{Object.entries(missingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="review">Needs review</option><option value="ready">Ready only</option></select></label></div>
      <p role="status">{visible.length} published modules shown</p>
      <div className="mr-workspace"><section aria-label="Module readiness details" className="mr-list">{visible.map(row => <article className="mr-card" key={row.module.id}>
        <p className="muted">{data.courses.find(course => course.id === row.module.course_id)?.title} · Order {row.module.sort_order}</p><h2>{row.module.title}</h2><strong>{row.ready ? 'Ready' : 'Needs review'}</strong>
        <p>Video: {row.hasVideo ? row.videoTitle || 'Attached (title unavailable)' : 'Missing or unavailable'}{row.hasVideo ? ` · ${row.videoProvider || 'Provider unavailable'}` : ''}</p><p>{row.lessonCount} published lessons · {row.activityCount} published activities / assignments</p>
        <ul className="mr-chips" aria-label="Missing content">{row.missing.map(key => <li key={key}>{missingLabels[key]}</li>)}</ul>
        <details><summary>Module content checks</summary><dl>{(['description', 'ai_summary', 'objectives', 'career_connection'] as Missing[]).map(key => <div key={key}><dt>{missingLabels[key].replace('Missing ', '')}</dt><dd>{row.missing.includes(key) ? 'Missing' : 'Present'}</dd></div>)}</dl></details>
        {!row.ready && <button className="button button-primary" onClick={() => { setSelected(row.module.id); setMessage(''); setDrafts(previous => previous[row.module.id] ? previous : { ...previous, [row.module.id]: generateModuleDraft(data.courses.find(course => course.id === row.module.course_id)!, row) }); }}>{drafts[row.module.id] ? 'Review Draft' : 'Generate Draft'}</button>}
      </article>)}{!visible.length && <p>No published modules match these filters.</p>}</section>
      <section className="mr-card mr-draft" aria-label="Draft Assist" aria-live="polite"><h2>Draft Assist</h2>{selectedRow && drafts[selected] ? <><h3>{selectedRow.module.title}</h3><p>Suggested content only. Verify accuracy, learner level, and accessibility before use. Existing fields are not replaced.</p><button className="button button-secondary" onClick={() => void copy(drafts[selected].map(section => `${section.title}\n${section.text}`).join('\n\n'))}>Copy all draft text</button>{drafts[selected].map((section, index) => <div className="mr-draft-section" key={`${selected}-${section.title}`}><label>{section.title}<textarea value={section.text} rows={7} onChange={event => { const text = event.target.value; setDrafts(previous => ({ ...previous, [selected]: previous[selected].map((item, i) => i === index ? { ...item, text } : item) })); }}/></label><button className="button button-secondary" onClick={() => void copy(section.text)}>Copy {section.title}</button></div>)}<p>Select this course and module after opening the destination tool.</p><div className="mr-actions"><Link className="button button-secondary" to="/curriculum">Open Curriculum Studio</Link>{selectedRow.missing.includes('video') && <Link className="button button-secondary" to="/staff/video-finder">Open Video Finder</Link>}</div></> : <p>Select Generate Draft on a module that needs review.</p>}<p role="status">{message}</p></section></div>
    </>}
  </div>;
}
