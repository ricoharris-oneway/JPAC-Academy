select to_regprocedure('public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)') is not null rpc_exists,
       not has_function_privilege('anon','public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)','EXECUTE') anon_cannot_execute,
       has_function_privilege('authenticated','public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)','EXECUTE') authenticated_can_execute;

select not (pg_get_functiondef('public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)'::regprocedure) ilike any(array[
  '%xp_ledger%','%lesson_progress%','%mastery%','%certificates%','%submissions%','%reviews%','%student_timeline%','%student_intelligence%','%teacher_assignments%'
])) and pg_get_functiondef('public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)'::regprocedure) not ilike '%course_modules set status=%' protected_scope_clean;

select (select count(*) from public.xp_ledger) xp_ledger,
       (select count(*) from public.enrollments) enrollments,
       (select count(*) from public.submissions) submissions,
       (select count(*) from public.certificates) certificates,
       (select count(*) from public.lesson_progress) lesson_progress;

select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) curriculum_status_hash from public.course_modules;

-- After a separately approved deliberate test, compare the protected counts
-- above with the preflight. Only enrollments may increase, and only by the
-- expected number for a previously unenrolled existing student.
