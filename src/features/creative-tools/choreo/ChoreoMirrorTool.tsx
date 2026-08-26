import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExtraCreditPanel } from '../shared/ExtraCreditPanel';
import { InstructorActivityPanel } from '../shared/InstructorActivityPanel';
import { LocalProjectPanel } from '../shared/LocalProjectPanel';
import { projectAsText, type LocalToolProject } from '../shared/projectStorage';
import { ToolShell } from '../shared/ToolShell';
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
  const videoRef = useRef<HTMLVideoElement | null>(null); const canvasRef = useRef<HTMLCanvasElement | null>(null); const streamRef = useRef<MediaStream | null>(null); const animationRef = useRef<number | null>(null); const previousFrameRef = useRef<Uint8ClampedArray | null>(null); const lastAnalysisRef = useRef(0); const latestMetricsRef = useRef(emptyMetrics); const mountedRef = useRef(true); const requestIdRef = useRef(0); const sessionStartedRef = useRef(false);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; previousFrameRef.current = null; latestMetricsRef.current = emptyMetrics; setMetrics(emptyMetrics); setCameraState('idle'); if (sessionStartedRef.current) setStoppedAfterPractice(true); setMessage('Camera stopped. No video was recorded or saved.');
  }, []);

  async function startCamera() {
    const requestId = ++requestIdRef.current;
    setCameraState('requesting'); setMessage('Waiting for camera permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } streamRef.current = stream; const video = videoRef.current; const canvas = canvasRef.current; if (!video || !canvas) throw new Error('The camera preview could not be prepared.'); video.srcObject = stream; await video.play(); if (!mountedRef.current || requestId !== requestIdRef.current) { stream.getTracks().forEach((track) => track.stop()); video.srcObject = null; return; }
      setCameraState('active'); setCameraStarted(true); setStoppedAfterPractice(false); setLoadedSummary(null); sessionStartedRef.current = true; setMessage('Camera active. Frames are analyzed only in this browser.'); setCalibrated(false); setBaseline(0); previousFrameRef.current = null;
      const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Motion analysis is unavailable in this browser.');
      const analyze = (time: number) => {
        if (time - lastAnalysisRef.current >= 110 && video.readyState >= 2) { lastAnalysisRef.current = time; context.drawImage(video, 0, 0, canvas.width, canvas.height); const frame = context.getImageData(0, 0, canvas.width, canvas.height); const next = analyzeMotion(frame.data, previousFrameRef.current, canvas.width, canvas.height); previousFrameRef.current = new Uint8ClampedArray(frame.data); latestMetricsRef.current = next; setMetrics(next); setLastMetrics(next); setFeedbackSeen(true); }
        animationRef.current = requestAnimationFrame(analyze);
      };
      animationRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; if (!mountedRef.current || requestId !== requestIdRef.current) return; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'); setCameraState(denied ? 'denied' : 'error'); setMessage(denied ? 'Camera permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The camera could not start.');
    }
  }

  function calibrate() { if (cameraState !== 'active') { setMessage('Start the camera before calibrating.'); return; } setBaseline(Math.min(18, latestMetricsRef.current.energy)); setCalibrated(true); setMessage('Calibration complete. Begin from a comfortable ready position.'); }
  function reset() { stopCamera(); sessionStartedRef.current = false; setMode('Warm-Up'); setGoal('Warm up movement'); setMirrored(true); setBaseline(0); setCalibrated(false); setLastMetrics(null); setModeChosen(false); setCameraStarted(false); setFeedbackSeen(false); setStoppedAfterPractice(false); setSaved(false); setSessionSeconds(0); setLoadedSummary(null); setMessage('Reset complete. Your camera is off.'); }
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

  return <ToolShell title="Choreo Mirror" eyebrow="JPAC Creator Tool" description="Practice beside a reference frame while using your private tracking frame for movement feedback.">
    <section className="premium-tool-panel choreo-mirror-tool performance-coach-lab">
      <div className="instrument-lab-intro"><div><span className="premium-kicker">Performance coach</span><h2>Choose your practice goal</h2><p>Practice with a clear focus, review local movement feedback, and save text-only notes on this device.</p></div><div className="practice-goal-grid">{choreoGoals.map((item) => <button type="button" key={item} className={goal === item ? 'active' : ''} aria-pressed={goal === item} onClick={() => setGoal(item)}>{item}</button>)}</div></div>
      <section className="practice-mission"><header><div><span className="premium-kicker">Practice Mission</span><h2>{goal}</h2></div><strong>{[modeChosen, cameraStarted, sessionSeconds >= 3, feedbackSeen, stoppedAfterPractice && saved].filter(Boolean).length}/5 steps</strong></header><ol>{['Choose practice mode', 'Start camera', 'Follow the Reference Frame', 'Watch Tracking Frame feedback', 'Stop camera and save locally'].map((step, index) => <li key={step} className={[modeChosen, cameraStarted, sessionSeconds >= 3, feedbackSeen, stoppedAfterPractice && saved][index] ? 'complete' : ''}><span>{index + 1}</span>{step}</li>)}</ol></section>
      <InstructorActivityPanel activities={choreoActivities} selectedId={selectedActivityId} onSelect={setSelectedActivityId} />
      <div className="instrument-session-strip choreo-session-strip" aria-label="Movement practice statistics"><div><small>Practice goal</small><strong>{goal}</strong></div><div><small>Practice mode</small><strong>{mode}</strong></div><div><small>Motion energy</small><strong>{summaryEnergy}</strong></div><div><small>Balance</small><strong>{summaryBalance}</strong></div><div><small>View quality</small><strong>{summaryView}</strong></div><div><small>Mirrored view</small><strong>{mirrored ? 'On' : 'Off'}</strong></div><div><small>Calibration</small><strong>{calibrated ? 'Calibrated' : 'Not calibrated'}</strong></div></div>
      <section className="choreo-permission" aria-labelledby="camera-permission-title"><div><div className="eyebrow">Camera privacy</div><h2 id="camera-permission-title">You decide when the camera starts</h2><p>The preview and motion calculations stay on this device. JPAC does not record, upload, save, or grade your video. Microphone access is never requested.</p></div><div className="premium-action-row"><button type="button" className="button button-primary" disabled={cameraState === 'active' || cameraState === 'requesting'} onClick={() => void startCamera()}>{cameraState === 'requesting' ? 'Requesting…' : 'Start Camera'}</button><button type="button" className="button button-secondary" disabled={cameraState !== 'active'} onClick={stopCamera}>Stop Camera</button><button type="button" className="button button-secondary" onClick={reset}>Reset</button></div></section>
      <div className={`choreo-status ${cameraState === 'denied' || cameraState === 'error' ? 'error' : ''}`} role="status">{message}</div>
      <div className="premium-control-grid choreo-controls"><label>Practice mode<select value={mode} onChange={(event) => { setMode(event.target.value as PracticeMode); setModeChosen(true); }}>{modes.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" className={`premium-toggle ${mirrored ? 'active' : ''}`} aria-pressed={mirrored} onClick={() => setMirrored((value) => !value)}>Mirrored view {mirrored ? 'on' : 'off'}</button><button type="button" className="button button-secondary" disabled={cameraState !== 'active'} onClick={calibrate}>{calibrated ? 'Recalibrate' : 'Calibrate view'}</button></div>
      <section className="choreo-frame-grid" aria-label="Reference and tracking frames">
        <article className="choreo-frame-panel choreo-reference-panel">
          <header><div className="eyebrow">Teacher / Reference Side</div><h2>Reference Frame</h2><p>This is the choreography reference space. Follow your teacher, routine, or practice target here.</p></header>
          <div className="choreo-reference-placeholder"><span aria-hidden="true">🎬</span><strong>Coming soon: reference video</strong><small>Use this side to follow choreography</small></div>
        </article>
        <article className="choreo-frame-panel choreo-tracking-panel">
          <header><div className="eyebrow">Your Practice Side</div><h2>Tracking Frame</h2><p>This is your live mirror. Movement feedback is calculated locally from this frame.</p></header>
          <div className={`choreo-video-shell ${mirrored ? 'mirrored' : ''}`}><video ref={videoRef} playsInline muted aria-label="Local live camera preview in Tracking Frame" /><div className="choreo-camera-placeholder" hidden={cameraState === 'active'}><span aria-hidden="true">🕺</span><strong>Camera preview</strong><small>Select Start Camera when you are ready.</small></div><span className="choreo-local-badge">Local-only · Not recording</span></div>
        </article>
        <canvas ref={canvasRef} width="160" height="120" hidden aria-hidden="true" />
      </section>
      <section className="motion-dashboard" aria-label="Practice feedback"><article><span>Motion energy</span><div className="motion-meter"><i style={{ width: `${adjustedEnergy}%` }} /></div><strong>{cameraState === 'active' ? `${Math.round(adjustedEnergy)}%` : '—'}</strong></article><article><span>Movement balance</span><div className="balance-meter"><i /><b style={{ left: `${50 + metrics.balance / 2}%` }} /></div><strong>{cameraState === 'active' ? balanceLabel(metrics.balance) : 'Waiting for camera'}</strong></article><article><span>View quality</span><strong>{cameraState !== 'active' ? 'Waiting' : metrics.brightness < 42 ? 'Needs more light' : 'View is clear'}</strong><small>{calibrated ? 'Calibrated' : 'Calibrate before practice'}</small></article></section>
      <div className="premium-learning-grid"><article><h2>Practice feedback</h2><p>{cameraState === 'active' ? feedback : 'Start the camera to see simple movement-energy feedback.'}</p><small>This uses frame differences only—not skeletal tracking, medical analysis, or dance assessment.</small></article><article><h2>Timing and stillness prompt</h2><p>{modePrompts[mode]}</p></article></div>
      <div className="beginner-helper-grid">{choreoHelpers.map(([title, text]) => <article key={title}><strong>{title}</strong><span>{text}</span></article>)}</div>
      <LocalProjectPanel toolType="choreo-mirror" toolLabel="Choreo Mirror" snapshot={snapshot} onLoad={loadProject} onSaved={() => setSaved(true)} />
      <ExtraCreditPanel summary={extraCreditSummary} />
    </section>
  </ToolShell>;
}
