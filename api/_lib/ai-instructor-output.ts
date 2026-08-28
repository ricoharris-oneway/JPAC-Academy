import type { AIInstructorMode } from './ai-instructor-policy.js';

export type AIInstructorSafetyLabel =
  | 'JPAC Coach guidance'
  | 'Teacher review required'
  | 'Completeness check only'
  | 'This does not award XP or update progress';

export type AIInstructorSafeFallbackReason =
  | 'ai_disabled'
  | 'provider_config_missing'
  | 'provider_timeout'
  | 'provider_failure'
  | 'invalid_provider_output';

export type AIInstructorAdvisoryResponse = {
  ok: true;
  schemaVersion: 'phase-2a-v1';
  source: 'phase_1_deterministic_fallback' | 'live_ai_provider';
  mode: AIInstructorMode;
  liveAIEnabled: boolean;
  advisoryOnly: true;
  teacherReviewRequired: true;
  completenessCheckOnly: true;
  labels: AIInstructorSafetyLabel[];
  headline: string;
  guidance: string;
  nextStep: string;
  fallbackReason?: AIInstructorSafeFallbackReason;
};

export type AIInstructorProviderOutput = {
  headline: string;
  guidance: string;
  nextStep: string;
  advisoryOnly: true;
  teacherReviewRequired: true;
  completenessCheckOnly: true;
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

export function createPhase1Fallback(
  mode: AIInstructorMode,
  fallbackReason: AIInstructorSafeFallbackReason = 'ai_disabled',
): AIInstructorAdvisoryResponse {
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
    fallbackReason,
  };
}

const PROHIBITED_OUTPUT_KEYS = new Set([
  'score', 'grade', 'approval', 'approved', 'rejection', 'rejected', 'finalDecision', 'final_decision',
]);
const PROTECTED_OUTPUT_LANGUAGE = /\b(?:score|grade|approval|rejection|review\s+decision|final\s+decision|award\s+xp|xp\s+award|update\s+progress|progress\s+update|certificate|change\s+enrollment|publish\s+curriculum|invoke\s+(?:a\s+)?review|approve(?:d|s)?\s+(?:the\s+)?submission|reject(?:ed|s)?\s+(?:the\s+)?submission)\b/i;

export function validateAIInstructorProviderOutput(value: unknown): AIInstructorProviderOutput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => PROHIBITED_OUTPUT_KEYS.has(key))) return null;
  const allowedKeys = new Set([
    'headline', 'guidance', 'nextStep', 'advisoryOnly', 'teacherReviewRequired', 'completenessCheckOnly',
  ]);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (
    typeof record.headline !== 'string'
    || typeof record.guidance !== 'string'
    || typeof record.nextStep !== 'string'
    || record.advisoryOnly !== true
    || record.teacherReviewRequired !== true
    || record.completenessCheckOnly !== true
  ) return null;
  const text = `${record.headline} ${record.guidance} ${record.nextStep}`;
  if (text.length > 4_000 || PROTECTED_OUTPUT_LANGUAGE.test(text)) return null;
  return {
    headline: record.headline.slice(0, 300),
    guidance: record.guidance.slice(0, 2_500),
    nextStep: record.nextStep.slice(0, 500),
    advisoryOnly: true,
    teacherReviewRequired: true,
    completenessCheckOnly: true,
  };
}

export function createProviderAdvisory(
  mode: AIInstructorMode,
  output: AIInstructorProviderOutput,
): AIInstructorAdvisoryResponse {
  return {
    ok: true,
    schemaVersion: 'phase-2a-v1',
    source: 'live_ai_provider',
    mode,
    liveAIEnabled: true,
    advisoryOnly: true,
    teacherReviewRequired: true,
    completenessCheckOnly: true,
    labels: [...SAFETY_LABELS],
    headline: output.headline,
    guidance: output.guidance,
    nextStep: output.nextStep,
  };
}

export function createAIInstructorError(
  error: AIInstructorErrorResponse['error'],
  message: string,
): AIInstructorErrorResponse {
  return { ok: false, schemaVersion: 'phase-2a-v1', error, message, fallbackRequired: true };
}
