import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { careerPaths } from '../data/careerPaths';
import { useMemberJourney } from '../context/MemberJourneyContext';
import { useAuth } from '../context/AuthContext';
import '../styles/member-launch.css';

export function ChooseCareerPathPage() {
  const { selectedPath, selectPath } = useMemberJourney();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(selectedPath || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    setBusy(true); setError('');
    try { await selectPath(selected); navigate('/', { replace: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your Career Path.'); }
    finally { setBusy(false); }
  }
  return <main className="member-launch path-onboarding">
    <header className="member-hero path-intro"><span className="member-kicker">YOUR NEXT CHAPTER · START HERE</span><h1>Choose Your<br /><em>Career Path</em></h1><p>Your JPAC Academy journey starts here. Your Career Path helps guide your recommended programs, creative tools, portfolio direction, and long-term artistic development.</p><span className="member-pill">Required before entering the Academy</span></header>
    <p className="member-note">Choose the future you want to explore. You can change your direction later. Some courses and milestones are still in development; choosing a path does not unlock coursework.</p>
    <fieldset className="path-options" disabled={busy}><legend>Your creative direction</legend>{careerPaths.map(path => <label className={`path-option ${selected === path.slug ? 'selected' : ''}`} key={path.slug}>
      <input type="radio" name="career-path" value={path.slug} checked={selected === path.slug} onChange={() => setSelected(path.slug)} />
      <span className="path-symbol" aria-hidden="true">{path.icon}</span><strong>{path.name}</strong><span>{path.outcome}</span><small>{path.relatedPrograms.slice(0, 3).join(' · ')}</small>
    </label>)}</fieldset>
    <footer className="path-confirm"><div><strong>{careerPaths.find(path => path.slug === selected)?.name || 'Select one path to continue'}</strong>{error && <p role="alert">{error}</p>}</div><button className="button button-primary" disabled={!selected || busy} onClick={() => void confirm()}>{busy ? 'Saving your path…' : 'Confirm My Career Path'}</button><button className="auth-switch" onClick={() => void signOut()}>Sign out</button></footer>
  </main>;
}
