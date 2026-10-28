import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { chordShapes, fretNumbers, guitarGoals, guitarHelpers, guitarSounds, guitarStrings, midiFrequency, midiLabel, type ChordName, type GuitarGoal, type GuitarSound } from './guitarTheory';

type ActiveVoice = { oscillator: OscillatorNode; modulators: OscillatorNode[]; gain: GainNode };
type GuitarSnapshot = { goal: GuitarGoal; sound: GuitarSound; selected_chord: ChordName; effects: string[]; recent_notes: string[]; notes_played: number; chords_strummed: number; chord_history: ChordName[] };
type GuidePanel = 'guide' | 'coach' | 'save' | 'extra' | null;

export function VirtualGuitarTool() {
  const [goal, setGoal] = useState<GuitarGoal>('Learn strings');
  const [sound, setSound] = useState<GuitarSound>('Clean Guitar'); const [selectedChord, setSelectedChord] = useState<ChordName>('G'); const [lastPlayed, setLastPlayed] = useState('Ready to play'); const [audioError, setAudioError] = useState('');
  const [effects, setEffects] = useState({ drive: false, chorus: false, delay: false }); const contextRef = useRef<AudioContext | null>(null); const voicesRef = useRef<ActiveVoice[]>([]); const strumTimersRef = useRef<number[]>([]);
  const [recentNotes, setRecentNotes] = useState<string[]>([]); const [notesPlayed, setNotesPlayed] = useState(0); const [chordsStrummed, setChordsStrummed] = useState(0); const [chordHistory, setChordHistory] = useState<ChordName[]>([]); const [soundChosen, setSoundChosen] = useState(false); const [chordChosen, setChordChosen] = useState(false); const [saved, setSaved] = useState(false); const [guidePanel, setGuidePanel] = useState<GuidePanel>(null);

  const stopAudio = useCallback(() => {
    strumTimersRef.current.forEach((timer) => window.clearTimeout(timer)); strumTimersRef.current = []; const now = contextRef.current?.currentTime || 0;
    voicesRef.current.forEach(({ oscillator, modulators, gain }) => { try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, .01); oscillator.stop(now + .08); modulators.forEach((item) => item.stop(now + .08)); } catch { /* voice already ended */ } }); voicesRef.current = []; setLastPlayed('Audio stopped');
  }, []);

  const playMidi = useCallback(async (midi: number, label = midiLabel(midi), trackNote = true) => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported by this browser.');
      const context = contextRef.current || new AudioCtor(); contextRef.current = context; if (context.state === 'suspended') await context.resume(); const now = context.currentTime;
      const oscillator = context.createOscillator(); const filter = context.createBiquadFilter(); const gain = context.createGain(); const modulators: OscillatorNode[] = [];
      oscillator.type = sound === 'Warm Acoustic' ? 'triangle' : sound === 'Bright Lead' ? 'sawtooth' : 'triangle'; oscillator.frequency.value = midiFrequency(midi); filter.type = 'lowpass'; filter.frequency.setValueAtTime(sound === 'Bright Lead' ? 4200 : sound === 'Warm Acoustic' ? 1700 : 2800, now); filter.frequency.exponentialRampToValueAtTime(650, now + 1.25); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.2, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.45);
      oscillator.connect(filter).connect(gain); let output: AudioNode = gain;
      if (effects.drive) { const drive = context.createWaveShaper(); const curve = new Float32Array(256); for (let index = 0; index < curve.length; index += 1) { const x = index * 2 / 255 - 1; curve[index] = Math.tanh(2.8 * x); } drive.curve = curve; drive.oversample = '2x'; output.connect(drive); output = drive; }
      if (effects.chorus) { const chorus = context.createDelay(.05); chorus.delayTime.value = .018; const lfo = context.createOscillator(); const depth = context.createGain(); lfo.frequency.value = 1.7; depth.gain.value = .004; lfo.connect(depth).connect(chorus.delayTime); lfo.start(now); lfo.stop(now + 1.55); modulators.push(lfo); output.connect(chorus); output = chorus; }
      if (effects.delay) { const delay = context.createDelay(.5); const feedback = context.createGain(); delay.delayTime.value = .22; feedback.gain.value = .24; output.connect(delay); delay.connect(feedback).connect(delay); delay.connect(context.destination); }
      output.connect(context.destination); oscillator.start(now); oscillator.stop(now + 1.5); const voice = { oscillator, modulators, gain }; voicesRef.current.push(voice); oscillator.onended = () => { voicesRef.current = voicesRef.current.filter((item) => item !== voice); }; setLastPlayed(label); if (trackNote) { setRecentNotes((current) => [...current.slice(-9), label]); setNotesPlayed((value) => value + 1); } setAudioError('');
    } catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Tap a fret to try again.'); }
  }, [effects, sound]);

  function strumChord() { setChordsStrummed((value) => value + 1); setChordHistory((current) => [...current.slice(-5), selectedChord]); const shape = chordShapes[selectedChord]; shape.forEach((fret, stringIndex) => { if (fret === null) return; const timer = window.setTimeout(() => void playMidi(guitarStrings[stringIndex].midi + fret, `${selectedChord} chord`, false), stringIndex * 55); strumTimersRef.current.push(timer); }); }
  function reset() { stopAudio(); setSound('Clean Guitar'); setSelectedChord('G'); setEffects({ drive: false, chorus: false, delay: false }); setRecentNotes([]); setNotesPlayed(0); setChordsStrummed(0); setChordHistory([]); setSoundChosen(false); setChordChosen(false); setSaved(false); setAudioError(''); }
  useEffect(() => () => { strumTimersRef.current.forEach((timer) => window.clearTimeout(timer)); const context = contextRef.current; voicesRef.current.forEach(({ oscillator, modulators }) => { try { oscillator.stop(); modulators.forEach((item) => item.stop()); } catch { /* already stopped */ } }); if (context) void context.close(); contextRef.current = null; }, []);

  const activeEffects = useMemo(() => (Object.keys(effects) as (keyof typeof effects)[]).filter((effect) => effects[effect]), [effects]);
  const snapshot = useMemo<GuitarSnapshot>(() => ({ goal, sound, selected_chord: selectedChord, effects: activeEffects, recent_notes: recentNotes, notes_played: notesPlayed, chords_strummed: chordsStrummed, chord_history: chordHistory }), [activeEffects, chordHistory, chordsStrummed, goal, notesPlayed, recentNotes, selectedChord, sound]);
  const mission = [soundChosen, chordChosen, chordsStrummed >= 1, notesPlayed >= 2, new Set(chordHistory).size >= 2, saved];
  const missionLabels = ['Choose a guitar sound', 'Pick a chord', 'Strum the chord', 'Try two fret notes', 'Practice switching chords', 'Save your project locally'];
  const summary = projectAsText({ title: `${goal} guitar practice`, notes: 'Prepared from the current local session.', savedAt: new Date().toISOString(), data: snapshot }, 'Virtual Guitar');
  function loadProject(project: LocalToolProject<GuitarSnapshot>) { const data = project.data; if (guitarGoals.includes(data.goal)) setGoal(data.goal); if (guitarSounds.includes(data.sound)) setSound(data.sound); if (Object.hasOwn(chordShapes, data.selected_chord)) setSelectedChord(data.selected_chord); setEffects({ drive: data.effects.includes('drive'), chorus: data.effects.includes('chorus'), delay: data.effects.includes('delay') }); setRecentNotes(Array.isArray(data.recent_notes) ? data.recent_notes.slice(-10) : []); setNotesPlayed(Number(data.notes_played) || 0); setChordsStrummed(Number(data.chords_strummed) || 0); setChordHistory(Array.isArray(data.chord_history) ? data.chord_history.filter((item): item is ChordName => Object.hasOwn(chordShapes, item)).slice(-6) : []); setSoundChosen(true); setChordChosen(true); setSaved(true); setLastPlayed('Local project loaded'); }

  return <ToolShell title="Virtual Guitar / Instrument Studio" eyebrow="JPAC Instrument Studio" description="Shape your tone, grab a chord, and build a riff in a guitar-first workspace." immersive>
    <section className="premium-tool-panel virtual-guitar-tool instrument-lab instrument-app-shell guitar-lab guitar-studio-app">
      <div className="instrument-app-toolbar">
        <div className="instrument-brand-lockup"><span>GUITAR STUDIO</span><strong>{sound}</strong><small>{goal} · {activeEffects.length ? activeEffects.join(' + ') : 'Dry signal'}</small></div>
        <div className="instrument-toolbar-actions"><button type="button" className="instrument-primary-action" onClick={strumChord}>▶ Strum {selectedChord}</button><button type="button" onClick={stopAudio}>■ Stop Audio</button><button type="button" onClick={reset}>↻ Reset</button></div>
      </div>

      <div className="instrument-goal-rail" aria-label="Guitar practice goal">{guitarGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div>

      <div className="guitar-studio-control-tower">
        <label><span>Instrument</span><select value={sound} onChange={(event) => { setSound(event.target.value as GuitarSound); setSoundChosen(true); }}>{guitarSounds.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="guitar-effect-rack" role="group" aria-label="Guitar effects">{(['drive', 'chorus', 'delay'] as const).map((effect) => <button type="button" className={effects[effect] ? 'active' : ''} aria-pressed={effects[effect]} key={effect} onClick={() => setEffects((current) => ({ ...current, [effect]: !current[effect] }))}><span>{effect === 'drive' ? '⚡' : effect === 'chorus' ? '≈' : '↻'}</span><strong>{effect}</strong></button>)}</div>
      </div>

      <section className="instrument-stage guitar-performance-stage" aria-label="Virtual guitar performance workspace">
        <div className="instrument-stage-heading"><div><span>JPAC GUITAR WORKSTATION</span><strong>Build a riff. Shape the sound.</strong></div><small>{lastPlayed}</small></div>
        <div className="guitar-stage-visual" aria-hidden="true"><div className="guitar-body-shape"/><div className="guitar-neck-shape"/><span>JPAC</span></div>
        {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
        <div className="guitar-fretboard-scroll guitar-studio-fretboard"><div className="guitar-fretboard" role="group" aria-label="Six string, twelve fret virtual guitar"><div className="guitar-fret-header"><span>String</span>{fretNumbers.map((fret) => <b key={fret}>{fret === 0 ? 'Open' : fret}</b>)}</div>{guitarStrings.map((string, stringIndex) => <div className="guitar-string-row" key={`${string.name}-${stringIndex}`}><strong>{string.short}<small>{string.name}</small></strong>{fretNumbers.map((fret) => { const midi = string.midi + fret; return <button type="button" key={fret} aria-label={`${string.name} string, ${fret === 0 ? 'open' : `fret ${fret}`}, note ${midiLabel(midi)}`} onClick={() => void playMidi(midi)}><span/><i>{midiLabel(midi).replace(/\d/g, '')}</i></button>; })}</div>)}</div></div>
      </section>

      <section className="guitar-chord-workstation">
        <div><span className="premium-kicker">Chord Bank</span><h2>{selectedChord} selected</h2></div>
        <div className="guitar-chord-buttons" role="group" aria-label="Select a guitar chord">{(Object.keys(chordShapes) as ChordName[]).map((chord) => <button type="button" className={selectedChord === chord ? 'active' : ''} aria-pressed={selectedChord === chord} key={chord} onClick={() => { setSelectedChord(chord); setChordChosen(true); }}>{chord}</button>)}</div>
        <button type="button" className="instrument-strum-button" onClick={strumChord}>STRUM {selectedChord}</button>
      </section>

      <div className="instrument-session-strip instrument-studio-strip" aria-live="polite"><div><small>Last played</small><strong>{lastPlayed}</strong></div><div><small>Fret notes</small><strong>{notesPlayed}</strong></div><div><small>Chords</small><strong>{chordsStrummed}</strong></div><div><small>Mission</small><strong>{mission.filter(Boolean).length}/{mission.length}</strong></div></div>

      <section className="session-pattern instrument-session-pattern"><div><span className="premium-kicker">Riff Tracker</span><h2>{recentNotes.length ? recentNotes.join(' · ') : 'Tap fret notes to build a riff.'}</h2><p>{chordHistory.length ? `Chord switches: ${chordHistory.join(' → ')}` : 'Choose and strum different chords to practice switching.'}</p></div><button type="button" onClick={() => { setRecentNotes([]); setChordHistory([]); }}>Clear</button></section>

      <div className="creator-guide-dock" aria-label="Virtual Guitar guide">
        <button type="button" onClick={() => setGuidePanel('guide')}><span>?</span><strong>Guide</strong></button>
        <button type="button" onClick={() => setGuidePanel('coach')}><span>✦</span><strong>Coach</strong></button>
        <button type="button" onClick={() => setGuidePanel('save')}><span>◇</span><strong>Save</strong></button>
        <button type="button" onClick={() => setGuidePanel('extra')}><span>★</span><strong>Extra</strong></button>
      </div>

      {guidePanel && <div className="creator-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuidePanel(null); }}>
        <aside className="creator-guide-panel" role="dialog" aria-modal="true" aria-label="Virtual Guitar guidance">
          <button type="button" className="creator-guide-close" aria-label="Close guide" onClick={() => setGuidePanel(null)}>×</button>
          {guidePanel === 'guide' && <div className="creator-guide-content"><span className="premium-kicker">Quick Start</span><h2>Grab a sound and start playing.</h2><div className="creator-guide-steps"><button type="button" onClick={() => setGuidePanel(null)}><b>1</b><span><strong>Choose your tone</strong><small>Pick an instrument sound and switch effects on or off.</small></span></button><button type="button" onClick={() => setGuidePanel(null)}><b>2</b><span><strong>Explore the fretboard</strong><small>Tap open strings or frets and listen to how the pitch changes.</small></span></button><button type="button" onClick={() => { setGuidePanel(null); strumChord(); }}><b>3</b><span><strong>Strum a chord</strong><small>Pick a chord shape, then use the large Strum button.</small></span></button><button type="button" onClick={() => setGuidePanel('save')}><b>4</b><span><strong>Save your riff</strong><small>Keep your practice snapshot locally when you are done.</small></span></button></div></div>}
          {guidePanel === 'coach' && <div className="creator-guide-content"><span className="premium-kicker">Practice Coach</span><h2>{mission.filter(Boolean).length} of {mission.length} creative steps complete</h2><ol className="instrument-coach-mission">{missionLabels.map((label, index) => <li className={mission[index] ? 'complete' : ''} key={label}><span>{mission[index] ? '✓' : index + 1}</span>{label}</li>)}</ol><div className="creator-guide-cards">{guitarHelpers.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}<article><strong>How the fretboard works</strong><p>Each string starts on a different open note. Every fret raises the pitch by one half step; the 12th fret repeats the open note one octave higher.</p></article><article><strong>Try this next</strong><p>Strum G slowly, play a few notes around the shape, then switch to C and listen for the notes that move.</p></article></div></div>}
          {guidePanel === 'save' && <div className="creator-guide-content"><LocalProjectPanel toolType="virtual-guitar" toolLabel="Virtual Guitar" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} /></div>}
          {guidePanel === 'extra' && <div className="creator-guide-content"><ExtraCreditPanel summary={summary}/></div>}
        </aside>
      </div>}
    </section>
  </ToolShell>;
}
