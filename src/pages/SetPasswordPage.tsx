import{useEffect,useState,type FormEvent}from'react';
import{Navigate,useLocation,useNavigate}from'react-router-dom';
import{supabase}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';

export function SetPasswordPage(){
  const{user,loading}=useAuth();const navigate=useNavigate();const location=useLocation();const[password,setPassword]=useState('');const[confirm,setConfirm]=useState('');const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);const[complete,setComplete]=useState(false);
  useEffect(()=>{if(complete){const timer=setTimeout(()=>navigate('/courses',{replace:true}),1200);return()=>clearTimeout(timer)}},[complete,navigate]);
  if(!loading&&!user)return <Navigate to="/login" replace state={{message:'Your activation or recovery link has expired. Request a new link and try again.'}}/>;
  async function submit(event:FormEvent){event.preventDefault();if(password!==confirm){setMessage('Passwords do not match.');return}if(!supabase)return;setBusy(true);setMessage('');const{error}=await supabase.auth.updateUser({password});setBusy(false);if(error){setMessage(error.message);return}setComplete(true);setMessage('Password saved. Opening your purchased courses…')}
  const flow=(location.state as{authFlow?:string}|null)?.authFlow;
  return <main className="auth-status-page"><section className="auth-panel card"><div className="eyebrow">{flow==='recovery'?'Password recovery':'Academy account activation'}</div><h1>Set your password</h1><p className="muted">Choose a secure password for {user?.email||'your JPAC Academy account'}. You only need to do this once during activation.</p><form className="auth-form" onSubmit={submit}><label>New password<input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><label>Confirm new password<input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={event=>setConfirm(event.target.value)}/></label><button className="button button-primary" disabled={busy||complete}>{busy?'Saving…':complete?'Password saved':'Set password'}</button></form>{message&&<div className="auth-message" role="status">{message}</div>}</section></main>
}
