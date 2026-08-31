import{useEffect,useState}from'react';
import{Link,useParams}from'react-router-dom';
import{LessonCoach,LessonCompletion,LessonFlow,LessonIntro,LessonLearnSection}from'../components/LessonExperience';
import{LessonVideoSection}from'../components/LessonVideoSection';
import{loadCourseContent,markLessonProgress,type CourseLesson,type CourseModule,type LessonProgress}from'../lib/studentAccess';

type CourseRecord={id:string;title:string};

export function LessonPage(){
  const{courseId='',lessonId=''}=useParams();const[course,setCourse]=useState<CourseRecord|null>(null);const[module,setModule]=useState<CourseModule|null>(null);const[lesson,setLesson]=useState<CourseLesson|null>(null);const[nextLesson,setNextLesson]=useState<CourseLesson|null>(null);const[lessonNumber,setLessonNumber]=useState(1);const[progress,setProgress]=useState<LessonProgress|null>(null);const[loading,setLoading]=useState(true);const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);
  useEffect(()=>{setLoading(true);void loadCourseContent(courseId).then(async result=>{const selected=result.lessons.find(item=>item.id===lessonId)||null;const selectedModule=result.modules.find(item=>item.id===selected?.module_id)||null;const moduleLessons=selectedModule?result.lessons.filter(item=>item.module_id===selectedModule.id):[];const position=moduleLessons.findIndex(item=>item.id===lessonId);const selectedProgress=result.progress.find(item=>item.lesson_id===lessonId)||null;setCourse(result.course as CourseRecord|null);setLesson(selected);setModule(selectedModule);setLessonNumber(position>=0?position+1:1);setNextLesson(position>=0?moduleLessons[position+1]||null:null);setProgress(selectedProgress);setMessage(result.error||(!selected?'This lesson is unavailable or does not belong to this entitled course.':''));setLoading(false);if(selected&&!selectedProgress){const error=await markLessonProgress(selected.id,'in_progress');if(error)setMessage(error);else setProgress({lesson_id:selected.id,status:'in_progress',percent_complete:1,updated_at:new Date().toISOString()})}})},[courseId,lessonId]);
  async function complete(){if(!lesson)return;setBusy(true);const error=await markLessonProgress(lesson.id,'completed');setBusy(false);setMessage(error||'Lesson complete.');if(!error)setProgress({lesson_id:lesson.id,status:'completed',percent_complete:100,updated_at:new Date().toISOString()})}
  if(loading)return <div className="card card-pad">Loading lesson…</div>;
  if(!course||!module||!lesson)return <section className="card card-pad locked-course"><span>🔒</span><h1>Lesson unavailable</h1><p>{message||'Your account cannot open this lesson.'}</p><Link className="button button-secondary" to="/courses">Return to My Academy</Link></section>;
  const completeState=progress?.status==='completed';
  return <article className="guided-lesson"><LessonIntro courseId={course.id} module={module} lesson={lesson} lessonNumber={lessonNumber} progress={progress}/><LessonFlow complete={completeState}/><LessonVideoSection module={module}/><LessonLearnSection lesson={lesson}/><LessonCoach courseId={course.id} module={module} lesson={lesson} nextLesson={nextLesson}/><LessonCompletion complete={completeState} busy={busy} nextLesson={nextLesson} courseId={course.id} onComplete={()=>void complete()}/>{message&&<div className="auth-message" role="status">{message}</div>}</article>
}
