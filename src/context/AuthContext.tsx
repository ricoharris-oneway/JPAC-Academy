import{createContext,useContext,useEffect,useMemo,useState,type ReactNode}from'react';
import type{Session,User}from'@supabase/supabase-js';
import{supabase}from'../lib/supabase';

export type AppRole='student'|'teacher'|'admin'|'developer';
type Profile={id:string;email:string|null;display_name:string;role:AppRole;avatar_url:string|null;total_xp:number};
type AuthValue={session:Session|null;user:User|null;profile:Profile|null;loading:boolean;signIn:(email:string,password:string)=>Promise<string|null>;signUp:(email:string,password:string,displayName:string)=>Promise<string|null>;signOut:()=>Promise<void>;refreshProfile:()=>Promise<void>};
const AuthContext=createContext<AuthValue|null>(null);

function friendlySignInError(message:string){
  const normalized=message.toLowerCase();
  if(normalized.includes('invalid login credentials'))return 'Email or password is incorrect. If this is your first visit, use the activation link in your JPAC Academy invitation to set your password.';
  if(normalized.includes('email not confirmed'))return 'Your Academy account is not activated yet. Open the activation link in your invitation email first.';
  if(normalized.includes('too many requests'))return 'Too many sign-in attempts. Please wait a few minutes, then try again.';
  return message;
}

export function AuthProvider({children}:{children:ReactNode}){
  const[session,setSession]=useState<Session|null>(null);const[profile,setProfile]=useState<Profile|null>(null);const[loading,setLoading]=useState(true);
  const loadProfile=async(userId?:string)=>{if(!supabase||!userId){setProfile(null);return}const{data}=await supabase.from('profiles').select('id,email,display_name,role,avatar_url,total_xp').eq('id',userId).maybeSingle();setProfile((data as Profile|null)||null)};
  useEffect(()=>{if(!supabase){setLoading(false);return}let active=true;void supabase.auth.getSession().then(async({data})=>{if(!active)return;setSession(data.session);await loadProfile(data.session?.user.id);if(active)setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);setTimeout(()=>{if(active)void loadProfile(next?.user.id)},0)});return()=>{active=false;subscription.unsubscribe()}},[]);
  const value=useMemo<AuthValue>(()=>({session,user:session?.user||null,profile,loading,signIn:async(email,password)=>{if(!supabase)return'Supabase is not configured.';const{error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});return error?friendlySignInError(error.message):null},signUp:async(email,password,displayName)=>{if(!supabase)return'Supabase is not configured.';const{error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{display_name:displayName}}});return error?.message||null},signOut:async()=>{await supabase?.auth.signOut()},refreshProfile:async()=>loadProfile(session?.user.id)}),[session,profile,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used inside AuthProvider');return value}
