-- EMERGENCY ROLLBACK. Run only after verifying the exact Wave 1 post-publication hashes.

begin;

do $preflight$
declare actual_hash text;
begin
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Rollback refused: published course-level prerequisite changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'33d6b3dbf3574fcaf99b19a0fd91a065' then raise exception 'Rollback refused: module status hash drifted'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'30d7b1cc36aad17698103f9fb04e97d2' then raise exception 'Rollback refused: lesson status hash drifted'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'234d87df696612d5d5b8f4e4646c691b' then raise exception 'Rollback refused: activity status hash drifted'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Rollback refused: protected counts changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(primary_video_url,''),coalesce(video_title,''),coalesce(video_provider,''),coalesce(video_duration_seconds::text,''),coalesce(active_instructional_media_id::text,'')),E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'5f16841e053bdad2cd79740c90233a1b' then raise exception 'Rollback refused: video hash changed'; end if;
end $preflight$;

with targets as (
  select m.id from public.course_modules m join public.courses c on c.id=m.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
update public.activities set status='draft' where status='published' and module_id in(select id from targets);

with targets as (
  select m.id from public.course_modules m join public.courses c on c.id=m.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
update public.lessons set status='draft' where status='published' and module_id in(select id from targets);

with targets as (
  select m.id from public.course_modules m join public.courses c on c.id=m.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
)
update public.course_modules set status='draft' where status='published' and id in(select id from targets);

do $postcheck$
declare actual_hash text;
begin
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Rollback module status hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Rollback lesson status hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Rollback activity status hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.courses; if actual_hash<>'8082773c4d305ebc6c08ee3615428c36' then raise exception 'Rollback changed course status'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Rollback changed published course-level prerequisite'; end if;
end $postcheck$;

commit;
