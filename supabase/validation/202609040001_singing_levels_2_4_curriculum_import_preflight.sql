-- READ-ONLY PREFLIGHT. Safe to run before separately approving the import.
begin transaction read only;

select m.id module_id,m.title,cl.level_number,m.level_module_number,
  m.primary_video_url,m.video_title,m.video_provider,m.video_duration_seconds,
  m.active_instructional_media_id,
  (select count(*) from public.module_instructional_media x where x.module_id=m.id) module_instructional_media_count
from public.course_modules m join public.courses c on c.id=m.course_id
join public.course_levels cl on cl.id=m.course_level_id
where c.slug='singing'
order by cl.level_number,m.level_module_number;

select
  count(*) filter(where cl.level_number between 2 and 4) target_modules,
  count(*) filter(where cl.level_number between 2 and 4 and m.status='draft') draft_target_modules,
  count(*) filter(where cl.level_number between 2 and 4 and m.core_xp=625 and m.core_unlock_threshold=438) canonical_xp_targets,
  (select count(*) from public.lessons l join public.course_modules lm on lm.id=l.module_id join public.courses lc on lc.id=lm.course_id join public.course_levels ll on ll.id=lm.course_level_id where lc.slug='singing' and ll.level_number between 2 and 4) existing_target_lessons,
  (select count(*) from public.activities a join public.course_modules am on am.id=a.module_id join public.courses ac on ac.id=am.course_id join public.course_levels al on al.id=am.course_level_id where ac.slug='singing' and al.level_number between 2 and 4) existing_target_activities
from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing';

select
  md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,''),(select count(*) from public.module_instructional_media x where x.module_id=m.id)::text),E'\n' order by m.id),'')) singing_video_media_count_hash,
  md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) legacy_singing_video_hash
from public.course_modules m join public.courses c on c.id=m.course_id
where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null or exists(select 1 from public.module_instructional_media x where x.module_id=m.id));

select 'protected_counts' check_name,
  (select count(*) from public.enrollments) enrollments,
  (select count(*) from public.lesson_progress) lesson_progress,
  (select count(*) from public.activity_progress) activity_progress,
  (select count(*) from public.xp_ledger) xp_ledger,
  (select count(*) from public.student_xp_ledger) student_xp_ledger,
  (select count(*) from public.student_skill_mastery) mastery,
  (select count(*) from public.submissions) submissions,
  (select count(*) from public.certificates) certificates;

do $$ declare actual text; begin
  if (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>30 then raise exception 'Expected 30 target modules'; end if;
  if exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4 and (m.status<>'draft' or m.core_xp<>625 or m.core_unlock_threshold<>438)) then raise exception 'Target draft/XP baseline changed'; end if;
  if (select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>0 then raise exception 'Target lessons now exist; reconcile instead of duplicating'; end if;
  if (select count(*) from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>0 then raise exception 'Target activities now exist; reconcile instead of duplicating'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,''),(select count(*) from public.module_instructional_media x where x.module_id=m.id)::text),E'\n' order by m.id),'')) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null or exists(select 1 from public.module_instructional_media x where x.module_id=m.id)); if actual<>'e6e45328064ad2b26c8d7df6de4383ec' then raise exception 'Singing video/media-count baseline changed: %',actual; end if;
end $$;

rollback;
