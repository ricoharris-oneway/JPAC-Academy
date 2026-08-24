import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';

type Signature = '2/4' | '3/4' | '4/4' | '6/8';
type Subdivision = 'quarter' | 'eighth' | 'triplet';
const signatures: Signature[] = ['2/4', '3/4', '4/4', '6/8'];
const subdivisions: Subdivision[] = ['quarter', 'eighth', 'triplet'];

function practicePrompt(bpm: number) {
  if (bpm < 70) return 'Slow zone: focus on relaxed, accurate movement and count every beat aloud.';
  if (bpm < 120) return 'Groove zone: keep a steady pulse and repeat one short section four times.';
  if (bpm < 170) return 'Performance zone: stay loose and make beat one feel clear.';
  return 'Challenge zone: use a simple pattern and lower the BPM if accuracy starts to slip.';
}

export function SmartMetronomeTool() {
  const [bpm, setBpm] = useState(90); const [signature, setSignature] = useState<Signature>('4/4'); const [subdivision, setSubdivision] = useState<Subdivision>('quarter');
  const [running, setRunning] = useState(false); const [beat, setBeat] = useState(0); const [error, setError] = useState('');
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
    setRunning(true); const tick = () => { const current = beatRef.current; setBeat(current); void click(current % (beatsPerMeasure * multiplier) === 0); beatRef.current = current + 1; };
    tick(); timerRef.current = window.setInterval(tick, interval);
  }, [bpm, click, signature, stop, subdivision]);

  useEffect(() => { if (running) void start(); }, [bpm, signature, subdivision]); // restart timing when a control changes
  useEffect(() => () => { stop(); void contextRef.current?.close(); contextRef.current = null; }, [stop]);

  function tapTempo() { const now = performance.now(); const recent = [...tapsRef.current.filter((tap) => now - tap < 2500), now].slice(-5); tapsRef.current = recent; if (recent.length > 1) { const gaps = recent.slice(1).map((tap, index) => tap - recent[index]); setBpm(Math.max(40, Math.min(220, Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length))))); } }
  const beatsPerMeasure = Number(signature.split('/')[0]); const multiplier = subdivision === 'quarter' ? 1 : subdivision === 'eighth' ? 2 : 3;
  return <ToolShell title="Smart Metronome" eyebrow="JPAC Creator Tool" description="Build steady timing with clear accents, subdivisions, and an easy visual pulse.">
    <section className="premium-tool-panel">
      <div className={`metronome-pulse ${running ? 'running' : ''} ${beat % (beatsPerMeasure * multiplier) === 0 ? 'accent' : ''}`} aria-live="polite"><strong>{bpm}</strong><span>BPM</span><small>{running ? `Beat ${Math.floor((beat % (beatsPerMeasure * multiplier)) / multiplier) + 1}` : 'Ready'}</small></div>
      <label className="bpm-slider">Tempo<input type="range" min="40" max="220" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} /><input aria-label="BPM" type="number" min="40" max="220" value={bpm} onChange={(e) => setBpm(Math.max(40, Math.min(220, Number(e.target.value) || 40)))} /></label>
      <div className="premium-control-grid"><label>Time signature<select value={signature} onChange={(e) => setSignature(e.target.value as Signature)}>{signatures.map((item) => <option key={item}>{item}</option>)}</select></label><label>Subdivision<select value={subdivision} onChange={(e) => setSubdivision(e.target.value as Subdivision)}>{subdivisions.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="premium-action-row"><button type="button" className="button button-primary" onClick={() => running ? stop() : void start()}>{running ? 'Stop' : 'Start'}</button><button type="button" className="button button-secondary" onClick={tapTempo}>Tap tempo</button><button type="button" className="button button-secondary" onClick={() => { stop(); setBpm(90); setSignature('4/4'); setSubdivision('quarter'); tapsRef.current = []; }}>Reset</button></div>
      {error ? <div className="premium-audio-error" role="alert">{error}</div> : null}<article className="metronome-prompt"><h2>Practice prompt</h2><p>{practicePrompt(bpm)}</p></article>
    </section>
  </ToolShell>;
}
