export type InstructionalMediaProvider='youtube'|'direct'|'legacy';
export type InstructionalMedia={id:string;module_id:string;version_number:number;provider:InstructionalMediaProvider;provider_media_id:string;source_url:string|null;normalized_url:string|null;title:string;duration_seconds:number|null;status:'draft'|'active'|'retired';created_at:string;activated_at:string|null;retired_at:string|null;replaces_media_id:string|null};
export type NormalizedMediaInput={provider:'youtube'|'direct';providerMediaId:string;normalizedUrl:string;embedUrl:string};

const youtubeId=/^[A-Za-z0-9_-]{11}$/;
const approvedYoutubeHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com']);
const approvedEmbedHosts=new Set(['youtube.com','www.youtube.com','www.youtube-nocookie.com']);

export function normalizeInstructionalMediaUrl(value:string):NormalizedMediaInput|null{
  const source=value.trim();if(!source||/[<>]/.test(source))return null;
  let url:URL;try{url=new URL(source)}catch{return null}if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();let videoId='';
  if(approvedYoutubeHosts.has(host)&&url.pathname==='/watch')videoId=url.searchParams.get('v')||'';
  else if(host==='youtu.be'&&url.pathname.split('/').filter(Boolean).length===1)videoId=url.pathname.slice(1);
  else if(approvedEmbedHosts.has(host)&&/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname))videoId=url.pathname.split('/')[2]||'';
  if(youtubeId.test(videoId))return{provider:'youtube',providerMediaId:videoId,normalizedUrl:`https://www.youtube.com/watch?v=${videoId}`,embedUrl:`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`};
  if(!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host))return null;
  if(!/\.(mp4|webm|m4v)$/i.test(url.pathname))return null;
  return{provider:'direct',providerMediaId:source,normalizedUrl:source,embedUrl:source};
}

export function formatInstructionalDuration(seconds:number|null|undefined){if(!seconds||seconds<1)return'Not configured';return`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`}
