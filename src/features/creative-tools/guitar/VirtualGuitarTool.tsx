import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { chordShapes, fretNumbers, guitarSounds, guitarStrings, midiFrequency, midiLabel, type ChordName, type GuitarSound } from './guitarTheory';

type ActiveVoice = { oscillator: OscillatorNode; modulators: OscillatorNode[]; gain: GainNode };

export function VirtualGuitarTool() {
  const [sound, setSound] = useState<GuitarSound>('Clean Guitar'); const [selectedChord, setSelectedChord] = useState<ChordName>('G'); const [lastPlayed, setLastPlayed] = useState('Ready to play'); const [audioError, setAudioError] = useState('');
  const [effects, setEffects] = useState({ drive: false, chorus: false, delay: false }); const contextRef = useRef<AudioContext | null>(null); const voicesRef = useRef<ActiveVoice[]>([]); const strumTimersRef = useRef<number[]>([]);

  const stopAudio = useCallback(() => {
    strumTimersRef.current.forEach((timer) => window.clearTimeout(timer)); strumTimersRef.current = []; const now = contextRef.current?.currentTime || 0;
    voicesRef.current.forEach(({ oscillator, modulators, gain }) => { try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, .01); oscillator.stop(now + .08); modulators.forEach((item) => item.stop(now + .08)); } catch { /* voice already ended */ } }); voicesRef.current = []; setLastPlayed('Audio stopped');
  }, []);

  const playMidi = useCallback(async (midi: number, label = midiLabel(midi)) => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported by this browser.');
      const context = contextRef.current || new AudioCtor(); contextRef.current = context; if (context.state === 'suspended') await context.resume(); const now = context.currentTime;
      const oscillator = context.createOscillator(); const filter = context.createBiquadFilter(); const gain = context.createGain(); const modulators: OscillatorNode[] = [];
      oscillator.type = sound === 'Warm Acoustic' ? 'triangle' : sound === 'Bright Lead' ? 'sawtooth' : 'triangle'; oscillator.frequency.value = midiFrequency(midi); filter.type = 'lowpass'; filter.frequency.setValueAtTime(sound === 'Bright Lead' ? 4200 : sound === 'Warm Acoustic' ? 1700 : 2800, now); filter.frequency.exponentialRampToValueAtTime(650, now + 1.25); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.2, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.45);
      oscillator.connect(filter).connect(gain); let output: AudioNode = gain;
      if (effects.drive) { const drive = context.createWaveShaper(); const curve = new Float32Array(256); for (let index = 0; index < curve.length; index += 1) { const x = index * 2 / 255 - 1; curve[index] = Math.tanh(2.8 * x); } drive.curve = curve; drive.oversample = '2x'; output.connect(drive); output = drive; }
      if (effects.chorus) { const chorus = context.createDelay(.05); chorus.delayTime.value = .018; const lfo = context.createOscillator(); const depth = context.createGain(); lfo.frequency.value = 1.7; depth.gain.value = .004; lfo.connect(depth).connect(chorus.delayTime); lfo.start(now); lfo.stop(now + 1.55); modulators.push(lfo); output.connect(chorus); output = chorus; }
      if (effects.delay) { const delay = context.createDelay(.5); const feedback = context.createGain(); delay.delayTime.value = .22; feedback.gain.value = .24; output.connect(delay); delay.connect(feedback).connect(delay); delay.connect(context.destination); }
      output.connect(context.destination); oscillator.start(now); oscillator.stop(now + 1.5); const voice = { oscillator, modulators, gain }; voicesRef.current.push(voice); oscillator.onended = () => { voicesRef.current = voicesRef.current.filter((item) => item !== voice); }; setLastPlayed(label); setAudioError('');
    } catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Tap a fret to try again.'); }
  }, [effects, sound]);

  function strumChord() { const shape = chordShapes[selectedChord]; shape.forEach((fret, stringIndex) => { if (fret === null) return; const timer = window.setTimeout(() => void playMidi(guitarStrings[stringIndex].midi + fret, `${selectedChord} chord`), stringIndex * 55); strumTimersRef.current.push(timer); }); }
  function reset() { stopAudio(); setSound('Clean Guitar'); setSelectedChord('G'); setEffects({ drive: false, chorus: false, delay: false }); setAudioError(''); }
  useEffect(() => () => { strumTimersRef.current.forEach((timer) => window.clearTimeout(timer)); const context = contextRef.current; voicesRef.current.forEach(({ oscillator, modulators }) => { try { oscillator.stop(); modulators.forEach((item) => item.stop()); } catch { /* already stopped */ } }); if (context) void context.close(); contextRef.current = null; }, []);

  return <ToolShell title="Virtual Guitar / Instrument Studio" eyebrow="JPAC Creator Tool" description="Explore six strings, twelve frets, chord shapes, strumming, and guitar-style effects.">
    <section className="premium-tool-panel virtual-guitar-tool">
      <div className="premium-control-grid guitar-controls"><label>Sound<select value={sound} onChange={(event) => setSound(event.target.value as GuitarSound)}>{guitarSounds.map((item) => <option key={item}>{item}</option>)}</select></label><div className="guitar-effect-group" role="group" aria-label="Guitar effects">{(['drive', 'chorus', 'delay'] as const).map((effect) => <button type="button" className={effects[effect] ? 'active' : ''} aria-pressed={effects[effect]} key={effect} onClick={() => setEffects((current) => ({ ...current, [effect]: !current[effect] }))}>{effect[0].toUpperCase() + effect.slice(1)}</button>)}</div><button type="button" className="button button-secondary" onClick={reset}>Stop / Reset audio</button></div>
      <div className="guitar-readout" aria-live="polite"><small>Last played</small><strong>{lastPlayed}</strong></div>{audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
      <div className="guitar-fretboard-scroll"><div className="guitar-fretboard" role="group" aria-label="Six string, twelve fret virtual guitar"><div className="guitar-fret-header"><span>String</span>{fretNumbers.map((fret) => <b key={fret}>{fret === 0 ? 'Open' : fret}</b>)}</div>{guitarStrings.map((string, stringIndex) => <div className="guitar-string-row" key={`${string.name}-${stringIndex}`}><strong>{string.short}<small>{string.name}</small></strong>{fretNumbers.map((fret) => { const midi = string.midi + fret; return <button type="button" key={fret} aria-label={`${string.name} string, ${fret === 0 ? 'open' : `fret ${fret}`}, note ${midiLabel(midi)}`} onClick={() => void playMidi(midi)}><span /><i>{midiLabel(midi).replace(/\d/g, '')}</i></button>; })}</div>)}</div></div>
      <section className="guitar-chords"><div><h2>Common chord shapes</h2><p>Select a chord, then strum all of its playable strings.</p></div><div className="guitar-chord-buttons" role="group" aria-label="Select a guitar chord">{(Object.keys(chordShapes) as ChordName[]).map((chord) => <button type="button" className={selectedChord === chord ? 'active' : ''} aria-pressed={selectedChord === chord} key={chord} onClick={() => setSelectedChord(chord)}>{chord}</button>)}</div><button type="button" className="button button-primary" onClick={strumChord}>Strum {selectedChord}</button></section>
      <div className="premium-learning-grid"><article><h2>How the fretboard works</h2><p>Each string starts on a different open note. Moving one fret toward the guitar body raises the pitch by one musical half step. The 12th fret repeats the open-string note one octave higher.</p></article><article><h2>Try this next</h2><p>Choose G, strum slowly, then play each highlighted chord tone one string at a time. Switch to C and listen for which notes move and which stay close.</p></article></div>
    </section>
  </ToolShell>;
}
