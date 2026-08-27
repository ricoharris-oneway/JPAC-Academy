import { renderToStaticMarkup } from 'react-dom/server';
import { LocalRecordingPanel } from './LocalRecordingPanel';
import { initialLocalRecordingState, recordingBoundaries, replaceObjectUrl } from './useLocalMediaRecorder';
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const noop = () => undefined;
const idle = renderToStaticMarkup(<LocalRecordingPanel kind="audio" status="idle" recordingUrl={null} error="" disabled={false} filename="take.webm" onRecord={noop} onStop={noop} onClear={noop} />);
assert(idle.includes('Record') && idle.includes('Stop recording') && idle.includes('Clear recording'), 'Manual recording controls should render.');
assert(!idle.includes('download='), 'Download must be hidden before recording.');
assert(initialLocalRecordingState.status === 'idle', 'Recording must not start on page load.');
const ready = renderToStaticMarkup(<LocalRecordingPanel kind="video" status="ready" recordingUrl="blob:take" error="" disabled={false} filename="take.webm" onRecord={noop} onStop={noop} onClear={noop} />);
assert(ready.includes('download="take.webm"'), 'Download must appear after recording.');
let revoked = ''; replaceObjectUrl('blob:old', 'blob:new', (url) => { revoked = url; }); assert(revoked === 'blob:old', 'Replacing an object URL must revoke the previous URL.');
assert(recordingBoundaries.audio === 'audio-only' && recordingBoundaries.video === 'video-only', 'Smart Tuner and Choreo Mirror boundaries must remain separate.');
console.log('Local media recording tests passed.');
