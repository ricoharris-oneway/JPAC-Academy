import{useState,type FormEvent}from'react';
import{Link}from'react-router-dom';
import{supabase}from'../lib/supabase';
import{authCallbackUrl}from'../lib/auth';

export function ForgotPasswordPage(){
  const[email,setEmail]=useState('');const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(!supabase){setMessage('Supabase is not configured.');return}setBusy(true);setMessage('');const{error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:authCallbackUrl('/reset-password','recovery')});setBusy(false);setMessage(error?.message||'If an Academy account exists for that email, a password reset link is on its way.')}
  return <main className="auth-status-page"><section className="auth-panel card"><div className="eyebrow">JPAC Academy</div><h1>Reset your password</h1><p className="muted">Enter your Academy email and we’ll send a secure recovery link.</p><form className="auth-form" onSubmit={submit}><label>Email<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="button button-primary" disabled={busy}>{busy?'Sending…':'Send recovery link'}</button></form>{message&&<div className="auth-message" role="status">{message}</div>}<Link className="auth-switch" to="/login">Return to sign in</Link></section></main>
}
