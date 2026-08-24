import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { describePitch, detectPitch, practicePrompt, referencePitches, tuningFeedback } from './pitchDetection';

type PermissionState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';
type Reading = { note: string; cents: number; frequency: number };

export function SmartTunerTool() {
  const [mode, setMode] = useState<'Vocal' | 'Instrument'>('Vocal'); const [permission, setPermission] = useState<PermissionState>('idle'); const [reading, setReading] = useState<Reading | null>(null); const [stable, setStable] = useState(false); const [message, setMessage] = useState('Your microphone is off.');
  const streamRef = useRef<MediaStream | null>(null); const contextRef = useRef<AudioContext | null>(null); const referenceContextRef = useRef<AudioContext | null>(null); const animationRef = useRef<number | null>(null); const historyRef = useRef<number[]>([]); const lastDetectionRef = useRef(0);

  const stopMic = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (contextRef.current) void contextRef.current.close(); contextRef.current = null; historyRef.current = []; setReading(null); setStable(false); setPermission('idle'); setMessage('Microphone stopped. Nothing was recorded or saved.');
  }, []);

  async function startMic() {
    setPermission('requesting'); setMessage('Waiting for microphone permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }); streamRef.current = stream;
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported in this browser.');
      const context = new AudioCtor(); contextRef.current = context; if (context.state === 'suspended') await context.resume(); const analyser = context.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = .2; context.createMediaStreamSource(stream).connect(analyser); const buffer = new Float32Array(analyser.fftSize);
      setPermission('active'); setMessage('Listening locally…');
      const analyze = (time: number) => {
        analyser.getFloatTimeDomainData(buffer); const frequency = detectPitch(buffer, context.sampleRate);
        if (frequency && frequency >= 55 && frequency <= 1200) {
          lastDetectionRef.current = time; const history = historyRef.current; if (history.length && Math.abs(frequency - history[history.length - 1]) / frequency > .08) history.length = 0; history.push(frequency); if (history.length > 6) history.shift();
          const smoothFrequency = history.reduce((sum, value) => sum + value, 0) / history.length; const spread = history.length > 2 ? Math.max(...history) - Math.min(...history) : Infinity; setStable(history.length >= 3 && spread / smoothFrequency < .018); setReading(describePitch(smoothFrequency)); setMessage('Microphone active. Audio stays in this browser.');
        } else if (time - lastDetectionRef.current > 700) { historyRef.current = []; setReading(null); setStable(false); }
        animationRef.current = requestAnimationFrame(analyze);
      };
      animationRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'); setPermission(denied ? 'denied' : 'error'); setMessage(denied ? 'Microphone permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The microphone could not start.');
    }
  }

  async function playReference(frequency: number, label: string) {
    try { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is unavailable.'); const context = referenceContextRef.current || new AudioCtor(); referenceContextRef.current = context; if (context.state === 'suspended') await context.resume(); const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime; oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.16, now + .03); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.2); oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + 1.25); setMessage(`Playing reference pitch ${label}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Reference pitch could not play.'); }
  }

  function reset() { stopMic(); if (referenceContextRef.current) void referenceContextRef.current.close(); referenceContextRef.current = null; setMode('Vocal'); setMessage('Reset complete. Your microphone is off.'); }
  useEffect(() => () => { if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); if (contextRef.current) void contextRef.current.close(); if (referenceContextRef.current) void referenceContextRef.current.close(); }, []);
  const feedback = tuningFeedback(reading?.cents ?? null, stable); const meter = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;

  return <ToolShell title="Smart Tuner" eyebrow="JPAC Creator Tool" description="Practice matching pitch with encouraging, browser-local microphone feedback.">
    <section className="premium-tool-panel smart-tuner">
      <section className="tuner-permission" aria-labelledby="mic-permission-title"><div><div className="eyebrow">You stay in control</div><h2 id="mic-permission-title">Microphone permission</h2><p>JPAC listens only while this page is open and you select Start Mic. Audio is analyzed on your device—it is not recorded, uploaded, or saved.</p></div><div className="premium-action-row"><button type="button" className="button button-primary" disabled={permission === 'active' || permission === 'requesting'} onClick={() => void startMic()}>{permission === 'requesting' ? 'Requesting…' : 'Start Mic'}</button><button type="button" className="button button-secondary" disabled={permission !== 'active'} onClick={stopMic}>Stop Mic</button><button type="button" className="button button-secondary" onClick={reset}>Reset</button></div></section>
      <div className={`tuner-status ${permission === 'denied' || permission === 'error' ? 'error' : ''}`} role="status">{message}</div>
      <div className="tuner-mode" role="group" aria-label="Tuner mode"><button type="button" className={mode === 'Vocal' ? 'active' : ''} aria-pressed={mode === 'Vocal'} onClick={() => setMode('Vocal')}>Vocal mode</button><button type="button" className={mode === 'Instrument' ? 'active' : ''} aria-pressed={mode === 'Instrument'} onClick={() => setMode('Instrument')}>Instrument mode</button></div>
      <section className="tuner-display" aria-live="polite"><div className="tuner-note"><small>Detected note</small><strong>{reading?.note || '—'}</strong></div><div className="tuner-reading"><span>{reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} cents` : 'Listening…'}</span><span>{reading ? `${reading.frequency.toFixed(1)} Hz` : '— Hz'}</span></div><div className="tuning-meter" aria-label={reading ? `${reading.cents} cents from center` : 'Waiting for a steady note'}><span className="meter-flat">Flat</span><div className="meter-track"><i className="meter-center" /><b style={{ left: `${50 + meter}%` }} /></div><span className="meter-sharp">Sharp</span></div><h2 className={feedback === 'Centered' ? 'centered' : ''}>{feedback}</h2></section>
      <section className="reference-pitches"><div><h2>Reference pitch player</h2><p>Listen, then match the pitch with your voice or instrument.</p></div><div>{referencePitches.map((pitch) => <button type="button" key={pitch.note} onClick={() => void playReference(pitch.frequency, pitch.note)}>{pitch.note}<small>{pitch.frequency.toFixed(2)} Hz</small></button>)}</div></section>
      <div className="premium-learning-grid"><article><h2>What tuning means</h2><p>Tuning means matching a note’s target pitch. “Sharp” is slightly too high, “flat” is slightly too low, and “centered” is close to the target. This beginner tool gives practice guidance, not professional studio measurement.</p></article><article><h2>Try this next</h2><p>{practicePrompt(reading?.cents ?? null, stable, mode)}</p></article></div>
    </section>
  </ToolShell>;
}
