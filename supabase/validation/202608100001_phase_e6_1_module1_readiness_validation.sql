begin transaction read only;

with target as(
  select m.id,m.title,m.status,m.short_intro,m.video_brief,m.primary_video_url,
    m.lab_tool_id,m.core_xp,m.core_unlock_threshold
  from public.course_modules m
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=1
)
select 'module' as report,target.*,
  case when nullif(trim(target.short_intro),'') is not null then 'COMPLETE' else 'MISSING' end as mission_state,
  case when nullif(trim(target.video_brief),'') is not null then 'BRIEF_PRESENT' else 'BRIEF_MISSING' end as video_brief_state,
  case when nullif(trim(target.primary_video_url),'') is not null then 'APPROVED_MEDIA_PRESENT' else 'AWAITING_APPROVED_MEDIA' end as video_state,
  case when lt.id is not null and lt.status='ready' and nullif(trim(lt.launch_url),'') is not null then 'READY' else 'NOT_AVAILABLE' end as lab_state
from target
left join public.lab_tools lt on lt.id=target.lab_tool_id;

with target as(
  select m.id
  from public.course_modules m
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=1
)
select 'core_challenges' as report,a.id,a.title,a.status,a.required,a.xp_type,a.xp_reward,a.passing_score,a.rubric,
  case when jsonb_typeof(a.rubric->'criteria')='array'
    then (select sum(coalesce((criterion->>'weight')::numeric,0)) from jsonb_array_elements(a.rubric->'criteria') criterion)
    else null end as rubric_total,
  a.rubric='{"criteria":[{"name":"Alignment and posture","weight":20},{"name":"Breath coordination","weight":25},{"name":"Phrase control","weight":20},{"name":"Healthy vocal production","weight":20},{"name":"Preparation and completion","weight":15}]}'::jsonb as rubric_matches_reviewed_e3
from public.activities a
join target on target.id=a.module_id
where a.required and a.xp_type='core'
order by case a.status when 'draft' then 1 when 'review' then 2 when 'approved' then 3 when 'published' then 4 else 5 end,a.id;

with target as(
  select m.id
  from public.course_modules m
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=1
)
select 'preservation_counts' as report,
  (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=target.id) as lesson_progress_rows,
  (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.module_id=target.id) as submission_rows,
  (select count(*) from public.xp_ledger x where x.module_id=target.id) as xp_rows,
  (select count(*) from public.enrollments e join public.course_modules m on m.course_id=e.course_id where m.id=target.id) as enrollment_rows
from target;

do $$
declare
  target public.activities%rowtype;
  rubric_total numeric;
  reviewed_rubric constant jsonb := '{"criteria":[{"name":"Alignment and posture","weight":20},{"name":"Breath coordination","weight":25},{"name":"Phrase control","weight":20},{"name":"Healthy vocal production","weight":20},{"name":"Preparation and completion","weight":15}]}'::jsonb;
begin
  select * into target
  from public.activities
  where id='6ff39598-9e2c-4efd-8f9e-cd6d71d6d4db'::uuid;

  if target.id is null or target.rubric is distinct from reviewed_rubric then
    raise exception 'Module 1 challenge does not have the exact reviewed E3 rubric';
  end if;

  select sum((criterion->>'weight')::numeric) into rubric_total
  from jsonb_array_elements(target.rubric->'criteria') criterion;

  if rubric_total<>100 then
    raise exception 'Module 1 reviewed rubric total is %, expected 100',rubric_total;
  end if;
end $$;

rollback;
