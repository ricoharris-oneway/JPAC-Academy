import type { LocalRecordingKind, LocalRecordingStatus } from './useLocalMediaRecorder';
import { recordingControlVisibility } from './useLocalMediaRecorder';

type Props = { kind: LocalRecordingKind; status: LocalRecordingStatus; recordingUrl: string | null; error: string; disabled: boolean; filename: string; onRecord: () => void; onStop: () => void; onClear: () => void };

export function LocalRecordingPanel({ kind, status, recordingUrl, error, disabled, filename, onRecord, onStop, onClear }: Props) {
  const controls = recordingControlVisibility(status);
  return <section className="local-recording-panel" aria-labelledby={`${kind}-recording-title`}>
    <header><div><span className="premium-kicker">Local practice recording</span><h2 id={`${kind}-recording-title`}>{kind === 'audio' ? 'Audio practice take' : 'Video practice take'}</h2></div><strong>{status === 'recording' ? 'Recording now' : status === 'ready' ? 'Ready to preview' : 'Not recording'}</strong></header>
    <p>This recording stays on this device unless you download it. It is not submitted or saved to your JPAC account.</p>
    <div className="premium-action-row"><button type="button" className="button button-primary" disabled={disabled || !controls.canRecord} onClick={onRecord}>Record</button><button type="button" className="button button-secondary" disabled={!controls.canStop} onClick={onStop}>Stop recording</button><button type="button" className="button button-secondary" disabled={!recordingUrl && status !== 'recording'} onClick={onClear}>Clear recording</button>{controls.showDownload && recordingUrl ? <a className="button button-secondary" href={recordingUrl} download={filename}>Download</a> : null}</div>
    {error ? <div className="premium-audio-error" role="alert">{error}</div> : null}
    {recordingUrl ? kind === 'audio' ? <audio controls src={recordingUrl}>Your browser does not support audio playback.</audio> : <video controls playsInline src={recordingUrl}>Your browser does not support video playback.</video> : null}
  </section>;
}
