-- Run before the Phase E3 review seed to capture the production Module 2 UUID
-- and its complete legacy footprint. This script is read-only.
begin transaction read only;

with module_2 as (
  select m.id,m.course_id,m.course_level_id,m.level_module_number,m.title,m.description,
         m.status,m.core_xp,m.created_at,m.updated_at
  from public.course_modules m
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=2
)
select * from module_2;

with module_2 as (
  select m.id from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=2
)
select l.id as lesson_id,l.title,l.description,l.status,l.sort_order,l.xp_value,
       count(distinct p.id) as progress_rows
from public.lessons l join module_2 m on m.id=l.module_id
left join public.lesson_progress p on p.lesson_id=l.id
group by l.id,l.title,l.description,l.status,l.sort_order,l.xp_value
order by l.sort_order,l.id;

with module_2 as (
  select m.id from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=2
)
select a.id as activity_id,a.lesson_id,a.title,a.description,a.status,a.activity_type,
       a.xp_reward,a.xp_type,a.passing_score,a.rubric,
       count(distinct s.id) as submission_rows
from public.activities a join module_2 m on m.id=a.module_id
left join public.submissions s on s.activity_id=a.id
group by a.id,a.lesson_id,a.title,a.description,a.status,a.activity_type,a.xp_reward,a.xp_type,a.passing_score,a.rubric
order by a.created_at,a.id;

with module_2 as (
  select m.id from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=2
), legacy_objects as (
  select id from module_2
  union select l.id from public.lessons l join module_2 m on m.id=l.module_id
  union select a.id from public.activities a join module_2 m on m.id=a.module_id
)
select x.id,x.student_id,x.amount,x.reason,x.source_type,x.source_id,x.xp_type,x.course_id,x.module_id,x.created_at
from public.xp_ledger x
where x.module_id=(select id from module_2) or x.source_id in(select id from legacy_objects)
order by x.created_at,x.id;

with singing as (select id from public.courses where slug='singing' limit 1)
select count(*) as singing_enrollment_count,
       md5(coalesce(string_agg(to_jsonb(e)::text,'|' order by e.id::text),'')) as singing_enrollment_hash
from public.enrollments e join singing s on s.id=e.course_id;

rollback;
