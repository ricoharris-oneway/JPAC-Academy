import type { AIInstructorMode } from './ai-instructor-policy.ts';

export type AIInstructorSafetyLabel =
  | 'JPAC Coach guidance'
  | 'Teacher review required'
  | 'Completeness check only'
  | 'This does not award XP or update progress';

export type AIInstructorAdvisoryResponse = {
  ok: true;
  schemaVersion: 'phase-2a-v1';
  source: 'phase_1_deterministic_fallback';
  mode: AIInstructorMode;
  liveAIEnabled: false;
  advisoryOnly: true;
  teacherReviewRequired: true;
  completenessCheckOnly: true;
  labels: AIInstructorSafetyLabel[];
  headline: string;
  guidance: string;
  nextStep: string;
};

export type AIInstructorErrorResponse = {
  ok: false;
  schemaVersion: 'phase-2a-v1';
  error: 'method_not_allowed' | 'authentication_required' | 'invalid_request' | 'request_too_large';
  message: string;
  fallbackRequired: true;
};

const SAFETY_LABELS: AIInstructorSafetyLabel[] = [
  'JPAC Coach guidance',
  'Teacher review required',
  'Completeness check only',
  'This does not award XP or update progress',
];

export function createPhase1Fallback(mode: AIInstructorMode): AIInstructorAdvisoryResponse {
  return {
    ok: true,
    schemaVersion: 'phase-2a-v1',
    source: 'phase_1_deterministic_fallback',
    mode,
    liveAIEnabled: false,
    advisoryOnly: true,
    teacherReviewRequired: true,
    completenessCheckOnly: true,
    labels: [...SAFETY_LABELS],
    headline: 'Phase 1 JPAC Coach is active',
    guidance: 'Live AI is not enabled. Continue with the current deterministic JPAC Coach guidance.',
    nextStep: 'Use the authorized page guidance and ask your teacher for final review when required.',
  };
}

export function createAIInstructorError(
  error: AIInstructorErrorResponse['error'],
  message: string,
): AIInstructorErrorResponse {
  return { ok: false, schemaVersion: 'phase-2a-v1', error, message, fallbackRequired: true };
}
