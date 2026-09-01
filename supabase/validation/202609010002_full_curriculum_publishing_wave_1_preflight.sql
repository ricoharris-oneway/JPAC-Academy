-- READ ONLY. Run before requesting approval to apply Publishing Wave 1.

with target_courses as (
  select * from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
), target_modules as (
  select m.* from public.course_modules m join target_courses c on c.id=m.course_id where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
), target_lessons as (
  select l.* from public.lessons l join target_modules m on m.id=l.module_id
), target_activities as (
  select a.* from public.activities a join target_modules m on m.id=a.module_id
)
select
  (select count(*) from target_courses) target_courses,
  (select count(*) from target_modules) target_modules,
  (select count(*) from target_lessons) target_lessons,
  (select count(*) from target_activities) target_activities,
  (select count(*) from target_modules where status='draft') draft_modules,
  (select count(*) from target_lessons where status='draft') draft_lessons,
  (select count(*) from target_activities where status='draft') draft_activities;

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
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual<>9 then raise exception 'Expected 9 target courses; found %',actual; end if;
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and (status<>'published' or nullif(trim(ai_summary),'') is null or cardinality(learning_objectives)=0 or cardinality(career_tags)=0);
  if actual<>0 then raise exception 'Target course status or metadata baseline changed'; end if;
  select md5(string_agg(concat_ws('|',id::text,ai_summary,array_to_string(learning_objectives,E'\x1f'),array_to_string(career_tags,E'\x1f')),E'\n' order by id)) into actual_hash from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual_hash<>'2c68234b2376e8bb9185dfa3db724607' then raise exception 'Course completion hash changed'; end if;

  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual<>432 then raise exception 'Expected 432 modules; found %',actual; end if;
  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual<>1296 then raise exception 'Expected 1296 lessons; found %',actual; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual<>864 then raise exception 'Expected 864 activities; found %',actual; end if;

  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and (m.status<>'draft' or cardinality(m.learning_objectives)=0 or nullif(trim(m.career_connection),'') is null);
  if actual<>0 then raise exception 'Target module status or metadata baseline changed'; end if;
  select md5(string_agg(concat_ws('|',m.id::text,array_to_string(m.learning_objectives,E'\x1f'),m.career_connection),E'\n' order by m.id)) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual_hash<>'a65b2435025575e199755d1800c28334' then raise exception 'Module completion hash changed'; end if;

  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual<>36 then raise exception 'Expected 36 published prerequisite levels; found %',actual; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and not exists(select 1 from public.course_modules m where m.course_level_id=cl.id and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62');
  if actual<>0 then raise exception 'An empty target level shell exists'; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and (cl.status<>'published' or cl.approved_at is null or cl.approved_by is not null);
  if actual<>0 then raise exception 'Published course-level prerequisite changed'; end if;

  select count(*) into actual from public.course_modules m where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and m.course_id in(select id from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])) and ((select count(*) from public.lessons l where l.module_id=m.id)<>3 or (select count(*) from public.activities a where a.module_id=m.id)<>2);
  if actual<>0 then raise exception 'A target module has an incomplete child-record shape'; end if;
  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and (l.status<>'draft' or nullif(trim(l.title),'') is null or nullif(trim(l.description),'') is null or nullif(trim(l.short_summary),'') is null or nullif(trim(l.learning_objective),'') is null or l.duration_minutes is null or jsonb_typeof(l.content_blocks)<>'array' or jsonb_array_length(l.content_blocks)=0 or cardinality(l.technique_cues)=0 or cardinality(l.common_mistakes)=0 or nullif(trim(l.self_check),'') is null);
  if actual<>0 then raise exception 'Target lesson status or required content baseline changed'; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and (a.status<>'draft' or nullif(trim(a.title),'') is null or nullif(trim(a.description),'') is null or nullif(trim(a.instructions),'') is null or nullif(trim(a.activity_type),'') is null or nullif(trim(a.submission_type),'') is null);
  if actual<>0 then raise exception 'Target activity status or required content baseline changed'; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and a.required and a.xp_type='core' and (jsonb_typeof(a.rubric->'criteria')<>'array' or jsonb_array_length(a.rubric->'criteria')=0 or (select coalesce(sum((criterion->>'weight')::numeric),0) from jsonb_array_elements(a.rubric->'criteria') criterion)<>100 or a.xp_reward<>350 or a.passing_score<>70 or not a.allows_resubmission);
  if actual<>0 then raise exception 'Core Challenge rubric or XP contract changed'; end if;

  if not exists(select 1 from public.course_modules where id='b94c8524-9715-4020-8075-5588b6fcce62' and title='Save Draft Test Module' and status='draft') then raise exception 'Excluded Piano test module changed'; end if;
  select count(*) into actual from public.lessons where module_id='b94c8524-9715-4020-8075-5588b6fcce62' and status='draft'; if actual<>3 then raise exception 'Excluded Piano test lessons changed'; end if;
  select count(*) into actual from public.activities where module_id='b94c8524-9715-4020-8075-5588b6fcce62' and status='draft'; if actual<>2 then raise exception 'Excluded Piano test activities changed'; end if;

  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic/access counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.courses; if actual_hash<>'8082773c4d305ebc6c08ee3615428c36' then raise exception 'Course status hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Published course-level prerequisite hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Module status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Lesson status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Activity status hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(primary_video_url,''),coalesce(video_title,''),coalesce(video_provider,''),coalesce(video_duration_seconds::text,''),coalesce(active_instructional_media_id::text,'')),E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'5f16841e053bdad2cd79740c90233a1b' then raise exception 'Global video hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'fe5066455650e47c94e72f3cb3f9f6ac' then raise exception 'Module identity/XP hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'bc805ba34679ae3d2f4e33862c2423a1' then raise exception 'Lesson identity/XP hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'e46580d9f35006238965e4dacb05a0ae' then raise exception 'Activity identity/XP/mastery hash changed'; end if;
end $assert$;
