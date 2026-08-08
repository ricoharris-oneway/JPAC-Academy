import{useEffect,useState}from'react';
import{useNavigate}from'react-router-dom';
import{supabase}from'../lib/supabase';
import{getAuthFlowType,safeInternalPath}from'../lib/auth';

export function AuthCallbackPage(){
  const navigate=useNavigate();const[error,setError]=useState('');
  useEffect(()=>{let active=true;async function complete(){
    if(!supabase){setError('Supabase is not configured.');return}

    const url=new URL(window.location.href);
    const hash=new URLSearchParams(url.hash.replace(/^#/,''));
    const callbackError=url.searchParams.get('error_description')||hash.get('error_description');
    const code=url.searchParams.get('code');
    const accessToken=hash.get('access_token');
    const refreshToken=hash.get('refresh_token');
    const type=getAuthFlowType(url);
    const requested=safeInternalPath(url.searchParams.get('next'),'/');

    // Remove one-time credentials from browser history before async work or an
    // error render can expose them.
    const cleanUrl=new URL('/auth/callback',window.location.origin);
    cleanUrl.searchParams.set('next',requested);
    if(type!=='unknown')cleanUrl.searchParams.set('type',type);
    window.history.replaceState({},document.title,cleanUrl.toString());

    if(callbackError){if(active)setError(callbackError);return}

    if(code){
      const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);
      if(exchangeError){if(active)setError(exchangeError.message);return}
    }else if(accessToken&&refreshToken){
      const{error:setSessionError}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      if(setSessionError){if(active)setError(setSessionError.message);return}
    }

    const{data,error:sessionError}=await supabase.auth.getSession();
    if(sessionError||!data.session){
      if(active)setError(sessionError?.message||'This sign-in link is invalid or has expired. Request a new link and try again.');
      return
    }

    const destination=type==='invite'||type==='recovery'?'/set-password':requested;
    if(active)navigate(destination,{replace:true,state:{authFlow:type}})
  }void complete();return()=>{active=false}},[navigate]);
  return <main className="auth-status-page"><section className="auth-panel card"><div className="eyebrow">JPAC Academy</div><h1>{error?'We could not complete that link':'Activating your Academy access…'}</h1><p className="muted">{error||'Please wait while your secure session is prepared.'}</p>{error&&<button className="button button-primary" onClick={()=>navigate('/login',{replace:true})}>Return to sign in</button>}</section></main>
}
