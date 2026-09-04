-- READ-ONLY POST-VALIDATION. Run only after a separately approved import.
begin transaction read only;

select cl.level_number,count(distinct m.id) modules,count(distinct l.id) lessons,count(distinct a.id) assignments,
  count(distinct m.id) filter(where m.status='draft') draft_modules,
  count(distinct l.id) filter(where l.status='draft') draft_lessons,
  count(distinct a.id) filter(where a.status='draft') draft_assignments
from public.course_levels cl join public.courses c on c.id=cl.course_id
join public.course_modules m on m.course_level_id=cl.id
left join public.lessons l on l.module_id=m.id left join public.activities a on a.module_id=m.id
where c.slug='singing' and cl.level_number between 2 and 4 group by cl.level_number order by cl.level_number;

select m.id module_id,m.title,cl.level_number,m.level_module_number,m.primary_video_url,m.video_title,m.video_provider,m.video_duration_seconds,m.active_instructional_media_id,
  (select count(*) from public.module_instructional_media x where x.module_id=m.id) module_instructional_media_count
from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id
where c.slug='singing' order by cl.level_number,m.level_module_number;

select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,''),(select count(*) from public.module_instructional_media x where x.module_id=m.id)::text),E'\n' order by m.id),'')) singing_video_media_count_hash,
  md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) legacy_singing_video_hash
from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null or exists(select 1 from public.module_instructional_media x where x.module_id=m.id));

do $$ declare actual text; begin
  if (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>30 then raise exception 'Expected 30 target modules'; end if;
  if (select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>90 then raise exception 'Expected 90 target lessons'; end if;
  if (select count(*) from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4)<>30 then raise exception 'Expected 30 target assignments'; end if;
  if exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4 and (m.status<>'draft' or m.core_xp<>625 or m.core_unlock_threshold<>438)) then raise exception 'Target status/XP contract changed'; end if;
  if exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4 and l.status<>'draft') or exists(select 1 from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4 and a.status<>'draft') then raise exception 'Children must remain draft'; end if;
  if exists(select 1 from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id where c.slug='singing' and cl.level_number between 2 and 4 and (a.xp_reward<>350 or a.xp_type<>'core' or a.passing_score<>70 or not a.required)) then raise exception 'Assignment completion contract changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,''),(select count(*) from public.module_instructional_media x where x.module_id=m.id)::text),E'\n' order by m.id),'')) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null or exists(select 1 from public.module_instructional_media x where x.module_id=m.id)); if actual<>'e6e45328064ad2b26c8d7df6de4383ec' then raise exception 'Singing video/media-count baseline changed'; end if;
end $$;

rollback;
