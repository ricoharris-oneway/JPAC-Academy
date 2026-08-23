import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, SkeletonCards } from '../components/CreativeComponents';
import { WorkspaceHero } from '../components/WorkspaceHero';
import { useAuth } from '../context/AuthContext';
import { resolveDisplayName, type DisplayNameProfile } from '../lib/displayName';
import { supabase } from '../lib/supabase';

const postTypes = [
  ['practice_win', 'Practice win'],
  ['assignment_reflection', 'Assignment reflection'],
  ['class_question', 'Class question'],
  ['showcase_submission', 'Showcase submission'],
  ['peer_encouragement', 'Peer encouragement'],
  ['event_excitement', 'Event excitement'],
  ['challenge_response', 'JPAC challenge response'],
] as const;
const reactions = [
  ['applause', '👏', 'Applause'],
  ['celebrate', '🎉', 'Celebrate'],
  ['encourage', '💜', 'Encourage'],
  ['inspired', '✨', 'Inspired'],
] as const;
const reportReasons = [
  ['private_information', 'Private information'],
  ['bullying_or_harassment', 'Bullying or harassment'],
  ['unsafe_content', 'Unsafe content'],
  ['copyright', 'Copyright concern'],
  ['impersonation_or_deceptive_ai', 'Impersonation or deceptive AI'],
  ['inappropriate_content', 'Inappropriate content'],
  ['external_link', 'Unapproved external link'],
  ['other', 'Other'],
] as const;

type PostStatus = 'pending_review'|'approved'|'rejected'|'needs_revision'|'hidden'|'archived';
type Post = {id:string;author_id:string;post_type:string;body:string;status:PostStatus;media_url:string|null;is_announcement:boolean;review_note:string|null;created_at:string;updated_at:string};
type Reaction = {id:string;actor_id:string;post_id:string|null;reaction_type:string};
type Report = {id:string;post_id:string|null;reason_category:string;details:string|null;status:'open'|'reviewing';created_at:string};
type SafeProfile = DisplayNameProfile&{id:string};
type ModerationChoice = 'approve'|'reject'|'revision'|'hide'|'restore';

function readable(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function safeDate(value:string){const date=new Date(value);return Number.isNaN(date.valueOf())?'Date unavailable':date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
function validHttpsUrl(value:string){if(!value)return true;try{return new URL(value).protocol==='https:'}catch{return false}}

export function CommunityPage(){
  const{user,profile,loading:authLoading}=useAuth();
  const[feed,setFeed]=useState<Post[]>([]);
  const[moderationPosts,setModerationPosts]=useState<Post[]>([]);
  const[postReactions,setPostReactions]=useState<Reaction[]>([]);
  const[reports,setReports]=useState<Report[]>([]);
  const[profiles,setProfiles]=useState<Map<string,SafeProfile>>(new Map());
  const[staffAccess,setStaffAccess]=useState(false);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState('');
  const[postType,setPostType]=useState<(typeof postTypes)[number][0]>('practice_win');
  const[body,setBody]=useState('');
  const[mediaUrl,setMediaUrl]=useState('');
  const[announcement,setAnnouncement]=useState('');
  const[reportingPost,setReportingPost]=useState('');
  const[reportReason,setReportReason]=useState<(typeof reportReasons)[number][0]>('private_information');
  const[reportDetails,setReportDetails]=useState('');
  const[moderationNotes,setModerationNotes]=useState<Record<string,string>>({});
  const[reportNotes,setReportNotes]=useState<Record<string,string>>({});
  const roleSaysStaff=Boolean(profile&&['teacher','admin','developer'].includes(profile.role));
  const canAnnounce=staffAccess&&Boolean(profile&&['admin','developer'].includes(profile.role));

  const load=useCallback(async()=>{
    if(!user){setLoading(false);return}
    if(!supabase){setError('Community Wall is temporarily unavailable because the Academy data service is not configured.');setLoading(false);return}
    setLoading(true);setError('');
    const[feedResult,reactionResult]=await Promise.all([
      supabase.from('community_posts').select('id,author_id,post_type,body,status,media_url,is_announcement,review_note,created_at,updated_at').eq('status','approved').order('created_at',{ascending:false}).limit(60),
      supabase.from('community_reactions').select('id,actor_id,post_id,reaction_type'),
    ]);
    if(feedResult.error||reactionResult.error){setError(feedResult.error?.message||reactionResult.error?.message||'Community Wall could not load.');setLoading(false);return}
    const approved=(feedResult.data as Post[])||[];
    setFeed(approved);setPostReactions((reactionResult.data as Reaction[])||[]);
    let staffPosts:Post[]=[];let staffReports:Report[]=[];let staffAllowed=false;
    if(roleSaysStaff){
      const[moderationResult,reportsResult]=await Promise.all([
        supabase.from('community_posts').select('id,author_id,post_type,body,status,media_url,is_announcement,review_note,created_at,updated_at').in('status',['pending_review','needs_revision','approved','hidden']).order('created_at',{ascending:false}).limit(100),
        supabase.from('community_reports').select('id,post_id,reason_category,details,status,created_at').in('status',['open','reviewing']).order('created_at',{ascending:true}),
      ]);
      if(!moderationResult.error&&!reportsResult.error){staffAllowed=true;staffPosts=(moderationResult.data as Post[])||[];staffReports=(reportsResult.data as Report[])||[]}
    }
    setStaffAccess(staffAllowed);setModerationPosts(staffPosts);setReports(staffReports);
    const authorIds=[...new Set([...approved,...staffPosts].map(item=>item.author_id))];
    if(authorIds.length){
      const{data}=await supabase.from('profiles').select('id,display_name,full_name,first_name,last_name').in('id',authorIds);
      setProfiles(new Map(((data as SafeProfile[])||[]).map(item=>[item.id,item])));
    }else setProfiles(new Map());
    setLoading(false);
  },[user,roleSaysStaff]);

  useEffect(()=>{void load()},[load]);

  const reactionCounts=useMemo(()=>{
    const counts=new Map<string,number>();
    postReactions.forEach(item=>{if(item.post_id)counts.set(`${item.post_id}:${item.reaction_type}`,(counts.get(`${item.post_id}:${item.reaction_type}`)||0)+1)});
    return counts;
  },[postReactions]);
  const myReactions=useMemo(()=>new Map(postReactions.filter(item=>item.actor_id===user?.id&&item.post_id).map(item=>[`${item.post_id}:${item.reaction_type}`,item])),[postReactions,user?.id]);
  const pendingPosts=moderationPosts.filter(item=>item.status==='pending_review'||item.status==='needs_revision');
  const managedPosts=moderationPosts.filter(item=>item.status==='approved'||item.status==='hidden');
  function authorName(post:Post){const found=profiles.get(post.author_id);if(found)return resolveDisplayName(found,null);if(post.author_id===user?.id)return resolveDisplayName(profile,user);return 'JPAC Community Member'}
  function showMessage(value:string){setError('');setMessage(value)}

  async function submitPost(event:FormEvent){
    event.preventDefault();if(!user||!supabase)return;
    const cleanBody=body.trim();const cleanMedia=mediaUrl.trim();
    if(!cleanBody||cleanBody.length>4000){setError('Post text must be between 1 and 4,000 characters.');return}
    if(!validHttpsUrl(cleanMedia)){setError('Optional media must use a valid HTTPS URL.');return}
    setBusy('post');setError('');setMessage('');
    const{error:submitError}=await supabase.from('community_posts').insert({author_id:user.id,post_type:postType,body:cleanBody,status:'pending_review',media_url:cleanMedia||null,is_announcement:false,reviewed_by:null,reviewed_at:null});
    setBusy('');
    if(submitError){setError(submitError.message);return}
    setBody('');setMediaUrl('');showMessage('Submitted for review.');await load();
  }

  async function toggleReaction(postId:string,reactionType:string){
    if(!user||!supabase)return;const key=`${postId}:${reactionType}`;const existing=myReactions.get(key);setBusy(key);setError('');
    const result=existing?await supabase.from('community_reactions').delete().eq('id',existing.id):await supabase.from('community_reactions').insert({actor_id:user.id,post_id:postId,comment_id:null,reaction_type:reactionType});
    setBusy('');if(result.error){setError(result.error.message);return}await load();
  }

  async function submitReport(event:FormEvent){
    event.preventDefault();if(!user||!supabase||!reportingPost)return;
    setBusy(`report:${reportingPost}`);setError('');
    const{error:reportError}=await supabase.from('community_reports').insert({reporter_id:user.id,post_id:reportingPost,comment_id:null,reason_category:reportReason,details:reportDetails.trim()||null,status:'open',assigned_to:null,resolution:null,resolved_at:null});
    setBusy('');if(reportError){setError(reportError.message);return}
    setReportingPost('');setReportDetails('');showMessage('Report submitted for staff review.');
  }

  async function moderate(post:Post,choice:ModerationChoice){
    if(!user||!supabase||!staffAccess)return;const note=(moderationNotes[post.id]||'').trim();const noteRequired=['reject','revision','hide'].includes(choice);
    if(noteRequired&&!note){setError('A moderation note is required to reject, request revision, or hide a post.');return}
    const nextStatus:PostStatus=choice==='approve'||choice==='restore'?'approved':choice==='reject'?'rejected':choice==='revision'?'needs_revision':'hidden';
    const action=choice==='approve'?'approved_post':choice==='reject'?'rejected_post':choice==='revision'?'requested_revision':choice==='hide'?'hid_post':'restored_post';
    const now=new Date().toISOString();setBusy(`moderate:${post.id}`);setError('');
    const{data:updatedPost,error:updateError}=await supabase.from('community_posts').update({status:nextStatus,reviewed_by:user.id,reviewed_at:now,review_note:note||null,updated_at:now}).eq('id',post.id).eq('status',post.status).select('id').maybeSingle();
    if(updateError||!updatedPost){setBusy('');setError(updateError?.message||'This post changed before the action completed. Refresh and try again.');return}
    const{error:auditError}=await supabase.from('community_moderation_actions').insert({actor_id:user.id,post_id:post.id,comment_id:null,report_id:null,action,previous_status:post.status,new_status:nextStatus,reason:note||null,metadata:{source:'community_wall_v1_ui'}});
    setBusy('');
    if(auditError){setError(`The post status changed, but its moderation audit could not be recorded: ${auditError.message}`);await load();return}
    setModerationNotes(current=>({...current,[post.id]:''}));showMessage(`Post marked ${readable(nextStatus).toLowerCase()}.`);await load();
  }

  async function resolveReport(report:Report,nextStatus:'resolved'|'dismissed'){
    if(!user||!supabase||!staffAccess)return;const note=(reportNotes[report.id]||'').trim();
    if(!note){setError('A resolution note is required.');return}
    const now=new Date().toISOString();setBusy(`resolve:${report.id}`);setError('');
    const{data:updatedReport,error:updateError}=await supabase.from('community_reports').update({status:nextStatus,assigned_to:user.id,resolution:note,resolved_at:now,updated_at:now}).eq('id',report.id).in('status',['open','reviewing']).select('id').maybeSingle();
    if(updateError||!updatedReport){setBusy('');setError(updateError?.message||'This report changed before the action completed. Refresh and try again.');return}
    const{error:auditError}=await supabase.from('community_moderation_actions').insert({actor_id:user.id,post_id:null,comment_id:null,report_id:report.id,action:'resolved_report',previous_status:report.status,new_status:nextStatus,reason:note,metadata:{source:'community_wall_v1_ui'}});
    setBusy('');
    if(auditError){setError(`The report status changed, but its moderation audit could not be recorded: ${auditError.message}`);await load();return}
    showMessage(`Report ${nextStatus}.`);await load();
  }

  async function createAnnouncement(event:FormEvent){
    event.preventDefault();if(!user||!supabase||!canAnnounce)return;const clean=announcement.trim();
    if(!clean||clean.length>4000){setError('Announcement text must be between 1 and 4,000 characters.');return}
    const now=new Date().toISOString();setBusy('announcement');setError('');
    const{data,error:announcementError}=await supabase.from('community_posts').insert({author_id:user.id,post_type:'admin_announcement',body:clean,status:'approved',media_url:null,is_announcement:true,reviewed_by:user.id,reviewed_at:now,review_note:'Admin announcement',updated_at:now}).select('id').single();
    if(announcementError){setBusy('');setError(announcementError.message);return}
    const{error:auditError}=await supabase.from('community_moderation_actions').insert({actor_id:user.id,post_id:data.id,comment_id:null,report_id:null,action:'created_post',previous_status:null,new_status:'approved',reason:'Admin announcement',metadata:{source:'community_wall_v1_ui'}});
    setBusy('');if(auditError){setError(`The announcement was created, but its audit could not be recorded: ${auditError.message}`);await load();return}
    setAnnouncement('');showMessage('Admin announcement published to the internal feed.');await load();
  }

  if(authLoading)return <section className="card card-pad" role="status"><h1>Loading Community…</h1><SkeletonCards count={3}/></section>;
  if(!user)return <section className="card card-pad"><h1>Sign in required</h1><p className="muted">The JPAC Community Wall is available only inside the authenticated Academy.</p><Link className="button button-primary" to="/login">Sign in</Link></section>;
  if(loading)return <section className="card card-pad" role="status" aria-live="polite"><h1>Loading Community…</h1><p className="muted">Gathering approved internal posts.</p><SkeletonCards count={3}/></section>;
  if(error&&!feed.length)return <section className="card card-pad" role="alert"><h1>Community Wall unavailable</h1><p className="muted">{error}</p><button className="button button-primary" onClick={()=>void load()}>Try again</button></section>;

  return <div className="community-page">
    <WorkspaceHero eyebrow="JPAC Academy · Internal Community" title="Community Wall" description="Celebrate progress, ask class questions, and encourage the JPAC community in a moderated internal space." environment="student" ariaLabel="Community safety" ariaMessage="Posts are reviewed before they appear." stats={[{icon:'✨',value:feed.length,label:'Approved posts'},{icon:'🛡️',value:'Reviewed',label:'Before appearing'},{icon:'💜',value:'Positive',label:'Reactions only'}]}/>
    <div className="community-safety" role="note"><strong>Posts are reviewed before they appear.</strong><span>No private messaging, public sharing, or Facebook posting.</span></div>
    {message?<div className="admin-message" role="status">{message}</div>:null}
    {error?<div className="community-error" role="alert">{error}</div>:null}

    <div className="community-layout">
      <section className="card community-composer" aria-labelledby="community-create-title">
        <div className="eyebrow">Share with JPAC</div><h2 id="community-create-title">Create a post</h2>
        <form onSubmit={submitPost}>
          <label>Post type<select value={postType} onChange={event=>setPostType(event.target.value as typeof postType)}>{postTypes.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label>Your post<textarea value={body} maxLength={4000} onChange={event=>setBody(event.target.value)} placeholder="Share a win, reflection, question, or encouragement…"/><small>{body.length}/4000</small></label>
          <label>Optional approved media URL<input type="url" inputMode="url" value={mediaUrl} onChange={event=>setMediaUrl(event.target.value)} placeholder="https://…"/><small>HTTPS only. Media remains pending until staff review.</small></label>
          <button className="button button-primary" disabled={busy==='post'||!body.trim()}>{busy==='post'?'Submitting…':'Submit for review'}</button>
        </form>
      </section>

      <section className="community-feed" aria-labelledby="community-feed-title">
        <div className="community-section-heading"><div><div className="eyebrow">Approved internal feed</div><h2 id="community-feed-title">Latest from JPAC</h2></div><button className="button button-secondary" onClick={()=>void load()}>Refresh</button></div>
        {!feed.length?<EmptyState icon="💜" title="The Community Wall is ready" detail="Approved posts will appear here after staff review."/>:feed.map(post=><article className={`card community-post ${post.is_announcement?'announcement':''}`} key={post.id}>
          <header><span className="community-avatar">{authorName(post).split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{authorName(post)}</strong><small>{post.is_announcement?'Admin announcement':readable(post.post_type)} · {safeDate(post.created_at)}</small></div>{post.is_announcement?<b className="community-badge">Announcement</b>:null}</header>
          <p>{post.body}</p>
          {post.media_url?<a className="community-media-link" href={post.media_url} target="_blank" rel="noreferrer">Open approved media ↗</a>:null}
          <div className="community-post-actions" aria-label="Positive reactions">{reactions.map(([value,icon,label])=>{const key=`${post.id}:${value}`;const selected=myReactions.has(key);return <button type="button" key={value} className={selected?'selected':''} aria-pressed={selected} disabled={busy===key} onClick={()=>void toggleReaction(post.id,value)} title={label}><span>{icon}</span>{label}<b>{reactionCounts.get(key)||0}</b></button>})}<button type="button" className="report-button" onClick={()=>setReportingPost(current=>current===post.id?'':post.id)}>Report</button></div>
          {reportingPost===post.id?<form className="community-report-form" onSubmit={submitReport}><label>Reason<select value={reportReason} onChange={event=>setReportReason(event.target.value as typeof reportReason)}>{reportReasons.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Optional details<textarea maxLength={2000} value={reportDetails} onChange={event=>setReportDetails(event.target.value)}/></label><div><button className="button button-primary" disabled={busy===`report:${post.id}`}>Submit report</button><button className="button button-secondary" type="button" onClick={()=>setReportingPost('')}>Cancel</button></div></form>:null}
        </article>)}
      </section>
    </div>

    {staffAccess?<section className="community-staff" aria-labelledby="moderation-title"><div className="community-section-heading"><div><div className="eyebrow">Staff only</div><h2 id="moderation-title">Moderation queue</h2></div><span className="community-badge">{pendingPosts.length} awaiting review</span></div>
      {!pendingPosts.length?<div className="card community-compact-empty">No posts are awaiting review.</div>:<div className="community-moderation-grid">{pendingPosts.map(post=><ModerationCard key={post.id} post={post} note={moderationNotes[post.id]||''} setNote={value=>setModerationNotes(current=>({...current,[post.id]:value}))} busy={busy===`moderate:${post.id}`} author={authorName(post)} onAction={choice=>void moderate(post,choice)}/>)}</div>}
      {managedPosts.length?<><h3>Approved and hidden content controls</h3><div className="community-moderation-grid">{managedPosts.map(post=><ModerationCard key={post.id} post={post} note={moderationNotes[post.id]||''} setNote={value=>setModerationNotes(current=>({...current,[post.id]:value}))} busy={busy===`moderate:${post.id}`} author={authorName(post)} onAction={choice=>void moderate(post,choice)}/>)}</div></>:null}
      <div className="community-section-heading reports-heading"><div><div className="eyebrow">Safety review</div><h2>Open reports</h2></div><span className="community-badge">{reports.length}</span></div>
      {!reports.length?<div className="card community-compact-empty">No open reports.</div>:<div className="community-reports">{reports.map(report=><article className="card" key={report.id}><strong>{readable(report.reason_category)}</strong><small>Post {report.post_id?.slice(0,8)} · {safeDate(report.created_at)}</small>{report.details?<p>{report.details}</p>:null}<label>Resolution note<textarea maxLength={2000} value={reportNotes[report.id]||''} onChange={event=>setReportNotes(current=>({...current,[report.id]:event.target.value}))}/></label><div><button className="button button-primary" disabled={busy===`resolve:${report.id}`||!(reportNotes[report.id]||'').trim()} onClick={()=>void resolveReport(report,'resolved')}>Resolve</button><button className="button button-secondary" disabled={busy===`resolve:${report.id}`||!(reportNotes[report.id]||'').trim()} onClick={()=>void resolveReport(report,'dismissed')}>Dismiss</button></div></article>)}</div>}
      {canAnnounce?<section className="card community-announcement"><div className="eyebrow">Admin only</div><h2>Create an announcement</h2><form onSubmit={createAnnouncement}><label>Announcement<textarea maxLength={4000} value={announcement} onChange={event=>setAnnouncement(event.target.value)}/><small>{announcement.length}/4000</small></label><button className="button button-primary" disabled={busy==='announcement'||!announcement.trim()}>{busy==='announcement'?'Publishing…':'Publish internal announcement'}</button></form></section>:null}
    </section>:null}
  </div>;
}

function ModerationCard({post,note,setNote,busy,author,onAction}:{post:Post;note:string;setNote:(value:string)=>void;busy:boolean;author:string;onAction:(choice:ModerationChoice)=>void}){
  return <article className="card community-moderation-card"><header><div><strong>{author}</strong><small>{readable(post.post_type)} · {safeDate(post.created_at)}</small></div><span className={`community-status ${post.status}`}>{readable(post.status)}</span></header><p>{post.body}</p>{post.media_url?<a href={post.media_url} target="_blank" rel="noreferrer">Review media ↗</a>:null}<label>Moderation note<textarea maxLength={2000} value={note} onChange={event=>setNote(event.target.value)} placeholder="Required for reject, revision, or hide"/></label><div className="community-moderation-actions">{post.status==='pending_review'||post.status==='needs_revision'?<><button className="button button-primary" disabled={busy} onClick={()=>onAction('approve')}>Approve</button><button className="button button-secondary" disabled={busy||!note.trim()} onClick={()=>onAction('revision')}>Request revision</button><button className="button button-secondary" disabled={busy||!note.trim()} onClick={()=>onAction('reject')}>Reject</button></>:null}{post.status!=='hidden'?<button className="button button-secondary" disabled={busy||!note.trim()} onClick={()=>onAction('hide')}>Hide</button>:<button className="button button-primary" disabled={busy} onClick={()=>onAction('restore')}>Restore</button>}</div></article>;
}
