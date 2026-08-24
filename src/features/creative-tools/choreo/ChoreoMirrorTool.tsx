import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolShell } from '../shared/ToolShell';
import { analyzeMotion, balanceLabel, movementFeedback, type MotionMetrics } from './motionAnalysis';

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';
type PracticeMode = 'Warm-Up' | 'Choreography' | 'Stage Presence' | 'Freestyle';
const modes: PracticeMode[] = ['Warm-Up', 'Choreography', 'Stage Presence', 'Freestyle'];
const emptyMetrics: MotionMetrics = { energy: 0, balance: 0, brightness: 100 };
const modePrompts: Record<PracticeMode, string> = {
  'Warm-Up': 'Move smoothly through your comfortable range. Keep shoulders relaxed and never force a stretch.',
  Choreography: 'Choose an eight-count. Make the start, accents, and ending shape easy to recognize.',
  'Stage Presence': 'Practice confident focus, lifted posture, and intentional stillness between movements.',
  Freestyle: 'Explore one movement idea, repeat it, then change its level, direction, or energy.',
};

export function ChoreoMirrorTool() {
  const [cameraState, setCameraState] = useState<CameraState>('idle'); const [message, setMessage] = useState('Your camera is off.'); const [mode, setMode] = useState<PracticeMode>('Warm-Up'); const [mirrored, setMirrored] = useState(true); const [metrics, setMetrics] = useState<MotionMetrics>(emptyMetrics); const [baseline, setBaseline] = useState(0); const [calibrated, setCalibrated] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null); const canvasRef = useRef<HTMLCanvasElement | null>(null); const streamRef = useRef<MediaStream | null>(null); const animationRef = useRef<number | null>(null); const previousFrameRef = useRef<Uint8ClampedArray | null>(null); const lastAnalysisRef = useRef(0); const latestMetricsRef = useRef(emptyMetrics); const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); animationRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; previousFrameRef.current = null; latestMetricsRef.current = emptyMetrics; setMetrics(emptyMetrics); setCameraState('idle'); setMessage('Camera stopped. No video was recorded or saved.');
  }, []);

  async function startCamera() {
    setCameraState('requesting'); setMessage('Waiting for camera permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported in this browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }); if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } streamRef.current = stream; const video = videoRef.current; const canvas = canvasRef.current; if (!video || !canvas) throw new Error('The camera preview could not be prepared.'); video.srcObject = stream; await video.play();
      setCameraState('active'); setMessage('Camera active. Frames are analyzed only in this browser.'); setCalibrated(false); setBaseline(0); previousFrameRef.current = null;
      const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('Motion analysis is unavailable in this browser.');
      const analyze = (time: number) => {
        if (time - lastAnalysisRef.current >= 110 && video.readyState >= 2) { lastAnalysisRef.current = time; context.drawImage(video, 0, 0, canvas.width, canvas.height); const frame = context.getImageData(0, 0, canvas.width, canvas.height); const next = analyzeMotion(frame.data, previousFrameRef.current, canvas.width, canvas.height); previousFrameRef.current = new Uint8ClampedArray(frame.data); latestMetricsRef.current = next; setMetrics(next); }
        animationRef.current = requestAnimationFrame(analyze);
      };
      animationRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; if (!mountedRef.current) return; const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'); setCameraState(denied ? 'denied' : 'error'); setMessage(denied ? 'Camera permission was denied. You can update browser permissions and try again.' : error instanceof Error ? error.message : 'The camera could not start.');
    }
  }

  function calibrate() { if (cameraState !== 'active') { setMessage('Start the camera before calibrating.'); return; } setBaseline(Math.min(18, latestMetricsRef.current.energy)); setCalibrated(true); setMessage('Calibration complete. Begin from a comfortable ready position.'); }
  function reset() { stopCamera(); setMode('Warm-Up'); setMirrored(true); setBaseline(0); setCalibrated(false); setMessage('Reset complete. Your camera is off.'); }
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); if (videoRef.current) videoRef.current.srcObject = null; }; }, []);
  const adjustedEnergy = Math.max(0, metrics.energy - baseline); const feedback = movementFeedback(metrics, baseline);

  return <ToolShell title="Choreo Mirror" eyebrow="JPAC Creator Tool" description="Use a private live mirror and simple motion energy to support dance and performance practice.">
    <section className="premium-tool-panel choreo-mirror-tool">
      <section className="choreo-permission" aria-labelledby="camera-permission-title"><div><div className="eyebrow">Camera privacy</div><h2 id="camera-permission-title">You decide when the camera starts</h2><p>The preview and motion calculations stay on this device. JPAC does not record, upload, save, or grade your video. Microphone access is never requested.</p></div><div className="premium-action-row"><button type="button" className="button button-primary" disabled={cameraState === 'active' || cameraState === 'requesting'} onClick={() => void startCamera()}>{cameraState === 'requesting' ? 'Requesting…' : 'Start Camera'}</button><button type="button" className="button button-secondary" disabled={cameraState !== 'active'} onClick={stopCamera}>Stop Camera</button><button type="button" className="button button-secondary" onClick={reset}>Reset</button></div></section>
      <div className={`choreo-status ${cameraState === 'denied' || cameraState === 'error' ? 'error' : ''}`} role="status">{message}</div>
      <div className="premium-control-grid choreo-controls"><label>Practice mode<select value={mode} onChange={(event) => setMode(event.target.value as PracticeMode)}>{modes.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" className={`premium-toggle ${mirrored ? 'active' : ''}`} aria-pressed={mirrored} onClick={() => setMirrored((value) => !value)}>Mirrored view {mirrored ? 'on' : 'off'}</button><button type="button" className="button button-secondary" disabled={cameraState !== 'active'} onClick={calibrate}>{calibrated ? 'Recalibrate' : 'Calibrate view'}</button></div>
      <section className="choreo-stage"><div className={`choreo-video-shell ${mirrored ? 'mirrored' : ''}`}><video ref={videoRef} playsInline muted aria-label="Local live camera preview" /><div className="choreo-camera-placeholder" hidden={cameraState === 'active'}><span aria-hidden="true">🕺</span><strong>Camera preview</strong><small>Select Start Camera when you are ready.</small></div><span className="choreo-local-badge">Local-only · Not recording</span></div><canvas ref={canvasRef} width="160" height="120" hidden aria-hidden="true" /></section>
      <section className="motion-dashboard" aria-label="Practice feedback"><article><span>Motion energy</span><div className="motion-meter"><i style={{ width: `${adjustedEnergy}%` }} /></div><strong>{cameraState === 'active' ? `${Math.round(adjustedEnergy)}%` : '—'}</strong></article><article><span>Movement balance</span><div className="balance-meter"><i /><b style={{ left: `${50 + metrics.balance / 2}%` }} /></div><strong>{cameraState === 'active' ? balanceLabel(metrics.balance) : 'Waiting for camera'}</strong></article><article><span>View quality</span><strong>{cameraState !== 'active' ? 'Waiting' : metrics.brightness < 42 ? 'Needs more light' : 'View is clear'}</strong><small>{calibrated ? 'Calibrated' : 'Calibrate before practice'}</small></article></section>
      <div className="premium-learning-grid"><article><h2>Practice feedback</h2><p>{cameraState === 'active' ? feedback : 'Start the camera to see simple movement-energy feedback.'}</p><small>This uses frame differences only—not skeletal tracking, medical analysis, or dance assessment.</small></article><article><h2>Timing and stillness prompt</h2><p>{modePrompts[mode]}</p></article></div>
    </section>
  </ToolShell>;
}
