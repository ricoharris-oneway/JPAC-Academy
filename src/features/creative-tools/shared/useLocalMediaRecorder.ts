import { useCallback, useEffect, useRef, useState } from 'react';

export type LocalRecordingKind = 'audio' | 'video';
export type LocalRecordingStatus = 'idle' | 'recording' | 'ready' | 'error';
export const initialLocalRecordingState = { status: 'idle' as LocalRecordingStatus, recordingUrl: null as string | null, error: '' };
export const recordingBoundaries = { audio: 'audio-only', video: 'video-only' } as const;
export function recordingControlVisibility(status: LocalRecordingStatus) { return { canRecord: status !== 'recording', canStop: status === 'recording', showDownload: status === 'ready' }; }
export function replaceObjectUrl(previous: string | null, next: string | null, revoke = URL.revokeObjectURL) { if (previous && previous !== next) revoke(previous); return next; }

function preferredMimeType(kind: LocalRecordingKind) {
  const candidates = kind === 'audio' ? ['audio/webm;codecs=opus', 'audio/webm'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

export function useLocalMediaRecorder(stream: MediaStream | null, kind: LocalRecordingKind) {
  const [state, setState] = useState(initialLocalRecordingState);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const clearRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) { recorder.onstop = null; if (recorder.state === 'recording') recorder.stop(); }
    recorderRef.current = null; chunksRef.current = [];
    urlRef.current = replaceObjectUrl(urlRef.current, null);
    setState(initialLocalRecordingState);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    if (!stream || typeof MediaRecorder === 'undefined') { setState((current) => ({ ...current, status: 'error', error: 'Start the microphone or camera before recording.' })); return; }
    const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    if (!tracks.length || tracks.some((track) => track.readyState !== 'live')) { setState((current) => ({ ...current, status: 'error', error: `A live ${kind} stream is required.` })); return; }
    const recordingStream = new MediaStream(tracks);
    chunksRef.current = []; urlRef.current = replaceObjectUrl(urlRef.current, null);
    try {
      const mimeType = preferredMimeType(kind);
      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined); recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { if (mountedRef.current) setState({ status: 'error', recordingUrl: null, error: 'Recording could not continue in this browser.' }); };
      recorder.onstop = () => {
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (kind === 'audio' ? 'audio/webm' : 'video/webm') });
        const recordingUrl = URL.createObjectURL(blob); urlRef.current = replaceObjectUrl(urlRef.current, recordingUrl);
        setState({ status: 'ready', recordingUrl, error: '' }); recorderRef.current = null; chunksRef.current = [];
      };
      recorder.start(); setState({ status: 'recording', recordingUrl: null, error: '' });
    } catch (error) { setState({ status: 'error', recordingUrl: null, error: error instanceof Error ? error.message : 'Recording is unavailable.' }); }
  }, [kind, stream]);

  useEffect(() => { if (!stream) stopRecording(); }, [stopRecording, stream]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; const recorder = recorderRef.current; if (recorder) { recorder.onstop = null; if (recorder.state === 'recording') recorder.stop(); } recorderRef.current = null; urlRef.current = replaceObjectUrl(urlRef.current, null); }; }, []);

  return { ...state, startRecording, stopRecording, clearRecording };
}
