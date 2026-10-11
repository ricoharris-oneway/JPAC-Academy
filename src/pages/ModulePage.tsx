import{useEffect,useMemo,useRef,useState}from'react';
import{Link,useParams}from'react-router-dom';
import{loadCourseContent,type CourseModule}from'../lib/studentAccess';
import{supabase}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';
import{AriaFeedback,LearnSection,LevelUpCard,MasteryChecklist,MissionBrief,MissionNextStep,MissionProgress,PracticeChallenge,SubmissionHistory,WatchSection,type MissionActivity,type MissionAttempt,type MissionCompletion}from'../components/MissionExperience';
import{JPACCoachPanel}from'../features/ai-instructor/components/JPACCoachPanel';
import{buildModuleCoachContext}from'../features/ai-instructor/contextBuilder';

type CourseRecord={id:string;title:string};
type BonusAward={source_id:string|null;amount:number};
const matchesDataTitle=(activity:MissionActivity,data?:Record<string,string>)=>Boolean(data?.title&&activity.title.toLowerCase().includes(data.title.toLowerCase()));

export function ModulePage(){
  const{courseId='',moduleId=''}=useParams();const{user}=useAuth();
  const[course,setCourse]=useState<CourseRecord|null>(null);const[module,setModule]=useState<CourseModule|null>(null);const[courseModules,setCourseModules]=useState<CourseModule[]>([]);const[lessons,setLessons]=useState<Awaited<ReturnType<typeof loadCourseContent>>['lessons']>([]);const[progress,setProgress]=useState<Awaited<ReturnType<typeof loadCourseContent>>['progress']>([]);const[activities,setActivities]=useState<MissionActivity[]>([]);const[completion,setCompletion]=useState<MissionCompletion|null>(null);const[attempts,setAttempts]=useState<MissionAttempt[]>([]);const[bonusAwards,setBonusAwards]=useState<BonusAward[]>([]);const[file,setFile]=useState<File|null>(null);const[submissionReceipt,setSubmissionReceipt]=useState<{submissionId:string;fileName:string;submittedAt:string;attempt:number;status:string}|null>(null);const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[submissionStage,setSubmissionStage]=useState<'idle'|'uploading'|'creating'|'verifying'|'verified'|'error'>('idle');const[submissionError,setSubmissionError]=useState('');const[acknowledgingVideo,setAcknowledgingVideo]=useState(false);const[message,setMessage]=useState('');const lastVideoSecond=useRef(-10);

  async function load(background=false){
    if(!background)setLoading(true);const result=await loadCourseContent(courseId);const selected=result.modules.find(item=>item.id===moduleId)||null;
    setCourse(result.course as CourseRecord|null);setModule(selected);setCourseModules(result.modules);setLessons(selected?result.lessons.filter(item=>item.module_id===selected.id):[]);setProgress(result.progress);if(!background){setActivities([]);setCompletion(null);setAttempts([]);setBonusAwards([]);}
    if(result.error||!selected||!supabase||!user){setMessage(result.error||(!selected?'This mission is locked, unavailable, or outside your enrolled course.':''));setLoading(false);return}
    const[activityResult,completionResult,bonusResult]=await Promise.all([
      supabase.from('activities').select('id,title,description,instructions,activity_type,submission_type,xp_reward,xp_type,required,rubric').eq('module_id',selected.id).eq('status','published'),
      supabase.rpc('jpac_module_completion',{target_student:user.id,target_module:selected.id}),
      supabase.from('xp_ledger').select('source_id,amount').eq('student_id',user.id).eq('module_id',selected.id).eq('xp_type','bonus'),
    ]);
    const activityRows=(activityResult.data as MissionActivity[]|null)||[];setActivities(activityRows);setCompletion(Array.isArray(completionResult.data)?(completionResult.data[0]as MissionCompletion||null):null);setBonusAwards((bonusResult.data as BonusAward[]|null)||[]);
    let historyError='';if(activityRows.length){const historyResult=await supabase.from('submissions').select('id,activity_id,attempt_number,status,score,teacher_feedback,submitted_at,media_name,media_type,media_url').eq('student_id',user.id).in('activity_id',activityRows.map(item=>item.id)).order('attempt_number',{ascending:false});setAttempts((historyResult.data as MissionAttempt[]|null)||[]);historyError=historyResult.error?.message||''}
    setMessage(activityResult.error?.message||completionResult.error?.message||bonusResult.error?.message||historyError);if(!background)setLoading(false);
  }
  useEffect(()=>{lastVideoSecond.current=-10;void load()},[courseId,moduleId,user?.id]);
  useEffect(()=>{if(!loading&&window.location.hash==='#guided-workflow'){window.setTimeout(()=>document.getElementById('guided-workflow')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}},[loading,moduleId]);
  useEffect(()=>{if(!user||loading||completion?.is_complete)return;const refresh=()=>{if(document.visibilityState==='visible')void load(true)};const timer=window.setInterval(refresh,12000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[user?.id,moduleId,loading,completion?.is_complete]);
  useEffect(()=>{if(!supabase||!user)return;const channel=supabase.channel(`module-submissions-${moduleId}-${user.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'submissions',filter:`student_id=eq.${user.id}`},()=>{void load(true)}).subscribe();return()=>{void supabase.removeChannel(channel)}},[moduleId,user?.id]);

  const requiredActivity=activities.find(activity=>activity.required)||null;
  const optionalActivities=activities.filter(activity=>!activity.required&&activity.xp_type==='bonus');
  const labActivity=optionalActivities.find(activity=>/^jpac\b/i.test(activity.title)||matchesDataTitle(activity,module?.jpac_tool_activity))||null;
  const realWorldActivity=optionalActivities.find(activity=>activity.id!==labActivity?.id&&(/^real[- ]world\b/i.test(activity.title)||matchesDataTitle(activity,module?.real_world_activity)))||optionalActivities.find(activity=>activity.id!==labActivity?.id)||null;
  const otherPractice=optionalActivities.filter(activity=>activity.id!==labActivity?.id&&activity.id!==realWorldActivity?.id);
  const bonusEarned=bonusAwards.reduce((sum,row)=>sum+Number(row.amount||0),0);const awardedSources=new Set(bonusAwards.map(row=>row.source_id).filter(Boolean));
  const bonusAvailable=optionalActivities.length?optionalActivities.reduce((sum,item)=>sum+Number(item.xp_reward||0),0):Number(module?.bonus_xp_available||0);
  const requiredAttempts=requiredActivity?attempts.filter(item=>item.activity_id===requiredActivity.id):[];const latest=requiredAttempts[0]||null;const latestAssessed=requiredAttempts.find(item=>item.score!==null)||null;const hasRevision=latest?.status==='revision_requested';const reviewPending=latest?.status==='submitted'||latest?.status==='under_review';const assignmentApproved=latest?.status==='approved'||Boolean(completion?.assessment_passed);const canSubmit=!latest||hasRevision;
  const nextModule=useMemo(()=>{if(!module)return null;return courseModules.filter(item=>item.sort_order>module.sort_order).sort((a,b)=>a.sort_order-b.sort_order)[0]||null},[courseModules,module]);
  const sameLevelNext=Boolean(nextModule&&nextModule.level_number===module?.level_number);

  async function completeIntro(){if(!supabase)return;setBusy(true);const{data,error}=await supabase.rpc('jpac_complete_module_intro',{target_module:moduleId});setBusy(false);setMessage(error?.message||(Number(data)>0?'Mission started. 50 Core XP earned.':'Mission intro was already complete; no duplicate Core XP was awarded.'));if(!error)await load()}
  async function trackVideo({watched:currentTime,duration}:{watched:number;duration:number}){if(!supabase||!Number.isFinite(duration)||duration<=0)return;const watched=Math.floor(currentTime);const ratio=currentTime/duration;if(watched-lastVideoSecond.current<5&&ratio<.9)return;lastVideoSecond.current=watched;const{data,error}=await supabase.rpc('jpac_record_module_video_progress',{target_module:moduleId,watched,duration:Math.floor(duration)});if(error){setMessage(error.message);return}const recorded=Math.max(0,Math.min(100,Number(data||0)));setCompletion(current=>current?{...current,video_percent:Math.max(Number(current.video_percent||0),recorded)}:current);if(recorded>=90&&Number(completion?.video_percent||0)<90)await load()}
  async function acknowledgeVideo(){if(!supabase||acknowledgingVideo||Number(completion?.video_percent||0)>=90)return;setAcknowledgingVideo(true);const{data,error}=await supabase.rpc('jpac_acknowledge_module_video',{target_module:moduleId});setAcknowledgingVideo(false);if(error){setMessage(error.message);return}const recorded=Math.max(90,Math.min(100,Number(data||100)));setCompletion(current=>current?{...current,video_percent:recorded}:current);setMessage('Video acknowledged. This Core requirement is complete.');await load(true)}
  function normalizedSubmissionType(selected:File,activity:MissionActivity){
    const declared=(selected.type||'').toLowerCase();
    const ext=selected.name.toLowerCase().split('.').pop()||'';
    const videoMap:Record<string,string>={mp4:'video/mp4',mov:'video/quicktime',m4v:'video/x-m4v',webm:'video/webm'};
    const audioMap:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/x-m4a',wav:'audio/wav',mp4:'audio/mp4'};
    const fileMap:Record<string,string>={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',csv:'text/csv',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',zip:'application/zip'};
    if(activity.submission_type==='video'){
      if(declared.startsWith('video/'))return declared;
      return videoMap[ext]||'';
    }
    if(activity.submission_type==='audio'){
      if(declared.startsWith('audio/'))return declared;
      return audioMap[ext]||'';
    }
    if(activity.submission_type==='file'){
      return declared||fileMap[ext]||'application/octet-stream';
    }
    return declared;
  }
  async function submit(activity:MissionActivity){
    if(!supabase||!user||!file||!canSubmit)return;
    const submittedFile=file;
    const normalizedType=normalizedSubmissionType(submittedFile,activity);
    if(!normalizedType){
      setSubmissionStage('error');
      setSubmissionError(`This assignment requires a ${activity.submission_type} file. Choose a supported ${activity.submission_type} recording and try again.`);
      return;
    }
    setBusy(true);
    setSubmissionStage('uploading');
    setSubmissionError('');
    setSubmissionReceipt(null);
    setMessage('');
    const safe=submittedFile.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
    const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
    const{error:uploadError}=await supabase.storage.from('performance-submissions').upload(path,submittedFile,{contentType:normalizedType,upsert:false});
    if(uploadError){
      setBusy(false);
      setSubmissionStage('error');
      setSubmissionError(`Upload failed: ${uploadError.message}`);
      return;
    }

    setSubmissionStage('creating');
    const{data:submissionId,error:submitError}=await supabase.rpc('jpac_submit_module_activity',{
      target_activity:activity.id,
      file_name:submittedFile.name,
      file_type:normalizedType,
      storage_path:path
    });
    if(submitError||!submissionId){
      setBusy(false);
      setSubmissionStage('error');
      setSubmissionError(`JPAC could not create the assignment record: ${submitError?.message||'No submission ID was returned.'}`);
      return;
    }

    setSubmissionStage('verifying');
    const{data:verified,error:verifyError}=await supabase.from('submissions')
      .select('id,activity_id,attempt_number,status,submitted_at,media_name,media_type,media_url')
      .eq('id',submissionId)
      .eq('student_id',user.id)
      .eq('activity_id',activity.id)
      .maybeSingle();

    setBusy(false);
    if(verifyError||!verified||verified.media_name!==submittedFile.name||verified.media_url!==path){
      setSubmissionStage('error');
      setSubmissionError('The file reached JPAC, but the final submission record could not be verified. Do not submit a duplicate. Refresh this module or contact JPAC support.');
      await load(true);
      return;
    }

    setSubmissionStage('verified');
    setSubmissionReceipt({
      submissionId:String(verified.id),
      fileName:String(verified.media_name||submittedFile.name),
      submittedAt:String(verified.submitted_at||new Date().toISOString()),
      attempt:Number(verified.attempt_number||1),
      status:String(verified.status||'submitted')
    });
    setFile(null);
    await load(true);
    document.getElementById('mission-create')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function completePractice(activity:MissionActivity){if(!supabase)return;setBusy(true);const{data,error}=await supabase.rpc('jpac_complete_bonus_activity',{target_activity:activity.id});setBusy(false);setMessage(error?.message||(Number(data)>0?`Practice complete. ${data} Bonus XP awarded.`:'Practice was already recorded; no duplicate Bonus XP was awarded.'));if(!error)await load()}

  if(loading)return <div className="card card-pad">Loading mission…</div>;
  if(!course||!module)return <section className="card card-pad locked-course"><span>🔒</span><h1>Mission locked</h1><p>{message||'Complete the previous mission requirements to unlock this creative session.'}</p><Link className="button button-secondary" to={`/courses/${courseId}`}>Return to course</Link></section>;
  const nextAttempt=requiredAttempts.length?Math.max(...requiredAttempts.map(item=>item.attempt_number))+1:1;
  return <div className="creator-mission"><Link className="text-link" to={`/courses/${course.id}`}>← {course.title}</Link>
    <div className="eyebrow">Level {module.level_number||1} · Mission {module.level_module_number||module.sort_order}</div>
    <MissionNextStep completion={completion} lessons={lessons} progress={progress} requiredActivity={requiredActivity} attempts={requiredAttempts} nextModule={nextModule} courseId={course.id} onStart={()=>void completeIntro()} busy={busy}/>
    <div id="guided-workflow" tabIndex={-1}><MissionProgress completion={completion} lessons={lessons} progress={progress} bonusEarned={bonusEarned} bonusAvailable={bonusAvailable} hasRevision={hasRevision}/></div>
    <section className="module-learning-content" aria-labelledby="module-content-title">
      <div className="module-learning-content-head"><span>Module content</span><h2 id="module-content-title">{module.title}</h2><p>Complete the learning content below in order. Your Guided Workflow above reflects these exact module requirements.</p></div>
      <MissionBrief module={module} requiredActivity={requiredActivity} bonusAvailable={bonusAvailable} onStart={()=>void completeIntro()} busy={busy} started={Boolean(completion?.intro_complete)}/>
      <JPACCoachPanel context={buildModuleCoachContext({courseId:course.id,module,instructions:requiredActivity?.instructions,rubric:requiredActivity?.rubric,teacherFeedback:latest?.teacher_feedback,hasPreparedEvidence:Boolean(file)})}/>
      <LearnSection courseId={course.id} lessons={lessons} progress={progress}/>
      <div className="module-video-block">
        <div className="module-video-block-head"><span>Required instructional video</span><h2>Watch: {module.title}</h2><p>This is the video requirement represented in the Guided Workflow above.</p></div>
        <WatchSection videoUrl={module.primary_video_url} percent={Number(completion?.video_percent||0)} onProgress={trackVideo} onAcknowledge={()=>void acknowledgeVideo()} acknowledging={acknowledgingVideo}/>
      </div>
    <div id="mission-practice" tabIndex={-1} className="mission-practice-grid"><PracticeChallenge kind="practice" activity={realWorldActivity} moduleData={module.real_world_activity} busy={busy} earned={Boolean(realWorldActivity&&awardedSources.has(realWorldActivity.id))} onComplete={activity=>void completePractice(activity)}/><PracticeChallenge kind="lab" activity={labActivity} moduleData={module.jpac_tool_activity} busy={busy} earned={Boolean(labActivity&&awardedSources.has(labActivity.id))} onComplete={activity=>void completePractice(activity)}/>{otherPractice.map(activity=><PracticeChallenge key={activity.id} kind="practice" activity={activity} busy={busy} earned={awardedSources.has(activity.id)} onComplete={item=>void completePractice(item)}/>)}</div>
    {requiredActivity&&<section id="mission-create" tabIndex={-1} className="mission-card creative-challenge module-assignment-block">
      <div className="module-assignment-block-head"><span>Required module assignment</span><h2>Submit: {requiredActivity.title}</h2><p>This is the assignment requirement represented in the Guided Workflow above.</p></div>
      <div className="creative-challenge-head"><div><div className="mission-section-label">Required assignment</div><h2>{requiredActivity.title}</h2></div><strong>{requiredActivity.xp_reward} Core XP</strong></div>
      <p>{requiredActivity.description}</p><p className="muted">{requiredActivity.instructions}</p>
      <div className="submission-state"><strong>{assignmentApproved?'✓ Assignment approved':hasRevision?'Revision requested':reviewPending?'✓ Submitted for review':'Assignment ready'}</strong><small>{assignmentApproved?'Your instructor approved this requirement. Continue with the mastery checklist.':hasRevision?'Read the feedback below, prepare a corrected take, and submit a new attempt.':reviewPending?'Your file is safely recorded. You do not need to submit again while the instructor review is pending.':'Complete the four submission steps below when your take is ready.'}</small></div>
      {submissionReceipt&&<div className="submission-receipt" role="status"><strong>✓ Submission verified by JPAC</strong><span>{submissionReceipt.fileName}</span><small>Attempt {submissionReceipt.attempt} · {new Date(submissionReceipt.submittedAt).toLocaleString()} · Status: {submissionReceipt.status.replace('_',' ')}</small><small>Confirmation ID: {submissionReceipt.submissionId.slice(0,8).toUpperCase()}</small></div>}
      <SubmissionHistory attempts={requiredAttempts}/>
      {!assignmentApproved&&<div className="card" style={{padding:18,marginTop:16}}><div className="eyebrow">Assignment submission workflow</div><h3>{hasRevision?'Submit your revision':reviewPending?'Submission received':'Turn in your assignment'}</h3><ol style={{display:'grid',gap:10,paddingLeft:22}}><li><strong>Prepare your take.</strong> Confirm it follows the assignment directions and rubric.</li><li><strong>Select your file.</strong> JPAC will show the filename before anything is submitted.</li><li><strong>Submit for instructor review.</strong> You will receive an on-screen confirmation and the file will appear in Submission History.</li><li><strong>Track the review.</strong> Stay on this module page for approval, revision feedback, and the next required step.</li></ol>
        {reviewPending?<div className="auth-message" role="status"><strong>✓ Submission received.</strong> Your uploaded file is recorded above. No additional submission is needed until your instructor reviews it.</div>:<><label className="practice-drop"><input type="file" accept={requiredActivity.submission_type==='video'?'video/*':requiredActivity.submission_type==='audio'?'audio/*':requiredActivity.submission_type==='file'?undefined:'audio/*,video/*'} onChange={event=>{setSubmissionReceipt(null);setSubmissionError('');setSubmissionStage('idle');setFile(event.target.files?.[0]||null)}}/><strong>{file?.name||`Choose ${requiredActivity.submission_type==='file'?'assignment file':requiredActivity.submission_type+' assignment file'}`}</strong><small>{file?`${Math.max(.01,file.size/1024/1024).toFixed(2)} MB · selected · not submitted yet`:`Accepted evidence: ${requiredActivity.submission_type==='file'?'the file type requested in the assignment directions':requiredActivity.submission_type||'audio or video'}. Selecting a file does not submit it automatically.`}</small></label>{file&&<div className="submission-ready"><strong>Ready to submit</strong><span>{file.name}</span><small>Review the filename, then use the button below to send this attempt to your instructor.</small></div>}<button className="button button-primary" disabled={!file||busy||!canSubmit} onClick={()=>void submit(requiredActivity)}>{submissionStage==='uploading'?'Uploading file…':submissionStage==='creating'?'Creating submission…':submissionStage==='verifying'?'Verifying submission…':hasRevision?`Submit revision attempt ${nextAttempt}`:'Submit assignment for review'}</button>{submissionStage==='error'&&<div className="auth-message error" role="alert"><strong>Submission not completed.</strong><span>{submissionError}</span></div>}{submissionStage==='verified'&&submissionReceipt&&<div className="submission-receipt" role="status"><strong>✓ Submission verified by JPAC</strong><span>{submissionReceipt.fileName}</span><small>Attempt {submissionReceipt.attempt} · {new Date(submissionReceipt.submittedAt).toLocaleString()} · Status: {submissionReceipt.status.replaceAll('_',' ')}</small><small>Confirmation ID: {submissionReceipt.submissionId.slice(0,8).toUpperCase()}</small></div>}</>}
      </div>}
      {assignmentApproved&&<div className="mission-actions"><button className="button button-primary" onClick={()=>document.getElementById('mission-master')?.scrollIntoView({behavior:'smooth',block:'start'})}>Continue to mastery checklist</button></div>}
    </section>}
    </section>
    <AriaFeedback attempt={latestAssessed}/>
    <section id="mission-master" tabIndex={-1}><MasteryChecklist completion={completion}/></section>
    <LevelUpCard completion={completion} bonusEarned={bonusEarned} nextModule={nextModule} courseId={course.id} currentLevel={module.level_number}/>
    {completion?.is_complete&&nextModule&&sameLevelNext&&<section className="course-next-step"><div><span>Next module unlocked</span><small>Continue Level {module.level_number||1}</small><h2>{nextModule.title}</h2><p>Module {nextModule.level_module_number||nextModule.sort_order} is the next mission in this level. Your completed module has unlocked it automatically.</p></div><Link className="button button-primary" to={`/courses/${course.id}/modules/${nextModule.id}`}>Continue to Next Module</Link></section>}
    {message&&<div className="auth-message" role="status">{message}</div>}
  </div>
}
