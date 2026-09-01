-- READ ONLY. Run after an explicitly approved Wave 1 application.

with target_courses as (
  select * from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
), target_modules as (
  select m.* from public.course_modules m join target_courses c on c.id=m.course_id where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
select
  (select count(*) from target_courses) completed_courses,
  (select count(*) from target_modules) completed_modules,
  (select count(*) from target_courses where nullif(trim(ai_summary),'') is null or cardinality(learning_objectives)=0 or cardinality(career_tags)=0) incomplete_courses,
  (select count(*) from target_modules where cardinality(learning_objectives)=0 or nullif(trim(career_connection),'') is null) incomplete_modules,
  (select md5(string_agg(concat_ws('|',id::text,ai_summary,array_to_string(learning_objectives,E'\x1f'),array_to_string(career_tags,E'\x1f')),E'\n' order by id)) from target_courses) course_completion_hash,
  (select md5(string_agg(concat_ws('|',id::text,array_to_string(learning_objectives,E'\x1f'),career_connection),E'\n' order by id)) from target_modules) module_completion_hash;

select
  (select count(*) from public.xp_ledger) xp_ledger,
  (select count(*) from public.enrollments) enrollments,
  (select count(*) from public.submissions) submissions,
  (select count(*) from public.certificates) certificates,
  (select count(*) from public.lesson_progress) lesson_progress,
  (select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) from public.course_modules) curriculum_status_hash,
  (select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) from public.course_modules) module_identity_xp_hash,
  (select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) from public.lessons) lesson_identity_xp_hash,
  (select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) from public.activities) activity_identity_xp_mastery_hash;

select count(*) singing_video_modules,
  md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) singing_video_hash
from public.course_modules m join public.courses c on c.id=m.course_id
where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);

do $assert$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and (nullif(trim(ai_summary),'') is null or cardinality(learning_objectives)=0 or cardinality(career_tags)=0);
  if actual<>0 then raise exception 'Wave 1 has % incomplete courses',actual; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and (cardinality(m.learning_objectives)=0 or nullif(trim(m.career_connection),'') is null);
  if actual<>0 then raise exception 'Wave 1 has % incomplete modules',actual; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'fe5066455650e47c94e72f3cb3f9f6ac' then raise exception 'Module identity or XP fields changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) into actual_hash from public.lessons;
  if actual_hash<>'bc805ba34679ae3d2f4e33862c2423a1' then raise exception 'Lesson identity or XP fields changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) into actual_hash from public.activities;
  if actual_hash<>'e46580d9f35006238965e4dacb05a0ae' then raise exception 'Activity identity, XP, or mastery fields changed'; end if;
  select md5(string_agg(concat_ws('|',id::text,ai_summary,array_to_string(learning_objectives,E'\x1f'),array_to_string(career_tags,E'\x1f')),E'\n' order by id)) into actual_hash from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual_hash<>'2c68234b2376e8bb9185dfa3db724607' then raise exception 'Course completion hash mismatch'; end if;
  select md5(string_agg(concat_ws('|',m.id::text,array_to_string(m.learning_objectives,E'\x1f'),m.career_connection),E'\n' order by m.id)) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual_hash<>'a65b2435025575e199755d1800c28334' then raise exception 'Module completion hash mismatch'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video baseline changed'; end if;
end $assert$;
