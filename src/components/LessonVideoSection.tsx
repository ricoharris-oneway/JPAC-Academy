import type { CourseModule } from '../lib/studentAccess';
import { normalizeInstructionalMediaUrl } from '../lib/instructionalMedia';
import { ProviderAwareVideo } from './ProviderAwareVideo';
import '../styles/lesson-video.css';

export function LessonVideoSection({ module }: { module: CourseModule }) {
  const media = normalizeInstructionalMediaUrl(module.primary_video_url || '');
  if (!media) return null;
  return <section className="lesson-learning-card lesson-video-card"><div className="lesson-section-label">Approved lesson video</div><div className="lesson-learning-head"><div><h2>Watch and learn</h2><p>This video was reviewed and approved by JPAC staff for this module.</p></div></div><ProviderAwareVideo url={media.normalizedUrl} title={`${module.title} approved instructional video`} /></section>;
}
