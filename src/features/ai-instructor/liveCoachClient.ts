export const LIVE_AI_ENV_FLAG = 'VITE_JPAC_LIVE_AI_ENABLED' as const;

export type LiveCoachMode =
  | 'lesson_explanation'
  | 'practice_recommendation'
  | 'assignment_checklist'
  | 'submission_precheck'
  | 'teacher_feedback_revision_plan'
  | 'teacher_review_summary';

const LIVE_COACH_MODES: LiveCoachMode[] = [
  'lesson_explanation',
  'practice_recommendation',
  'assignment_checklist',
  'submission_precheck',
  'teacher_feedback_revision_plan',
  'teacher_review_summary',
];

export type LiveCoachSafetyLabel =
  | 'JPAC Coach guidance'
  | 'Teacher review required'
  | 'Completeness check only'
  | 'This does not award XP or update progress';

const REQUIRED_SAFETY_LABELS: LiveCoachSafetyLabel[] = [
  'JPAC Coach guidance',
  'Teacher review required',
  'Completeness check only',
  'This does not award XP or update progress',
];

export type LiveCoachRequest = {
  mode: LiveCoachMode;
};

export type LiveCoachAdvisoryResponse = {
  ok: true;
  schemaVersion: 'phase-2a-v1';
  source: 'phase_1_deterministic_fallback' | 'live_ai_provider';
  mode: LiveCoachMode;
  liveAIEnabled: boolean;
  advisoryOnly: true;
  teacherReviewRequired: true;
  completenessCheckOnly: true;
  labels: LiveCoachSafetyLabel[];
  headline: string;
  guidance: string;
  nextStep: string;
};

export type LiveCoachClientResult =
  | { usedLiveAI: true; fallbackRequired: false; reason: null; response: LiveCoachAdvisoryResponse }
  | {
    usedLiveAI: false;
    fallbackRequired: true;
    reason: 'disabled' | 'authentication_required' | 'server_unavailable' | 'invalid_response';
    response: LiveCoachAdvisoryResponse | null;
  };

export type LiveCoachClientOptions = {
  accessToken?: string;
  signal?: AbortSignal;
};

export function isLiveAIRequested(): boolean {
  return shouldShowLiveLessonHelp(import.meta.env.VITE_JPAC_LIVE_AI_ENABLED);
}

export function shouldShowLiveLessonHelp(flag?: string): boolean {
  return flag === 'true';
}

export function createLessonExplanationRequest(): LiveCoachRequest {
  return { mode: 'lesson_explanation' };
}

function isAdvisoryResponse(value: unknown): value is LiveCoachAdvisoryResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<LiveCoachAdvisoryResponse>;
  return response.ok === true
    && response.schemaVersion === 'phase-2a-v1'
    && ((response.source === 'phase_1_deterministic_fallback' && response.liveAIEnabled === false)
      || (response.source === 'live_ai_provider' && response.liveAIEnabled === true))
    && response.advisoryOnly === true
    && response.teacherReviewRequired === true
    && response.completenessCheckOnly === true
    && LIVE_COACH_MODES.some((mode) => mode === response.mode)
    && Array.isArray(response.labels)
    && response.labels.length === REQUIRED_SAFETY_LABELS.length
    && REQUIRED_SAFETY_LABELS.every((label) => response.labels?.includes(label))
    && typeof response.headline === 'string'
    && typeof response.guidance === 'string'
    && typeof response.nextStep === 'string';
}

export async function requestLiveCoach(
  request: LiveCoachRequest,
  options: LiveCoachClientOptions = {},
): Promise<LiveCoachClientResult> {
  if (!isLiveAIRequested()) {
    return { usedLiveAI: false, fallbackRequired: true, reason: 'disabled', response: null };
  }

  const accessToken = options.accessToken?.trim();
  if (!accessToken) {
    return { usedLiveAI: false, fallbackRequired: true, reason: 'authentication_required', response: null };
  }

  try {
    const response = await fetch('/api/ai-instructor', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
    });
    if (!response.ok) {
      return { usedLiveAI: false, fallbackRequired: true, reason: 'server_unavailable', response: null };
    }
    const payload: unknown = await response.json();
    if (!isAdvisoryResponse(payload)) {
      return { usedLiveAI: false, fallbackRequired: true, reason: 'invalid_response', response: null };
    }
    const usedLiveAI = payload.source === 'live_ai_provider' && payload.liveAIEnabled;
    return usedLiveAI
      ? { usedLiveAI: true, fallbackRequired: false, reason: null, response: payload }
      : { usedLiveAI: false, fallbackRequired: true, reason: 'disabled', response: payload };
  } catch {
    return { usedLiveAI: false, fallbackRequired: true, reason: 'server_unavailable', response: null };
  }
}
