export type AuthFlowType='invite'|'recovery'|'signup'|'email_change'|'magiclink'|'unknown';

export function safeInternalPath(value:string|null,fallback='/'){
  return value?.startsWith('/')&&!value.startsWith('//')?value:fallback;
}

export function authCallbackUrl(next='/set-password'){
  const url=new URL('/auth/callback',window.location.origin);
  url.searchParams.set('next',safeInternalPath(next,'/set-password'));
  return url.toString();
}

export function getAuthFlowType(url:URL):AuthFlowType{
  const hash=new URLSearchParams(url.hash.replace(/^#/,''));
  const value=url.searchParams.get('type')||hash.get('type')||'';
  return ['invite','recovery','signup','email_change','magiclink'].includes(value)?value as AuthFlowType:'unknown';
}
