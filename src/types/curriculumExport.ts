import type{InstructionalMedia}from'../lib/instructionalMedia';

export type CurriculumExportActivityRole='practice'|'core_challenge'|'other';
export type CurriculumExportWarning={code:string;message:string};

export type CurriculumExportCourseInput={id:string;slug:string;title:string;description:string;status:string};
export type CurriculumExportLevelInput={id:string;level_number:number;title:string;status:string};
export type CurriculumExportModuleInput={
  id:string;level_module_number:number;sort_order:number;title:string;description:string;status:string;
  short_intro:string;career_connection:string;aria_coaching_targets:Record<string,unknown>;
  career_mission_ideas:unknown[];portfolio_moment:boolean;portfolio_ready_threshold:number|null;
  intro_core_xp:number;video_core_xp:number;assignment_core_xp:number;mastery_core_xp:number;
  core_xp:number;core_unlock_threshold:number;primary_video_url:string|null;video_provider:string|null;
  video_title:string|null;video_duration_seconds:number|null;video_brief:string;
  jpac_tool_activity:Record<string,unknown>;real_world_activity:Record<string,unknown>;lab_tool_id:string|null;review_notes:string;
};
export type CurriculumExportLessonInput={
  id:string;title:string;description:string;status:string;sort_order:number;duration_minutes:number|null;
  short_summary:string;learning_objective:string;content_blocks:unknown[];technique_cues:string[];
  common_mistakes:string[];self_check:string;wix_lesson_url:string|null;
};
export type CurriculumExportActivityInput={
  id:string;title:string;description:string;instructions:string;activity_type:string;submission_type:string;
  xp_reward:number;xp_type:string;required:boolean;status:string;passing_score:number;
  allows_resubmission:boolean;portfolio_candidate:boolean;rubric:unknown;
};
export type CurriculumExportToolInput={id:string;slug?:string;name:string;status:string;tool_type:string;launch_url:string|null};
export type CurriculumExportInput={
  course:CurriculumExportCourseInput;level:CurriculumExportLevelInput;module:CurriculumExportModuleInput;
  lessons:CurriculumExportLessonInput[];activities:CurriculumExportActivityInput[];
  media:InstructionalMedia[];tool:CurriculumExportToolInput|null;
};

export type CurriculumModuleExport={
  contract:'jpac-curriculum-export';contract_version:'1.0.0';exported_at:string;
  export_scope:{type:'module';course_slug:string;level_number:number;module_number:number};
  options:{include_database_ids:boolean};warnings:CurriculumExportWarning[];
  course:Record<string,unknown>;level:Record<string,unknown>;module:Record<string,unknown>;
};
