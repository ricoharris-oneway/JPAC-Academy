begin transaction read only;

with singing as(
  select c.id from public.courses c where c.slug='singing'
), beginner as(
  select cl.id from public.course_levels cl join singing s on s.id=cl.course_id where cl.level_number=1
), modules as(
  select m.* from public.course_modules m join singing s on s.id=m.course_id
), beginner_modules as(
  select m.* from modules m join beginner b on b.id=m.course_level_id
), expected as(
  select
    (select count(*) from modules)=40 as singing_has_40_modules,
    (select count(*) from beginner_modules)=10 as beginner_has_10_modules,
    (select count(*) from modules where core_xp=625)=40 as all_modules_have_625_core_xp,
    (select coalesce(sum(core_xp),0) from modules)=25000 as singing_has_25000_core_xp,
    (select count(*) from beginner_modules where level_module_number=1 and title='Breath, Alignment & Vocal Health' and status='published' and career_connection='Alignment, breath coordination, and healthy vocal production support reliable work for live performers, recording artists, voice actors, and other vocal creators.')=1 as module_1_career_is_canonical,
    (select count(*) from beginner_modules where level_module_number=2 and title='Pitch, Tone & First Performance' and status='published')=1 as legacy_module_2_is_preserved,
    not exists(select 1 from public.lessons l join beginner_modules m on m.id=l.module_id where l.status='published' and l.sort_order>=101) as no_staged_lessons_were_published,
    not exists(select 1 from public.activities a join beginner_modules m on m.id=a.module_id where a.status='published' and a.title in('Before-and-After Breath Challenge','Breath Cycle Comparison Lab','Find Your Sound Challenge')) as no_staged_activities_were_published
)
select *,case when singing_has_40_modules and beginner_has_10_modules and all_modules_have_625_core_xp
  and singing_has_25000_core_xp and module_1_career_is_canonical and legacy_module_2_is_preserved
  and no_staged_lessons_were_published and no_staged_activities_were_published
  then 'READY' else 'BLOCKED' end as overall_result from expected;

select m.level_module_number,m.id as module_uuid,m.title,m.status,m.core_xp,m.core_unlock_threshold,
       nullif(trim(m.career_connection),'') is not null as career_connection_present,
       nullif(trim(m.video_brief),'') is not null as video_brief_present,
       m.aria_coaching_targets<>'{}'::jsonb as aria_targets_present,
       m.career_mission_ideas<>'[]'::jsonb as career_ideas_present,
       m.portfolio_ready_threshold,m.portfolio_moment
from public.course_modules m
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1 and m.status='published'
order by m.level_module_number;

-- Historical tables are deliberately read only; capture these counts before
-- and after execution and confirm they are unchanged.
select
  (select count(*) from public.lesson_progress) as lesson_progress_rows,
  (select count(*) from public.submissions) as submission_rows,
  (select count(*) from public.xp_ledger) as xp_ledger_rows,
  (select count(*) from public.enrollments) as enrollment_rows;

rollback;
