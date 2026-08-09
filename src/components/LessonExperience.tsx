import{Link}from'react-router-dom';
import type{CourseLesson,CourseModule,LessonProgress}from'../lib/studentAccess';

const readableType=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());

export function CompactLessonHeader({courseId,module,lesson,lessonNumber,progress}:{courseId:string;module:CourseModule;lesson:CourseLesson;lessonNumber:number;progress:LessonProgress|null}){
  const percent=Math.max(0,Math.min(100,Number(progress?.percent_complete||0)));const complete=progress?.status==='completed';
  return <header className="lesson-header"><Link className="text-link" to={`/courses/${courseId}/modules/${module.id}`}>← Back to module</Link><div className="lesson-location">Level {module.level_number||1}<span>•</span>Module {module.level_module_number||module.sort_order}<span>•</span>Lesson {lessonNumber}</div><div className="lesson-header-main"><div><h1>{lesson.title}</h1><p>{readableType(lesson.lesson_type)}{lesson.duration_minutes?` • ${lesson.duration_minutes} min`:''}</p></div><div className={`lesson-status ${complete?'complete':''}`}><strong>{complete?'Complete':`${Math.round(percent)}%`}</strong><small>{complete?'Lesson finished':'Lesson progress'}</small></div></div><div className="lesson-progress-track" aria-label={`${Math.round(percent)}% lesson progress`}><i style={{width:`${percent}%`}}/></div></header>
}

export function LessonFlow({complete}:{complete:boolean}){
  return <nav className="lesson-flow" aria-label="Lesson flow"><div className="active"><span>{complete?'✓':'1'}</span><strong>Learn it</strong><small>{complete?'Reviewed':'Current step'}</small></div><i/><div className={complete?'complete':''}><span>{complete?'✓':'2'}</span><strong>Complete lesson</strong><small>{complete?'Complete':'Next step'}</small></div></nav>
}

export function LessonLearnSection({lesson}:{lesson:CourseLesson}){
  const blocks=lesson.description.split(/\r?\n\s*\r?\n/).map(value=>value.trim()).filter(Boolean);
  return <section className="lesson-learning-card"><div className="lesson-section-label">Learn it</div><div className="lesson-learning-head"><div><h2>Explore the lesson</h2><p>Move through the published instruction at your own pace.</p></div><span>{blocks.length||1} learning block{blocks.length===1?'':'s'}</span></div>{blocks.length?<div className="lesson-content-blocks">{blocks.map((block,index)=><article key={`${index}-${block.slice(0,24)}`}><span>{String(index+1).padStart(2,'0')}</span><p>{block}</p></article>)}</div>:<div className="lesson-content-empty"><strong>Instruction is being prepared.</strong><p>No lesson description has been published yet.</p></div>}{lesson.wix_lesson_url&&<div className="lesson-resource"><div><span>Published learning resource</span><strong>Continue with the approved lesson material</strong><p>This resource is part of the current curriculum for this lesson.</p></div><a className="button button-primary" href={lesson.wix_lesson_url} target="_blank" rel="noreferrer">Open lesson resource</a></div>}</section>
}

export function LessonCoach(){return <aside className="lesson-coach"><div className="lesson-coach-mark">A</div><div><span>Creative coach</span><strong>Need help understanding this lesson?</strong><p>Open your existing ARIA-powered growth space for guidance based on available Academy evidence.</p></div><Link className="button button-secondary" to="/student-intelligence">Ask ARIA</Link></aside>}

export function LessonCompletion({complete,busy,nextLesson,courseId,onComplete}:{complete:boolean;busy:boolean;nextLesson:CourseLesson|null;courseId:string;onComplete:()=>void}){
  return <section className={`lesson-completion ${complete?'complete':''}`}><span>{complete?'Lesson complete':'Ready to continue?'}</span><h2>{complete?'Nice work. Keep your creative momentum.':'Complete this lesson when you have finished the published material above.'}</h2>{complete?<div className="lesson-completion-actions"><strong>✓ Lesson complete</strong>{nextLesson?<Link className="button button-primary" to={`/courses/${courseId}/lessons/${nextLesson.id}`}>Continue to next lesson</Link>:<p>Your next step is available from the module mission.</p>}</div>:<button className="button button-primary" disabled={busy} onClick={onComplete}>{busy?'Saving…':'Complete lesson'}</button>}</section>
}
