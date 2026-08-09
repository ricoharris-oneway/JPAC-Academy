-- Read-only validation for Build 2.5 Phase E3.
begin transaction read only;

do $$
declare
  singing_id uuid;
  beginner_id uuid;
  missing_columns integer;
  total_levels integer;
  beginner_modules integer;
  total_modules integer;
  incorrect_module_xp integer;
  total_core_xp integer;
  duplicate_numbers integer;
  duplicate_titles integer;
  authored_higher_levels integer;
  module_2_id uuid;
  legacy_lesson_count integer;
  legacy_activity_count integer;
begin
  select id into singing_id from public.courses where lower(slug) = 'singing' limit 1;
  if singing_id is null then raise exception 'BLOCKED: canonical Singing course not found'; end if;

  select id into beginner_id from public.course_levels where course_id = singing_id and level_number = 1;
  if beginner_id is null then raise exception 'BLOCKED: Beginner level not found'; end if;

  select count(*) into missing_columns
  from (values
    ('course_modules','video_brief'),('course_modules','aria_coaching_targets'),
    ('course_modules','career_mission_ideas'),('course_modules','portfolio_ready_threshold'),
    ('lessons','short_summary'),('lessons','learning_objective'),('lessons','content_blocks'),
    ('lessons','technique_cues'),('lessons','common_mistakes'),('lessons','self_check'),
    ('lessons','resource_brief')
  ) expected(table_name,column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema='public' and c.table_name=expected.table_name and c.column_name=expected.column_name
  );
  if missing_columns <> 0 then raise exception 'BLOCKED: % Phase E3 authoring columns missing',missing_columns; end if;

  select count(*) into total_levels from public.course_levels where course_id=singing_id;
  select count(*) into beginner_modules from public.course_modules where course_id=singing_id and course_level_id=beginner_id;
  select count(*) into total_modules from public.course_modules where course_id=singing_id;
  select count(*) into incorrect_module_xp from public.course_modules where course_id=singing_id and core_xp<>625;
  select coalesce(sum(core_xp),0) into total_core_xp from public.course_modules where course_id=singing_id;
  if total_levels<>4 or beginner_modules<>10 or total_modules<>40 or incorrect_module_xp<>0 or total_core_xp<>25000 then
    raise exception 'BLOCKED: canonical totals differ (levels %, beginner %, modules %, wrong XP %, total XP %)',total_levels,beginner_modules,total_modules,incorrect_module_xp,total_core_xp;
  end if;

  select count(*) into duplicate_numbers from (select level_module_number from public.course_modules where course_level_id=beginner_id group by level_module_number having count(*)>1) d;
  select count(*) into duplicate_titles from (select lower(trim(title)) from public.course_modules where course_level_id=beginner_id group by lower(trim(title)) having count(*)>1) d;
  if duplicate_numbers<>0 or duplicate_titles<>0 then raise exception 'BLOCKED: duplicate Beginner modules detected'; end if;

  select id into module_2_id from public.course_modules where course_level_id=beginner_id and level_module_number=2 and title='Pitch, Tone & First Performance' and status='published';
  if module_2_id is null then raise exception 'BLOCKED: authoring changed the published Module 2 identity or state'; end if;
  if not exists(select 1 from public.course_modules where course_level_id=beginner_id and level_module_number=3 and title='Pitch Control') then
    raise exception 'BLOCKED: canonical Module 3 is not Pitch Control';
  end if;
  select count(*) into legacy_lesson_count from public.lessons
  where module_id=module_2_id and title in ('Pitch Matching and Listening','Foundation Performance') and status='published';
  select count(*) into legacy_activity_count from public.activities
  where module_id=module_2_id and title='Level 1 Foundation Performance' and status='published';
  if legacy_lesson_count<>2 or legacy_activity_count<>1 then
    raise exception 'BLOCKED: authoring changed the published Module 2 pilot';
  end if;
  if (select count(*) from public.lessons where module_id=module_2_id and status='draft' and sort_order between 101 and 103
      and title in ('Speaking Into Song','Comfortable Range and Tension Awareness','Natural Tone and Healthy Onset'))<>3 then
    raise exception 'BLOCKED: staged Natural Voice lessons are incomplete';
  end if;
  if (select count(*) from public.activities where module_id=module_2_id and status='draft'
      and title in ('Three Versions, One Authentic Voice','Natural Tone Comparison Lab','Find Your Sound Challenge'))<>3 then
    raise exception 'BLOCKED: staged Natural Voice activities are incomplete';
  end if;

  select count(*) into authored_higher_levels
  from public.course_modules m join public.course_levels l on l.id=m.course_level_id
  where m.course_id=singing_id and l.level_number>1
    and (m.video_brief<>'' or m.aria_coaching_targets<>'{}'::jsonb or m.career_mission_ideas<>'[]'::jsonb);
  if authored_higher_levels<>0 then raise exception 'BLOCKED: Phase E3-style authoring found above Beginner'; end if;
  if (select count(*) from public.course_modules where course_level_id=beginner_id
      and jsonb_typeof(aria_coaching_targets->'evidence_targets')='array'
      and jsonb_array_length(aria_coaching_targets->'evidence_targets')>=4
      and nullif(aria_coaching_targets->>'priority_rule','') is not null)<>10 then
    raise exception 'BLOCKED: ARIA evidence targets are incomplete';
  end if;
  if (select count(*) from public.lessons l where l.module_id in(select id from public.course_modules where course_level_id=beginner_id)
      and jsonb_typeof(l.content_blocks)='array' and jsonb_array_length(l.content_blocks)>=4)<>30 then
    raise exception 'BLOCKED: expected 30 substantial authored lessons with at least four learning blocks';
  end if;
end $$;

-- Concise review report. Authored counts are expected after the separate review seed is run.
with singing as (select id from public.courses where lower(slug)='singing' limit 1),
beginner as (select l.id from public.course_levels l join singing s on s.id=l.course_id where l.level_number=1),
modules as (select m.* from public.course_modules m join beginner b on b.id=m.course_level_id)
select
  (select id from singing) as singing_course_id,
  (select id from modules where level_module_number=2) as unchanged_module_2_id,
  (select title from modules where level_module_number=2) as module_2_title,
  (select title from modules where level_module_number=3) as module_3_title,
  (select count(*) from public.course_levels l join singing s on s.id=l.course_id) as level_count,
  (select count(*) from modules) as beginner_module_count,
  (select count(*) from public.course_modules m join singing s on s.id=m.course_id) as singing_module_count,
  (select count(*) from modules where core_xp=625) as beginner_modules_at_625_core_xp,
  (select sum(m.core_xp) from public.course_modules m join singing s on s.id=m.course_id) as singing_core_xp,
  (select count(*) from modules where status='published') as preserved_published_modules,
  (select count(*) from modules where video_brief is not null and jsonb_typeof(aria_coaching_targets)='object') as authored_modules,
  (select count(*) from public.lessons l join modules m on m.id=l.module_id where l.status='draft' and l.content_blocks<>'[]'::jsonb) as authored_draft_lessons,
  (select count(*) from public.activities a join modules m on m.id=a.module_id where a.status='draft') as staged_draft_activities,
  (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join modules m on m.id=l.module_id) as preserved_beginner_progress_rows,
  (select count(*) from public.submissions sub join public.activities a on a.id=sub.activity_id join modules m on m.id=a.module_id) as preserved_beginner_submissions;

-- Every row proves the visible Phase D pilot and its student evidence remain
-- unchanged after the authoring-only seed.
with singing as (select id from public.courses where lower(slug)='singing' limit 1),
beginner as (select l.id from public.course_levels l join singing s on s.id=l.course_id where l.level_number=1),
module_2 as (select m.id from public.course_modules m join beginner b on b.id=m.course_level_id where m.level_module_number=2)
select l.id as legacy_lesson_id,l.title,l.status,l.sort_order,
       count(distinct p.id) as preserved_progress_rows,
       count(distinct sub.id) as preserved_submission_rows,
       count(distinct x.id) as preserved_xp_rows
from public.lessons l
join module_2 m on m.id=l.module_id
left join public.lesson_progress p on p.lesson_id=l.id
left join public.activities a on a.lesson_id=l.id
left join public.submissions sub on sub.activity_id=a.id
left join public.xp_ledger x on x.module_id=m.id or x.source_id in (l.id,a.id)
where l.title in ('Pitch Matching and Listening','Foundation Performance')
group by l.id,l.title,l.status,l.sort_order
order by l.sort_order;

-- Enrollment ownership is untouched: this reports the canonical Singing count.
with singing as (select id from public.courses where lower(slug)='singing' limit 1)
select count(*) as singing_enrollment_count
from public.enrollments e join singing s on s.id=e.course_id;

-- Draft activity and rubric integrity. Returns zero rows when valid.
with singing as (select id from public.courses where lower(slug)='singing' limit 1),
beginner as (select l.id from public.course_levels l join singing s on s.id=l.course_id where l.level_number=1),
drafts as (
  select a.id,a.module_id,a.activity_type,a.xp_reward as xp_value,a.passing_score,a.rubric,
         coalesce((select sum((item->>'weight')::numeric) from jsonb_array_elements(a.rubric->'criteria') item),0) rubric_weight
  from public.activities a join public.course_modules m on m.id=a.module_id join beginner b on b.id=m.course_level_id
  where a.status='draft'
)
select * from drafts
where passing_score<>70 or (activity_type='performance' and rubric_weight<>100)
   or (activity_type='performance' and xp_value<>350)
   or (activity_type='practice' and xp_value<>50);

-- RLS and identity safety checks: these should return enabled=true and zero orphan counts.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('course_modules','lessons','activities','lesson_progress','submissions')
order by c.relname;

select
  (select count(*) from public.lesson_progress p left join public.lessons l on l.id=p.lesson_id where l.id is null) as orphan_progress,
  (select count(*) from public.submissions s left join public.activities a on a.id=s.activity_id where a.id is null) as orphan_submissions;

rollback;
