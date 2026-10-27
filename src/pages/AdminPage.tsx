import{useEffect,useMemo,useState}from'react';
import{supabase}from'../lib/supabase';
import{useAuth,type AppRole}from'../context/AuthContext';
import{AssignmentReviewQueue}from'../components/AssignmentReviewQueue';

type Profile={id:string;display_name:string|null;email:string|null;role:AppRole;total_xp:number|null};
type Course={id:string;title:string;status:string;total_xp:number};
type NotificationRoute={route_key:string;label:string;description:string|null;recipients:string[];enabled:boolean;updated_at:string};
type AccessPlan={student_id:string;access_tier:'single_course'|'all_courses';single_course_id:string|null;status:'active'|'inactive';wix_subscription_reference:string|null;notes:string;updated_at:string};
const roleLabels:{[K in AppRole]:string}={student:'Student',teacher:'Teacher',admin:'Admin',developer:'Developer Admin'};

export function AdminPage(){
  const{profile}=useAuth();
  const[users,setUsers]=useState<Profile[]>([]);
  const[courses,setCourses]=useState<Course[]>([]);
  const[routes,setRoutes]=useState<NotificationRoute[]>([]);
  const[accessPlans,setAccessPlans]=useState<AccessPlan[]>([]);
  const[selectedUser,setSelectedUser]=useState('');
  const[selectedCourse,setSelectedCourse]=useState('');
  const[xp,setXp]=useState('500');
  const[reason,setReason]=useState('Creative practice achievement');
  const[message,setMessage]=useState('');
  const[loading,setLoading]=useState(true);
  const[savingRoute,setSavingRoute]=useState('');
  const[resetPassword,setResetPassword]=useState('');const[resetConfirm,setResetConfirm]=useState('');const[resetBusy,setResetBusy]=useState(false);
  const[accessTier,setAccessTier]=useState<'single_course'|'all_courses'>('single_course');
  const[accessCourse,setAccessCourse]=useState('');
  const[wixReference,setWixReference]=useState('');
  const[accessNotes,setAccessNotes]=useState('');
  const[accessBusy,setAccessBusy]=useState(false);

  const students=useMemo(()=>users.filter(x=>x.role==='student'),[users]);
  const teachers=useMemo(()=>users.filter(x=>['teacher','admin','developer'].includes(x.role)),[users]);

  async function load(){
    if(!supabase)return;
    setLoading(true);
    const[{data:u,error:ue},{data:c,error:ce},{data:r,error:re},{data:ap,error:ape}]=await Promise.all([
      supabase.from('profiles').select('id,display_name,email,role,total_xp').order('display_name'),
      supabase.from('courses').select('id,title,status,total_xp').order('title'),
      supabase.from('notification_routes').select('route_key,label,description,recipients,enabled,updated_at').order('label'),
      supabase.from('student_access_plans').select('student_id,access_tier,single_course_id,status,wix_subscription_reference,notes,updated_at')
    ]);
    if(ue||ce||re||ape)setMessage(ue?.message||ce?.message||re?.message||ape?.message||'Unable to load Academy data.');
    setUsers((u as Profile[])||[]);
    setCourses((c as Course[])||[]);
    setRoutes((r as NotificationRoute[])||[]);
    setAccessPlans((ap as AccessPlan[])||[]);
    setLoading(false);
  }

  useEffect(()=>{void load()},[]);
  useEffect(()=>{const plan=accessPlans.find(x=>x.student_id===selectedUser);if(plan){setAccessTier(plan.access_tier);setAccessCourse(plan.single_course_id||'');setWixReference(plan.wix_subscription_reference||'');setAccessNotes(plan.notes||'')}else{setAccessTier('single_course');setAccessCourse('');setWixReference('');setAccessNotes('')}},[selectedUser,accessPlans]);

  async function changeRole(userId:string,role:AppRole){
    if(!supabase)return;
    setMessage('Saving role…');
    const{error}=await supabase.rpc('admin_set_user_role',{target_user:userId,new_role:role});
    setMessage(error?.message||'Role updated.');
    if(!error)await load();
  }

  async function awardXp(){
    if(!supabase||!selectedUser)return;
    const amount=Number(xp);
    const{error}=await supabase.rpc('admin_award_xp',{target_student:selectedUser,xp_amount:amount,xp_reason:reason});
    setMessage(error?.message||`${amount.toLocaleString()} XP awarded.`);
    if(!error)await load();
  }

  async function enroll(){
    if(!supabase||!selectedUser||!selectedCourse)return;
    const teacher=teachers[0]?.id||null;
    const{error}=await supabase.rpc('admin_enroll_student',{target_student:selectedUser,target_course:selectedCourse,assigned_teacher:teacher});
    setMessage(error?.message||'Student enrolled successfully.');
  }

  async function saveCourseAccess(){
    if(!supabase||!selectedUser)return;
    if(accessTier==='single_course'&&!accessCourse){setMessage('Choose the course for Single Course access.');return}
    setAccessBusy(true);setMessage('Updating Academy access…');
    const{error}=await supabase.rpc('admin_set_student_course_access',{target_student:selectedUser,new_access_tier:accessTier,target_single_course:accessTier==='single_course'?accessCourse:null,wix_reference:wixReference||null,access_notes:accessNotes||''});
    setAccessBusy(false);
    setMessage(error?.message||(accessTier==='all_courses'?'All Courses access activated.':'Single Course access activated.'));
    if(!error)await load();
  }

  async function deactivateCourseAccess(){
    if(!supabase||!selectedUser)return;
    setAccessBusy(true);setMessage('Pausing Academy access…');
    const{error}=await supabase.rpc('admin_deactivate_student_course_access',{target_student:selectedUser});
    setAccessBusy(false);setMessage(error?.message||'Academy access paused.');
    if(!error)await load();
  }
  async function resetStudentPassword(){if(!supabase||!selectedUser)return;if(resetPassword.length<8){setMessage('Password must be at least 8 characters.');return}if(resetPassword!==resetConfirm){setMessage('Passwords do not match.');return}setResetBusy(true);const{data}=await supabase.auth.getSession();const response=await fetch('/api/admin-reset-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({studentId:selectedUser,password:resetPassword})});const result=await response.json();setResetBusy(false);setMessage(response.ok?'Student password reset successfully.':result.error||'Password reset failed.');if(response.ok){setResetPassword('');setResetConfirm('')}}

  function updateRoute(routeKey:string,patch:Partial<NotificationRoute>){
    setRoutes(current=>current.map(route=>route.route_key===routeKey?{...route,...patch}:route));
  }

  async function saveRoute(route:NotificationRoute){
    if(!supabase)return;
    setSavingRoute(route.route_key);
    const recipients=route.recipients.map(x=>x.trim().toLowerCase()).filter(Boolean);
    const invalid=recipients.find(x=>!/^\S+@\S+\.\S+$/.test(x));
    if(invalid){setMessage(`Check the email address: ${invalid}`);setSavingRoute('');return}
    const{error}=await supabase.rpc('admin_save_notification_route',{target_route_key:route.route_key,target_recipients:recipients,target_enabled:route.enabled});
    setMessage(error?.message||`${route.label} updated.`);
    setSavingRoute('');
    if(!error)await load();
  }

  if(!profile||!['admin','developer'].includes(profile.role))return <div className="card card-pad"><h2>Administrator access required</h2></div>;

  return <>
    <div className="page-hero"><div><div className="eyebrow">Academy operations</div><h1 className="page-title">Admin Command Center</h1><p className="muted">Manage people, roles, enrollment, XP, credentials, and notification routing through visual workflows.</p></div><div className="studio-signal">● Live Supabase data</div></div>
    <div className="admin-metrics"><div><strong>{users.length}</strong><span>Total accounts</span></div><div><strong>{students.length}</strong><span>Students</span></div><div><strong>{teachers.length}</strong><span>Staff</span></div><div><strong>{courses.length}</strong><span>Courses</span></div></div>
    {message&&<div className="admin-message">{message}</div>}
    <AssignmentReviewQueue/>
    <div className="admin-grid">
      <section className="card admin-panel"><div className="section-head"><h2>People & access</h2><button className="button button-secondary" onClick={()=>void load()}>Refresh</button></div>{loading?<p className="muted">Loading accounts…</p>:<div className="user-list">{users.map(user=>{const name=user.display_name?.trim()||'Unnamed user';return <article className="user-row" key={user.id}><div className="avatar">{name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</div><div className="user-details"><strong>{name}</strong><small>{user.email||'No email'}</small><span>{Number(user.total_xp||0).toLocaleString()} XP</span></div><select aria-label={`Role for ${name}`} value={user.role} onChange={e=>void changeRole(user.id,e.target.value as AppRole)} disabled={user.id===profile.id}>{Object.entries(roleLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></article>})}</div>}</section>
      <aside className="card admin-panel quick-actions"><h2>Quick academy actions</h2><label>Student<select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}><option value="">Select a student</option>{students.map(s=><option value={s.id} key={s.id}>{s.display_name}</option>)}</select></label><label>Course<select value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}><option value="">Select a course</option>{courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label><div className="action-box"><h3>Award XP</h3><input type="number" value={xp} onChange={e=>setXp(e.target.value)}/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason"/><button className="button button-primary" disabled={!selectedUser} onClick={()=>void awardXp()}>Award XP</button></div><button className="button button-secondary wide" disabled={!selectedUser||!selectedCourse} onClick={()=>void enroll()}>Enroll in selected course</button></aside>
    </div>
    <section className="card admin-panel" style={{marginTop:24}}>
      <div className="section-head"><div><div className="eyebrow">Subscription access</div><h2>Academy Course Access</h2><p className="muted">Wix manages payment. This setting controls only which JPAC Academy courses the student can open.</p></div></div>
      <div className="wizard-form">
        <label>Student<select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}><option value="">Select a student</option>{students.map(st=><option value={st.id} key={st.id}>{st.display_name||st.email}</option>)}</select></label>
        <label>Access plan<select value={accessTier} onChange={e=>setAccessTier(e.target.value as 'single_course'|'all_courses')} disabled={!selectedUser}><option value="single_course">Single Course</option><option value="all_courses">All Courses</option></select></label>
        {accessTier==='single_course'&&<label>Course<select value={accessCourse} onChange={e=>setAccessCourse(e.target.value)} disabled={!selectedUser}><option value="">Choose course</option>{courses.filter(c=>c.status==='published').map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>}
        <label>Wix subscription / order reference<input value={wixReference} onChange={e=>setWixReference(e.target.value)} placeholder="Optional record only"/></label>
        <label className="wide">Access notes<textarea value={accessNotes} onChange={e=>setAccessNotes(e.target.value)} placeholder="Optional internal notes"/></label>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}><button className="button button-primary" disabled={!selectedUser||accessBusy||(accessTier==='single_course'&&!accessCourse)} onClick={()=>void saveCourseAccess()}>{accessBusy?'Saving…':'Save Course Access'}</button><button className="button button-secondary" disabled={!selectedUser||accessBusy||!accessPlans.find(x=>x.student_id===selectedUser&&x.status==='active')} onClick={()=>void deactivateCourseAccess()}>Pause Access</button></div>
      {selectedUser&&<p className="muted" style={{marginTop:12}}>{accessPlans.find(x=>x.student_id===selectedUser)?.status==='active'?(accessTier==='all_courses'?'Current access: All published courses, including future courses.':'Current access: '+(courses.find(c=>c.id===accessCourse)?.title||'Single Course')+'.'):'No new subscription access plan is active. Existing legacy enrollments remain until a plan is assigned.'}</p>}
    </section>
    <section className="card admin-panel" style={{marginTop:24}}><div className="section-head"><div><div className="eyebrow">Secure account administration</div><h2>Reset Student Password</h2><p className="muted">Select the student above, then set a new password. Existing passwords cannot be viewed.</p></div></div><div className="wizard-form"><label>Student<input readOnly value={students.find(x=>x.id===selectedUser)?.email||'Select a student above'}/></label><label>New password<input type="password" minLength={8} autoComplete="new-password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><label>Confirm password<input type="password" minLength={8} autoComplete="new-password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)}/></label></div><button className="button button-primary" disabled={!selectedUser||resetBusy} onClick={()=>void resetStudentPassword()}>{resetBusy?'Resetting…':'Reset Password'}</button></section>
    <section className="card admin-panel" style={{marginTop:24}}>
      <div className="section-head"><div><div className="eyebrow">System settings</div><h2>Notification routing</h2><p className="muted">Change departmental notification addresses without editing code. Separate multiple addresses with commas.</p></div></div>
      {loading?<p className="muted">Loading notification routes…</p>:routes.length?<div className="user-list">{routes.map(route=><article className="user-row" key={route.route_key} style={{alignItems:'flex-start'}}><div className="avatar">✉</div><div className="user-details" style={{flex:1}}><strong>{route.label}</strong><small>{route.description}</small><input aria-label={`${route.label} recipients`} value={route.recipients.join(', ')} onChange={e=>updateRoute(route.route_key,{recipients:e.target.value.split(',').map(x=>x.trim())})} placeholder="name@jmonespac.org"/><label style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}><input type="checkbox" checked={route.enabled} onChange={e=>updateRoute(route.route_key,{enabled:e.target.checked})}/> Enabled</label></div><button className="button button-secondary" disabled={savingRoute===route.route_key} onClick={()=>void saveRoute(route)}>{savingRoute===route.route_key?'Saving…':'Save'}</button></article>)}</div>:<p className="muted">Run the notification-routing migration to activate these settings.</p>}
    </section>
  </>;
}
