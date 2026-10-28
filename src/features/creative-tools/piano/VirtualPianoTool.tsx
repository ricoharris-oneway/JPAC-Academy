import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { addActiveNotes, beginnerTrainerPattern, chordPads, midiFrequency, noteNames, pianoGoals, pianoHelpers, pianoKeyClass, pianoSounds, removeActiveNotes, type PianoGoal, type PianoSound } from './pianoTheory';

type Voice = { oscillator: OscillatorNode; gain: GainNode };
type PianoSnapshot = { goal: PianoGoal; sound: PianoSound; octave: number; sustain: boolean; pattern: string[]; notes_played: number; chords_played: number };
type GuidePanel = 'guide' | 'coach' | 'save' | 'extra' | null;
const keyboardMap = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];

export function VirtualPianoTool() {
  const audioRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<Map<number, Voice>>(new Map());
  const sourcesRef = useRef<Map<number, Set<string>>>(new Map());
  const trainerTimerRef = useRef<number | null>(null);
  const [goal, setGoal] = useState<PianoGoal>('Learn notes');
  const [sound, setSound] = useState<PianoSound>('Classic Piano');
  const [octave, setOctave] = useState(4);
  const [sustain, setSustain] = useState(false);
  const [lastPlayed, setLastPlayed] = useState('Ready to play');
  const [audioError, setAudioError] = useState('');
  const [pattern, setPattern] = useState<string[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [chordCount, setChordCount] = useState(0);
  const [soundChanges, setSoundChanges] = useState(0);
  const [saved, setSaved] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set());
  const [trainerStep, setTrainerStep] = useState(-1);
  const [trainerPlaying, setTrainerPlaying] = useState(false);
  const [tempo, setTempo] = useState(88);
  const [guidePanel, setGuidePanel] = useState<GuidePanel>(null);

  const track = useCallback((label: string, isChord: boolean) => {
    setPattern((current) => [...current.slice(-11), label]);
    if (isChord) setChordCount((value) => value + 1); else setNoteCount((value) => value + 1);
  }, []);

  const stopVoice = useCallback((midi: number) => {
    const voice = voicesRef.current.get(midi); if (!voice) return;
    const now = audioRef.current?.currentTime || 0;
    try { voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setTargetAtTime(0, now, 0.015); voice.oscillator.stop(now + 0.12); } catch { /* already stopped */ }
    voicesRef.current.delete(midi);
  }, []);

  const releaseNotes = useCallback((midis: readonly number[], source: string) => {
    midis.forEach((midi) => { const sources = sourcesRef.current.get(midi); sources?.delete(source); if (!sources?.size) { sourcesRef.current.delete(midi); stopVoice(midi); } });
    setActiveNotes((current) => removeActiveNotes(current, midis.filter((midi) => !sourcesRef.current.has(midi))));
  }, [stopVoice]);

  const stopAll = useCallback(() => {
    if (trainerTimerRef.current !== null) window.clearTimeout(trainerTimerRef.current); trainerTimerRef.current = null;
    [...voicesRef.current.keys()].forEach(stopVoice); sourcesRef.current.clear(); setActiveNotes(new Set()); setTrainerPlaying(false); setTrainerStep(-1);
    setLastPlayed('Audio stopped');
  }, [stopVoice]);

  const playNotes = useCallback(async (midis: readonly number[], label: string, isChord = false, source = 'pointer') => {
    midis.forEach((midi) => { const sources = sourcesRef.current.get(midi) || new Set<string>(); sources.add(source); sourcesRef.current.set(midi, sources); });
    setActiveNotes((current) => addActiveNotes(current, midis));
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio is not supported.');
      const context = audioRef.current || new AudioCtor(); audioRef.current = context;
      if (context.state === 'suspended') await context.resume();
      const now = context.currentTime;
      midis.forEach((midi) => {
        if (voicesRef.current.has(midi)) return;
        const oscillator = context.createOscillator(); const gain = context.createGain(); const filter = context.createBiquadFilter();
        oscillator.type = sound === 'Soft Keys' ? 'sine' : sound === 'Bright Pop' ? 'square' : 'triangle';
        oscillator.frequency.value = midiFrequency(midi);
        filter.type = 'lowpass'; filter.frequency.value = sound === 'Soft Keys' ? 1300 : sound === 'Bright Pop' ? 3600 : 2300;
        gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(sound === 'Bright Pop' ? 0.07 : sound === 'Soft Keys' ? 0.12 : 0.1, now + 0.02);
        oscillator.connect(filter).connect(gain).connect(context.destination); oscillator.start(now);
        voicesRef.current.set(midi, { oscillator, gain }); oscillator.onended = () => { if (voicesRef.current.get(midi)?.oscillator === oscillator) voicesRef.current.delete(midi); };
      });
      setLastPlayed(label); setAudioError(''); track(label, isChord);
    } catch (error) { releaseNotes(midis, source); setAudioError(error instanceof Error ? error.message : 'Audio could not start. Select a key to try again.'); }
  }, [releaseNotes, sound, track]);

  const stopTrainer = useCallback((reset = false) => {
    if (trainerTimerRef.current !== null) window.clearTimeout(trainerTimerRef.current); trainerTimerRef.current = null;
    const midis = [...sourcesRef.current.entries()].filter(([, sources]) => sources.has('trainer')).map(([midi]) => midi);
    releaseNotes(midis, 'trainer'); setTrainerPlaying(false); if (reset) setTrainerStep(-1);
  }, [releaseNotes]);

  const runTrainerStep = useCallback((index: number) => {
    const step = beginnerTrainerPattern.steps[index];
    if (!step) { setTrainerPlaying(false); setLastPlayed('Trainer exercise complete'); setTrainerStep(-1); return; }
    setTrainerPlaying(true); setTrainerStep(index); void playNotes(step.midis, step.label, step.midis.length > 1, 'trainer');
    trainerTimerRef.current = window.setTimeout(() => { releaseNotes(step.midis, 'trainer'); runTrainerStep(index + 1); }, step.beats * 60_000 / tempo);
  }, [playNotes, releaseNotes, tempo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      const index = keyboardMap.indexOf(event.key.toLowerCase());
      if (index >= 0 && index < 24) { event.preventDefault(); const midi = 12 * (octave + 1) + index; void playNotes([midi], `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`, false, `keyboard:${event.key.toLowerCase()}`); }
    };
    const onKeyUp = (event: KeyboardEvent) => { const index = keyboardMap.indexOf(event.key.toLowerCase()); if (index >= 0 && index < 24) releaseNotes([12 * (octave + 1) + index], `keyboard:${event.key.toLowerCase()}`); };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [octave, playNotes, releaseNotes]);

  useEffect(() => () => { stopAll(); void audioRef.current?.close(); audioRef.current = null; }, [stopAll]);

  const startMidi = 12 * (octave + 1);
  const keys = Array.from({ length: 24 }, (_, index) => startMidi + index);
  const snapshot = useMemo<PianoSnapshot>(() => ({ goal, sound, octave, sustain, pattern, notes_played: noteCount, chords_played: chordCount }), [chordCount, goal, noteCount, octave, pattern, sound, sustain]);
  const mission = [noteCount >= 3, chordCount >= 1, pattern.length >= 5, soundChanges >= 1, saved];
  const missionLabels = ['Play three single notes', 'Try one chord pad', 'Play a short pattern', 'Change sound', 'Save your project locally'];
  const summary = projectAsText({ title: `${goal} piano practice`, notes: 'Prepared from the current local session.', savedAt: new Date().toISOString(), data: snapshot }, 'Virtual Piano');
  function loadProject(project: LocalToolProject<PianoSnapshot>) { const data = project.data; if (pianoGoals.includes(data.goal)) setGoal(data.goal); if (pianoSounds.includes(data.sound)) setSound(data.sound); if ([2, 3, 4, 5].includes(data.octave)) setOctave(data.octave); setSustain(Boolean(data.sustain)); setPattern(Array.isArray(data.pattern) ? data.pattern.slice(-12) : []); setNoteCount(Number(data.notes_played) || 0); setChordCount(Number(data.chords_played) || 0); setSoundChanges(1); setSaved(true); setLastPlayed('Local project loaded'); }
  function resetSession() { stopAll(); setPattern([]); setNoteCount(0); setChordCount(0); setSoundChanges(0); setSaved(false); setAudioError(''); }

  return <ToolShell title="Virtual Piano" eyebrow="JPAC Instrument Studio" description="Sit down, choose a sound, and play. Guidance is available when you want it." immersive>
    <section className="premium-tool-panel instrument-lab instrument-app-shell piano-lab piano-studio-app">
      <div className="instrument-app-toolbar">
        <div className="instrument-brand-lockup"><span>VIRTUAL PIANO</span><strong>{sound}</strong><small>{goal} · Octave {octave}</small></div>
        <div className="instrument-toolbar-actions">
          <button type="button" className="instrument-primary-action" disabled={trainerPlaying} onClick={() => runTrainerStep(trainerStep >= 0 ? trainerStep : 0)}>▶ Trainer</button>
          <button type="button" disabled={!trainerPlaying} onClick={() => stopTrainer(false)}>■ Stop Trainer</button>
          <button type="button" onClick={stopAll}>Stop Audio</button>
        </div>
      </div>

      <div className="instrument-goal-rail" aria-label="Piano practice goal">{pianoGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div>

      <section className="instrument-stage piano-performance-stage" aria-label="Virtual piano performance workspace">
        <div className="instrument-stage-heading"><div><span>JPAC STAGE PIANO</span><strong>Play the instrument first.</strong></div><small>{lastPlayed}</small></div>
        <div className="piano-stage-visual" aria-hidden="true"><span className="piano-stage-light left"/><span className="piano-stage-light right"/><div className="piano-stage-mark">JPAC</div></div>
        {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
        <div className="virtual-piano piano-studio-keyboard" aria-label="Two octave virtual piano">
          {keys.map((midi) => {
            const pitch = midi % 12; const label = `${noteNames[pitch]}${Math.floor(midi / 12) - 1}`;
            return <button type="button" key={midi} className={pianoKeyClass(midi, activeNotes)} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void playNotes([midi], label, false, `pointer:${event.pointerId}`); }} onPointerUp={(event) => releaseNotes([midi], `pointer:${event.pointerId}`)} onPointerCancel={(event) => releaseNotes([midi], `pointer:${event.pointerId}`)} aria-label={`Play ${label}`} aria-pressed={activeNotes.has(midi)}><span>{noteNames[pitch]}</span></button>;
          })}
        </div>
      </section>

      <div className="instrument-control-deck piano-studio-controls">
        <label><span>Sound</span><select value={sound} onChange={(e) => { setSound(e.target.value as PianoSound); setSoundChanges((value) => value + 1); }}>{pianoSounds.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Octave</span><select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>{[2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button type="button" className={sustain ? 'active' : ''} aria-pressed={sustain} onClick={() => setSustain((value) => !value)}>◉ Sustain {sustain ? 'On' : 'Off'}</button>
        <button type="button" onClick={resetSession}>↻ Reset Session</button>
      </div>

      <div className="instrument-session-strip instrument-studio-strip" aria-live="polite"><div><small>Last played</small><strong>{lastPlayed}</strong></div><div><small>Notes</small><strong>{noteCount}</strong></div><div><small>Chords</small><strong>{chordCount}</strong></div><div><small>Mission</small><strong>{mission.filter(Boolean).length}/{mission.length}</strong></div></div>

      <section className="instrument-lower-deck">
        <div className="instrument-deck-card"><div><span className="premium-kicker">Chord Pads</span><h2>Build harmony in C</h2></div><div className="chord-pad-grid">{chordPads.map((chord) => { const midis = chord.notes.map((offset) => startMidi + offset); return <button type="button" className={midis.every((midi) => activeNotes.has(midi)) ? 'played' : ''} key={chord.name} onPointerDown={() => { const source = `chord:${chord.name}`; void playNotes(midis, `${chord.name} chord`, true, source); window.setTimeout(() => releaseNotes(midis, source), sustain ? 1800 : 800); }}>{chord.name}</button>; })}</div></div>
        <div className="instrument-deck-card trainer-compact-card"><div><span className="premium-kicker">Pattern Trainer</span><h2>{beginnerTrainerPattern.name}</h2></div><div className="trainer-compact-readout"><span>{trainerStep >= 0 ? `Step ${trainerStep + 1}/${beginnerTrainerPattern.steps.length}` : 'Ready'}</span><strong>{trainerStep >= 0 ? beginnerTrainerPattern.steps[trainerStep]?.label : beginnerTrainerPattern.instruction}</strong></div><label>Tempo <input type="range" min="60" max="120" step="4" value={tempo} onChange={(event) => setTempo(Number(event.target.value))} disabled={trainerPlaying}/><b>{tempo} BPM</b></label></div>
      </section>

      <section className="session-pattern instrument-session-pattern"><div><span className="premium-kicker">Current idea</span><h2>{pattern.length ? pattern.join(' · ') : 'Play a few notes to begin your pattern.'}</h2></div><button type="button" onClick={() => setPattern([])}>Clear</button></section>

      <div className="creator-guide-dock" aria-label="Virtual Piano guide">
        <button type="button" onClick={() => setGuidePanel('guide')}><span>?</span><strong>Guide</strong></button>
        <button type="button" onClick={() => setGuidePanel('coach')}><span>✦</span><strong>Coach</strong></button>
        <button type="button" onClick={() => setGuidePanel('save')}><span>◇</span><strong>Save</strong></button>
        <button type="button" onClick={() => setGuidePanel('extra')}><span>★</span><strong>Extra</strong></button>
      </div>

      {guidePanel && <div className="creator-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuidePanel(null); }}>
        <aside className="creator-guide-panel" role="dialog" aria-modal="true" aria-label="Virtual Piano guidance">
          <button type="button" className="creator-guide-close" aria-label="Close guide" onClick={() => setGuidePanel(null)}>×</button>
          {guidePanel === 'guide' && <div className="creator-guide-content"><span className="premium-kicker">Quick Start</span><h2>Sit down and play.</h2><div className="creator-guide-steps"><button type="button" onClick={() => setGuidePanel(null)}><b>1</b><span><strong>Choose a sound</strong><small>Use the compact control deck under the keyboard.</small></span></button><button type="button" onClick={() => setGuidePanel(null)}><b>2</b><span><strong>Play notes or chords</strong><small>Use the screen keyboard, chord pads, or your computer keyboard.</small></span></button><button type="button" onClick={() => { setGuidePanel(null); runTrainerStep(0); }}><b>3</b><span><strong>Try Trainer Mode</strong><small>Watch the keys light up, then repeat the pattern.</small></span></button><button type="button" onClick={() => setGuidePanel('save')}><b>4</b><span><strong>Save your idea</strong><small>Keep your practice snapshot locally when you are done.</small></span></button></div><div className="creator-guide-cards"><article><strong>Computer keyboard</strong><p>Use A–; plus W, E, T, Y, U, O, P for the black-key row.</p></article><article><strong>Nothing is auto-graded</strong><p>This studio is for practice and creation. Submit work only when your course asks you to.</p></article></div></div>}
          {guidePanel === 'coach' && <div className="creator-guide-content"><span className="premium-kicker">Practice Coach</span><h2>{mission.filter(Boolean).length} of {mission.length} creative steps complete</h2><ol className="instrument-coach-mission">{missionLabels.map((label, index) => <li className={mission[index] ? 'complete' : ''} key={label}><span>{mission[index] ? '✓' : index + 1}</span>{label}</li>)}</ol><div className="creator-guide-cards">{pianoHelpers.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div></div>}
          {guidePanel === 'save' && <div className="creator-guide-content"><LocalProjectPanel toolType="virtual-piano" toolLabel="Virtual Piano" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} /></div>}
          {guidePanel === 'extra' && <div className="creator-guide-content"><ExtraCreditPanel summary={summary} /></div>}
        </aside>
      </div>}
    </section>
  </ToolShell>;
}
