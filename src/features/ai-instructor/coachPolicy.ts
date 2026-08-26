import type{CoachAction}from'./types';

export const ALLOWED_COACH_ACTIONS=Object.freeze<CoachAction[]>([
  'navigate','expand_guidance','display_checklist','copy_checklist','suggest_practice','summarize_requirements','summarize_feedback',
]);

export const PROTECTED_COACH_ACTIONS=Object.freeze<CoachAction[]>([
  'award_xp','grade_assignment','approve_submission','award_mastery','update_lesson_progress','update_enrollment_progress',
  'issue_certificate','change_enrollment','publish_curriculum','upload_media','submit_assignment','invoke_teacher_review',
  'change_extra_credit_status','call_protected_academic_mutation',
]);

export function isCoachActionAllowed(action:CoachAction){return ALLOWED_COACH_ACTIONS.includes(action)}

export function assertCoachActionAllowed(action:CoachAction){
  if(!isCoachActionAllowed(action))throw new Error(`JPAC Coach policy blocks protected action: ${action}`);
}
