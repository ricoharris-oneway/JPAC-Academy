import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
import { LocalRecordingPanel } from '../shared/LocalRecordingPanel';
import { useLocalMediaRecorder } from '../shared/useLocalMediaRecorder';
import { analyzeMotion, balanceLabel, choreoActivities, choreoGoals, choreoHelpers, movementFeedback, viewQualityLabel, type ChoreoGoal, type MotionMetrics } from './motionAnalysis';

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';
type PracticeMode = 'Warm-Up' | 'Choreography' | 'Stage Presence' | 'Freestyle';
const modes: PracticeMode[] = ['Warm-Up', 'Choreography', 'Stage Presence', 'Freestyle'];
const emptyMetrics: MotionMetrics = { energy: 0, balance: 0, brightness: 100 };
type ChoreoProject = { practice_goal: ChoreoGoal; instructor_activity: string; practice_mode: PracticeMode; motion_energy: string; movement_balance: string; view_quality: string; mirrored_view: string; calibration_status: string };
const modePrompts: Record<PracticeMode, string> = {
  'Warm-Up': 'Move smoothly through your comfortable range. Keep shoulders relaxed and never force a stretch.',
  Choreography: 'Choose an eight-count. Make the start, accents, and ending shape easy to recognize.',
  'Stage Presence': 'Practice confident focus, lifted posture, and intentional stillness between movements.',
  Freestyle: 'Explore one movement idea, repeat it, then change its level, direction, or energy.',
};

export function ChoreoMirrorTool() {
  const [cameraState, setCameraState] = useState<CameraState>('idle'); const [message, setMessage] = useState('Your camera is off.'); const [mode, setMode] = useState<PracticeMode>('Warm-Up'); const [mirrored, setMirrored] = useState(true); const [metrics, setMetrics] = useState<MotionMetrics>(emptyMetrics); const [baseline, setBaseline] = useState(0); const [calibrated, setCalibrated] = useState(false);
  const [goal, setGoal] = useState<ChoreoGoal>('Warm up movement'); const [selectedActivityId, setSelectedActivityId] = useState(choreoActivities[0].id); const [lastMetrics, setLastMetrics] = useState<MotionMetrics | null>(null); const [modeChosen, setModeChosen] = useState(false); const [cameraStarted, setCameraStarted] = useState(false); const [feedbackSeen, setFeedbackSeen] = useState(false); const [stoppedAfterPractice, setStoppedAfterPractice] = useState(false); const [saved, setSaved] = useState(false); const [sessionSeconds, setSessionSeconds] = useState(0); const [loadedSummary, setLoadedSummary] = useState<ChoreoProject | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [guidePanel,setGuidePanel]=useState<'quick'|'coach'|'privacy'|'save'|'extra'|'recording'|null>('quick');
  const videoRef = useRef<HTMLVideoElement | null>(null); const canvasRef = useRef<HTMLCanvasElement | null>(null); const streamRef = useRef<MediaStream | null>(null); const animationRef = useRef<number | null>(null); const previousFrameRef = useRef<Uint8ClampedArray | null>(null); const lastAnalysisRef = useRef(0); const latestMetricsRef = useRef(emptyMetrics); const mountedRef = useRef(true); const requestIdRef = useRef(0); const sessionStartedRef = useRef(false);
  const recording = useLocalMediaRecorder(mediaStream, 'video');

  const stopCamera = useCallback(() => {
    recording.stopRecording(); requestIdRef.current += 1; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setMediaStream(null); if (videoRef.current) videoRef.current.srcObject = null; previousFrameRef.current = null; latestMetricsRef.current = emptyMetrics; setMetrics(emptyMetrics); setCameraState('idle'); if (sessionStartedRef.current) setStoppedAfterPractice(true); setMessage('Camera stopped. Any completed recording remains only in this page session.');
  }, [recording.stopRecording]);

  async function startCamera() {
    const requestId = ++requestIdRef.current;
    setCameraState('requesting'); setMessage('Waiting for camera permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } streamRef.current = stream; setMediaStream(stream); const video = videoRef.current; const canvas = canvasRef.current; if (!video || !canvas) throw new Error('The camera preview could not be prepared.'); video.srcObject = stream; await video.play(); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); video.srcObject = null; return; }
      setCameraState('active'); setCameraStarted(true); setStoppedAfterPractice(false); setLoadedSummary(null); sessionStartedRef.current = true; setMessage('Camera active. Frames are analyzed only in this browser.'); setCalibrated(false); setBaseline(0); previousFrameRef.current = null;
      const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Motion analysis is unavailable in this browser.');
      const analyze = (time: number) => {
        if (time - lastAnalysisRef.current >= 110 && video.readyState >= 2) { lastAnalysisRef.current = time; context.drawImage(video, 0, 0, canvas.width, canvas.height); const frame = context.getImageData(0, 0, canvas.width, canvas.height); const next = analyzeMotion(frame.data, previousFrameRef.current, canvas.width, canvas.height); previousFrameRef.current = new Uint8ClampedArray(frame.data); latestMetricsRef.current = next; setMetrics(next); setLastMetrics(next); setFeedbackSeen(true); }
        animationRef.current = requestAnimationFrame(analyze);
      };
      animationRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setMediaStream(null); if (videoRef.current) videoRef.current.srcObject = null; if (!mountedRef.current || requestId !== requestIdRef.current) return; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'); setCameraState(denied ? 'denied' : 'error'); setMessage(denied ? 'Camera permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The camera could not start.');
    }
  }

  function calibrate() { if (cameraState !== 'active') { setMessage('Start the camera before calibrating.'); return; } setBaseline(Math.min(18, latestMetricsRef.current.energy)); setCalibrated(true); setMessage('Calibration complete. Begin from a comfortable ready position.'); }
  function reset() { stopCamera(); recording.clearRecording(); sessionStartedRef.current = false; setMode('Warm-Up'); setGoal('Warm up movement'); setMirrored(true); setBaseline(0); setCalibrated(false); setLastMetrics(null); setModeChosen(false); setCameraStarted(false); setFeedbackSeen(false); setStoppedAfterPractice(false); setSaved(false); setSessionSeconds(0); setLoadedSummary(null); setMessage('Reset complete. Your camera is off.'); }
  useEffect(() => { if (cameraState !== 'active') return; const sessionTimer = window.setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000); return () => window.clearInterval(sessionTimer); }, [cameraState]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; requestIdRef.current += 1; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); if (videoRef.current) videoRef.current.srcObject = null; }; }, []);
  const adjustedEnergy = Math.max(0, metrics.energy - baseline); const feedback = movementFeedback(metrics, baseline);
  const summaryEnergy = loadedSummary?.motion_energy ?? (lastMetrics ? `${Math.round(Math.max(0, lastMetrics.energy - baseline))}%` : 'Not measured');
  const summaryBalance = loadedSummary?.movement_balance ?? (lastMetrics ? balanceLabel(lastMetrics.balance) : 'Not measured');
  const summaryView = loadedSummary?.view_quality ?? (lastMetrics ? viewQualityLabel(lastMetrics.brightness) : 'Not measured');
  const selectedActivity = choreoActivities.find((activity) => activity.id === selectedActivityId) ?? choreoActivities[0];
  const snapshot = useMemo<ChoreoProject>(() => ({ practice_goal: goal, instructor_activity: selectedActivity.title, practice_mode: mode, motion_energy: summaryEnergy, movement_balance: summaryBalance, view_quality: summaryView, mirrored_view: mirrored ? 'On' : 'Off', calibration_status: calibrated ? 'Calibrated' : 'Not calibrated' }), [calibrated, goal, mirrored, mode, selectedActivity.title, summaryBalance, summaryEnergy, summaryView]);
  const extraCreditSummary = projectAsText({ title: `${goal} · ${mode}`, notes: `Coach activity: ${selectedActivity.title}. Reflection: ${selectedActivity.reflectionPrompt}`, savedAt: new Date().toISOString(), data: snapshot }, 'Choreo Mirror');
  function loadProject(project: LocalToolProject<ChoreoProject>) { const data = project.data; stopCamera(); sessionStartedRef.current = false; setGoal(data.practice_goal); setSelectedActivityId(choreoActivities.find((activity) => activity.title === data.instructor_activity)?.id ?? choreoActivities[0].id); setMode(data.practice_mode); setModeChosen(true); setMirrored(data.mirrored_view === 'On'); setCalibrated(data.calibration_status === 'Calibrated'); setLoadedSummary(data); setMessage('Local text summary loaded. Start Camera when you want new live feedback.'); }

  return <ToolShell title="Choreo Mirror" eyebrow="JPAC Performance Lab" description="Move. Mirror. Rehearse. Build stage confidence." immersive>
    <section className="premium-tool-panel choreo-mirror-tool choreo-app-shell">
      <div className="choreo-app-toolbar">
        <div className="choreo-brand-lockup"><span>CHOREO MIRROR</span><strong>{goal}</strong><small>{mode} · {cameraState==='active'?'Camera live':'Camera off'}</small></div>
        <div className="choreo-toolbar-actions">
          <button type="button" className="choreo-main-control" disabled={cameraState==='active'||cameraState==='requesting'} onClick={()=>void startCamera()}>{cameraState==='requesting'?'Starting…':'▶ Start Camera'}</button>
          <button type="button" className="choreo-stop-control" disabled={cameraState!=='active'} onClick={stopCamera}>■ Stop</button>
          <button type="button" className={recording.status==='recording'?'choreo-record-control active':'choreo-record-control'} disabled={cameraState!=='active'||recording.status==='recording'} onClick={recording.startRecording}>● Record</button>
          <button type="button" className="choreo-stop-control" disabled={recording.status!=='recording'} onClick={recording.stopRecording}>Stop Take</button>
        </div>
      </div>

      <div className="choreo-mode-rail" aria-label="Choose practice goal">
        {choreoGoals.map((item)=><button type="button" key={item} className={goal===item?'active':''} aria-pressed={goal===item} onClick={()=>setGoal(item)}>{item}</button>)}
      </div>

      <section className="choreo-stage" aria-label="Choreography mirror workspace">
        <article className="choreo-stage-pane reference">
          <div className="choreo-pane-label"><span>REFERENCE</span><strong>{selectedActivity.title}</strong></div>
          <div className="choreo-reference-visual">
            <div className="choreo-reference-orbit" aria-hidden="true"><i/><i/><i/></div>
            <span className="choreo-reference-icon" aria-hidden="true">✦</span>
            <strong>Reference Stage</strong>
            <small>Teacher routine or choreography video can live here.</small>
            <button type="button" className="choreo-overlay-action" onClick={()=>setGuidePanel('coach')}>Open Coach Cue</button>
          </div>
        </article>

        <article className="choreo-stage-pane tracking">
          <div className="choreo-pane-label"><span>YOU</span><strong>{cameraState==='active'?'Live Mirror':'Ready when you are'}</strong></div>
          <div className={`choreo-video-shell choreo-app-video ${mirrored?'mirrored':''}`}>
            <video ref={videoRef} playsInline muted aria-label="Local live camera preview"/>
            <div className="choreo-camera-placeholder" hidden={cameraState==='active'}>
              <span aria-hidden="true">🕺</span><strong>Step into frame</strong><small>Start the camera when you are ready to move.</small>
            </div>
            <span className="choreo-local-badge">LOCAL ONLY · {recording.status==='recording'?'REC':'PRIVATE'}</span>
            <div className="choreo-live-overlay" hidden={cameraState!=='active'}>
              <span><small>ENERGY</small><strong>{Math.round(adjustedEnergy)}%</strong></span>
              <span><small>BALANCE</small><strong>{balanceLabel(metrics.balance)}</strong></span>
              <span><small>VIEW</small><strong>{metrics.brightness<42?'Add light':'Clear'}</strong></span>
            </div>
          </div>
        </article>
        <canvas ref={canvasRef} width="160" height="120" hidden aria-hidden="true"/>
      </section>

      <div className="choreo-control-deck">
        <div className="choreo-mode-picker">
          {modes.map(item=><button type="button" key={item} className={mode===item?'active':''} onClick={()=>{setMode(item);setModeChosen(true)}}>{item}</button>)}
        </div>
        <div className="choreo-deck-actions">
          <button type="button" className={mirrored?'active':''} onClick={()=>setMirrored(value=>!value)}>⇄ Mirror {mirrored?'On':'Off'}</button>
          <button type="button" disabled={cameraState!=='active'} onClick={calibrate}>{calibrated?'✓ Calibrated':'◎ Calibrate'}</button>
          <button type="button" onClick={()=>setGuidePanel('recording')}>▣ Takes</button>
          <button type="button" onClick={reset}>↻ Reset</button>
        </div>
      </div>

      <div className={`choreo-status-toast ${cameraState==='denied'||cameraState==='error'?'error':''}`} role="status">{message}</div>

      <div className="choreo-mini-feedback">
        <article><span>MOVE</span><strong>{cameraState==='active'?feedback:'Start camera to activate movement feedback.'}</strong></article>
        <article><span>FOCUS</span><strong>{modePrompts[mode]}</strong></article>
      </div>

      <div className="choreo-guide-dock" aria-label="Choreo Mirror guide">
        <button type="button" onClick={()=>setGuidePanel('quick')}><span>?</span><strong>Guide</strong></button>
        <button type="button" onClick={()=>setGuidePanel('coach')}><span>✦</span><strong>Coach</strong></button>
        <button type="button" onClick={()=>setGuidePanel('privacy')}><span>◉</span><strong>Privacy</strong></button>
        <button type="button" onClick={()=>setGuidePanel('save')}><span>◇</span><strong>Save</strong></button>
        <button type="button" onClick={()=>setGuidePanel('extra')}><span>★</span><strong>Extra</strong></button>
      </div>

      {guidePanel&&<div className="choreo-guide-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setGuidePanel(null)}}>
        <aside className="choreo-guide-panel" role="dialog" aria-modal="true" aria-label="Choreo Mirror guidance">
          <button type="button" className="choreo-guide-close" aria-label="Close guide" onClick={()=>setGuidePanel(null)}>×</button>
          {guidePanel==='quick'&&<div className="choreo-guide-content">
            <span className="premium-kicker">Quick Start</span><h2>Move first. Read only when you need it.</h2>
            <div className="choreo-guide-steps">
              <button type="button" onClick={()=>{setModeChosen(true);setGuidePanel(null)}}><b>1</b><span><strong>Pick a practice mode</strong><small>Warm-Up, Choreography, Stage Presence, or Freestyle.</small></span></button>
              <button type="button" onClick={()=>{setGuidePanel(null);void startCamera()}}><b>2</b><span><strong>Start your camera</strong><small>Your live mirror stays in this browser.</small></span></button>
              <button type="button" onClick={()=>setGuidePanel('coach')}><b>3</b><span><strong>Follow one coach cue</strong><small>Use a single focus instead of reading a full lesson.</small></span></button>
              <button type="button" onClick={()=>setGuidePanel('save')}><b>4</b><span><strong>Save your reflection</strong><small>Keep a local note or prepare a teacher-reviewed snapshot.</small></span></button>
            </div>
          </div>}
          {guidePanel==='coach'&&<div className="choreo-guide-content"><InstructorActivityPanel activities={choreoActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId}/></div>}
          {guidePanel==='privacy'&&<div className="choreo-guide-content"><span className="premium-kicker">Camera Privacy</span><h2>You control the camera.</h2><div className="choreo-guide-cards"><article><strong>Local analysis</strong><p>Camera frames and motion calculations stay in this browser.</p></article><article><strong>No microphone</strong><p>Choreo Mirror does not request microphone access.</p></article><article><strong>Recording is optional</strong><p>Recording begins only when you press Record and remains local unless you download it.</p></article><article><strong>No automatic grading</strong><p>Movement feedback is practice guidance, not a medical or dance assessment.</p></article></div></div>}
          {guidePanel==='recording'&&<div className="choreo-guide-content"><LocalRecordingPanel kind="video" status={recording.status} recordingUrl={recording.recordingUrl} error={recording.error} disabled={cameraState!=='active'} filename="jpac-choreo-mirror-practice.webm" onRecord={recording.startRecording} onStop={recording.stopRecording} onClear={recording.clearRecording}/></div>}
          {guidePanel==='save'&&<div className="choreo-guide-content"><LocalProjectPanel toolType="choreo-mirror" toolLabel="Choreo Mirror" snapshot={snapshot} onLoad={loadProject} onSaved={()=>setSaved(true)}/></div>}
          {guidePanel==='extra'&&<div className="choreo-guide-content"><ExtraCreditPanel summary={extraCreditSummary}/></div>}
        </aside>
      </div>}
    </section>
  </ToolShell>;
}
