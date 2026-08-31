do $preflight$ begin
  if to_regclass('public.course_modules') is null then raise exception 'public.course_modules is required'; end if;
  if to_regclass('public.module_instructional_media') is null then raise exception 'public.module_instructional_media is required'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='course_modules' and column_name='primary_video_url') then raise exception 'course_modules.primary_video_url is required'; end if;
  if to_regprocedure('public.is_staff()') is null then raise exception 'public.is_staff() is required'; end if;
  if to_regprocedure('public.jpac_normalize_instructional_media_url(text)') is null then raise exception 'media URL normalizer is required'; end if;
end $preflight$;
select 'protected_counts' check_name,(select count(*) from public.xp_ledger) xp_ledger,(select count(*) from public.enrollments) enrollments,(select count(*) from public.submissions) submissions,(select count(*) from public.certificates) certificates,(select count(*) from public.lesson_progress) lesson_progress;
select 'curriculum_status_baseline' check_name,md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) status_hash from public.course_modules;
