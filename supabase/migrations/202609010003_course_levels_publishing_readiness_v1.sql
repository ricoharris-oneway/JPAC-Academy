-- PREPARED ONLY. Do not apply without explicit course-level publication approval.
-- Publishes and approval-stamps only 36 non-Singing course_levels rows.

begin;

do $preflight$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual<>36 then raise exception 'Expected 36 target levels; found %',actual; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and (cl.status<>'draft' or cl.approved_at is not null or cl.approved_by is not null or nullif(trim(cl.title),'') is null or nullif(trim(cl.description),'') is null or cardinality(cl.learning_objectives)=0); if actual<>0 then raise exception 'Target level status, approval, or content baseline changed'; end if;
  select md5(string_agg(concat_ws('|',cl.id::text,cl.course_id::text,cl.level_number::text,cl.title,cl.description,array_to_string(cl.learning_objectives,E'\x1f'),cl.core_xp_target::text,cl.review_notes),E'\n' order by cl.id)) into actual_hash from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']); if actual_hash<>'fd6f47e501bb8607de5e8aa20ac6f2eb' then raise exception 'Target level content hash changed'; end if;
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and not exists(select 1 from public.course_modules m where m.course_level_id=cl.id and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'); if actual<>0 then raise exception 'Empty target level shell found'; end if;
  if (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62')<>432 then raise exception 'Target module count changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected counts changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'4ed20ac7a8245b63906c1aaeed7b59b3' then raise exception 'Course-level publication hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Module status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Lesson status hash changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Activity status hash changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
end $preflight$;

update public.course_levels cl set
  status='published',
  approved_at=transaction_timestamp()
from public.courses c
where c.id=cl.course_id
  and c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
  and cl.status='draft'
  and cl.approved_at is null;

do $postcheck$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and cl.status='published' and cl.approved_at is not null and cl.approved_by is null; if actual<>36 then raise exception 'Expected 36 published target levels; found %',actual; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Post-publication course-level hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Module status changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Lesson status changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Activity status changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected counts changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null); if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video hash changed'; end if;
end $postcheck$;

commit;
