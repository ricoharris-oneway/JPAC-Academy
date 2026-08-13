export const CURRICULUM_IMPORT_MAX_BYTES=10*1024*1024;
export type ImportPreviewStatus='WOULD_CREATE'|'WOULD_REUSE'|'POSSIBLE_CONFLICT'|'COURSE_MISMATCH'|'NOT_CHECKED';
export type ImportPreviewFinding={severity:'ERROR'|'WARNING'|'INFO';code:string;message:string;level_number?:number;module_number?:number};
export type ImportPreviewCounts={levels:number;modules:number;lessons:number;activities:number;warnings:number};
export type ImportPreviewDecisionSummary={would_reuse:number;would_create:number;possible_conflicts:number;course_mismatch:number;not_checked:number;total:number;complete:boolean};
export type ImportPreviewLoadedModule={level_number:number;module_number:number;title:string};
export type ImportPreviewContext={selected_course_slug:string|null;modules:ImportPreviewLoadedModule[]};
export type ImportPreviewLesson={sort_order:number|null;title:string;objective:string};
export type ImportPreviewActivity={role:string;title:string;activity_type:string;status:string};
export type ImportPreviewModule={
  level_number:number;module_number:number;title:string;status:string;lessons:ImportPreviewLesson[];activities:ImportPreviewActivity[];
  media_review_status:string;tool_review_status:string;career_path_status:string;
  comparison_status:ImportPreviewStatus;comparison_reason:string;
};
export type ImportPreviewLevel={level_number:number;title:string;status:string;modules:ImportPreviewModule[]};
export type CurriculumImportPreview={
  contract:'jpac-curriculum-export';contract_version:'1.2.0';scope:{type:'module'|'level'|'course';course_slug:string;level_number?:number;module_number?:number};
  course:{course_slug:string;title:string;description:string;status:string};levels:ImportPreviewLevel[];
  counts:ImportPreviewCounts;source_warnings:unknown[];findings:ImportPreviewFinding[];contains_database_ids:boolean;
};
export type CurriculumImportPreviewResult={ok:true;preview:CurriculumImportPreview}|{ok:false;findings:ImportPreviewFinding[]};
