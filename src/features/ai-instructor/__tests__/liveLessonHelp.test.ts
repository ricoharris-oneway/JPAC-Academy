import { createLessonExplanationRequest, shouldShowLiveLessonHelp } from '../liveCoachClient';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runLiveLessonHelpUnitTests(): number {
  const request = createLessonExplanationRequest();
  assert(!shouldShowLiveLessonHelp(), 'Panel must be hidden when the client flag is undefined.');
  assert(!shouldShowLiveLessonHelp('false'), 'Panel must be hidden when the client flag is false.');
  assert(shouldShowLiveLessonHelp('true'), 'Panel must be visible only when the client flag is exactly true.');
  assert(!shouldShowLiveLessonHelp('TRUE'), 'Panel must reject non-exact flag values.');
  assert(request.mode === 'lesson_explanation', 'Lesson help must use lesson_explanation only.');
  assert(Object.keys(request).length === 1, 'Lesson help must not send student, role, history, review, or media data.');
  return 6;
}
