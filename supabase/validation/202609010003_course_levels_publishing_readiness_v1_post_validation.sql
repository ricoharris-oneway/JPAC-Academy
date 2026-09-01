-- READ ONLY. Run after an explicitly approved course-level publication.

with target_levels as (
  select cl.* from public.course_levels cl join public.courses c on c.id=cl.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
)
select
  count(*) target_levels,
  count(*) filter(where status='published' and approved_at is not null) published_approved_levels,
  count(*) filter(where status<>'published' or approved_at is null) incomplete_publication,
  count(*) filter(where nullif(trim(title),'') is null or nullif(trim(description),'') is null or cardinality(learning_objectives)=0) incomplete_content
from target_levels;

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
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and cl.status='published' and cl.approved_at is not null and cl.approved_by is null; if actual<>36 then raise exception 'Expected 36 published target levels; found %',actual; end if;
  select md5(string_agg(concat_ws('|',cl.id::text,cl.course_id::text,cl.level_number::text,cl.title,cl.description,array_to_string(cl.learning_objectives,E'\x1f'),cl.core_xp_target::text,cl.review_notes),E'\n' order by cl.id)) into actual_hash from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual_hash<>'fd6f47e501bb8607de5e8aa20ac6f2eb' then raise exception 'Target level content changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Course-level publication hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Module status changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Lesson status changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Activity status changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected counts changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
end $assert$;
