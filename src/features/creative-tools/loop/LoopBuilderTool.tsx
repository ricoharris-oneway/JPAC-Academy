import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import { clonePattern, countActiveSteps, createVariation, emptyPattern, grooveNames, groovePresets, loopActivities, loopGoals, loopHelpers, loopRows, serializePattern, summarizePattern, type GrooveName, type LoopGoal, type LoopRow, type Pattern } from './loopTheory';

type LoopProject = { creative_goal: LoopGoal; instructor_activity: string; selected_style: GrooveName; tempo_bpm: number; active_steps: number; loop_length: string; last_edited_row: string; pattern_summary: string; pattern: Pattern };

export function LoopBuilderTool() {
  const [pattern, setPattern] = useState<Pattern>(() => clonePattern(groovePresets.Pop)); const [bpm, setBpm] = useState(100); const [running, setRunning] = useState(false); const [playhead, setPlayhead] = useState(-1); const [copyMessage, setCopyMessage] = useState(''); const [audioError, setAudioError] = useState('');
  const [goal, setGoal] = useState<LoopGoal>('Build a beat'); const [style, setStyle] = useState<GrooveName>('Pop'); const [lastEditedRow, setLastEditedRow] = useState('None yet'); const [selectedActivityId, setSelectedActivityId] = useState(loopActivities[0].id); const [presetChosen, setPresetChosen] = useState(false); const [gridEdited, setGridEdited] = useState(false); const [played, setPlayed] = useState(false); const [variationCount, setVariationCount] = useState(0); const [saved, setSaved] = useState(false);
  const audioRef = useRef<AudioContext | null>(null); const timerRef = useRef<number | null>(null); const stepRef = useRef(0); const patternRef = useRef(pattern); patternRef.current = pattern;

  const playVoice = useCallback((row: LoopRow) => {
    const context = audioRef.current; if (!context) return; const now = context.currentTime; const gain = context.createGain(); gain.connect(context.destination);
    if (row === 'Kick') { const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(145, now); oscillator.frequency.exponentialRampToValueAtTime(48, now + .18); gain.gain.setValueAtTime(.5, now); gain.gain.exponentialRampToValueAtTime(.001, now + .2); oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .21); return; }
    if (row === 'Bass') { const oscillator = context.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.value = 65.41; gain.gain.setValueAtTime(.24, now); gain.gain.exponentialRampToValueAtTime(.001, now + .28); oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .3); return; }
    const duration = row === 'Hi-Hat' ? .06 : row === 'Clap' ? .11 : .16; const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate); const data = buffer.getChannelData(0); for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource(); source.buffer = buffer; const filter = context.createBiquadFilter(); filter.type = row === 'Hi-Hat' ? 'highpass' : 'bandpass'; filter.frequency.value = row === 'Hi-Hat' ? 6500 : row === 'Clap' ? 1700 : 1200; gain.gain.setValueAtTime(row === 'Hi-Hat' ? .12 : .22, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration); source.connect(filter).connect(gain); source.start(now);
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => { const step = stepRef.current; setPlayhead(step); loopRows.forEach((row) => { if (patternRef.current[row][step]) playVoice(row); }); stepRef.current = (step + 1) % 16; };
    tick(); timerRef.current = window.setInterval(tick, 60000 / bpm / 4);
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); timerRef.current = null; };
  }, [bpm, playVoice, running]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); void audioRef.current?.close(); audioRef.current = null; }, []);

  async function start() {
    try { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported by this browser.'); const context = audioRef.current || new AudioCtor(); audioRef.current = context; if (context.state === 'suspended') await context.resume(); stepRef.current = 0; setAudioError(''); setRunning(true); setPlayed(true); }
    catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Select Start to try again.'); }
  }
  function stop() { setRunning(false); setPlayhead(-1); stepRef.current = 0; }
  function toggle(row: LoopRow, step: number) { setPattern((current) => ({ ...current, [row]: current[row].map((on, index) => index === step ? !on : on) })); setLastEditedRow(row); setGridEdited(true); setCopyMessage(''); }
  function choosePreset(name: GrooveName) { stop(); setPattern(clonePattern(groovePresets[name])); setStyle(name); setLastEditedRow('Preset loaded'); setPresetChosen(true); setGridEdited(false); setVariationCount(0); setCopyMessage(''); }
  function vary() { setPattern((current) => createVariation(current)); setLastEditedRow('Deterministic variation'); setGridEdited(true); setVariationCount((count) => count + 1); setCopyMessage('Variation created.'); }
  async function copyPattern() { try { await navigator.clipboard.writeText(serializePattern(pattern, bpm)); setCopyMessage('Pattern copied.'); } catch { setCopyMessage('Copy is unavailable in this browser.'); } }
  const summary = useMemo(() => summarizePattern(pattern), [pattern]);
  const selectedActivity = loopActivities.find((activity) => activity.id === selectedActivityId) ?? loopActivities[0];
  const snapshot = useMemo<LoopProject>(() => ({ creative_goal: goal, instructor_activity: selectedActivity.title, selected_style: style, tempo_bpm: bpm, active_steps: countActiveSteps(pattern), loop_length: '16 steps / 4 beats', last_edited_row: lastEditedRow, pattern_summary: summary, pattern }), [bpm, goal, lastEditedRow, pattern, selectedActivity.title, style, summary]);
  const extraCreditSummary = projectAsText({ title: `${style} ${goal}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Loop Builder / Beat Lab');
  function loadProject(project: LocalToolProject<LoopProject>) { const data = project.data; setGoal(data.creative_goal); setSelectedActivityId(loopActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? loopActivities[0].id); setStyle(data.selected_style); setBpm(data.tempo_bpm); setPattern(clonePattern(data.pattern)); setLastEditedRow(data.last_edited_row); stop(); }

  return <ToolShell title="Loop Builder / Beat Lab" eyebrow="JPAC Creator Tool" description="Build a beat, shape a groove, and turn rhythm practice into a local songwriting project.">
    <section className="premium-tool-panel loop-builder songwriting-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Production lab</span><h2>Choose your creative goal</h2><p>Build with a clear purpose, then save the strongest version on this device.</p></div><div className="practice-goal-grid">{loopGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{goal}</h2></div><strong>{[presetChosen, gridEdited, played, variationCount > 0, saved].filter(Boolean).length}/5 steps</strong></header><ol>{['Choose a style or preset', 'Edit the beat grid', 'Play the loop', 'Create one variation', 'Save your beat locally'].map((step, index) => <li key={step} className={[presetChosen, gridEdited, played, variationCount > 0, saved][index] ? 'complete' : ''}><span>{index + 1}</span>{step}</li>)}</ol></section>
      <InstructorActivityPanel activities={loopActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
      <div className="instrument-session-strip songwriting-stats"><div><small>Creative goal</small><strong>{goal}</strong></div><div><small>Active steps</small><strong>{countActiveSteps(pattern)}</strong></div><div><small>Tempo</small><strong>{bpm} BPM</strong></div><div><small>Style</small><strong>{style}</strong></div><div><small>Loop length</small><strong>16 steps</strong></div><div><small>Last edit</small><strong>{lastEditedRow}</strong></div></div>
      <div className="loop-transport"><button type="button" className="button button-primary" onClick={() => running ? stop() : void start()}>{running ? 'Stop' : 'Start'}</button><label>BPM <input type="range" min="60" max="180" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /><input aria-label="Beats per minute" type="number" min="60" max="180" value={bpm} onChange={(event) => setBpm(Math.max(60, Math.min(180, Number(event.target.value) || 60)))} /></label><div className="loop-beat-display" aria-live="polite"><small>Beat</small><strong>{playhead < 0 ? '—' : `${Math.floor(playhead / 4) + 1}.${playhead % 4 + 1}`}</strong></div></div>
      {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
      <div className="loop-preset-row"><span>Genre grooves</span>{grooveNames.map((name) => <button type="button" key={name} className={style === name ? 'active' : ''} onClick={() => choosePreset(name)}>{name}</button>)}<button type="button" onClick={vary}>Create Variation</button><button type="button" onClick={() => { stop(); setPattern(emptyPattern()); setLastEditedRow('Pattern cleared'); setGridEdited(true); setCopyMessage(''); }}>Clear pattern</button></div>
      <div className="sequencer-scroll"><div className="loop-sequencer" role="group" aria-label="16-step beat sequencer"><div className="loop-corner">Instrument</div>{Array.from({ length: 16 }, (_, step) => <div className={`loop-step-number ${playhead === step ? 'playing' : ''}`} key={step}>{step + 1}</div>)}{loopRows.map((row) => <div className="loop-row" key={row}><strong>{row}</strong>{pattern[row].map((on, step) => <button type="button" className={`${on ? 'active' : ''} ${playhead === step ? 'playing' : ''}`} aria-pressed={on} aria-label={`${row}, step ${step + 1}, ${on ? 'on' : 'off'}`} key={step} onClick={() => toggle(row, step)}><span /></button>)}</div>)}</div></div>
      <section className="loop-summary"><div><div className="eyebrow">Pattern summary</div><p>{summary}</p></div><button type="button" className="button button-secondary" onClick={() => void copyPattern()}>Copy pattern</button>{copyMessage ? <span role="status">{copyMessage}</span> : null}</section>
      <div className="premium-learning-grid"><article><h2>What this teaches</h2><p>A loop is a repeating musical idea. Placing kick, snare, hi-hat, clap, and bass on different steps teaches pulse, backbeat, subdivision, and arrangement.</p></article><article><h2>Try this next</h2><p>Start with Pop. Remove one sound at a time and listen to its job, then move one kick or bass step to create your own groove.</p></article></div>
      <div className="beginner-helper-grid">{loopHelpers.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}</div>
      <LocalProjectPanel toolType="loop-builder" toolLabel="Loop Builder / Beat Lab" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={extraCreditSummary} />
    </section>
  </ToolShell>;
}
