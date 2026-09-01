-- READ ONLY. Run only after an explicitly approved Publishing Wave 1 application.

with target_courses as (
  select * from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
), target_modules as (
  select m.* from public.course_modules m join target_courses c on c.id=m.course_id where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
select
  (select count(*) from target_courses where status='published') published_courses,
  (select count(*) from target_modules where status='published') published_modules,
  (select count(*) from public.lessons l join target_modules m on m.id=l.module_id where l.status='published') published_lessons,
  (select count(*) from public.activities a join target_modules m on m.id=a.module_id where a.status='published') published_activities,
  (select count(*) from target_modules where status<>'published') unpublished_modules,
  (select count(*) from public.lessons l join target_modules m on m.id=l.module_id where l.status<>'published') unpublished_lessons,
  (select count(*) from public.activities a join target_modules m on m.id=a.module_id where a.status<>'published') unpublished_activities;

select
  (select count(*) from public.xp_ledger) xp_ledger,
  (select count(*) from public.enrollments) enrollments,
  (select count(*) from public.submissions) submissions,
  (select count(*) from public.certificates) certificates,
  (select count(*) from public.lesson_progress) lesson_progress;

select count(*) singing_video_modules,
  md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) singing_video_hash
from public.course_modules m join public.courses c on c.id=m.course_id
where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);

do $assert$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and m.status='published'; if actual<>432 then raise exception 'Expected 432 published modules; found %',actual; end if;
  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and l.status='published'; if actual<>1296 then raise exception 'Expected 1296 published lessons; found %',actual; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and a.status='published'; if actual<>864 then raise exception 'Expected 864 published activities; found %',actual; end if;
  if not exists(select 1 from public.course_modules where id='b94c8524-9715-4020-8075-5588b6fcce62' and title='Save Draft Test Module' and status='draft') then raise exception 'Excluded Piano test module changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.courses; if actual_hash<>'8082773c4d305ebc6c08ee3615428c36' then raise exception 'Course status changed'; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and cl.status='published' and cl.approved_at is not null and cl.approved_by is null; if actual<>36 then raise exception 'Published course-level prerequisite changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Published course-level prerequisite hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'33d6b3dbf3574fcaf99b19a0fd91a065' then raise exception 'Module status hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'30d7b1cc36aad17698103f9fb04e97d2' then raise exception 'Lesson status hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'234d87df696612d5d5b8f4e4646c691b' then raise exception 'Activity status hash mismatch'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(primary_video_url,''),coalesce(video_title,''),coalesce(video_provider,''),coalesce(video_duration_seconds::text,''),coalesce(active_instructional_media_id::text,'')),E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'5f16841e053bdad2cd79740c90233a1b' then raise exception 'Global video hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'fe5066455650e47c94e72f3cb3f9f6ac' then raise exception 'Module identity/XP hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'bc805ba34679ae3d2f4e33862c2423a1' then raise exception 'Lesson identity/XP hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'e46580d9f35006238965e4dacb05a0ae' then raise exception 'Activity identity/XP/mastery hash changed'; end if;
end $assert$;
