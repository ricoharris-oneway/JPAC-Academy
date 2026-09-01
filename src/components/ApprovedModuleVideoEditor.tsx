import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { approvedYouTubeVideoValidation, normalizeApprovedYouTubeUrl, saveApprovedYouTubeVideo } from '../lib/videoFinder';
import { ProviderAwareVideo } from './ProviderAwareVideo';

type ModuleVideo = { id: string; primary_video_url: string | null; video_title: string | null; video_duration_seconds: number | null };

export function ApprovedModuleVideoEditor({ module, canManage, onChanged, onMessage }: { module: ModuleVideo; canManage: boolean; onChanged: () => Promise<void>; onMessage: (message: string) => void }) {
  const [url, setUrl] = useState(() => module.primary_video_url || '');
  const [title, setTitle] = useState(() => module.video_title || '');
  const [duration, setDuration] = useState(() => module.video_duration_seconds ? String(module.video_duration_seconds) : '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const normalized = useMemo(() => normalizeApprovedYouTubeUrl(url), [url]);
  const validation = approvedYouTubeVideoValidation({ url, title, duration });

  async function save() {
    if (!supabase || !canManage || validation) return;
    setSaving(true); setStatus('');
    const error = await saveApprovedYouTubeVideo(supabase, { moduleId: module.id, url, title, durationSeconds: Number(duration) });
    if (error) { setSaving(false); setStatus(error); onMessage(error); return; }
    const refresh = await supabase.from('course_modules').select('primary_video_url,video_title,video_duration_seconds').eq('id', module.id).single();
    if (refresh.error || !refresh.data) { setSaving(false); const message = refresh.error?.message || 'The save completed, but the saved module could not be refreshed.'; setStatus(message); onMessage(message); return; }
    setUrl(refresh.data.primary_video_url || ''); setTitle(refresh.data.video_title || ''); setDuration(refresh.data.video_duration_seconds ? String(refresh.data.video_duration_seconds) : '');
    await onChanged();
    setSaving(false); setStatus('Saved. Module video fields refreshed from the database.');
    onMessage('Approved module video saved.');
  }

  return <section className="e4-instructional-media"><div className="section-head"><div><div className="eyebrow">Approved module video</div><h3>{module.primary_video_url ? 'Edit instructional video' : 'Add instructional video'}</h3></div><span>MODULE LEVEL</span></div>
    <p>This approved video is saved to the module and appears on its published student lessons. Saving it does not change curriculum status.</p>
    <div className="e4-form"><label className="wide">Primary video URL<input type="url" value={url} disabled={!canManage || saving} onChange={(event) => { setUrl(event.target.value); setStatus(''); }} placeholder="https://www.youtube.com/watch?v=…" /></label><label>Video title<input value={title} disabled={!canManage || saving} onChange={(event) => { setTitle(event.target.value); setStatus(''); }} /></label><label>Provider/type<input value="youtube" readOnly /></label><label>Video duration (seconds)<input type="number" min="1" max="7200" value={duration} disabled={!canManage || saving} onChange={(event) => { setDuration(event.target.value); setStatus(''); }} /></label></div>
    {url && !normalized && <p className="media-error">Enter a valid YouTube watch, youtu.be, or embed URL.</p>}
    {normalized && <div className="media-preview"><ProviderAwareVideo url={normalized.normalizedUrl} title={title || 'Approved module video preview'} /></div>}
    <div className="e4-actions wide"><button className="button button-primary" type="button" disabled={!canManage || saving || Boolean(validation)} onClick={() => void save()}>{saving ? 'Saving…' : 'Save approved video'}</button></div>
    {!url && <small>URL, reviewed title, and duration are required.</small>}{url && validation && <small className="media-error">{validation}</small>}{status && <small className={status.startsWith('Saved.') ? 'video-save-success' : 'media-error'} role="status">{status}</small>}
  </section>;
}
