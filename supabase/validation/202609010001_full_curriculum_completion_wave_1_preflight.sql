-- READ ONLY. Run before requesting approval to apply Wave 1.

with target_courses as (
  select * from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
), target_modules as (
  select m.* from public.course_modules m join target_courses c on c.id=m.course_id where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
select
  (select count(*) from target_courses) target_courses,
  (select count(*) from target_modules) target_modules,
  (select count(*) from public.lessons l join target_modules m on m.id=l.module_id) target_lessons,
  (select count(*) from public.activities a join target_modules m on m.id=a.module_id) target_activities,
  (select count(*) from target_courses where nullif(trim(ai_summary),'') is null) missing_course_summaries,
  (select count(*) from target_courses where cardinality(learning_objectives)=0) missing_course_objectives,
  (select count(*) from target_courses where cardinality(career_tags)=0) missing_course_career_tags,
  (select count(*) from target_modules where cardinality(learning_objectives)=0) missing_module_objectives,
  (select count(*) from target_modules where nullif(trim(career_connection),'') is null) missing_module_career_connections;

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
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual<>9 then raise exception 'Expected 9 Wave 1 courses; found %',actual; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual<>432 then raise exception 'Expected 432 Wave 1 modules; found %',actual; end if;
  if not exists(select 1 from public.course_modules where id='b94c8524-9715-4020-8075-5588b6fcce62' and title='Save Draft Test Module' and status='draft') then raise exception 'Excluded Piano test module baseline changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status baseline changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video baseline changed'; end if;
end $assert$;
