export const AI_INSTRUCTOR_MODES = [
  'lesson_explanation',
  'practice_recommendation',
  'assignment_checklist',
  'submission_precheck',
  'teacher_feedback_revision_plan',
  'teacher_review_summary',
] as const;

export type AIInstructorMode = (typeof AI_INSTRUCTOR_MODES)[number];

export const PROHIBITED_AI_INSTRUCTOR_ACTIONS = [
  'auto_grade',
  'auto_approve',
  'award_xp',
  'update_progress',
  'issue_certificate',
  'change_enrollment',
  'publish_curriculum',
  'upload_media',
  'invoke_review_rpc',
] as const;

export type ProhibitedAIInstructorAction = (typeof PROHIBITED_AI_INSTRUCTOR_ACTIONS)[number];

export function isAIInstructorMode(value: unknown): value is AIInstructorMode {
  return typeof value === 'string' && AI_INSTRUCTOR_MODES.some((mode) => mode === value);
}

export function isProhibitedAIInstructorAction(value: unknown): value is ProhibitedAIInstructorAction {
  return typeof value === 'string'
    && PROHIBITED_AI_INSTRUCTOR_ACTIONS.some((action) => action === value);
}

export function assertNoProhibitedAIInstructorAction(action: unknown): void {
  if (isProhibitedAIInstructorAction(action)) {
    throw new Error(`JPAC AI Instructor policy blocks protected action: ${action}`);
  }
}
