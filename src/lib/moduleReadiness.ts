import { normalizeInstructionalMediaUrl } from './instructionalMedia';

export type Course = { id: string; title: string; slug: string; status: string };
export type Module = { id: string; course_id: string; title: string; status: string; sort_order: number; level_module_number: number | null; description: string | null; ai_summary: string | null; learning_objectives: string[] | null; career_connection: string | null; active_instructional_media_id: string | null; primary_video_url: string | null; video_title: string | null; video_provider: string | null };
export type Lesson = { id: string; module_id: string; title: string; status: string };
export type Activity = { id: string; module_id: string | null; lesson_id: string | null; title: string; status: string };
export type Media = { id: string; module_id: string; status: string; title: string | null; provider: string | null; normalized_url: string | null; source_url: string | null };
export const missingLabels = { video: 'Missing video', lessons: 'Missing lessons', activities: 'Missing activities', description: 'Missing description', objectives: 'Missing objectives', ai_summary: 'Missing AI summary', career_connection: 'Missing career connection' } as const;
export type Missing = keyof typeof missingLabels;
const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export function assessModule(module: Module, lessons: Lesson[], activities: Activity[], media: Media[]) {
  const moduleLessons = lessons.filter(item => item.module_id === module.id);
  const lessonIds = new Set(moduleLessons.map(item => item.id));
  const moduleActivities = activities.filter(item => item.module_id === module.id || (!item.module_id && item.lesson_id && lessonIds.has(item.lesson_id)));
  const active = media.find(item => item.module_id === module.id && item.status === 'active' && (!module.active_instructional_media_id || item.id === module.active_instructional_media_id));
  // An explicit active-media pointer must resolve; do not hide a broken pointer with legacy metadata.
  const videoUrl = active ? active.normalized_url || active.source_url : module.active_instructional_media_id ? null : module.primary_video_url;
  const hasVideo = Boolean(videoUrl && normalizeInstructionalMediaUrl(videoUrl));
  const lessonCount = moduleLessons.filter(item => item.status === 'published').length;
  const activityCount = moduleActivities.filter(item => item.status === 'published').length;
  const checks: Record<Missing, boolean> = { video: hasVideo, lessons: lessonCount > 0, activities: activityCount > 0, description: hasText(module.description), objectives: Boolean(module.learning_objectives?.some(hasText)), ai_summary: hasText(module.ai_summary), career_connection: hasText(module.career_connection) };
  const missing = (Object.keys(checks) as Missing[]).filter(key => !checks[key]);
  return { module, lessons: moduleLessons, activities: moduleActivities, lessonCount, activityCount, hasVideo, videoTitle: active?.title || module.video_title, videoProvider: active?.provider || module.video_provider, missing, ready: module.status === 'published' && missing.length === 0 };
}
export type Readiness = ReturnType<typeof assessModule>;
export type DraftSection = { title: string; text: string };

export function generateModuleDraft(course: Course, row: Readiness): DraftSection[] {
  const { module, missing } = row;
  const sections: DraftSection[] = [];
  const add = (title: string, text: string) => sections.push({ title, text });
  const topic = module.title.trim();
  const lessonTopics = row.lessons.map(item => `${item.title} (${item.status})`).join('; ');
  const activityTopics = row.activities.map(item => `${item.title} (${item.status})`).join('; ');
  add('Staff Review Context', `JPAC template suggestion — review before use.\nCourse: ${course.title} (${course.slug})\nModule: ${topic}; order ${module.sort_order}; module number ${module.level_module_number ?? 'not available'}.\nExisting description: ${module.description?.trim() || 'None'}\nExisting lessons: ${lessonTopics || 'None'}\nExisting activities: ${activityTopics || 'None'}\nGaps: ${missing.map(key => missingLabels[key]).join(', ')}.\n${missing.includes('lessons') ? 'Staff action: develop and review at least one lesson in Curriculum Studio. This draft does not create a lesson.' : ''}`);
  if (missing.includes('description')) add('Module Description', `Build your creative confidence with ${topic} in JPAC ${course.title}. Explore the key ideas, try a focused creative exercise, and reflect on one improvement you can bring to your next rehearsal or project.`);
  if (missing.includes('ai_summary')) add('Student Summary', `In this module, you will explore ${topic} and connect it to your growth in ${course.title}. Work at a comfortable pace, practice with intention, and describe what changed between your first and next attempt.`);
  if (missing.includes('objectives')) add('Learning Objectives', `By the end of this module, you will be able to:\n• Explain one key idea from ${topic} in your own words.\n• Demonstrate that idea in a short ${course.title} exercise.\n• Use feedback to revise your work and identify one next step.`);
  if (missing.includes('career_connection')) add('Career Connection', `Creative professionals use focused practice, clear communication, and thoughtful revision. Apply ${topic} by explaining one creative choice to a collaborator and showing how feedback helped you improve. These habits support dependable work in rehearsals, studios, and creative projects.`);
  if (missing.includes('activities')) {
    add('Practice Activity Draft', `Try, reflect, refine: ${topic}\n1. Review the approved module lesson and demonstration.\n2. Choose one technique or idea to practice in a short ${course.title} exercise.\n3. Make a first attempt in a safe, comfortable workspace.\n4. Identify one strength and one change; try again.\n5. Share a brief reflection with your instructor. Staff: adapt materials, timing, and accessibility to the learner.`);
    add('Assignment Prompt Draft', `Show your growth in ${topic}. Create a short demonstration or creative sample using one idea from the approved lesson. Include a reflection explaining your goal, a choice you made, and one improvement after practice. Staff: confirm the submission format, scope, and accommodations before using this prompt.`);
    add('Rubric Draft', `Suggested review criteria — staff must approve:\n• Understanding: explains the chosen idea accurately (25%).\n• Application: demonstrates the idea with care (25%).\n• Creative choices: connects choices to the exercise goal (25%).\n• Reflection: identifies evidence of improvement and a next step (25%).\nFor each criterion: 4 = clear and independent; 3 = mostly clear with minor guidance; 2 = developing with support; 1 = needs another supported attempt. Assess growth and evidence, not access to expensive equipment.`);
  }
  if (missing.includes('video')) {
    add('Suggested Video Search', `YouTube search phrase: ${course.title} ${topic} step by step tutorial\nIdeal topic: a focused demonstration of ${topic} in ${course.title}.\nIdeal length: 4–10 minutes, adjusted by staff for the learner.\nMust-cover concepts: explain the central idea, demonstrate it clearly, show a practice example, and name a common mistake.${lessonTopics ? `\nCompare coverage with existing lessons: ${lessonTopics}.` : ''}`);
    add('Suggested Video Acceptance Criteria', 'Staff must watch the entire video. Confirm accurate instruction, age-appropriate language and visuals, clear sound, useful captions, safe practice, and an accessible pace. Avoid unsafe demonstrations, misleading claims, unrelated promotion, or requests for student personal information.\nMatch confidence guidance: strong = directly covers the module goal and practice; partial = relevant but needs explanation; weak = only shares keywords. Keyword matching is not approval. Verify availability and suitability in Video Finder before any manual update.');
  }
  return sections;
}
