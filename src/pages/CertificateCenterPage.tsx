import{useEffect,useState}from'react';
import{Link}from'react-router-dom';
import{supabase}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';
import{WorkspaceHero}from'../components/WorkspaceHero';

type Certificate={id:string;certificate_number:string;title:string;verification_token:string;status:string;issued_at:string};
type Portfolio={id:string;title:string;description:string;project_type:string;status:string;featured:boolean;media_assets:{external_url:string|null}[]|null};

export function CertificateCenterPage(){
  const{profile}=useAuth();const[certificates,setCertificates]=useState<Certificate[]>([]);const[portfolio,setPortfolio]=useState<Portfolio[]>([]);const[message,setMessage]=useState('');
  const[form,setForm]=useState({title:'',description:'',project_type:'project',url:''});
  async function load(){
    if(!supabase||!profile)return;
    const certificateQuery=supabase.from('certificates').select('id,certificate_number,title,verification_token,status,issued_at').order('issued_at',{ascending:false});
    const portfolioQuery=supabase.from('portfolio_projects').select('id,title,description,project_type,status,featured,media_assets(external_url)').order('created_at',{ascending:false});
    if(profile.role==='student'){certificateQuery.eq('student_id',profile.id);portfolioQuery.eq('student_id',profile.id)}
    const[{data:c,error:ce},{data:p,error:pe}]=await Promise.all([certificateQuery,portfolioQuery]);setCertificates((c as Certificate[])||[]);setPortfolio((p as Portfolio[])||[]);setMessage(ce?.message||pe?.message||'')
  }
  useEffect(()=>{void load()},[profile]);
  async function addProject(){
    if(!supabase||!profile||!form.title.trim())return;
    const{data,error}=await supabase.from('portfolio_projects').insert({student_id:profile.id,title:form.title.trim(),description:form.description.trim(),project_type:form.project_type,status:'draft'}).select('id').single();
    if(error){setMessage(error.message);return}
    if(form.url.trim()){const{error:mediaError}=await supabase.from('media_assets').insert({student_id:profile.id,portfolio_project_id:data.id,asset_type:'link',title:form.title.trim(),external_url:form.url.trim()});if(mediaError){setMessage(mediaError.message);return}}
    setForm({title:'',description:'',project_type:'project',url:''});await load()
  }
  async function feature(id:string){if(!supabase)return;const target=portfolio.find(item=>item.id===id);await supabase.from('portfolio_projects').update({featured:false}).eq('student_id',profile?.id);const{error}=await supabase.from('portfolio_projects').update({featured:!target?.featured}).eq('id',id);setMessage(error?.message||'');if(!error)await load()}
  const issued=certificates.filter(item=>item.status==='issued');
  return <div className="creative-passport"><WorkspaceHero eyebrow="Creative Passport" title="Verified credentials and portfolio evidence" description="Credentials and projects shown here are stored in the Academy database." environment="career" stats={[{icon:'📜',value:issued.length,label:'Issued credentials'},{icon:'🎬',value:portfolio.length,label:'Portfolio projects'}]}/>{message&&<div className="admin-message">{message}</div>}<div className="passport-layout"><section className="card passport-section"><h2>Verified credentials</h2>{issued.length?issued.map(item=><article className="passport-certificate" key={item.id}><h3>{item.title}</h3><code>{item.certificate_number}</code><Link className="button button-secondary" to={`/verify/${item.verification_token}`}>Verify</Link></article>):<p className="muted">No issued credentials yet.</p>}</section><section className="card passport-section"><h2>Portfolio projects</h2>{portfolio.length?portfolio.map(item=><article className="portfolio-item" key={item.id}><div><small>{item.project_type} · {item.status}</small><h3>{item.title}</h3><p>{item.description}</p>{item.media_assets?.[0]?.external_url&&<a href={item.media_assets[0].external_url} target="_blank" rel="noreferrer">Open evidence</a>}<button className="text-link" onClick={()=>void feature(item.id)}>{item.featured?'Remove feature':'Feature project'}</button></div></article>):<p className="muted">No portfolio projects yet.</p>}</section></div>{profile?.role==='student'&&<section className="card passport-section portfolio-builder"><h2>Add portfolio evidence</h2><label>Title<input value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/></label><label>Type<select value={form.project_type} onChange={event=>setForm({...form,project_type:event.target.value})}><option value="project">Project</option><option value="performance">Performance</option><option value="audio">Audio</option><option value="video">Video</option><option value="photo">Photo</option><option value="writing">Writing</option></select></label><label>Description<textarea value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/></label><label>Evidence link<input type="url" value={form.url} onChange={event=>setForm({...form,url:event.target.value})}/></label><button className="button button-primary" disabled={!form.title.trim()} onClick={()=>void addProject()}>Save project</button></section>}</div>
}
