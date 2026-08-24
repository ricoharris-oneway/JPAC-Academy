import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { chordPads, midiFrequency, noteNames, pianoSounds, type PianoSound, whiteNotes } from './pianoTheory';

type Voice = { oscillator: OscillatorNode; gain: GainNode };
const keyboardMap = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];

export function VirtualPianoTool() {
  const audioRef = useRef<AudioContext | null>(null);
  const voicesRef = useRef<Voice[]>([]);
  const [sound, setSound] = useState<PianoSound>('Classic Piano');
  const [octave, setOctave] = useState(4);
  const [sustain, setSustain] = useState(false);
  const [lastPlayed, setLastPlayed] = useState('Ready to play');
  const [audioError, setAudioError] = useState('');

  const stopAll = useCallback(() => {
    const now = audioRef.current?.currentTime || 0;
    voicesRef.current.forEach(({ oscillator, gain }) => { try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, 0.015); oscillator.stop(now + 0.12); } catch { /* already stopped */ } });
    voicesRef.current = [];
    setLastPlayed('Audio stopped');
  }, []);

  const playNotes = useCallback(async (midis: number[], label: string) => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error('Web Audio is not supported.');
      const context = audioRef.current || new AudioCtor(); audioRef.current = context;
      if (context.state === 'suspended') await context.resume();
      const now = context.currentTime;
      midis.forEach((midi) => {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.type = sound === 'Soft Keys' ? 'sine' : sound === 'Bright Pop' ? 'square' : 'triangle';
        oscillator.frequency.value = midiFrequency(midi);
        gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(sound === 'Bright Pop' ? 0.09 : 0.14, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (sustain ? 2.4 : 1.1));
        oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + (sustain ? 2.5 : 1.2));
        voicesRef.current.push({ oscillator, gain }); oscillator.onended = () => { voicesRef.current = voicesRef.current.filter((voice) => voice.oscillator !== oscillator); };
      });
      setLastPlayed(label); setAudioError('');
    } catch (error) { setAudioError(error instanceof Error ? error.message : 'Audio could not start. Select a key to try again.'); }
  }, [sound, sustain]);

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
  return <ToolShell title="Virtual Piano" eyebrow="JPAC Creator Tool" description="Play two octaves, explore chords, and build confidence one note at a time.">
    <section className="premium-tool-panel">
      <div className="premium-control-grid piano-controls">
        <label>Sound<select value={sound} onChange={(e) => setSound(e.target.value as PianoSound)}>{pianoSounds.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Starting octave<select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>{[2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button type="button" className={`premium-toggle ${sustain ? 'active' : ''}`} aria-pressed={sustain} onClick={() => setSustain((value) => !value)}>Sustain {sustain ? 'on' : 'off'}</button>
        <button type="button" className="button button-secondary" onClick={stopAll}>Reset / stop audio</button>
      </div>
      <div className="piano-readout" aria-live="polite"><small>Last played</small><strong>{lastPlayed}</strong></div>
      {audioError ? <div className="premium-audio-error" role="alert">{audioError}</div> : null}
      <div className="virtual-piano" aria-label="Two octave virtual piano">
        {keys.map((midi) => {
          const pitch = midi % 12; const white = whiteNotes.includes(pitch);
          return <button type="button" key={midi} className={`piano-key ${white ? 'white' : 'black'}`} onPointerDown={() => void playNotes([midi], `${noteNames[pitch]}${Math.floor(midi / 12) - 1}`)} aria-label={`Play ${noteNames[pitch]} ${Math.floor(midi / 12) - 1}`}><span>{noteNames[pitch]}</span></button>;
        })}
      </div>
      <section className="chord-pad-section"><div><h2>Chord pads in C</h2><p>Try a chord, then build a four-chord song idea.</p></div><div className="chord-pad-grid">{chordPads.map((chord) => <button type="button" key={chord.name} onClick={() => void playNotes(chord.notes.map((offset) => startMidi + offset), `${chord.name} chord`)}>{chord.name}</button>)}</div></section>
      <p className="piano-keyboard-hint">Keyboard: use A–; and the black-key row W, E, T, Y, U, O, P.</p>
    </section>
  </ToolShell>;
}
