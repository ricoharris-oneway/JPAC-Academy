export type CurriculumModuleVideoFields = {
  primary_video_url: string | null;
  video_provider: string | null;
  video_title: string | null;
  video_duration_seconds: number | null;
  video_brief: string;
};

export function curriculumModuleVideoPayload(module: CurriculumModuleVideoFields) {
  return {
    primary_video_url: module.primary_video_url || '',
    video_provider: module.video_provider || '',
    video_title: module.video_title || '',
    video_duration_seconds: module.video_duration_seconds ?? '',
    video_brief: module.video_brief,
  };
}
