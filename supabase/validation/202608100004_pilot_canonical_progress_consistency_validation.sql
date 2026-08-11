begin;
set local transaction read only;

with enrollment_facts as(
  select
    e.id enrollment_id,
    e.student_id,
    e.course_id,
    e.level,
    e.progress stored_progress,
    count(distinct m.id) filter(where m.status<>'archived') total_level_modules,
    count(distinct m.id) filter(
      where m.status<>'archived' and exists(
        select 1 from public.xp_ledger x
        where x.student_id=e.student_id
          and x.module_id=m.id
          and x.xp_type='core'
          and x.metadata->>'component'='mastery'
      )
    ) mastered_modules
  from public.enrollments e
  join public.course_levels l on l.course_id=e.course_id and l.level_number=e.level
  left join public.course_modules m on m.course_id=e.course_id and m.course_level_id=l.id
  group by e.id,e.student_id,e.course_id,e.level,e.progress
), calculated as(
  select *,case when total_level_modules>0 then round(mastered_modules::numeric/total_level_modules::numeric*100,2) else 0 end canonical_progress
  from enrollment_facts
)
select
  enrollment_id,
  student_id,
  course_id,
  level,
  total_level_modules,
  mastered_modules,
  stored_progress,
  canonical_progress,
  stored_progress=canonical_progress progress_matches
from calculated
order by student_id,course_id;

select
  to_regprocedure('public.jpac_sync_enrollment_progress(uuid,uuid)') is not null sync_function_exists,
  exists(
    select 1 from pg_trigger
    where tgrelid='public.xp_ledger'::regclass
      and tgname='xp_ledger_sync_canonical_progress'
      and not tgisinternal
  ) mastery_trigger_exists,
  exists(
    select 1 from pg_trigger
    where tgrelid='public.submissions'::regclass
      and tgname='submissions_sync_canonical_progress'
      and not tgisinternal
  ) assessment_trigger_exists,
  exists(
    select 1 from pg_trigger
    where tgrelid='public.enrollments'::regclass
      and tgname='enrollments_enforce_canonical_progress'
      and not tgisinternal
  ) enrollment_guard_exists,
  not has_function_privilege('anon','public.jpac_sync_enrollment_progress(uuid,uuid)','execute') anon_cannot_sync,
  not has_function_privilege('authenticated','public.jpac_sync_enrollment_progress(uuid,uuid)','execute') authenticated_cannot_sync,
  not has_function_privilege('anon','public.jpac_enforce_canonical_enrollment_progress()','execute') anon_cannot_enforce,
  not has_function_privilege('authenticated','public.jpac_enforce_canonical_enrollment_progress()','execute') authenticated_cannot_enforce;

select
  count(*) filter(where x.xp_type='core') core_xp_rows,
  coalesce(sum(x.amount) filter(where x.xp_type='core'),0) core_xp_total,
  count(*) filter(where x.metadata->>'component'='mastery') mastery_rows,
  (select count(*) from public.submissions) submission_rows,
  (select count(*) from public.lesson_progress) lesson_progress_rows,
  (select count(*) from public.enrollments) enrollment_rows
from public.xp_ledger x;

-- Pilot case: confirms whether Module 1 is truly mastered, rather than
-- inferring mastery from aggregate XP or an approved challenge alone.
select
  p.id student_id,
  c.id course_id,
  e.level,
  e.progress stored_active_level_mastery,
  count(distinct m.id) level_modules,
  count(distinct m.id) filter(where mastery.id is not null) mastered_modules,
  count(distinct s.id) filter(where s.status='approved') approved_attempts,
  (select coalesce(sum(x.amount),0) from public.xp_ledger x where x.student_id=p.id) total_ledger_xp
from public.profiles p
join public.enrollments e on e.student_id=p.id and e.status='active'
join public.courses c on c.id=e.course_id and c.slug='singing'
join public.course_levels l on l.course_id=c.id and l.level_number=e.level
join public.course_modules m on m.course_level_id=l.id and m.status<>'archived'
left join public.xp_ledger mastery on mastery.student_id=p.id and mastery.module_id=m.id and mastery.xp_type='core' and mastery.metadata->>'component'='mastery'
left join public.activities a on a.module_id=m.id and a.required
left join public.submissions s on s.student_id=p.id and s.activity_id=a.id
where lower(p.email)='rico.harris@jmonespac.org'
group by p.id,c.id,e.level,e.progress;

rollback;
