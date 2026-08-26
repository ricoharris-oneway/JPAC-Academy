import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel, type InstructorActivity } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';

type Signature = '2/4' | '3/4' | '4/4' | '6/8';
type Subdivision = 'quarter' | 'eighth' | 'triplet';
const signatures: Signature[] = ['2/4', '3/4', '4/4', '6/8'];
const subdivisions: Subdivision[] = ['quarter', 'eighth', 'triplet'];
const metronomeGoals = ['Keep steady beat', 'Practice clapping rhythm', 'Prepare for performance', 'Build speed gradually', 'Count time signatures'] as const;
type MetronomeGoal = typeof metronomeGoals[number];
type MetronomeProject = { practice_goal: MetronomeGoal; instructor_activity: string; selected_bpm: number; time_signature: Signature; subdivision: Subdivision; tap_tempo_result: string; session_seconds: number; speed_ladder_start: number; speed_ladder_target: number; speed_ladder_step: number };

const metronomeHelpers = [
  ['BPM', 'Beats per minute tells you how fast the steady pulse moves.'],
  ['Time signature', 'The top number tells you how many main beats belong in each measure.'],
  ['Subdivision', 'Subdivisions split each beat into smaller, evenly spaced clicks.'],
  ['Accent', 'A stronger click on beat one helps you hear the start of every measure.'],
  ['Tap tempo', 'Tap a steady pulse and the tool estimates its BPM from your recent taps.'],
] as const;

const metronomeActivities: readonly InstructorActivity[] = [
  { id: 'steady-60', title: '60 BPM Steady Beat', coachFocus: 'Build a calm internal pulse.', task: 'Clap with a 60 BPM click for 30 seconds.', steps: ['Set 60 BPM.', 'Choose quarter-note subdivision.', 'Start and count aloud.', 'Clap on every main beat.', 'Stop after at least 30 seconds.'], successTarget: 'Your clap stays aligned without rushing after beat one.', nextMove: 'Repeat at 64 BPM while keeping the same relaxed motion.', reflectionPrompt: 'Where did your timing feel most steady?' },
  { id: 'count-off', title: '4/4 Performance Count-Off', coachFocus: 'Lead a clear entrance for a group.', task: 'Practice a confident 1-2-3-4 count-off.', steps: ['Choose 4/4.', 'Set a performance tempo.', 'Listen for the accented beat one.', 'Count two full measures.', 'Imagine the performance entering next.'], successTarget: 'Every count is even and beat one sounds confident.', nextMove: 'Try the count-off quietly, then with stage energy.', reflectionPrompt: 'What made your count-off easy to follow?' },
  { id: 'waltz', title: '3/4 Waltz Feel', coachFocus: 'Feel a strong first beat followed by two lighter beats.', task: 'Count and move with a 3/4 pulse.', steps: ['Choose 3/4.', 'Start between 70 and 100 BPM.', 'Say “ONE-two-three.”', 'Step or sway with the measure.', 'Keep beat one clear.'], successTarget: 'The three-beat cycle feels smooth and beat one remains easy to find.', nextMove: 'Try an eighth-note subdivision without losing the main beats.', reflectionPrompt: 'How did the accent change the way you moved?' },
  { id: 'speed-ladder', title: 'Speed Ladder', coachFocus: 'Increase tempo without sacrificing accuracy.', task: 'Move from a comfortable start tempo toward a target.', steps: ['Set start and target tempos.', 'Choose a small step amount.', 'Practice the start tempo.', 'Step faster only when steady.', 'Stop or step back if accuracy slips.'], successTarget: 'Each tempo feels controlled before you increase it.', nextMove: 'Save the highest comfortable tempo—not simply the fastest.', reflectionPrompt: 'At what BPM did your technique need more attention?' },
  { id: 'quiet-confidence', title: 'Quiet Confidence', coachFocus: 'Keep time with relaxed, controlled movement.', task: 'Practice a soft pulse without losing clarity.', steps: ['Choose a comfortable BPM.', 'Use quarter-note clicks.', 'Breathe before starting.', 'Tap or clap softly for 30 seconds.', 'Notice tension and release it.'], successTarget: 'The pulse stays even while your shoulders and hands remain relaxed.', nextMove: 'Repeat with performance posture and the same calm timing.', reflectionPrompt: 'What helped you stay relaxed and steady?' },
];

function practicePrompt(bpm: number) {
  if (bpm < 70) return 'Slow zone: focus on relaxed, accurate movement and count every beat aloud.';
  if (bpm < 120) return 'Groove zone: keep a steady pulse and repeat one short section four times.';
  if (bpm < 170) return 'Performance zone: stay loose and make beat one feel clear.';
  return 'Challenge zone: use a simple pattern and lower the BPM if accuracy starts to slip.';
}

export function SmartMetronomeTool() {
  const [bpm, setBpm] = useState(90); const [signature, setSignature] = useState<Signature>('4/4'); const [subdivision, setSubdivision] = useState<Subdivision>('quarter');
  const [running, setRunning] = useState(false); const [beat, setBeat] = useState(0); const [error, setError] = useState('');
  const [goal, setGoal] = useState<MetronomeGoal>('Keep steady beat'); const [selectedActivityId, setSelectedActivityId] = useState(metronomeActivities[0].id); const [tapResult, setTapResult] = useState('Not tapped yet'); const [sessionSeconds, setSessionSeconds] = useState(0); const [saved, setSaved] = useState(false); const [tempoChosen, setTempoChosen] = useState(false); const [signatureChosen, setSignatureChosen] = useState(false); const [started, setStarted] = useState(false);
  const [ladderStart, setLadderStart] = useState(72); const [ladderTarget, setLadderTarget] = useState(108); const [ladderStep, setLadderStep] = useState(4);
  const contextRef = useRef<AudioContext | null>(null); const timerRef = useRef<number | null>(null); const beatRef = useRef(0); const tapsRef = useRef<number[]>([]);

  const stop = useCallback(() => { if (timerRef.current !== null) window.clearInterval(timerRef.current); timerRef.current = null; beatRef.current = 0; setBeat(0); setRunning(false); }, []);
  const click = useCallback(async (accent: boolean) => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio is not supported by this browser.');
      const context = contextRef.current || new AudioCtor(); contextRef.current = context; if (context.state === 'suspended') await context.resume();
      const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime;
      oscillator.frequency.value = accent ? 1100 : 760; oscillator.type = 'sine'; gain.gain.setValueAtTime(0.16, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + 0.06); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Audio was blocked. Select Start to try again.'); stop(); }
  }, [stop]);

  const start = useCallback(async () => {
    stop(); const beatsPerMeasure = Number(signature.split('/')[0]); const multiplier = subdivision === 'quarter' ? 1 : subdivision === 'eighth' ? 2 : 3; const interval = 60000 / bpm / multiplier;
    setRunning(true); setStarted(true); const tick = () => { const current = beatRef.current; setBeat(current); void click(current % (beatsPerMeasure * multiplier) === 0); beatRef.current = current + 1; };
    tick(); timerRef.current = window.setInterval(tick, interval);
  }, [bpm, click, signature, stop, subdivision]);

  useEffect(() => { if (running) void start(); }, [bpm, signature, subdivision]); // restart timing when a control changes
  useEffect(() => { if (!running) return; const sessionTimer = window.setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000); return () => window.clearInterval(sessionTimer); }, [running]);
  useEffect(() => () => { stop(); void contextRef.current?.close(); contextRef.current = null; }, [stop]);

  function tapTempo() { const now = performance.now(); const recent = [...tapsRef.current.filter((tap) => now - tap < 2500), now].slice(-5); tapsRef.current = recent; if (recent.length > 1) { const gaps = recent.slice(1).map((tap, index) => tap - recent[index]); const result = Math.max(40, Math.min(220, Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)))); setBpm(result); setTapResult(`${result} BPM`); setTempoChosen(true); } }
  const beatsPerMeasure = Number(signature.split('/')[0]); const multiplier = subdivision === 'quarter' ? 1 : subdivision === 'eighth' ? 2 : 3;
  const selectedActivity = metronomeActivities.find((activity) => activity.id === selectedActivityId) ?? metronomeActivities[0];
  const snapshot = useMemo<MetronomeProject>(() => ({ practice_goal: goal, instructor_activity: selectedActivity.title, selected_bpm: bpm, time_signature: signature, subdivision, tap_tempo_result: tapResult, session_seconds: sessionSeconds, speed_ladder_start: ladderStart, speed_ladder_target: ladderTarget, speed_ladder_step: ladderStep }), [bpm, goal, ladderStart, ladderStep, ladderTarget, selectedActivity.title, sessionSeconds, signature, subdivision, tapResult]);
  const extraCreditSummary = projectAsText({ title: `${goal} at ${bpm} BPM`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Smart Metronome');
  const ladderGuidance = bpm === ladderTarget ? 'Target reached. Stay here until the pulse feels comfortable.' : bpm < ladderTarget ? `Increase by ${ladderStep} BPM only after the current tempo feels steady.` : `Decrease by ${ladderStep} BPM to return toward your target with control.`;
  function loadProject(project: LocalToolProject<MetronomeProject>) { const data = project.data; stop(); setGoal(data.practice_goal); setSelectedActivityId(metronomeActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? metronomeActivities[0].id); setBpm(data.selected_bpm); setSignature(data.time_signature); setSubdivision(data.subdivision); setTapResult(data.tap_tempo_result); setSessionSeconds(data.session_seconds); setLadderStart(data.speed_ladder_start); setLadderTarget(data.speed_ladder_target); setLadderStep(data.speed_ladder_step); setTempoChosen(true); setSignatureChosen(true); }
  function changeLadder(direction: -1 | 1) { setBpm((current) => Math.max(40, Math.min(220, current + direction * ladderStep))); setTempoChosen(true); }
  return <ToolShell title="Smart Metronome" eyebrow="JPAC Creator Tool" description="Build steady timing with clear accents, subdivisions, and an easy visual pulse.">
    <section className="premium-tool-panel practice-theory-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Timing coach</span><h2>Choose your practice goal</h2><p>Practice with purpose, track the session locally, and save a timing plan on this device.</p></div><div className="practice-goal-grid">{metronomeGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{goal}</h2></div><strong>{[tempoChosen, signatureChosen, started, sessionSeconds >= 30, saved].filter(Boolean).length}/5 steps</strong></header><ol>{['Choose tempo', 'Choose time signature', 'Start the metronome', 'Clap or count for 30 seconds', 'Save your timing project locally'].map((step, index) => <li key={step} className={[tempoChosen, signatureChosen, started, sessionSeconds >= 30, saved][index] ? 'complete' : ''}><span>{index + 1}</span>{step}</li>)}</ol></section>
      <InstructorActivityPanel activities={metronomeActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
      <div className="instrument-session-strip metronome-session-strip" aria-label="Timing practice statistics"><div><small>Practice goal</small><strong>{goal}</strong></div><div><small>Selected BPM</small><strong>{bpm}</strong></div><div><small>Time signature</small><strong>{signature}</strong></div><div><small>Subdivision</small><strong>{subdivision}</strong></div><div><small>Tap tempo</small><strong>{tapResult}</strong></div><div><small>Session</small><strong>{sessionSeconds}s</strong></div></div>
      <div className={`metronome-pulse ${running ? 'running' : ''} ${beat % (beatsPerMeasure * multiplier) === 0 ? 'accent' : ''}`} aria-live="polite"><strong>{bpm}</strong><span>BPM</span><small>{running ? `Beat ${Math.floor((beat % (beatsPerMeasure * multiplier)) / multiplier) + 1}` : 'Ready'}</small></div>
      <label className="bpm-slider">Tempo<input type="range" min="40" max="220" value={bpm} onChange={(e) => { setBpm(Number(e.target.value)); setTempoChosen(true); }} /><input aria-label="BPM" type="number" min="40" max="220" value={bpm} onChange={(e) => { setBpm(Math.max(40, Math.min(220, Number(e.target.value) || 40))); setTempoChosen(true); }} /></label>
      <div className="premium-control-grid"><label>Time signature<select value={signature} onChange={(e) => { setSignature(e.target.value as Signature); setSignatureChosen(true); }}>{signatures.map((item) => <option key={item}>{item}</option>)}</select></label><label>Subdivision<select value={subdivision} onChange={(e) => setSubdivision(e.target.value as Subdivision)}>{subdivisions.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="premium-action-row"><button type="button" className="button button-primary" onClick={() => running ? stop() : void start()}>{running ? 'Stop' : 'Start'}</button><button type="button" className="button button-secondary" onClick={tapTempo}>Tap tempo</button><button type="button" className="button button-secondary" onClick={() => { stop(); setBpm(90); setSignature('4/4'); setSubdivision('quarter'); setGoal('Keep steady beat'); setTapResult('Not tapped yet'); setSessionSeconds(0); setTempoChosen(false); setSignatureChosen(false); setStarted(false); setSaved(false); tapsRef.current = []; }}>Reset</button></div>
      {error ? <div className="premium-audio-error" role="alert">{error}</div> : null}<article className="metronome-prompt"><h2>Practice prompt</h2><p>{practicePrompt(bpm)}</p></article>
      <section className="speed-ladder" aria-labelledby="speed-ladder-title"><header><div><span className="premium-kicker">Manual speed ladder</span><h2 id="speed-ladder-title">Build speed with control</h2></div><strong>{bpm} → {ladderTarget} BPM</strong></header><div className="premium-control-grid"><label>Start tempo<input type="number" min="40" max="220" value={ladderStart} onChange={(event) => setLadderStart(Math.max(40, Math.min(220, Number(event.target.value) || 40)))} /></label><label>Target tempo<input type="number" min="40" max="220" value={ladderTarget} onChange={(event) => setLadderTarget(Math.max(40, Math.min(220, Number(event.target.value) || 40)))} /></label><label>Step amount<input type="number" min="1" max="20" value={ladderStep} onChange={(event) => setLadderStep(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></label></div><p>{ladderGuidance}</p><div className="premium-action-row"><button type="button" className="button button-secondary" onClick={() => { setBpm(ladderStart); setTempoChosen(true); }}>Use start tempo</button><button type="button" className="button button-secondary" onClick={() => changeLadder(-1)}>Step slower</button><button type="button" className="button button-secondary" onClick={() => changeLadder(1)}>Step faster</button></div></section>
      <div className="beginner-helper-grid">{metronomeHelpers.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}</div>
      <LocalProjectPanel toolType="smart-metronome" toolLabel="Smart Metronome" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={extraCreditSummary} />
    </section>
  </ToolShell>;
}
