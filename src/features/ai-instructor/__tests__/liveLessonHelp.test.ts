import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LessonIntro } from '../../../components/LessonExperience';
import { createLessonExplanationRequest, shouldShowLiveLessonHelp } from '../liveCoachClient';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runLiveLessonHelpUnitTests(): number {
  const request = createLessonExplanationRequest();
  const introProps = {
    courseId: 'course-1',
    module: { id: 'module-1', course_id: 'course-1', title: 'Module One', description: '', sort_order: 1, xp_value: 0, level_number: 1, level_title: 'Beginner' },
    lesson: { id: 'lesson-1', module_id: 'module-1', title: 'Lesson One', description: '', lesson_type: 'lesson', duration_minutes: 10, sort_order: 1, xp_value: 0, wix_lesson_url: null },
    lessonNumber: 1,
    progress: null,
  };
  let requestCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response('{}');
  };
  const visible = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LessonIntro, { ...introProps, liveAIEnabled: true })));
  const hidden = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LessonIntro, { ...introProps, liveAIEnabled: false })));
  const hiddenByDefault = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LessonIntro, introProps)));
  globalThis.fetch = originalFetch;
  assert(!shouldShowLiveLessonHelp(), 'Panel must be hidden when the client flag is undefined.');
  assert(!shouldShowLiveLessonHelp('false'), 'Panel must be hidden when the client flag is false.');
  assert(shouldShowLiveLessonHelp('true'), 'Panel must be visible only when the client flag is exactly true.');
  assert(!shouldShowLiveLessonHelp('TRUE'), 'Panel must reject non-exact flag values.');
  assert(request.mode === 'lesson_explanation', 'Lesson help must use lesson_explanation only.');
  assert(Object.keys(request).length === 1, 'Lesson help must not send student, role, history, review, or media data.');
  assert(visible.includes('Live AI Lesson Help'), 'Enabled lesson intro must render Live AI Lesson Help.');
  assert(visible.indexOf('Lesson One') < visible.indexOf('Live AI Lesson Help'), 'Live AI Lesson Help must render immediately after the lesson header.');
  assert(visible.includes('Advisory guidance only') && visible.includes('Teacher review required') && visible.includes('This does not award XP or update progress'), 'Enabled panel must preserve all safety copy.');
  assert(visible.includes('Ask for lesson explanation'), 'Enabled panel must expose only a manual request control.');
  assert(requestCount === 0, 'Rendering the lesson intro must not issue a live AI request.');
  assert(!hidden.includes('Live AI Lesson Help'), 'Explicitly disabled lesson intro must hide the panel.');
  assert(!hiddenByDefault.includes('Live AI Lesson Help'), 'Lesson intro must hide the panel when the client flag is unset.');
  return 13;
}
