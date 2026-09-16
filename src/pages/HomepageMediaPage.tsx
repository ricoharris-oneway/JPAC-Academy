import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { homepageVisualGuide } from '../data/memberAssetMap';
import { getHomepageMediaSlots, type HomepageMediaOverride, type HomepageMediaSlot } from '../lib/homepageMedia';
import { supabase } from '../lib/supabase';
import '../styles/member-launch.css';

type Draft = HomepageMediaSlot & {
  overrideImageUrl: string;
  altText: string;
  active: boolean;
  published: boolean;
};

function toDraft(slot: HomepageMediaSlot, row?: HomepageMediaOverride): Draft {
  return {
    ...slot,
    overrideImageUrl: row?.override_image_url || '',
    altText: row?.alt_text || `${slot.itemName} JPAC Academy artwork`,
    active: row?.active || false,
    published: row?.published || false,
  };
}

export function HomepageMediaPage() {
  const { profile } = useAuth();
  const slots = useMemo(() => getHomepageMediaSlots(), []);
  const [drafts, setDrafts] = useState<Draft[]>(() => slots.map((slot) => toDraft(slot)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const allowed = profile && ['admin', 'developer'].includes(profile.role);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('homepage_media_overrides')
        .select('slot_key,section,item_name,default_image_path,override_image_url,alt_text,active,published');
      if (!active) return;
      if (error) setMessage('Homepage media storage is unavailable. Apply the unapplied migration before saving.');
      const rows = new Map(((data || []) as HomepageMediaOverride[]).map((row) => [row.slot_key, row]));
      setDrafts(slots.map((slot) => toDraft(slot, rows.get(slot.slotKey))));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [slots]);

  function update(slotKey: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => draft.slotKey === slotKey ? { ...draft, ...patch } : draft));
  }

  async function save(draft: Draft) {
    if (!supabase || !profile || !allowed) return;
    const url = draft.overrideImageUrl.trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setMessage(`Use a complete http(s) image URL for ${draft.itemName}.`);
        return;
      }
    }
    setSaving(draft.slotKey);
    const { error } = await supabase.from('homepage_media_overrides').upsert({
      slot_key: draft.slotKey,
      section: draft.section,
      item_name: draft.itemName,
      default_image_path: draft.defaultImagePath,
      override_image_url: url || null,
      alt_text: draft.altText.trim() || `${draft.itemName} JPAC Academy artwork`,
      active: draft.active,
      published: draft.published,
      updated_by: profile.id,
    }, { onConflict: 'slot_key' });
    setSaving('');
    setMessage(error?.message || `${draft.itemName} homepage media saved.`);
  }

  async function reset(draft: Draft) {
    update(draft.slotKey, { overrideImageUrl: '', active: false, published: false });
    if (!supabase || !profile || !allowed) return;
    setSaving(draft.slotKey);
    const { error } = await supabase.from('homepage_media_overrides').upsert({
      slot_key: draft.slotKey,
      section: draft.section,
      item_name: draft.itemName,
      default_image_path: draft.defaultImagePath,
      override_image_url: null,
      alt_text: draft.altText.trim() || `${draft.itemName} JPAC Academy artwork`,
      active: false,
      published: false,
      updated_by: profile.id,
    }, { onConflict: 'slot_key' });
    setSaving('');
    setMessage(error?.message || `${draft.itemName} reset to the default homepage image.`);
  }

  if (!allowed) return <div className="card card-pad"><h2>Administrator access required</h2></div>;
  return <main className="member-launch homepage-media-admin">
    <header className="member-page-heading"><span className="member-kicker">JPAC ACADEMY · ADMINISTRATION</span><h1>Homepage Media</h1><p>Manage URL-based homepage artwork overrides. Students see only active and published overrides; otherwise the default asset remains in use.</p></header>
    <section className="card homepage-visual-guide" aria-labelledby="homepage-visual-guide-title">
      <div>
        <div className="eyebrow">ADMIN PLANNING REFERENCE · NOT STUDENT-FACING</div>
        <h2 id="homepage-visual-guide-title">Homepage Visual Reference Guide</h2>
        <p>This 10×10 category guide is for internal homepage planning only. It is never used as a student-facing homepage, card, course, program, tool image, or background.</p>
      </div>
      <div className="homepage-visual-guide-grid">
        {homepageVisualGuide.map((group, index) => <article key={group.label}><span className="member-pill">Guide {index + 1} of 10</span><h3>{group.label}</h3><p>{group.description}</p><ul>{group.categories.map((category) => <li key={`${group.label}-${category}`}>{category}</li>)}</ul></article>)}
      </div>
    </section>
    {message && <p className="admin-message" role="status">{message}</p>}
    {loading ? <p className="muted">Loading homepage media slots…</p> : <div className="homepage-media-list">{drafts.map((draft) => {
      const preview = draft.overrideImageUrl.trim() || draft.defaultImagePath;
      return <article className="card homepage-media-card" key={draft.slotKey}>
        <div className="homepage-media-preview"><img src={preview} alt={draft.altText} /></div>
        <div className="homepage-media-fields"><div className="eyebrow">{draft.section}</div><h2>{draft.itemName}</h2><label>Current image preview<input readOnly value={preview} /></label><label>Default image path<input readOnly value={draft.defaultImagePath} /></label><label>Override image URL<input type="url" placeholder="https://…" value={draft.overrideImageUrl} onChange={(e) => update(draft.slotKey, { overrideImageUrl: e.target.value })} /></label><label>Alt text<input value={draft.altText} onChange={(e) => update(draft.slotKey, { altText: e.target.value })} /></label><div className="homepage-media-toggles"><label><input type="checkbox" checked={draft.active} onChange={(e) => update(draft.slotKey, { active: e.target.checked })} /> Active</label><label><input type="checkbox" checked={draft.published} onChange={(e) => update(draft.slotKey, { published: e.target.checked })} /> Published</label></div><div className="welcome-actions"><button className="button button-primary" disabled={saving === draft.slotKey} onClick={() => void save(draft)}>{saving === draft.slotKey ? 'Saving…' : 'Save'}</button><button className="button button-secondary" disabled={saving === draft.slotKey} onClick={() => void reset(draft)}>Reset to default</button></div></div>
      </article>;
    })}</div>}
  </main>;
}
