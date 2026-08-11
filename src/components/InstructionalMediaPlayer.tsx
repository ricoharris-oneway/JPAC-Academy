import{useEffect,useRef}from'react';
import{normalizeInstructionalMediaUrl,type InstructionalMedia}from'../lib/instructionalMedia';

type YouTubePlayer={destroy:()=>void;getCurrentTime:()=>number;getDuration:()=>number;getPlayerState:()=>number;getVideoData:()=>{title?:string};seekTo:(seconds:number,allowSeekAhead:boolean)=>void};
type YouTubeNamespace={Player:new(element:HTMLElement,options:Record<string,unknown>)=>YouTubePlayer;PlayerState:{PLAYING:number;ENDED:number}};
declare global{interface Window{YT?:YouTubeNamespace;onYouTubeIframeAPIReady?:()=>void}}

let youtubeLoader:Promise<YouTubeNamespace>|null=null;
function loadYouTubeApi(){if(window.YT?.Player)return Promise.resolve(window.YT);if(youtubeLoader)return youtubeLoader;youtubeLoader=new Promise((resolve,reject)=>{const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();if(window.YT)resolve(window.YT)};const existing=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');if(!existing){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>reject(new Error('YouTube player could not be loaded.'));document.head.appendChild(script)}});return youtubeLoader}

type PlayerProps={media:InstructionalMedia;resumeSeconds?:number;tracking?:boolean;onProgress?:(watched:number,duration:number)=>void;onComplete?:()=>void;onDuration?:(duration:number)=>void;onTitle?:(title:string)=>void;onError?:(message:string)=>void};

export function InstructionalMediaPlayer({media,resumeSeconds=0,tracking=false,onProgress,onComplete,onDuration,onTitle,onError}:PlayerProps){
  const hostRef=useRef<HTMLDivElement>(null);const playerRef=useRef<YouTubePlayer|null>(null);const timerRef=useRef<number|null>(null);const callbacks=useRef({onProgress,onComplete,onDuration,onTitle,onError});callbacks.current={onProgress,onComplete,onDuration,onTitle,onError};
  useEffect(()=>{
    if(media.provider!=='youtube'||!hostRef.current)return;
    let disposed=false;
    void loadYouTubeApi().then(YT=>{
      if(disposed||!hostRef.current)return;
      playerRef.current=new YT.Player(hostRef.current,{
        videoId:media.provider_media_id,
        playerVars:{enablejsapi:1,origin:window.location.origin,rel:0},
        events:{
          onReady:()=>{const player=playerRef.current;if(!player)return;const duration=Math.floor(player.getDuration());if(duration>0)callbacks.current.onDuration?.(duration);const title=player.getVideoData()?.title;if(title)callbacks.current.onTitle?.(title);if(resumeSeconds>0&&resumeSeconds<duration-1)player.seekTo(resumeSeconds,true)},
          onStateChange:()=>{if(timerRef.current!==null){window.clearInterval(timerRef.current);timerRef.current=null}const player=playerRef.current;if(!player||!tracking)return;const state=player.getPlayerState();if(state===YT.PlayerState.ENDED){callbacks.current.onComplete?.();return}if(state!==YT.PlayerState.PLAYING)return;timerRef.current=window.setInterval(()=>{if(document.visibilityState!=='visible'||player.getPlayerState()!==YT.PlayerState.PLAYING)return;const duration=Math.floor(player.getDuration());const watched=Math.floor(player.getCurrentTime());if(duration>0)callbacks.current.onProgress?.(watched,duration)},1000)},
          onError:()=>callbacks.current.onError?.('The YouTube instructional video could not be loaded.'),
        },
      });
    }).catch(error=>callbacks.current.onError?.(error instanceof Error?error.message:'YouTube player could not be loaded.'));
    return()=>{disposed=true;if(timerRef.current!==null)window.clearInterval(timerRef.current);timerRef.current=null;playerRef.current?.destroy();playerRef.current=null};
  },[media.id,media.provider,media.provider_media_id,resumeSeconds,tracking]);
  if(media.provider==='youtube')return <div className="instructional-player youtube-player" ref={hostRef}/>;
  if(media.provider==='direct'&&media.normalized_url)return <video className="instructional-player" controls preload="metadata" src={media.normalized_url} onLoadedMetadata={event=>{const video=event.currentTarget;const duration=Math.floor(video.duration);if(duration>0)onDuration?.(duration);if(resumeSeconds>0&&resumeSeconds<video.duration-1)video.currentTime=resumeSeconds}} onTimeUpdate={event=>{const video=event.currentTarget;if(!tracking||video.paused||document.visibilityState!=='visible'||!Number.isFinite(video.duration))return;onProgress?.(Math.floor(video.currentTime),Math.floor(video.duration))}} onEnded={()=>{if(tracking)onComplete?.()}}/>;
  const normalized=media.source_url?normalizeInstructionalMediaUrl(media.source_url):null;return <div className="video-configuration"><strong>Historical media record</strong><p>{normalized?'This media is not active.':'No playable source is retained for this legacy evidence record.'}</p></div>;
}
