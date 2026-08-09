begin;

-- Structured curriculum-authoring fields. These additions do not change
-- publication, access, XP, progression, or existing curriculum identities.
alter table public.course_modules
  add column if not exists video_brief text not null default '',
  add column if not exists aria_coaching_targets jsonb not null default '{}'::jsonb,
  add column if not exists career_mission_ideas jsonb not null default '[]'::jsonb,
  add column if not exists portfolio_ready_threshold numeric(5,2);

alter table public.course_modules drop constraint if exists course_modules_aria_coaching_targets_object_check;
alter table public.course_modules add constraint course_modules_aria_coaching_targets_object_check check(jsonb_typeof(aria_coaching_targets)='object');
alter table public.course_modules drop constraint if exists course_modules_career_mission_ideas_array_check;
alter table public.course_modules add constraint course_modules_career_mission_ideas_array_check check(jsonb_typeof(career_mission_ideas)='array');
alter table public.course_modules drop constraint if exists course_modules_portfolio_ready_threshold_check;
alter table public.course_modules add constraint course_modules_portfolio_ready_threshold_check check(portfolio_ready_threshold is null or portfolio_ready_threshold between 0 and 100);

alter table public.lessons
  add column if not exists short_summary text not null default '',
  add column if not exists learning_objective text not null default '',
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists technique_cues text[] not null default '{}',
  add column if not exists common_mistakes text[] not null default '{}',
  add column if not exists self_check text not null default '',
  add column if not exists resource_brief text not null default '';

alter table public.lessons drop constraint if exists lessons_content_blocks_array_check;
alter table public.lessons add constraint lessons_content_blocks_array_check check(jsonb_typeof(content_blocks)='array');

comment on column public.course_modules.video_brief is 'Staff authoring brief for a future approved instructional video; never a fabricated media URL.';
comment on column public.course_modules.aria_coaching_targets is 'Evidence categories and conditional coaching rules for staff/ARIA review; does not itself create recommendations or academic mutations.';
comment on column public.course_modules.career_mission_ideas is 'Review-stage Bonus-only career mission concepts; not executable progression records.';
comment on column public.course_modules.portfolio_ready_threshold is 'Optional quality threshold distinct from the assessment passing score; does not automatically award portfolio status.';
comment on column public.lessons.content_blocks is 'Ordered staff-authored instructional blocks rendered by the Lesson Experience.';

commit;
