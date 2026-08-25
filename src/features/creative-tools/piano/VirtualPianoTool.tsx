import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { chordPads, midiFrequency, noteNames, pianoGoals, pianoHelpers, pianoSounds, type PianoGoal, type PianoSound, whiteNotes } from './pianoTheory';

type Voice = { oscillator: OscillatorNode; gain: GainNode };
type PianoSnapshot = { goal: PianoGoal; sound: PianoSound; octave: number; sustain: boolean; pattern: string[]; notes_played: number; chords_played: number };
const keyboardMap = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];

export function VirtualPianoTool() {
  const audioRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<Voice[]>([]);
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

  const track = useCallback((label: string, isChord: boolean) => {
    setPattern((current) => [...current.slice(-11), label]);
    if (isChord) setChordCount((value) => value + 1); else setNoteCount((value) => value + 1);
  }, []);

  const stopAll = useCallback(() => {
    const now = audioRef.current?.currentTime || 0;
    voicesRef.current.forEach(({ oscillator, gain }) => { try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, 0.015); oscillator.stop(now + 0.12); } catch { /* already stopped */ } });
    voicesRef.current = [];
    setLastPlayed('Audio stopped');
  }, []);

  const playNotes = useCallback(async (midis: number[], label: string, isChord = false) => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio is not supported.');
      const context = audioRef.current || new AudioCtor(); audioRef.current = context;
      if (context.state === 'suspended') await context.resume();
      const now = context.currentTime;
      midis.forEach((midi) => {
        const oscillator = context.createOscillator(); const gain = context.createGain(); const filter = context.createBiquadFilter();
        oscillator.type = sound === 'Soft Keys' ? 'sine' : sound === 'Bright Pop' ? 'square' : 'triangle';
        oscillator.frequency.value = midiFrequency(midi);
        filter.type = 'lowpass'; filter.frequency.value = sound === 'Soft Keys' ? 1300 : sound === 'Bright Pop' ? 3600 : 2300;
        gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(sound === 'Bright Pop' ? 0.07 : sound === 'Soft Keys' ? 0.12 : 0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (sustain ? 2.4 : 1.1));
        oscillator.connect(filter).connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + (sustain ? 2.5 : 1.2));
        voicesRef.current.push({ oscillator, gain }); oscillator.onended = () => { voicesRef.current = voicesRef.current.filter((voice) => voice.oscillator !== oscillator); };
      });
      setLastPlayed(label); setAudioError(''); track(label, isChord);
    } catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Select a key to try again.'); }
  }, [sound, sustain, track]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      const index = keyboardMap.indexOf(event.key.toLowerCase());
      if (index >= 0 && index < 24) { event.preventDefault(); const midi = 12 * (octave + 1) + index; void playNotes([midi], `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}`); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [octave, playNotes]);

  useEffect(() => () => { stopAll(); void audioRef.current?.close(); audioRef.current = null; }, [stopAll]);

  const startMidi = 12 * (octave + 1);
  const keys = Array.from({ length: 24 }, (_, index) => startMidi + index);
  const snapshot = useMemo<PianoSnapshot>(() => ({ goal, sound, octave, sustain, pattern, notes_played: noteCount, chords_played: chordCount }), [chordCount, goal, noteCount, octave, pattern, sound, sustain]);
  const mission = [noteCount >= 3, chordCount >= 1, pattern.length >= 5, soundChanges >= 1, saved];
  const missionLabels = ['Play three single notes', 'Try one chord pad', 'Play a short pattern', 'Change sound', 'Save your project locally'];
  const summary = projectAsText({ title: `${goal} piano practice`, notes: 'Prepared from the current local session.', savedAt: new Date().toISOString(), data: snapshot }, 'Virtual Piano');
  function loadProject(project: LocalToolProject<PianoSnapshot>) { const data = project.data; if (pianoGoals.includes(data.goal)) setGoal(data.goal); if (pianoSounds.includes(data.sound)) setSound(data.sound); if ([2, 3, 4, 5].includes(data.octave)) setOctave(data.octave); setSustain(Boolean(data.sustain)); setPattern(Array.isArray(data.pattern) ? data.pattern.slice(-12) : []); setNoteCount(Number(data.notes_played) || 0); setChordCount(Number(data.chords_played) || 0); setSoundChanges(1); setSaved(true); setLastPlayed('Local project loaded'); }
  function resetSession() { stopAll(); setPattern([]); setNoteCount(0); setChordCount(0); setSoundChanges(0); setSaved(false); setAudioError(''); }

  return <ToolShell title="Virtual Piano" eyebrow="JPAC Creator Tool" description="Build a melody, explore rich sounds, and turn today’s practice into a local creative project.">
    <section className="premium-tool-panel instrument-lab piano-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Choose your creative goal</span><h2>What do you want to make today?</h2></div><div className="practice-goal-grid">{pianoGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{mission.filter(Boolean).length} of {mission.length} steps complete</h2></div><strong>{mission.every(Boolean) ? 'Mission complete! ✨' : 'Keep creating'}</strong></header><ol>{missionLabels.map((label, index) => <li className={mission[index] ? 'complete' : ''} key={label}><span>{mission[index] ? '✓' : index + 1}</span>{label}</li>)}</ol></section>
      <div className="premium-control-grid piano-controls">
        <label>Sound<select value={sound} onChange={(e) => { setSound(e.target.value as PianoSound); setSoundChanges((value) => value + 1); }}>{pianoSounds.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Starting octave<select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>{[2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button type="button" className={`premium-toggle ${sustain ? 'active' : ''}`} aria-pressed={sustain} onClick={() => setSustain((value) => !value)}>Sustain {sustain ? 'on' : 'off'}</button>
        <button type="button" className="button button-secondary" onClick={resetSession}>Reset / stop audio</button>
      </div>
      <div className="instrument-session-strip" aria-live="polite"><div><small>Last played</small><strong>{lastPlayed}</strong></div><div><small>Notes</small><strong>{noteCount}</strong></div><div><small>Chords</small><strong>{chordCount}</strong></div><div><small>Goal</small><strong>{goal}</strong></div></div>
      {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
      <div className="virtual-piano" aria-label="Two octave virtual piano">
        {keys.map((midi) => {
          const pitch = midi % 12; const white = whiteNotes.includes(pitch);
          const label = `${noteNames[pitch]}${Math.floor(midi / 12) - 1}`;
          return <button type="button" key={midi} className={`piano-key ${white ? 'white' : 'black'} ${lastPlayed === label ? 'played' : ''}`} onPointerDown={() => void playNotes([midi], label)} aria-label={`Play ${label}`}><span>{noteNames[pitch]}</span></button>;
        })}
      </div>
      <section className="chord-pad-section"><div><span className="premium-kicker">Harmony zone</span><h2>Chord pads in C</h2><p>Try a chord, then build a four-chord song idea.</p></div><div className="chord-pad-grid">{chordPads.map((chord) => <button type="button" className={lastPlayed === `${chord.name} chord` ? 'played' : ''} key={chord.name} onClick={() => void playNotes(chord.notes.map((offset) => startMidi + offset), `${chord.name} chord`, true)}>{chord.name}</button>)}</div></section>
      <section className="session-pattern"><div><span className="premium-kicker">Current session pattern</span><h2>{pattern.length ? pattern.join(' · ') : 'Play a few notes to begin your pattern.'}</h2></div><button type="button" onClick={() => setPattern([])}>Clear pattern</button></section>
      <div className="beginner-helper-grid">{pianoHelpers.map(([title, copy]) => <article key={title}><strong>{title}</strong><span>{copy}</span></article>)}</div>
      <p className="piano-keyboard-hint">Keyboard: use A–; and the black-key row W, E, T, Y, U, O, P.</p>
      <LocalProjectPanel toolType="virtual-piano" toolLabel="Virtual Piano" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={summary} />
    </section>
  </ToolShell>;
}
