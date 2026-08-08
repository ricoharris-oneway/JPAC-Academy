export type AuthFlowType='invite'|'recovery'|'signup'|'email_change'|'magiclink'|'unknown';

const RECOVERY_STORAGE_KEY='jpac-password-recovery';
const PRODUCTION_ACADEMY_ORIGIN='https://jpac-academy.vercel.app';
const LOCAL_ACADEMY_ORIGIN='http://localhost:5173';

export function safeInternalPath(value:string|null,fallback='/'){
  return value?.startsWith('/')&&!value.startsWith('//')?value:fallback;
}

export function academyAuthOrigin(){
  const local=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return local?LOCAL_ACADEMY_ORIGIN:PRODUCTION_ACADEMY_ORIGIN;
}

export function authCallbackUrl(next='/set-password',type?:AuthFlowType){
  const url=new URL('/auth/callback',academyAuthOrigin());
  url.searchParams.set('next',safeInternalPath(next,'/set-password'));
  if(type&&type!=='unknown')url.searchParams.set('type',type);
  return url.toString();
}

export function markPasswordRecovery(active:boolean){
  if(active)window.sessionStorage.setItem(RECOVERY_STORAGE_KEY,'active');
  else window.sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
}

export function hasPasswordRecovery(){
  return window.sessionStorage.getItem(RECOVERY_STORAGE_KEY)==='active';
}

export function getAuthFlowType(url:URL):AuthFlowType{
  const hash=new URLSearchParams(url.hash.replace(/^#/,''));
  const value=url.searchParams.get('type')||hash.get('type')||'';
  return ['invite','recovery','signup','email_change','magiclink'].includes(value)?value as AuthFlowType:'unknown';
}
