import{useEffect,useMemo,useState}from'react';
import{Link}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{supabase}from'../lib/supabase';
import{loadMyCourses,type AcademyCourse}from'../lib/studentAccess';

type CommunityPost={
  id:string;author_id:string;course_id:string;post_type:string;title:string|null;body:string;media_url:string|null;status:string;review_note:string|null;created_at:string;published_at:string|null;
  author:{display_name?:string|null;avatar_url?:string|null}|{display_name?:string|null;avatar_url?:string|null}[]|null;
};
const sections=[
  {id:'showcase_submission',label:'Show Your Work',icon:'🎬',description:'Share a project, performance, track, video, photo, or creative milestone.'},
  {id:'class_question',label:'Ask & Share',icon:'💬',description:'Ask a question or start a useful conversation about your program.'},
  {id:'practice_win',label:'Wins & Milestones',icon:'🏆',description:'Celebrate progress, breakthroughs, finished work, and creative wins.'},
  {id:'challenge_response',label:'Ideas & Inspiration',icon:'💡',description:'Share creative ideas, prompts, references, and inspiration with your program community.'},
] as const;
const one=<T,>(value:T|T[]|null|undefined)=>Array.isArray(value)?value[0]:value;

export function CommunityPage(){
  const{profile}=useAuth();
  const[courses,setCourses]=useState<AcademyCourse[]>([]);
  const[selectedCourse,setSelectedCourse]=useState('');
  const[selectedSection,setSelectedSection]=useState<(typeof sections)[number]['id']>('showcase_submission');
  const[posts,setPosts]=useState<CommunityPost[]>([]);
  const[title,setTitle]=useState('');
  const[body,setBody]=useState('');
  const[mediaUrl,setMediaUrl]=useState('');
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  useEffect(()=>{let active=true;void loadMyCourses().then(({data,error})=>{if(!active)return;setCourses(data);setSelectedCourse(current=>current||data[0]?.course_id||'');setMessage(error||'');setLoading(false)});return()=>{active=false}},[]);
  useEffect(()=>{if(selectedCourse)void loadPosts()},[selectedCourse]);

  async function loadPosts(){
    if(!supabase||!selectedCourse)return;
    const{data,error}=await supabase.from('community_posts')
      .select('id,author_id,course_id,post_type,title,body,media_url,status,review_note,created_at,published_at,author:profiles!community_posts_author_id_fkey(display_name,avatar_url)')
      .eq('course_id',selectedCourse)
      .order('created_at',{ascending:false})
      .limit(80);
    setPosts((data as CommunityPost[]|null)||[]);
    if(error)setMessage(error.message);
  }

  async function submit(){
    if(!supabase||!profile||!selectedCourse||!title.trim()||!body.trim())return;
    setBusy(true);setMessage('');
    const{error}=await supabase.from('community_posts').insert({
      author_id:profile.id,course_id:selectedCourse,post_type:selectedSection,title:title.trim(),body:body.trim(),
      media_url:mediaUrl.trim()||null,status:'pending_review',is_announcement:false,reviewed_by:null,reviewed_at:null
    });
    setBusy(false);
    if(error){setMessage(error.message);return}
    setTitle('');setBody('');setMediaUrl('');
    setMessage('Submitted for review. A teacher or administrator must approve it before the community can see it.');
    await loadPosts();
  }

  const approved=useMemo(()=>posts.filter(post=>post.status==='approved'),[posts]);
  const minePending=useMemo(()=>posts.filter(post=>post.author_id===profile?.id&&post.status!=='approved'),[posts,profile?.id]);
  const selectedCourseRecord=courses.find(course=>course.course_id===selectedCourse);

  if(loading)return <div className="card card-pad">Loading your community…</div>;
  return <div className="community-page">
    <header className="community-hero"><div><span className="member-kicker">JPAC CREATIVE COMMUNITY</span><h1>Find your people.<br/><em>Create together.</em></h1><p>Share inside the programs you belong to. Student posts are reviewed by JPAC staff before they are released to the community.</p></div><div className="community-safe-badge">✓ Moderated by JPAC</div></header>

    {message&&<div className="admin-message" role="status">{message}</div>}

    <section className="community-programs"><div className="section-head"><div><div className="eyebrow">Your spaces</div><h2>My Program Communities</h2></div></div>
      {courses.length?<div className="community-program-tabs">{courses.map(course=><button key={course.course_id} className={selectedCourse===course.course_id?'active':''} onClick={()=>setSelectedCourse(course.course_id)}><span>🎓</span><div><strong>{course.title}</strong><small>{selectedCourse===course.course_id?'Current community':'Open community'}</small></div></button>)}</div>:<div className="card card-pad"><h3>No active program community yet</h3><p className="muted">Community posting opens when you have an active JPAC course enrollment.</p><Link className="button button-primary" to="/programs">Explore Programs</Link></div>}
    </section>

    {selectedCourse&&<><section className="community-sections"><div className="section-head"><div><div className="eyebrow">{selectedCourseRecord?.title}</div><h2>Choose where to post</h2></div></div><div className="community-section-grid">{sections.map(section=><button key={section.id} className={selectedSection===section.id?'active':''} onClick={()=>setSelectedSection(section.id)}><span>{section.icon}</span><strong>{section.label}</strong><small>{section.description}</small></button>)}</div></section>

    <section className="community-compose card"><div className="community-compose-head"><div><div className="eyebrow">Submit to {sections.find(s=>s.id===selectedSection)?.label}</div><h2>Share with your program</h2><p>Every student submission goes to a teacher/admin review queue first.</p></div><span className="member-pill">REVIEW REQUIRED</span></div>
      <label>Post title<input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give your post a clear title"/></label>
      <label>What would you like to share?<textarea maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Share your work, question, progress, or idea…"/></label>
      <label>Optional media or project link<input type="url" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="https://…"/></label>
      <button className="button button-primary" disabled={busy||!title.trim()||!body.trim()} onClick={()=>void submit()}>{busy?'Submitting…':'Submit for JPAC Review'}</button>
    </section>

    {minePending.length>0&&<section className="community-feed-section"><div className="section-head"><div><div className="eyebrow">Your submissions</div><h2>Waiting on Review</h2></div></div><div className="community-feed">{minePending.map(post=><article className="community-post pending" key={post.id}><div className="community-post-meta"><span>⏳ {post.status.replaceAll('_',' ')}</span><time>{new Date(post.created_at).toLocaleString()}</time></div><h3>{post.title}</h3><p>{post.body}</p>{post.review_note&&<small>JPAC note: {post.review_note}</small>}</article>)}</div></section>}

    <section className="community-feed-section"><div className="section-head"><div><div className="eyebrow">Approved by JPAC</div><h2>{selectedCourseRecord?.title} Community</h2></div></div>{approved.length?<div className="community-feed">{approved.map(post=>{const author=one(post.author);const section=sections.find(item=>item.id===post.post_type);return <article className="community-post" key={post.id}><div className="community-post-meta"><span>{section?.icon||'✨'} {section?.label||post.post_type.replaceAll('_',' ')}</span><time>{new Date(post.published_at||post.created_at).toLocaleDateString()}</time></div><div className="community-author"><div className="community-avatar">{(author?.display_name||'JPAC Student').slice(0,1).toUpperCase()}</div><strong>{author?.display_name||'JPAC Student'}</strong></div><h3>{post.title}</h3><p>{post.body}</p>{post.media_url&&<a className="button button-secondary" href={post.media_url} target="_blank" rel="noreferrer">Open shared project ↗</a>}</article>})}</div>:<div className="card card-pad"><h3>Be the first to share.</h3><p className="muted">Approved student posts for this program will appear here.</p></div>}</section></>}

    <section className="facebook-community card"><div className="facebook-community-copy"><span className="member-kicker">LIVE JPAC COMMUNITY</span><h2>What’s happening at JPAC</h2><p>Follow performances, events, announcements, student highlights, and public community activity from J. Moné’s Performing Arts Center.</p><a className="button button-primary" href="https://www.facebook.com/jmonespac" target="_blank" rel="noreferrer">Open JPAC on Facebook ↗</a><small>If Facebook blocks the embedded timeline in your browser, use the button above to open the live page directly.</small></div><div className="facebook-frame"><iframe title="J. Moné's Performing Arts Center Facebook feed" src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fjmonespac&tabs=timeline&width=500&height=650&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true" width="500" height="650" style={{border:'none',overflow:'hidden',width:'100%'}} scrolling="no" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"/></div></section>
  </div>;
}
