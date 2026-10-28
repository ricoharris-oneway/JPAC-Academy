import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import { LocalRecordingPanel } from '../shared/LocalRecordingPanel';
import { useLocalMediaRecorder } from '../shared/useLocalMediaRecorder';
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
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [guidePanel,setGuidePanel]=useState<'quick'|'coach'|'privacy'|'recording'|'save'|'extra'|null>('quick');
  const streamRef = useRef<MediaStream | null>(null); const contextRef = useRef<AudioContext | null>(null); const referenceContextRef = useRef<AudioContext | null>(null); const animationRef = useRef<number | null>(null); const historyRef = useRef<number[]>([]); const lastDetectionRef = useRef(0); const lastUiUpdateRef=useRef(0);const modeRef=useRef(mode); const mountedRef = useRef(true); const requestIdRef = useRef(0); const sessionStartedRef = useRef(false);
  const recording = useLocalMediaRecorder(mediaStream, 'audio');

  const stopMic = useCallback(() => {
    recording.stopRecording();
    requestIdRef.current += 1;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setMediaStream(null);
    if (contextRef.current) void contextRef.current.close(); contextRef.current = null; historyRef.current = [];lastDetectionRef.current=0;lastUiUpdateRef.current=0; setReading(null); setStable(false);setInputLevel(0);setConfidence(0);setSignalStatus('off'); setPermission('idle'); if (sessionStartedRef.current) setStoppedAfterPractice(true); setMessage('Microphone stopped. Any completed recording remains only in this page session.');
  }, [recording.stopRecording]);

  async function startMic() {
    const requestId = ++requestIdRef.current;
    setPermission('requesting');setSignalStatus('listening');setInputLevel(0);setConfidence(0); setMessage('Waiting for microphone permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } streamRef.current = stream; setMediaStream(stream);
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
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;setMediaStream(null);if(contextRef.current)void contextRef.current.close();contextRef.current=null; if (!mountedRef.current || requestId !== requestIdRef.current) return; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');setSignalStatus('off'); setPermission(denied ? 'denied' : 'error'); setMessage(denied ? 'Microphone permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The microphone could not start.');
    }
  }

  async function playReference(frequency: number, label: string) {
    try { const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) throw new Error('Web Audio is unavailable.'); const context = referenceContextRef.current || new AudioCtor(); referenceContextRef.current = context; if (context.state === 'suspended') await context.resume(); const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime; oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.16, now + .03); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.2); oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + 1.25); setReferenceNote(label); setMessage(`Playing reference pitch ${label}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Reference pitch could not play.'); }
  }

  function reset() { stopMic(); recording.clearRecording(); if (referenceContextRef.current) void referenceContextRef.current.close(); referenceContextRef.current = null; sessionStartedRef.current = false; setMode('Vocal'); setGoal('Match pitch'); setLastReading(null); setReferenceNote('None yet'); setBestCenteredNote('None yet'); setModeChosen(false); setMicStarted(false); setNoteObserved(false); setFeedbackObserved(false); setStoppedAfterPractice(false); setSaved(false); setMessage('Reset complete. Your microphone is off.'); }
  useEffect(()=>{modeRef.current=mode},[mode]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestIdRef.current += 1; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); if (contextRef.current) void contextRef.current.close(); if (referenceContextRef.current) void referenceContextRef.current.close(); }; }, []);
  const feedback = tuningFeedback(reading?.cents ?? null, stable); const meter = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;const tuningState=reading?Math.abs(reading.cents)<=5?'In tune':reading.cents<0?'Flat':'Sharp':'Waiting';const signalLabel:Record<SignalStatus,string>={off:'Microphone off',listening:'Listening',quiet:'Signal too quiet',unclear:'Pitch unclear',detected:'Detected note'};const inputPercent=Math.min(100,Math.round(inputLevel*500));
  const selectedActivity = tunerActivities.find((activity) => activity.id === selectedActivityId) ?? tunerActivities[0];
  const snapshot = useMemo<TunerProject>(() => ({ practice_goal: goal, instructor_activity: selectedActivity.title, mode, detected_note: lastReading?.note ?? 'No note detected', frequency_hz: lastReading ? lastReading.frequency.toFixed(1) : 'Not available', cents_sharp_flat: lastReading ? `${lastReading.cents > 0 ? '+' : ''}${lastReading.cents}` : 'Not available', reference_note_used: referenceNote, best_centered_note: bestCenteredNote }), [bestCenteredNote, goal, lastReading, mode, referenceNote, selectedActivity.title]);
  const extraCreditSummary = projectAsText({ title: `${goal} · ${mode}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Smart Tuner');
  function loadProject(project: LocalToolProject<TunerProject>) { const data = project.data; stopMic(); sessionStartedRef.current = false; setGoal(data.practice_goal); setSelectedActivityId(tunerActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? tunerActivities[0].id); setMode(data.mode); setModeChosen(true); setReferenceNote(data.reference_note_used); setBestCenteredNote(data.best_centered_note); const frequency = Number(data.frequency_hz); const cents = Number(data.cents_sharp_flat); setLastReading(Number.isFinite(frequency) && Number.isFinite(cents) ? { note: data.detected_note, frequency, cents } : null); setMessage('Local text summary loaded. Start Mic when you want new live feedback.'); }

  return <ToolShell title="Smart Tuner" eyebrow="JPAC Performance Lab" description="Hear it. Center it. Lock the pitch." immersive>
    <section className="premium-tool-panel smart-tuner tuner-app-shell">
      <div className="tuner-app-toolbar">
        <div className="tuner-brand-lockup"><span>SMART TUNER</span><strong>{goal}</strong><small>{mode} mode · {permission==='active'?'Listening live':'Mic off'}</small></div>
        <div className="tuner-toolbar-actions">
          <button type="button" className="tuner-start-primary" disabled={permission==='active'||permission==='requesting'} onClick={()=>void startMic()}>{permission==='requesting'?'Starting…':'● Start Mic'}</button>
          <button type="button" disabled={permission!=='active'} onClick={stopMic}>■ Stop</button>
          <button type="button" className={recording.status==='recording'?'tuner-record active':'tuner-record'} disabled={permission!=='active'||recording.status==='recording'} onClick={recording.startRecording}>● Record</button>
          <button type="button" disabled={recording.status!=='recording'} onClick={recording.stopRecording}>Stop Take</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="tuner-mode-switch" role="group" aria-label="Tuner mode">
        <button type="button" className={mode==='Vocal'?'active':''} onClick={()=>{setMode('Vocal');setModeChosen(true)}}>VOCAL</button>
        <button type="button" className={mode==='Instrument'?'active':''} onClick={()=>{setMode('Instrument');setModeChosen(true)}}>INSTRUMENT</button>
      </div>

      <section className="tuner-visual-stage" aria-live="polite">
        <div className="tuner-note-neighbors" aria-hidden="true"><span>{reading?.note?reading.note.replace(/[0-9]/g,''):''}</span></div>
        <div className={`tuner-note-hero ${tuningState==='In tune'?'centered':''}`}>
          <span>{signalStatus==='detected'?'DETECTED NOTE':signalLabel[signalStatus]}</span>
          <strong>{reading?.note||'—'}</strong>
          <small>{reading?reading.frequency.toFixed(1)+' Hz':'Waiting for pitch'}</small>
        </div>

        <div className={`tuner-dial ${tuningState==='In tune'?'centered':''}`} role="meter" aria-valuemin={-50} aria-valuemax={50} aria-valuenow={reading?meter:0} aria-label={reading?`${reading.cents} cents from center`:'Waiting for pitch'}>
          <div className="tuner-dial-scale">
            {[-50,-40,-30,-20,-10,0,10,20,30,40,50].map(value=><span key={value} style={{'--tick':String(value)} as any}>{Math.abs(value)}</span>)}
          </div>
          <div className="tuner-dial-needle" style={{transform:`translateX(-50%) rotate(${meter*.9}deg)`}}><i/></div>
          <div className="tuner-dial-center"/>
          <div className="tuner-dial-readout">
            <strong>{reading?`${reading.cents>0?'+':''}${reading.cents}`:'—'}</strong>
            <small>CENTS</small>
          </div>
          <span className="tuner-flat-label">FLAT</span>
          <span className="tuner-sharp-label">SHARP</span>
        </div>

        <div className="tuner-live-message">
          <strong>{reading?feedback:signalLabel[signalStatus]}</strong>
          <small>{signalStatus==='detected'?Math.round(confidence*100)+'% pitch confidence':permission==='active'?'Hold one clear steady note.':'Start the mic when you are ready.'}</small>
        </div>

        <div className="tuner-reference-row" aria-label="Reference pitch player">
          {referencePitches.slice(0,8).map(pitch=><button type="button" key={pitch.note} className={referenceNote===pitch.note?'active':''} onClick={()=>void playReference(pitch.frequency,pitch.note)}><strong>{pitch.note}</strong><small>{pitch.frequency.toFixed(0)} Hz</small></button>)}
        </div>
      </section>

      <div className="tuner-goal-rail" aria-label="Choose practice goal">
        {tunerGoals.map(item=><button type="button" key={item} className={goal===item?'active':''} onClick={()=>setGoal(item)}>{item}</button>)}
      </div>

      <div className="tuner-status-toast" role="status">{message}</div>

      <div className="creator-guide-dock tuner-guide-dock" aria-label="Smart Tuner guide">
        <button type="button" onClick={()=>setGuidePanel('quick')}><span>?</span><strong>Guide</strong></button>
        <button type="button" onClick={()=>setGuidePanel('coach')}><span>✦</span><strong>Coach</strong></button>
        <button type="button" onClick={()=>setGuidePanel('privacy')}><span>◉</span><strong>Privacy</strong></button>
        <button type="button" onClick={()=>setGuidePanel('recording')}><span>▣</span><strong>Takes</strong></button>
        <button type="button" onClick={()=>setGuidePanel('save')}><span>◇</span><strong>Save</strong></button>
        <button type="button" onClick={()=>setGuidePanel('extra')}><span>★</span><strong>Extra</strong></button>
      </div>

      {guidePanel&&<div className="creator-guide-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setGuidePanel(null)}}>
        <aside className="creator-guide-panel" role="dialog" aria-modal="true" aria-label="Smart Tuner guidance">
          <button type="button" className="creator-guide-close" aria-label="Close guide" onClick={()=>setGuidePanel(null)}>×</button>
          {guidePanel==='quick'&&<div className="creator-guide-content"><span className="premium-kicker">Quick Start</span><h2>Listen. Match. Center.</h2><div className="creator-guide-steps">
            <button type="button" onClick={()=>setGuidePanel(null)}><b>1</b><span><strong>Choose Vocal or Instrument</strong><small>Use the same visual tuner for either source.</small></span></button>
            <button type="button" onClick={()=>{setGuidePanel(null);void startMic()}}><b>2</b><span><strong>Start the mic</strong><small>Pitch analysis stays in your browser.</small></span></button>
            <button type="button" onClick={()=>setGuidePanel(null)}><b>3</b><span><strong>Hold one clear note</strong><small>Watch the needle move toward center.</small></span></button>
            <button type="button" onClick={()=>setGuidePanel('save')}><b>4</b><span><strong>Capture your progress</strong><small>Save a local practice summary when you finish.</small></span></button>
          </div></div>}
          {guidePanel==='coach'&&<div className="creator-guide-content"><InstructorActivityPanel activities={tunerActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId}/></div>}
          {guidePanel==='privacy'&&<div className="creator-guide-content"><span className="premium-kicker">Microphone Privacy</span><h2>You control the mic.</h2><div className="creator-guide-cards"><article><strong>Local pitch analysis</strong><p>Microphone input is analyzed in your browser while the tuner is open.</p></article><article><strong>Recording is separate</strong><p>Practice recording begins only when you press Record.</p></article><article><strong>No automatic upload</strong><p>Your practice audio is not uploaded automatically.</p></article><article><strong>Practice guidance</strong><p>This tool supports pitch practice and is not a clinical or professional measurement device.</p></article></div></div>}
          {guidePanel==='recording'&&<div className="creator-guide-content"><LocalRecordingPanel kind="audio" status={recording.status} recordingUrl={recording.recordingUrl} error={recording.error} disabled={permission!=='active'} filename="jpac-smart-tuner-practice.webm" onRecord={recording.startRecording} onStop={recording.stopRecording} onClear={recording.clearRecording}/></div>}
          {guidePanel==='save'&&<div className="creator-guide-content"><LocalProjectPanel toolType="smart-tuner" toolLabel="Smart Tuner" snapshot={snapshot} onLoad={loadProject} onSaved={()=>setSaved(true)}/></div>}
          {guidePanel==='extra'&&<div className="creator-guide-content"><ExtraCreditPanel summary={extraCreditSummary}/></div>}
        </aside>
      </div>}
    </section>
  </ToolShell>;
}
