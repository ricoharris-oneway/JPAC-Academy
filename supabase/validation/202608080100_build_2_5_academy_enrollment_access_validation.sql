-- Build 2.5 Phases A-C production validation. Read-only.

-- Existing records and their new Academy enrollment attributes.
select e.id,e.student_id,e.course_id,e.status,e.start_date,e.end_date,e.level,
       e.enrollment_source,e.last_synchronized_at,c.slug,c.status as course_status
from public.enrollments e
join public.courses c on c.id=e.course_id
order by e.student_id,c.slug;

-- EXPECT ZERO: duplicate canonical student/course enrollments.
select student_id,course_id,count(*)
from public.enrollments
group by student_id,course_id
having count(*)>1;

-- EXPECT ZERO: active enrollments which cannot currently grant access.
select e.id,e.student_id,e.course_id,e.status,e.start_date,e.end_date,c.slug,c.status as course_status,
       case
         when c.id is null then 'course missing'
         when c.status<>'published' then 'course not published'
         when e.start_date is not null and e.start_date>current_date then 'not started'
         when e.end_date is not null and e.end_date<current_date then 'ended'
       end as blocked_reason
from public.enrollments e
left join public.courses c on c.id=e.course_id
where e.status='active'
  and (c.id is null or c.status<>'published'
       or (e.start_date is not null and e.start_date>current_date)
       or (e.end_date is not null and e.end_date<current_date));

-- Function grants must remain least privilege.
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('jpac_student_has_course_access','jpac_my_academy_courses')
order by p.proname,arguments;

-- Confirm current function bodies use Academy enrollment and not Wix access.
select p.proname,pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('jpac_student_has_course_access','jpac_my_academy_courses');

-- Run the following as an authenticated test student through the API/client:
-- select * from public.jpac_my_academy_courses();
-- select public.jpac_student_has_course_access('<course uuid>'::uuid);
