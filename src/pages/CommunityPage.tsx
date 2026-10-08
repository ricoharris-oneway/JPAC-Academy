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
const MAX_UPLOAD_BYTES=50*1024*1024;
const ACCEPTED_UPLOADS='.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.m4v,.webm';
const storagePath=(value:string|null)=>value?.startsWith('storage:')?value.slice('storage:'.length):null;
const fileNameFromPath=(value:string|null)=>{const path=storagePath(value);if(!path)return'';const raw=path.split('/').pop()||'Student file';return raw.replace(/^community-[0-9a-f-]+-/i,'')};
const attachmentKind=(value:string|null)=>{const name=fileNameFromPath(value).toLowerCase();if(/\.(mp3|wav|m4a|aac|ogg)$/.test(name))return'audio';if(/\.(mp4|mov|m4v|webm)$/.test(name))return'video';if(/\.(jpg|jpeg|png|webp)$/.test(name))return'image';if(/\.(xls|xlsx|csv)$/.test(name))return'spreadsheet';return'document'};

export function CommunityPage(){
  const{profile}=useAuth();
  const[courses,setCourses]=useState<AcademyCourse[]>([]);
  const[selectedCourse,setSelectedCourse]=useState('');
  const[selectedSection,setSelectedSection]=useState<(typeof sections)[number]['id']>('showcase_submission');
  const[posts,setPosts]=useState<CommunityPost[]>([]);
  const[title,setTitle]=useState('');
  const[body,setBody]=useState('');
  const[mediaUrl,setMediaUrl]=useState('');
  const[file,setFile]=useState<File|null>(null);
  const[signedUrls,setSignedUrls]=useState<Record<string,string>>({});
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
    const rows=(data as CommunityPost[]|null)||[];
    setPosts(rows);
    const secured=await Promise.all(rows.filter(post=>storagePath(post.media_url)).map(async post=>{
      const path=storagePath(post.media_url);
      if(!path||!supabase)return[post.id,'']as const;
      const{data:signed}=await supabase.storage.from('performance-submissions').createSignedUrl(path,900);
      return[post.id,signed?.signedUrl||'']as const;
    }));
    setSignedUrls(Object.fromEntries(secured.filter(([,url])=>url)));
    if(error)setMessage(error.message);
  }

  function selectFile(next:File|null){
    if(!next){setFile(null);return}
    if(next.size>MAX_UPLOAD_BYTES){setFile(null);setMessage('That file is larger than 50 MB. Choose a smaller file for this submission.');return}
    const extension='.'+(next.name.split('.').pop()||'').toLowerCase();
    const allowed=ACCEPTED_UPLOADS.split(',').includes(extension);
    if(!allowed){setFile(null);setMessage('Unsupported file type. Upload a document, spreadsheet, image, audio file, or video.');return}
    setMessage('');
    setFile(next);
  }

  async function submit(){
    if(!supabase||!profile||!selectedCourse||!title.trim()||(!body.trim()&&!file&&!mediaUrl.trim()))return;
    setBusy(true);setMessage('');
    let uploadedPath='';
    let storedMedia=mediaUrl.trim()||null;
    if(file){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
      uploadedPath=`${profile.id}/community-${crypto.randomUUID()}-${safe}`;
      const{error:uploadError}=await supabase.storage.from('performance-submissions').upload(uploadedPath,file,{contentType:file.type||undefined,upsert:false});
      if(uploadError){setBusy(false);setMessage(uploadError.message);return}
      storedMedia=`storage:${uploadedPath}`;
    }
    const{error}=await supabase.from('community_posts').insert({
      author_id:profile.id,course_id:selectedCourse,post_type:selectedSection,title:title.trim(),body:body.trim(),
      media_url:storedMedia,status:'pending_review',is_announcement:false,reviewed_by:null,reviewed_at:null
    });
    if(error&&uploadedPath)await supabase.storage.from('performance-submissions').remove([uploadedPath]);
    setBusy(false);
    if(error){setMessage(error.message);return}
    setTitle('');setBody('');setMediaUrl('');setFile(null);
    setMessage('Submitted successfully. Your work is safely recorded and is now waiting for teacher/admin approval.');
    await loadPosts();
  }

  const approved=useMemo(()=>posts.filter(post=>post.status==='approved'),[posts]);
  const minePending=useMemo(()=>posts.filter(post=>post.author_id===profile?.id&&post.status!=='approved'),[posts,profile?.id]);
  const selectedCourseRecord=courses.find(course=>course.course_id===selectedCourse);
  const canSubmit=Boolean(title.trim()&&(body.trim()||file||mediaUrl.trim()));

  function Attachment({post,compact=false}:{post:CommunityPost;compact?:boolean}){
    const path=storagePath(post.media_url);
    if(!post.media_url)return null;
    if(!path)return <a className="button button-secondary" href={post.media_url} target="_blank" rel="noreferrer">Open shared project ↗</a>;
    const url=signedUrls[post.id];
    const kind=attachmentKind(post.media_url);
    const name=fileNameFromPath(post.media_url)||'Student submission';
    return <div className={`community-attachment ${compact?'compact':''}`}>
      <div className="community-attachment-head"><span>{kind==='audio'?'🎵':kind==='video'?'🎬':kind==='image'?'🖼️':kind==='spreadsheet'?'📊':'📄'}</span><div><strong>{name}</strong><small>{kind.replace(/^./,c=>c.toUpperCase())} submission</small></div></div>
      {url&&kind==='audio'&&<audio controls preload="metadata" src={url}/>}
      {url&&kind==='video'&&<video controls preload="metadata" src={url}/>}
      {url&&kind==='image'&&<img src={url} alt={name}/>}
      {url?<a className="button button-secondary" href={url} target="_blank" rel="noreferrer">Open secure file ↗</a>:<small className="muted">Secure preview is available to authorized reviewers and viewers.</small>}
    </div>;
  }

  if(loading)return <div className="card card-pad">Loading your community…</div>;
  return <div className="community-page">
    <header className="community-hero"><div><span className="member-kicker">JPAC CREATIVE COMMUNITY</span><h1>Find your people.<br/><em>Create together.</em></h1><p>Share inside the programs you belong to. Student posts and uploaded work are reviewed by JPAC staff before they are released to the community.</p></div><div className="community-safe-badge">✓ Moderated by JPAC</div></header>

    {message&&<div className="admin-message" role="status">{message}</div>}

    <section className="community-programs"><div className="section-head"><div><div className="eyebrow">Your spaces</div><h2>My Program Communities</h2></div></div>
      {courses.length?<div className="community-program-tabs">{courses.map(course=><button key={course.course_id} className={selectedCourse===course.course_id?'active':''} onClick={()=>setSelectedCourse(course.course_id)}><span>🎓</span><div><strong>{course.title}</strong><small>{selectedCourse===course.course_id?'Current community':'Open community'}</small></div></button>)}</div>:<div className="card card-pad"><h3>No active program community yet</h3><p className="muted">Community posting opens when you have an active JPAC course enrollment.</p><Link className="button button-primary" to="/programs">Explore Programs</Link></div>}
    </section>

    {selectedCourse&&<><section className="community-sections"><div className="section-head"><div><div className="eyebrow">{selectedCourseRecord?.title}</div><h2>Choose where to post</h2></div></div><div className="community-section-grid">{sections.map(section=><button key={section.id} className={selectedSection===section.id?'active':''} onClick={()=>setSelectedSection(section.id)}><span>{section.icon}</span><strong>{section.label}</strong><small>{section.description}</small></button>)}</div></section>

    <section className="facebook-community card">
      <div className="facebook-community-copy">
        <span className="member-kicker">LIVE JPAC COMMUNITY</span><h2>What’s happening at JPAC</h2><p>Follow performances, events, announcements, student highlights, and public community activity from J. Moné’s Performing Arts Center.</p><a className="button button-primary" href="https://www.facebook.com/jmonespac" target="_blank" rel="noreferrer">Open JPAC on Facebook ↗</a>
        <div className="community-submit-panel">
          <div className="community-compose-head"><div><div className="eyebrow">Student Submission Center</div><h3>Submit your work</h3><p>Upload documents, spreadsheets, music, images, or video. Every submission is private until a teacher or administrator approves it.</p></div><span className="member-pill">REVIEW REQUIRED</span></div>
          <label>Submission title<input maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name your project or assignment"/></label>
          <label>Description or notes<textarea maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Tell your instructor what you are submitting, what you want reviewed, or any context they should know."/></label>
          <label className="community-upload-drop">
            <input type="file" accept={ACCEPTED_UPLOADS} onChange={event=>selectFile(event.target.files?.[0]||null)}/>
            <span className="community-upload-icon">↑</span>
            <strong>{file?.name||'Drop a file here or choose a file'}</strong>
            <small>{file?`${Math.max(.01,file.size/1024/1024).toFixed(2)} MB · ready to submit`:'PDF, Word, Excel/CSV, PowerPoint, images, MP3/WAV/M4A, MP4/MOV/WebM · up to 50 MB'}</small>
          </label>
          {file&&<button className="community-file-remove" type="button" onClick={()=>setFile(null)}>Remove selected file</button>}
          <label>Optional project link<input type="url" value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="https://…"/></label>
          {file&&mediaUrl.trim()&&<small className="muted">The uploaded file will be submitted as the primary evidence. Keep the link in your description if staff also need it.</small>}
          <button className="button button-primary community-submit-button" disabled={busy||!canSubmit} onClick={()=>void submit()}>{busy?'Uploading and submitting…':'Submit for JPAC Review'}</button>
          <small className="community-privacy-note">🔒 Student uploads stay in JPAC’s private submission storage and are reviewed before release.</small>
        </div>
        <small>If Facebook blocks the embedded timeline in your browser, use the button above to open the live page directly.</small>
      </div>
      <div className="facebook-frame"><iframe title="J. Moné's Performing Arts Center Facebook feed" src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fjmonespac&tabs=timeline&width=500&height=650&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true" width="500" height="650" style={{border:'none',overflow:'hidden',width:'100%'}} scrolling="no" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"/></div>
    </section>

    {minePending.length>0&&<section className="community-feed-section"><div className="section-head"><div><div className="eyebrow">Your submissions</div><h2>Submission Status</h2></div></div><div className="community-feed">{minePending.map(post=><article className="community-post pending" key={post.id}><div className="community-post-meta"><span>⏳ {post.status.replaceAll('_',' ')}</span><time>{new Date(post.created_at).toLocaleString()}</time></div><h3>{post.title}</h3>{post.body&&<p>{post.body}</p>}<Attachment post={post} compact/>{post.review_note&&<small>JPAC note: {post.review_note}</small>}</article>)}</div></section>}

    <section className="community-feed-section"><div className="section-head"><div><div className="eyebrow">Approved by JPAC</div><h2>{selectedCourseRecord?.title} Community</h2></div></div>{approved.length?<div className="community-feed">{approved.map(post=>{const author=one(post.author);const section=sections.find(item=>item.id===post.post_type);return <article className="community-post" key={post.id}><div className="community-post-meta"><span>{section?.icon||'✨'} {section?.label||post.post_type.replaceAll('_',' ')}</span><time>{new Date(post.published_at||post.created_at).toLocaleDateString()}</time></div><div className="community-author"><div className="community-avatar">{(author?.display_name||'JPAC Student').slice(0,1).toUpperCase()}</div><strong>{author?.display_name||'JPAC Student'}</strong></div><h3>{post.title}</h3>{post.body&&<p>{post.body}</p>}<Attachment post={post}/></article>})}</div>:<div className="card card-pad"><h3>Be the first to share.</h3><p className="muted">Approved student posts and projects for this program will appear here.</p></div>}</section></>}
  </div>;
}
