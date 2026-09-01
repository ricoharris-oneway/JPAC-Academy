-- READ ONLY. Run before requesting approval for the course-level prerequisite.

with target_courses as (
  select * from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
), target_levels as (
  select cl.* from public.course_levels cl join target_courses c on c.id=cl.course_id
), target_modules as (
  select m.* from public.course_modules m join target_courses c on c.id=m.course_id where m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
select
  (select count(*) from target_courses) target_courses,
  (select count(*) from target_levels) target_levels,
  (select count(*) from target_levels where status='draft' and approved_at is null) ready_draft_levels,
  (select count(*) from target_levels where nullif(trim(title),'') is null or nullif(trim(description),'') is null or cardinality(learning_objectives)=0) incomplete_levels,
  (select count(*) from target_levels tl where not exists(select 1 from target_modules tm where tm.course_level_id=tl.id)) empty_level_shells,
  (select count(*) from target_modules where course_level_id is null or not exists(select 1 from target_levels tl where tl.id=target_modules.course_level_id)) module_level_relationship_gaps;

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
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual<>9 then raise exception 'Expected 9 target courses; found %',actual; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual<>36 then raise exception 'Expected 36 target levels; found %',actual; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and (cl.status<>'draft' or cl.approved_at is not null or cl.approved_by is not null or nullif(trim(cl.title),'') is null or nullif(trim(cl.description),'') is null or cardinality(cl.learning_objectives)=0); if actual<>0 then raise exception 'Target level status, approval, or content baseline changed'; end if;
  select md5(string_agg(concat_ws('|',cl.id::text,cl.course_id::text,cl.level_number::text,cl.title,cl.description,array_to_string(cl.learning_objectives,E'\x1f'),cl.core_xp_target::text,cl.review_notes),E'\n' order by cl.id)) into actual_hash from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual_hash<>'fd6f47e501bb8607de5e8aa20ac6f2eb' then raise exception 'Target level content hash changed'; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and not exists(select 1 from public.course_modules m where m.course_level_id=cl.id and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'); if actual<>0 then raise exception 'Empty target level shell found'; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and (m.course_level_id is null or not exists(select 1 from public.course_levels cl where cl.id=m.course_level_id and cl.course_id=m.course_id)); if actual<>0 then raise exception 'Target module-level relationship gap found'; end if;
  if (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62')<>432 then raise exception 'Target module count changed'; end if;
  select md5(string_agg(concat_ws('|',m.id::text,array_to_string(m.learning_objectives,E'\x1f'),m.career_connection),E'\n' order by m.id)) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'; if actual_hash<>'a65b2435025575e199755d1800c28334' then raise exception 'Target module completion hash changed'; end if;
  if not exists(select 1 from public.course_modules where id='b94c8524-9715-4020-8075-5588b6fcce62' and title='Save Draft Test Module' and status='draft') then raise exception 'Excluded Piano test artifact changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected counts changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'4ed20ac7a8245b63906c1aaeed7b59b3' then raise exception 'Course-level publication hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Module status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Lesson status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Activity status hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
end $assert$;
