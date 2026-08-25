import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteLocalProject, listLocalProjects, projectAsText, saveLocalProject, type LocalToolProject } from './projectStorage';

type Props<T extends object> = {
  toolType: string;
  toolLabel: string;
  snapshot: T;
  onLoad: (project: LocalToolProject<T>) => void;
  onSaved?: () => void;
};

export function LocalProjectPanel<T extends object>({ toolType, toolLabel, snapshot, onLoad, onSaved }: Props<T>) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [activeId, setActiveId] = useState('');
  const [projects, setProjects] = useState<LocalToolProject<T>[]>([]);
  const [message, setMessage] = useState('');

  const refresh = useCallback(() => {
    try { setProjects(listLocalProjects(toolType) as LocalToolProject<T>[]); setMessage(''); }
    catch { setProjects([]); setMessage('Local saving is unavailable in this browser. You can still copy or export your summary.'); }
  }, [toolType]);

  useEffect(() => { refresh(); }, [refresh]);

  const current = useMemo<LocalToolProject<T>>(() => ({ id: activeId, toolType, title, notes, savedAt: new Date().toISOString(), data: snapshot }), [activeId, notes, snapshot, title, toolType]);
  const summary = projectAsText(current, toolLabel);

  function save() {
    try {
      const saved = saveLocalProject({ id: activeId || undefined, toolType, title: title.trim() || `${toolLabel} practice`, notes: notes.trim(), data: snapshot });
      setActiveId(saved.id); setTitle(saved.title); setProjects(listLocalProjects(toolType) as LocalToolProject<T>[]); setMessage('Project saved on this device.'); onSaved?.();
    } catch { setMessage('This browser blocked local saving. Copy or export your summary instead.'); }
  }

  function load(project: LocalToolProject<T>) { setActiveId(project.id); setTitle(project.title); setNotes(project.notes); onLoad(project); setMessage(`Loaded “${project.title}”.`); }
  function remove(project: LocalToolProject<T>) { try { deleteLocalProject(project.id); if (activeId === project.id) setActiveId(''); refresh(); setMessage(`Deleted “${project.title}” from this device.`); } catch { setMessage('This browser could not delete the local project.'); } }
  async function copy() { try { await navigator.clipboard.writeText(summary); setMessage('Project summary copied.'); } catch { setMessage('Copy was blocked. Select and copy the notes manually.'); } }
  function exportProject(format: 'txt' | 'json') {
    const content = format === 'json' ? JSON.stringify(current, null, 2) : summary;
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = `${(title || toolType).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format}`; link.click(); URL.revokeObjectURL(url);
    setMessage(`${format.toUpperCase()} summary exported.`);
  }

  return <section className="local-project-panel" aria-labelledby={`${toolType}-project-title`}>
    <header><div><span className="premium-kicker">Local project</span><h2 id={`${toolType}-project-title`}>Save your practice idea</h2><p>Saved on this device only. Do not include private contact or sensitive personal information.</p></div><span className="local-only-chip">Device only</span></header>
    <div className="local-project-fields"><label>Project title<input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${toolLabel} practice`} /></label><label>Student notes<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you try? What will you practice next?" /></label></div>
    <div className="premium-action-row"><button type="button" className="button button-primary" onClick={save}>Save locally</button><button type="button" className="button button-secondary" onClick={() => void copy()}>Copy summary</button><button type="button" className="button button-secondary" onClick={() => exportProject('txt')}>Export text</button><button type="button" className="button button-secondary" onClick={() => exportProject('json')}>Export JSON</button></div>
    {message ? <p className="local-project-message" role="status">{message}</p> : null}
    <div className="saved-project-list"><h3>Saved projects</h3>{projects.length ? projects.map((project) => <article key={project.id}><div><strong>{project.title}</strong><small>{new Date(project.savedAt).toLocaleString()}</small></div><div><button type="button" onClick={() => load(project)}>Load</button><button type="button" className="danger" onClick={() => remove(project)}>Delete</button></div></article>) : <p>No local projects yet.</p>}</div>
  </section>;
}
