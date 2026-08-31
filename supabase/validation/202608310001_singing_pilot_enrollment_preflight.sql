select to_regclass('public.profiles') is not null profiles_exists,
       to_regclass('public.enrollments') is not null enrollments_exists,
       to_regprocedure('public.is_staff()') is not null staff_helper_exists,
       exists(select 1 from public.courses c where c.slug='singing' and c.status='published') singing_published,
       exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and m.status='published') singing_has_published_module;

select exists(select 1 from pg_constraint where conrelid='public.enrollments'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%student_id, course_id%') enrollment_identity_unique;

select (select count(*) from public.xp_ledger) xp_ledger,
       (select count(*) from public.enrollments) enrollments,
       (select count(*) from public.submissions) submissions,
       (select count(*) from public.certificates) certificates,
       (select count(*) from public.lesson_progress) lesson_progress;

select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) curriculum_status_hash from public.course_modules;
