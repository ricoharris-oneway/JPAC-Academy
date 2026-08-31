import { useEffect, useId, useRef } from 'react';
import { normalizeInstructionalMediaUrl } from '../lib/instructionalMedia';
import '../styles/completion-path-hardening.css';

type YouTubeApi = NonNullable<Window['YT']>;
type YouTubePlayer = InstanceType<YouTubeApi['Player']>;

let youtubeApiPromise: Promise<YouTubeApi> | null = null;
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); else reject(new Error('YouTube player API did not initialize.')); };
    const existing = document.querySelector<HTMLScriptElement>('script[data-jpac-youtube-api]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.jpacYoutubeApi = 'true';
    script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

export type VideoProgress = { watched: number; duration: number };

export function ProviderAwareVideo({ url, title, onProgress }: { url: string; title: string; onProgress?: (progress: VideoProgress) => void }) {
  const media = normalizeInstructionalMediaUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const intervalRef = useRef<number | null>(null);
  const id = useId().replaceAll(':', '');

  useEffect(() => {
    if (media?.provider !== 'youtube' || !onProgress || !iframeRef.current) return;
    let disposed = false;
    let player: YouTubePlayer | null = null;
    const report = (target: YouTubePlayer) => {
      const watched = target.getCurrentTime();
      const duration = target.getDuration();
      if (Number.isFinite(watched) && Number.isFinite(duration) && duration > 0) onProgress({ watched, duration });
    };
    void loadYouTubeApi().then(api => {
      if (disposed || !iframeRef.current) return;
      player = new api.Player(iframeRef.current, { events: {
        onReady: () => undefined,
        onStateChange: (event: { data: number; target: YouTubePlayer }) => {
          if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
          intervalRef.current = event.data === 1 ? window.setInterval(() => report(event.target), 5000) : null;
          report(event.target);
        },
      } });
    }).catch(() => { /* The iframe remains playable if progress integration is unavailable. */ });
    return () => { disposed = true; if (intervalRef.current !== null) window.clearInterval(intervalRef.current); player?.destroy(); };
  }, [media?.provider, media?.providerMediaId, onProgress]);

  if (!media) return null;
  if (media.provider === 'direct') return <video className="module-video" controls preload="metadata" src={media.normalizedUrl} onTimeUpdate={event => onProgress?.({ watched: event.currentTarget.currentTime, duration: event.currentTarget.duration })} />;
  const separator = media.embedUrl.includes('?') ? '&' : '?';
  const origin = typeof window === 'undefined' ? '' : `${separator}origin=${encodeURIComponent(window.location.origin)}`;
  return <div className="module-video-frame"><iframe id={`jpac-video-${id}`} ref={iframeRef} src={`${media.embedUrl}${origin}`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
}
