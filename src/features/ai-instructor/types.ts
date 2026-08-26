export type CoachSurface='hub'|'dashboard'|'course'|'module'|'lesson'|'tool'|'extra_credit'|'revision';

export type CoachAction=
  |'navigate'|'expand_guidance'|'display_checklist'|'copy_checklist'|'suggest_practice'|'summarize_requirements'|'summarize_feedback'
  |'award_xp'|'grade_assignment'|'approve_submission'|'award_mastery'|'update_lesson_progress'|'update_enrollment_progress'
  |'issue_certificate'|'change_enrollment'|'publish_curriculum'|'upload_media'|'submit_assignment'|'invoke_teacher_review'
  |'change_extra_credit_status'|'call_protected_academic_mutation';

export type ChecklistSource='instructions'|'rubric'|'safety';
export type CoachChecklistItem={id:string;label:string;source:ChecklistSource;complete?:boolean};
export type CoachLink={label:string;to:string};

export type CoachContext={
  surface:CoachSurface;
  title:string;
  objective?:string;
  summary?:string;
  authoredInstructions?:string;
  rubric?:unknown;
  teacherFeedback?:string|null;
  currentRoute?:string;
  nextLink?:CoachLink;
  practiceLink?:CoachLink;
  submissionStatus?:string|null;
  hasPreparedEvidence?:boolean;
};

export type AssignmentPrecheckResult={
  label:'Completeness check only';
  status:'ready_to_review'|'needs_attention';
  items:CoachChecklistItem[];
  summary:string;
};

export type CoachGuidance={
  label:'JPAC Coach guidance';
  headline:string;
  explanation:string;
  nextStep:string;
  nextLink?:CoachLink;
  practiceLink?:CoachLink;
  checklist:CoachChecklistItem[];
  revisionSteps:string[];
  precheck?:AssignmentPrecheckResult;
};
