-- EMERGENCY ROLLBACK. Run only while child Publishing Wave 1 remains unapplied.

begin;

do $preflight$
declare actual bigint; actual_hash text;
begin
  select count(*) into actual from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production']) and cl.status='published' and cl.approved_at is not null and cl.approved_by is null; if actual<>36 then raise exception 'Rollback refused: target publication state changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'6c8b444b18d7a2f5acb7e7fb8333ee2b' then raise exception 'Rollback refused: course-level hash drifted'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Rollback refused: child Publishing Wave 1 or another module status change occurred'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.lessons; if actual_hash<>'4cc4acedddc8c2721f4a95a1f9fc64e4' then raise exception 'Rollback refused: lesson status changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.activities; if actual_hash<>'2cceeec9886bdcf423f6f6fcf9f19c19' then raise exception 'Rollback refused: activity status changed'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Rollback refused: protected counts changed'; end if;
end $preflight$;

update public.course_levels cl set
  status='draft',
  approved_at=null
from public.courses c
where c.id=cl.course_id
  and c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
  and cl.status='published'
  and cl.approved_at is not null
  and cl.approved_by is null;

do $postcheck$
declare actual_hash text;
begin
  select md5(coalesce(string_agg(concat_ws('|',id::text,status,(approved_at is not null)::text,coalesce(approved_by::text,'')),E'\n' order by id),'')) into actual_hash from public.course_levels; if actual_hash<>'4ed20ac7a8245b63906c1aaeed7b59b3' then raise exception 'Rollback course-level hash mismatch'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules; if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Rollback changed module status'; end if;
end $postcheck$;

commit;
