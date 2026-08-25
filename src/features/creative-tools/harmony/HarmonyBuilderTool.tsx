import { useMemo, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import { buildProgression, harmonyActivities, harmonyGoals, harmonyHelpers, harmonyKeys, harmonyStyles, type HarmonyGoal, type HarmonyKey, type HarmonyStyle } from './harmonyTheory';

type HarmonyProject = { creative_goal: HarmonyGoal; instructor_activity: string; selected_key: HarmonyKey; selected_style: HarmonyStyle; suggested_song_section: string; emotional_description: string; progression: string[]; roman_numerals: string[]; lyric_or_melody_idea: string };

export function HarmonyBuilderTool() {
  const [keyName, setKeyName] = useState<HarmonyKey>('C');
  const [style, setStyle] = useState<HarmonyStyle>('Pop');
  const [version, setVersion] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [goal, setGoal] = useState<HarmonyGoal>('Build a chorus');
  const [selectedActivityId, setSelectedActivityId] = useState(harmonyActivities[0].id);
  const [idea, setIdea] = useState('');
  const [generated, setGenerated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyChosen, setKeyChosen] = useState(false);
  const [styleChosen, setStyleChosen] = useState(false);
  const progression = useMemo(() => buildProgression(keyName, style, version), [keyName, style, version]);
  const selectedActivity = harmonyActivities.find((activity) => activity.id === selectedActivityId) ?? harmonyActivities[0];
  const snapshot = useMemo<HarmonyProject>(() => ({ creative_goal: goal, instructor_activity: selectedActivity.title, selected_key: keyName, selected_style: style, suggested_song_section: progression.suggestedUse, emotional_description: progression.emotion, progression: progression.chords, roman_numerals: progression.roman, lyric_or_melody_idea: idea }), [goal, idea, keyName, progression, selectedActivity.title, style]);
  const extraCreditSummary = projectAsText({ title: `${keyName} ${style} ${goal}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Harmony Builder');

  async function copy() {
    try { await navigator.clipboard.writeText(`${keyName} ${style} · ${progression.suggestedUse}\n${progression.roman.join(' – ')}\n${progression.chords.join(' – ')}\nIdea: ${idea || 'Add your lyric or melody idea'}`); setCopyMessage('Project idea copied.'); }
    catch { setCopyMessage('Copy is unavailable in this browser.'); }
  }

  function loadProject(project: LocalToolProject<HarmonyProject>) { const data = project.data; setGoal(data.creative_goal); setSelectedActivityId(harmonyActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? harmonyActivities[0].id); setKeyName(data.selected_key); setStyle(data.selected_style); setIdea(data.lyric_or_melody_idea); setKeyChosen(true); setStyleChosen(true); setGenerated(true); setCopyMessage(''); }

  return <ToolShell title="Harmony Builder" eyebrow="JPAC Creator Tool" description="Shape chord progressions into verses, choruses, bridges, and original song ideas.">
    <section className="premium-tool-panel songwriting-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Songwriting lab</span><h2>Choose your creative goal</h2><p>Connect music theory to a song section, emotion, and original idea.</p></div><div className="practice-goal-grid">{harmonyGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{goal}</h2></div><strong>{[keyChosen, styleChosen, generated, idea.trim().length > 0, saved].filter(Boolean).length}/5 steps</strong></header><ol>{['Choose a key', 'Choose a style', 'Generate a progression', 'Write a lyric or melody idea', 'Save your harmony project locally'].map((step, index) => <li key={step} className={[keyChosen, styleChosen, generated, idea.trim().length > 0, saved][index] ? 'complete' : ''}><span>{index + 1}</span>{step}</li>)}</ol></section>
      <InstructorActivityPanel activities={harmonyActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
      <div className="premium-control-grid">
        <label>Key<select value={keyName} onChange={(e) => { setKeyName(e.target.value as HarmonyKey); setKeyChosen(true); setGenerated(false); }}>{harmonyKeys.map((key) => <option key={key}>{key}</option>)}</select></label>
        <label>Mood / style<select value={style} onChange={(e) => { setStyle(e.target.value as HarmonyStyle); setStyleChosen(true); setGenerated(false); }}>{harmonyStyles.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="premium-action-row"><button className="button button-primary" type="button" onClick={() => { setKeyChosen(true); setStyleChosen(true); setGenerated(true); setVersion(0); setCopyMessage(''); }}>Generate progression</button><button className="button button-secondary" type="button" onClick={() => { setKeyChosen(true); setStyleChosen(true); setVersion((value) => value + 1); setGenerated(true); setCopyMessage('Another feel generated.'); }}>Try another feel</button><button className="button button-secondary" type="button" onClick={() => { setKeyName('C'); setStyle('Pop'); setGoal('Build a chorus'); setVersion(0); setIdea(''); setKeyChosen(false); setStyleChosen(false); setGenerated(false); setSaved(false); setCopyMessage(''); }}>Reset</button></div>
      <div className="harmony-result" key={version}>
        <div><small>Roman numerals</small><strong>{progression.roman.join(' · ')}</strong></div>
        <div><small>Chord names</small><strong>{progression.chords.join(' · ')}</strong></div>
        <div><small>Emotional direction</small><strong>{progression.emotion}</strong></div>
        <div><small>Suggested use</small><strong>{progression.suggestedUse}</strong></div>
      </div>
      <label className="harmony-idea-field">Lyric or melody idea<textarea maxLength={1000} value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Write one lyric line, melody shape, or hook idea…" /></label>
      <div className="premium-learning-grid"><article><h2>What this teaches</h2><p>{progression.lesson}</p></article><article><h2>Try this next</h2><p>{progression.prompt}</p></article></div>
      <div className="premium-action-row"><button className="button button-secondary" type="button" onClick={() => void copy()}>Copy progression</button>{copyMessage ? <span role="status">{copyMessage}</span> : null}</div>
      <div className="beginner-helper-grid">{harmonyHelpers.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}</div>
      <LocalProjectPanel toolType="harmony-builder" toolLabel="Harmony Builder" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={extraCreditSummary} />
    </section>
  </ToolShell>;
}
