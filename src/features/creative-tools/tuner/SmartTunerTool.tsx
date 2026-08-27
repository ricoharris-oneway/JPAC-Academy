import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import {
  describePitch,
  detectPitch,
  practicePrompt,
  referencePitches,
  tunerActivities,
  tunerGoals,
  tunerHelpers,
  tuningFeedback,
  type TunerGoal,
} from './pitchDetection';

type PermissionState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';
type SignalStatus = 'off' | 'listening' | 'quiet' | 'unclear' | 'detected';
type Reading = { note: string; cents: number; frequency: number };
type TunerProject = { practice_goal: TunerGoal; instructor_activity: string; mode: 'Vocal' | 'Instrument'; detected_note: string; frequency_hz: string; cents_sharp_flat: string; reference_note_used: string; best_centered_note: string };

export function SmartTunerTool() {
  const [mode, setMode] = useState<'Vocal' | 'Instrument'>('Vocal'); const [permission, setPermission] = useState<PermissionState>('idle'); const [reading, setReading] = useState<Reading | null>(null); const [stable, setStable] = useState(false); const [message, setMessage] = useState('Your microphone is off.'); const [signalStatus,setSignalStatus]=useState<SignalStatus>('off'); const[inputLevel,setInputLevel]=useState(0);const[confidence,setConfidence]=useState(0);
  const [goal, setGoal] = useState<TunerGoal>('Match pitch'); const [selectedActivityId, setSelectedActivityId] = useState(tunerActivities[0].id); const [lastReading, setLastReading] = useState<Reading | null>(null); const [referenceNote, setReferenceNote] = useState('None yet'); const [bestCenteredNote, setBestCenteredNote] = useState('None yet'); const [modeChosen, setModeChosen] = useState(false); const [micStarted, setMicStarted] = useState(false); const [noteObserved, setNoteObserved] = useState(false); const [feedbackObserved, setFeedbackObserved] = useState(false); const [stoppedAfterPractice, setStoppedAfterPractice] = useState(false); const [saved, setSaved] = useState(false);
  const streamRef = useRef<MediaStream | null>(null); const contextRef = useRef<AudioContext | null>(null); const referenceContextRef = useRef<AudioContext | null>(null); const animationRef = useRef<number | null>(null); const historyRef = useRef<number[]>([]); const lastDetectionRef = useRef(0); const lastUiUpdateRef=useRef(0);const modeRef=useRef(mode); const mountedRef = useRef(true); const requestIdRef = useRef(0); const sessionStartedRef = useRef(false);

  const stopMic = useCallback(() => {
    requestIdRef.current += 1;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (contextRef.current) void contextRef.current.close(); contextRef.current = null; historyRef.current = [];lastDetectionRef.current=0;lastUiUpdateRef.current=0; setReading(null); setStable(false);setInputLevel(0);setConfidence(0);setSignalStatus('off'); setPermission('idle'); if (sessionStartedRef.current) setStoppedAfterPractice(true); setMessage('Microphone stopped. Nothing was recorded or saved.');
  }, []);

  async function startMic() {
    const requestId = ++requestIdRef.current;
    setPermission('requesting');setSignalStatus('listening');setInputLevel(0);setConfidence(0); setMessage('Waiting for microphone permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } streamRef.current = stream;
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is not supported in this browser.');
      const context = new AudioCtor(); contextRef.current = context; if (context.state === 'suspended') await context.resume(); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); void context.close(); return; } const analyser = context.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = .2; context.createMediaStreamSource(stream).connect(analyser); const buffer = new Float32Array(analyser.fftSize);
      historyRef.current=[];lastDetectionRef.current=performance.now();lastUiUpdateRef.current=0;setPermission('active');setSignalStatus('listening'); setMicStarted(true); setStoppedAfterPractice(false); sessionStartedRef.current = true; setMessage('Microphone active. Audio stays in this browser.');
      const analyze = (time: number) => {
        if(time-lastUiUpdateRef.current<80){animationRef.current=requestAnimationFrame(analyze);return}lastUiUpdateRef.current=time;
        analyser.getFloatTimeDomainData(buffer);const activeMode=modeRef.current;const result=detectPitch(buffer,context.sampleRate,activeMode==='Vocal'?{minimumFrequency:70,maximumFrequency:1100}:{minimumFrequency:40,maximumFrequency:1400});setInputLevel(result.inputLevel);setConfidence(result.confidence);
        if (result.frequency) {
          lastDetectionRef.current = time; const history = historyRef.current;let candidate=result.frequency;const previous=history.at(-1);if(previous){const ratio=candidate/previous;if(ratio>1.85&&ratio<2.15)candidate/=2;else if(ratio>.46&&ratio<.54)candidate*=2;if(Math.abs(12*Math.log2(candidate/previous))>1.5)history.length=0}history.push(candidate);if(history.length>7)history.shift();
          const ordered=[...history].sort((a,b)=>a-b);const smoothFrequency=ordered[Math.floor(ordered.length/2)]; const spread = history.length > 2 ? Math.max(...history) - Math.min(...history) : Infinity; const isStable = history.length >= 3 && spread / smoothFrequency < .014; const nextReading = describePitch(smoothFrequency);setSignalStatus('detected');setStable(isStable); setReading(nextReading); setLastReading(nextReading); setNoteObserved(true); setFeedbackObserved(true); if (isStable && Math.abs(nextReading.cents) <= 5) setBestCenteredNote(`${nextReading.note} (${nextReading.cents > 0 ? '+' : ''}${nextReading.cents} cents)`)
        } else {setSignalStatus(result.inputLevel<.008?'quiet':'unclear');if(time-lastDetectionRef.current>500)setStable(false);if(time-lastDetectionRef.current>1400){historyRef.current=[];setReading(null)}}
        animationRef.current = requestAnimationFrame(analyze);
      };
      animationRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;if(contextRef.current)void contextRef.current.close();contextRef.current=null; if (!mountedRef.current || requestId !== requestIdRef.current) return; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');setSignalStatus('off'); setPermission(denied ? 'denied' : 'error'); setMessage(denied ? 'Microphone permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The microphone could not start.');
    }
  }

  async function playReference(frequency: number, label: string) {
    try { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is unavailable.'); const context = referenceContextRef.current || new AudioCtor(); referenceContextRef.current = context; if (context.state === 'suspended') await context.resume(); const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime; oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.16, now + .03); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.2); oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + 1.25); setReferenceNote(label); setMessage(`Playing reference pitch ${label}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Reference pitch could not play.'); }
  }

  function reset() { stopMic(); if (referenceContextRef.current) void referenceContextRef.current.close(); referenceContextRef.current = null; sessionStartedRef.current = false; setMode('Vocal'); setGoal('Match pitch'); setLastReading(null); setReferenceNote('None yet'); setBestCenteredNote('None yet'); setModeChosen(false); setMicStarted(false); setNoteObserved(false); setFeedbackObserved(false); setStoppedAfterPractice(false); setSaved(false); setMessage('Reset complete. Your microphone is off.'); }
  useEffect(()=>{modeRef.current=mode},[mode]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestIdRef.current += 1; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); if (contextRef.current) void contextRef.current.close(); if (referenceContextRef.current) void referenceContextRef.current.close(); }; }, []);
  const feedback = tuningFeedback(reading?.cents ?? null, stable); const meter = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;const tuningState=reading?Math.abs(reading.cents)<=5?'In tune':reading.cents<0?'Flat':'Sharp':'Waiting';const signalLabel:Record<SignalStatus,string>={off:'Microphone off',listening:'Listening',quiet:'Signal too quiet',unclear:'Pitch unclear',detected:'Detected note'};const inputPercent=Math.min(100,Math.round(inputLevel*500));
  const selectedActivity = tunerActivities.find((activity) => activity.id === selectedActivityId) ?? tunerActivities[0];
  const snapshot = useMemo<TunerProject>(() => ({ practice_goal: goal, instructor_activity: selectedActivity.title, mode, detected_note: lastReading?.note ?? 'No note detected', frequency_hz: lastReading ? lastReading.frequency.toFixed(1) : 'Not available', cents_sharp_flat: lastReading ? `${lastReading.cents > 0 ? '+' : ''}${lastReading.cents}` : 'Not available', reference_note_used: referenceNote, best_centered_note: bestCenteredNote }), [bestCenteredNote, goal, lastReading, mode, referenceNote, selectedActivity.title]);
  const extraCreditSummary = projectAsText({ title: `${goal} · ${mode}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Smart Tuner');
  function loadProject(project: LocalToolProject<TunerProject>) { const data = project.data; stopMic(); sessionStartedRef.current = false; setGoal(data.practice_goal); setSelectedActivityId(tunerActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? tunerActivities[0].id); setMode(data.mode); setModeChosen(true); setReferenceNote(data.reference_note_used); setBestCenteredNote(data.best_centered_note); const frequency = Number(data.frequency_hz); const cents = Number(data.cents_sharp_flat); setLastReading(Number.isFinite(frequency) && Number.isFinite(cents) ? { note: data.detected_note, frequency, cents } : null); setMessage('Local text summary loaded. Start Mic when you want new live feedback.'); }

  return <ToolShell title="Smart Tuner" eyebrow="JPAC Creator Tool" description="Practice matching pitch with encouraging, browser-local microphone feedback.">
    <section className="premium-tool-panel smart-tuner performance-coach-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Pitch coach</span><h2>Choose your practice goal</h2><p>Listen, match, adjust, and save text-only practice notes on this device.</p></div><div className="practice-goal-grid">{tunerGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{goal}</h2></div><strong>{[modeChosen, micStarted, noteObserved, feedbackObserved, stoppedAfterPractice && saved].filter(Boolean).length}/5 steps</strong></header><ol>{['Choose vocal or instrument mode', 'Start microphone', 'Sing or play one note', 'Watch sharp/flat feedback', 'Stop microphone and save locally'].map((step, index) => <li key={step} className={[modeChosen, micStarted, noteObserved, feedbackObserved, stoppedAfterPractice && saved][index] ? 'complete' : ''}><span>{index + 1}</span>{step}</li>)}</ol></section>
      <InstructorActivityPanel activities={tunerActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
      <div className="instrument-session-strip tuner-session-strip" aria-label="Pitch practice statistics"><div><small>Practice goal</small><strong>{goal}</strong></div><div><small>Detected note</small><strong>{lastReading?.note ?? '—'}</strong></div><div><small>Frequency</small><strong>{lastReading ? `${lastReading.frequency.toFixed(1)} Hz` : '—'}</strong></div><div><small>Cents</small><strong>{lastReading ? `${lastReading.cents > 0 ? '+' : ''}${lastReading.cents}` : '—'}</strong></div><div><small>Mode</small><strong>{mode}</strong></div><div><small>Reference</small><strong>{referenceNote}</strong></div><div><small>Best centered</small><strong>{bestCenteredNote}</strong></div></div>
      <section className="tuner-permission" aria-labelledby="mic-permission-title"><div><div className="eyebrow">You stay in control</div><h2 id="mic-permission-title">Microphone permission</h2><p>JPAC listens only while this page is open and you select Start Mic. Audio is analyzed on your device—it is not recorded, uploaded, or saved.</p></div><div className="premium-action-row"><button type="button" className="button button-primary" disabled={permission === 'active' || permission === 'requesting'} onClick={() => void startMic()}>{permission === 'requesting' ? 'Requesting…' : 'Start Mic'}</button><button type="button" className="button button-secondary" disabled={permission !== 'active'} onClick={stopMic}>Stop Mic</button><button type="button" className="button button-secondary" onClick={reset}>Reset</button></div></section>
      <div className={`tuner-status ${permission === 'denied' || permission === 'error' ? 'error' : ''}`} role="status">{message}</div>
      <div className="tuner-mode" role="group" aria-label="Tuner mode"><button type="button" className={mode === 'Vocal' ? 'active' : ''} aria-pressed={mode === 'Vocal'} onClick={() => { setMode('Vocal'); setModeChosen(true); }}>Vocal mode</button><button type="button" className={mode === 'Instrument' ? 'active' : ''} aria-pressed={mode === 'Instrument'} onClick={() => { setMode('Instrument'); setModeChosen(true); }}>Instrument mode</button></div>
      <section className="tuner-display" aria-live="polite">
        <div className={`tuner-input-status tuner-input-status-${signalStatus}`}>
          <div><small>Live input</small><strong>{signalLabel[signalStatus]}</strong></div>
          <div className="tuner-input-meter" role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={inputPercent}><i style={{ width: `${inputPercent}%` }} /></div>
          <small>{signalStatus === 'detected' ? `${Math.round(confidence * 100)}% pitch confidence` : signalStatus === 'quiet' ? 'Move closer or make a stronger steady sound.' : signalStatus === 'unclear' ? 'Hold one clear note and reduce background noise.' : permission === 'active' ? 'Make one steady note when you are ready.' : 'Select Start Mic to begin local analysis.'}</small>
        </div>
        <div className="tuner-note"><small>{reading && signalStatus !== 'detected' ? 'Last detected note' : 'Detected note'}</small><strong>{reading?.note || '—'}</strong></div>
        <div className="tuner-reading"><span>{reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} cents` : signalLabel[signalStatus]}</span><span>{reading && signalStatus === 'detected' ? `${reading.frequency.toFixed(1)} Hz` : '— Hz'}</span></div>
        <div className="tuning-meter" aria-label={reading ? `${reading.cents} cents from center, ${tuningState}` : 'Waiting for a steady note'}><span className="meter-flat">Flat</span><div className="meter-track"><i className="meter-center" /><b style={{ left: `${50 + meter}%` }} /></div><span className="meter-sharp">Sharp</span></div>
        <div className="tuner-state-row" aria-label="Tuning state"><span className={tuningState === 'Flat' ? 'active' : ''}>Flat</span><span className={tuningState === 'In tune' ? 'active centered' : ''}>In tune</span><span className={tuningState === 'Sharp' ? 'active' : ''}>Sharp</span></div>
        <h2 className={tuningState === 'In tune' ? 'centered' : ''}>{reading ? feedback : signalLabel[signalStatus]}</h2>
      </section>
      <section className="reference-pitches"><div><h2>Reference pitch player</h2><p>Listen, then match the pitch with your voice or instrument.</p></div><div>{referencePitches.map((pitch) => <button type="button" key={pitch.note} onClick={() => void playReference(pitch.frequency, pitch.note)}>{pitch.note}<small>{pitch.frequency.toFixed(2)} Hz</small></button>)}</div></section>
      <div className="premium-learning-grid"><article><h2>What tuning means</h2><p>Tuning means matching a note’s target pitch. “Sharp” is slightly too high, “flat” is slightly too low, and “centered” is close to the target. This beginner tool gives practice guidance, not professional studio measurement.</p></article><article><h2>Try this next</h2><p>{practicePrompt(reading?.cents ?? null, stable, mode)}</p></article></div>
      <div className="beginner-helper-grid">{tunerHelpers.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}</div>
      <LocalProjectPanel toolType="smart-tuner" toolLabel="Smart Tuner" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={extraCreditSummary} />
    </section>
  </ToolShell>;
}
