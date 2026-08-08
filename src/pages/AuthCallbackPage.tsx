import{useEffect,useState}from'react';
import{useNavigate}from'react-router-dom';
import{supabase}from'../lib/supabase';
import{getAuthFlowType,safeInternalPath}from'../lib/auth';

export function AuthCallbackPage(){
  const navigate=useNavigate();const[error,setError]=useState('');
  useEffect(()=>{let active=true;async function complete(){if(!supabase){setError('Supabase is not configured.');return}const url=new URL(window.location.href);const code=url.searchParams.get('code');if(code){const{error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);if(exchangeError){if(active)setError(exchangeError.message);return}}const{data,error:sessionError}=await supabase.auth.getSession();if(sessionError||!data.session){if(active)setError(sessionError?.message||'This sign-in link is invalid or has expired. Request a new link and try again.');return}const type=getAuthFlowType(url);const requested=safeInternalPath(url.searchParams.get('next'),'/');const destination=type==='invite'||type==='recovery'?'/set-password':requested;if(active)navigate(destination,{replace:true,state:{authFlow:type}})}void complete();return()=>{active=false}},[navigate]);
  return <main className="auth-status-page"><section className="auth-panel card"><div className="eyebrow">JPAC Academy</div><h1>{error?'We could not complete that link':'Activating your Academy access…'}</h1><p className="muted">{error||'Please wait while your secure session is prepared.'}</p>{error&&<button className="button button-primary" onClick={()=>navigate('/login',{replace:true})}>Return to sign in</button>}</section></main>
}
