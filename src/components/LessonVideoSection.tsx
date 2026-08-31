import type { CourseModule } from '../lib/studentAccess';
import { normalizeInstructionalMediaUrl } from '../lib/instructionalMedia';
import '../styles/lesson-video.css';

export function LessonVideoSection({ module }: { module: CourseModule }) {
  const media = normalizeInstructionalMediaUrl(module.primary_video_url || '');
  if (!media || media.provider !== 'youtube') return null;
  return <section className="lesson-learning-card lesson-video-card"><div className="lesson-section-label">Approved lesson video</div><div className="lesson-learning-head"><div><h2>Watch and learn</h2><p>This video was reviewed and approved by JPAC staff for this module.</p></div></div><div className="lesson-video-frame"><iframe src={media.embedUrl} title={`${module.title} approved instructional video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>;
}
