-- JPAC Community Wall v1 preflight. READ ONLY; creates and changes nothing.
begin transaction read only;

with expected_community_tables(table_name) as (
  values ('community_posts'),('community_comments'),('community_reactions'),('community_moderation_actions'),('community_reports')
), community_table_state as (
  select count(*) filter (where to_regclass(format('public.%I', table_name)) is not null)::int existing,
    coalesce(string_agg(table_name, ', ' order by table_name) filter (where to_regclass(format('public.%I', table_name)) is not null), 'none') existing_names
  from expected_community_tables
), required_foundations(object_name, present) as (
  values
    ('auth.users', to_regclass('auth.users') is not null),
    ('public.profiles', to_regclass('public.profiles') is not null),
    ('public.submissions', to_regclass('public.submissions') is not null),
    ('public.is_academy_staff()', to_regprocedure('public.is_academy_staff()') is not null),
    ('public.is_academy_admin()', to_regprocedure('public.is_academy_admin()') is not null)
), foundation_summary as (
  select count(*) filter (where present)::int found,
    coalesce(string_agg(object_name, ', ' order by object_name) filter (where not present), 'none') missing
  from required_foundations
), expected_courses(slug, expected_modules) as (
  values
    ('singing',40),('piano',49),('guitar',50),('acting',46),('dance',47),
    ('video-production',49),('audio-engineering',48),('music-production-songwriting',48),
    ('music-business',48),('digital-ai-creator',48)
), protected_counts as (
  select e.slug,e.expected_modules,count(distinct c.id)::int course_rows,count(m.id)::int actual_modules
  from expected_courses e
  left join public.courses c on c.slug=e.slug
  left join public.course_modules m on m.course_id=c.id
  group by e.slug,e.expected_modules
), protected_summary as (
  select count(*) filter (where course_rows<>1 or actual_modules<>expected_modules)::int mismatches,
    jsonb_object_agg(slug,jsonb_build_object('courses',course_rows,'modules',actual_modules,'expected',expected_modules) order by slug) counts
  from protected_counts
), assignment_swap as (
  select
    (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpc_count,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select
    (select count(*) from public.xp_ledger)::int xp_ledger,
    (select count(*) from public.enrollments)::int enrollments,
    (select count(*) from public.submissions)::int submissions,
    (select count(*) from public.certificates)::int certificates,
    (select count(*) from public.lesson_progress)::int lesson_progress
), findings as (
  select 'COMMUNITY WALL PREFLIGHT' report_section,'NO_EXISTING_TABLES' code,
    case when existing=0 then 'PASS' else 'BLOCK' end result,
    format('existing community tables=%s/0; names=%s',existing,existing_names) details
  from community_table_state
  union all
  select 'FOUNDATIONS','REQUIRED_OBJECTS',case when found=5 then 'PASS' else 'BLOCK' end,
    format('required objects=%s/5; missing=%s',found,missing)
  from foundation_summary
  union all
  select 'PROTECTED CURRICULUM','MODULE_COUNTS',case when mismatches=0 then 'PASS' else 'BLOCK' end,
    format('mismatches=%s; counts=%s',mismatches,counts)
  from protected_summary
  union all
  select 'ASSIGNMENT SWAP','BASELINE',case when rpc_count=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,
    format('required RPCs=%s/2; approved audit rows=%s/2',rpc_count,audit_rows)
  from assignment_swap
  union all
  select 'STUDENT STATE','BASELINE',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,
    format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress)
  from student_state
  union all
  select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,
    format('certificate rows=%s/0',certificates)
  from student_state
), summary as (
  select count(*) filter (where result='BLOCK')::int blockers from findings
)
select report_section,code,result,details from findings
union all
select 'COMMUNITY WALL PREFLIGHT','OVERALL',case when blockers=0 then 'PASS' else 'BLOCK' end,
  format('blockers=%s; apply migration only when zero',blockers)
from summary
order by report_section,code;

rollback;
