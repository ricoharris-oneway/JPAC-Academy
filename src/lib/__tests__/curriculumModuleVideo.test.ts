import { curriculumModuleVideoPayload } from '../curriculumModuleVideo';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export function runCurriculumModuleVideoTests(): number {
  const payload = curriculumModuleVideoPayload({
    primary_video_url: 'https://www.youtube.com/watch?v=abcdefghijk',
    video_provider: 'youtube',
    video_title: 'Reviewed warm-up',
    video_duration_seconds: 245,
    video_brief: 'A safe beginner warm-up.',
  });
  assert(payload.primary_video_url.endsWith('abcdefghijk'), 'Curriculum Studio module payload must include primary_video_url.');
  assert(payload.video_title === 'Reviewed warm-up' && payload.video_provider === 'youtube', 'Curriculum Studio module payload must include title and provider.');
  assert(payload.video_duration_seconds === 245, 'Curriculum Studio module payload must not omit video duration.');
  assert(payload.video_brief === 'A safe beginner warm-up.', 'Curriculum Studio module payload must retain the production brief.');
  assert(!('status' in payload), 'The isolated module video payload must never change curriculum status.');
  return 5;
}
