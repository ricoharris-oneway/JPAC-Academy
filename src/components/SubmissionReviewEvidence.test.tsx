import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeRubric, SubmissionReviewEvidence } from './SubmissionReviewEvidence';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

export function runSubmissionReviewEvidenceTests(): number {
  const signedUrl = 'https://project.supabase.co/storage/v1/object/sign/performance-submissions/private.wav?token=short-lived';
  const audio = renderToStaticMarkup(<SubmissionReviewEvidence signedUrl={signedUrl} mediaName="take.wav" mediaType="audio/wav" storagePath="student/private.wav" rubric={{ criteria: [{ name: 'Breath support', weight: 60 }, { criterion: 'Pitch accuracy', percentage: 40 }] }} />);
  const fallback = renderToStaticMarkup(<SubmissionReviewEvidence signedUrl={null} mediaName={null} mediaType={null} storagePath="student/evidence.bin" rubric={['Preparation', 'Performance choices']} />);
  assert(audio.includes('<audio') && audio.includes('Open secure evidence link'), 'Teacher review must render playable private audio and a secure link.');
  assert(audio.includes('Rubric / mastery criteria') && audio.includes('Breath support') && audio.includes('60%'), 'Teacher review must render weighted rubric criteria.');
  assert(fallback.includes('Evidence cannot be previewed here. Download or open using the secure link.'), 'Unpreviewable evidence must use the approved fallback.');
  assert(fallback.includes('Preparation') && fallback.includes('Performance choices'), 'String rubric criteria must normalize for display.');
  assert(normalizeRubric({ criteria: { Tone: 50, Expression: 50 } }).length === 2, 'Object-shaped rubric criteria must normalize.');
  assert(!audio.includes('student/private.wav'), 'Private storage paths must not be exposed in rendered review markup.');
  return 6;
}
