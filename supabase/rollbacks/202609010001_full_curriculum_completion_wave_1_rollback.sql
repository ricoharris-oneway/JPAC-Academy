-- PREPARED ONLY. Do not apply without explicit rollback approval.
-- Reverts only the empty fields filled by Wave 1; it never changes statuses or videos.

begin;

do $preflight$
declare actual_hash text;
begin
  select md5(string_agg(concat_ws('|',id::text,ai_summary,array_to_string(learning_objectives,E'\x1f'),array_to_string(career_tags,E'\x1f')),E'\n' order by id)) into actual_hash
  from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);
  if actual_hash<>'2c68234b2376e8bb9185dfa3db724607' then raise exception 'Course completion fields changed after Wave 1; automatic rollback refused'; end if;
  select md5(string_agg(concat_ws('|',m.id::text,array_to_string(m.learning_objectives,E'\x1f'),m.career_connection),E'\n' order by m.id)) into actual_hash
  from public.course_modules m join public.courses c on c.id=m.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';
  if actual_hash<>'a65b2435025575e199755d1800c28334' then raise exception 'Module completion fields changed after Wave 1; automatic rollback refused'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash
  from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video baseline changed; rollback refused'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status changed; rollback refused'; end if;
end $preflight$;

update public.courses set ai_summary='',learning_objectives=array[]::text[],career_tags=array[]::text[]
where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']);

update public.course_modules m set learning_objectives=array[]::text[],career_connection=''
from public.courses c where c.id=m.course_id
  and c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
  and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62';

do $postcheck$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.courses where slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and nullif(trim(ai_summary),'') is null and cardinality(learning_objectives)=0 and cardinality(career_tags)=0;
  if actual<>9 then raise exception 'Course rollback count mismatch: %',actual; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62' and cardinality(m.learning_objectives)=0 and nullif(trim(m.career_connection),'') is null;
  if actual<>432 then raise exception 'Module rollback count mismatch: %',actual; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Singing video baseline changed'; end if;
end $postcheck$;

commit;
