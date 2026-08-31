import { renderToStaticMarkup } from 'react-dom/server';
import { LessonVideoSection } from './LessonVideoSection';
import type { CourseModule } from '../lib/studentAccess';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export function runLessonVideoSectionTests(): number {
  const base = { id: 'module-1', course_id: 'course-1', title: 'Warm Ups', description: '', sort_order: 1, xp_value: 0, level_number: 1, level_title: 'Beginner' } as CourseModule;
  const markup = renderToStaticMarkup(<LessonVideoSection module={{ ...base, primary_video_url: 'https://www.youtube.com/watch?v=abcdefghijk' }} />);
  const empty = renderToStaticMarkup(<LessonVideoSection module={{ ...base, primary_video_url: null }} />);
  assert(markup.includes('Approved lesson video') && markup.includes('Watch and learn'), 'Published lesson video guidance must render.');
  assert(markup.includes('https://www.youtube-nocookie.com/embed/abcdefghijk'), 'Student lessons must use the normalized privacy-enhanced embed URL.');
  assert(markup.includes('allowfullscreen'), 'The approved video must support full-screen playback.');
  assert(empty === '', 'Lessons without a valid approved module video must not render an empty player.');
  return 4;
}
