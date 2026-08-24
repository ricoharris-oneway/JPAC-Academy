-- JPAC Creative Studio lab-tools seed preflight. READ ONLY.
begin transaction read only;

with expected_courses(slug,title,modules) as (
  values
    ('singing','Singing',40),
    ('piano','Piano',49),
    ('guitar','Guitar',50),
    ('acting','Acting',46),
    ('dance','Dance',47),
    ('video-production','Video Production',49),
    ('audio-engineering','Audio Engineering',48),
    ('music-production-songwriting','Music Production / Songwriting',48),
    ('music-business','Music Business / Artist Development',48),
    ('digital-ai-creator','Digital AI Creator',48)
), protected_catalog as (
  select e.slug,e.title,e.modules expected,count(distinct c.id)::int course_rows,count(m.id)::int actual
  from expected_courses e
  left join public.courses c on c.slug=e.slug and c.title=e.title
  left join public.course_modules m on m.course_id=c.id
  group by e.slug,e.title,e.modules
), protected_summary as (
  select count(*) filter(where course_rows<>1 or actual<>expected)::int blockers,
    jsonb_object_agg(slug,jsonb_build_object('course_rows',course_rows,'actual',actual,'expected',expected) order by slug) counts
  from protected_catalog
), required_columns(table_name,column_name) as (
  values
    ('lab_tools','id'),('lab_tools','slug'),('lab_tools','name'),('lab_tools','description'),
    ('lab_tools','category'),('lab_tools','tool_type'),('lab_tools','launch_url'),('lab_tools','icon'),
    ('lab_tools','xp_reward'),('lab_tools','status'),('lab_tools','sort_order'),('lab_tools','version'),
    ('lab_tools','estimated_minutes'),('lab_tools','ai_recommended'),('lab_tools','student_instructions'),
    ('lab_tools','admin_notes'),
    ('lab_tool_courses','lab_tool_id'),('lab_tool_courses','course_id'),
    ('lab_tool_courses','recommended'),('lab_tool_courses','required'),('lab_tool_courses','sort_order')
), schema_state as (
  select
    (select count(*) from information_schema.tables where table_schema='public' and table_name in('lab_tools','lab_tool_courses'))::int tables,
    (select count(*) from required_columns r where exists(
      select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
    ))::int columns,
    (select count(*) from pg_constraint con join pg_class rel on rel.oid=con.conrelid join pg_namespace n on n.oid=rel.relnamespace
      where n.nspname='public' and rel.relname='lab_tools' and con.contype='c'
        and pg_get_constraintdef(con.oid) ilike '%status%' and pg_get_constraintdef(con.oid) ilike '%testing%')::int testing_status_checks,
    (select coalesce(jsonb_agg(pg_get_constraintdef(con.oid)) filter(where con.contype='c'),'[]'::jsonb)
      from pg_constraint con join pg_class rel on rel.oid=con.conrelid join pg_namespace n on n.oid=rel.relnamespace
      where n.nspname='public' and rel.relname='lab_tools' and pg_get_constraintdef(con.oid) ilike '%status%') status_definitions
), tool_state as (
  select
    (select count(*) from public.lab_tools)::int tools,
    (select count(*) from public.lab_tool_courses)::int links,
    (select count(*) from public.course_modules where lab_tool_id is not null)::int direct_module_bindings,
    (select count(*) from public.courses where slug='singing' and title='Singing')::int singing_courses
), assignment_swap as (
  select
    (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpcs,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select
    (select count(*) from public.xp_ledger)::int xp_ledger,
    (select count(*) from public.enrollments)::int enrollments,
    (select count(*) from public.submissions)::int submissions,
    (select count(*) from public.certificates)::int certificates,
    (select count(*) from public.lesson_progress)::int lesson_progress
), community_state as (
  select count(*)::int tables from information_schema.tables
  where table_schema='public' and table_name in('community_posts','community_comments','community_reactions','community_moderation_actions','community_reports')
), findings(report_section,code,result,details) as (
  select 'SCHEMA','CANONICAL_TABLES',case when tables=2 then 'PASS' else 'BLOCK' end,format('lab tool tables=%s/2',tables) from schema_state
  union all select 'SCHEMA','REQUIRED_COLUMNS',case when columns=21 then 'PASS' else 'BLOCK' end,format('safe insert/link columns=%s/21',columns) from schema_state
  union all select 'SCHEMA','SAFE_TESTING_STATUS',case when testing_status_checks>=1 then 'PASS' else 'BLOCK' end,format('testing-compatible status checks=%s (minimum 1); definitions=%s',testing_status_checks,status_definitions) from schema_state
  union all select 'CATALOG BASELINE','EMPTY_TOOL_CATALOG',case when tools=0 then 'PASS' else 'BLOCK' end,format('lab_tools=%s/0',tools) from tool_state
  union all select 'CATALOG BASELINE','EMPTY_COURSE_LINKS',case when links=0 then 'PASS' else 'BLOCK' end,format('lab_tool_courses=%s/0',links) from tool_state
  union all select 'MODULE SAFETY','NO_DIRECT_BINDINGS',case when direct_module_bindings=0 then 'PASS' else 'BLOCK' end,format('course_modules.lab_tool_id bindings=%s/0',direct_module_bindings) from tool_state
  union all select 'SINGING','EXACT_COURSE',case when singing_courses=1 then 'PASS' else 'BLOCK' end,format('exact Singing shells=%s/1',singing_courses) from tool_state
  union all select 'PROTECTED CURRICULUM','MODULE_COUNTS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('mismatches=%s; counts=%s',blockers,counts) from protected_summary
  union all select 'ASSIGNMENT SWAP','BASELINE',case when rpcs=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('RPCs=%s/2; audit rows=%s/2',rpcs,audit_rows) from assignment_swap
  union all select 'STUDENT STATE','BASELINE',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
  union all select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificates=%s/0',certificates) from student_state
  union all select 'COMMUNITY WALL','TABLES_PRESERVED',case when tables=5 then 'PASS' else 'BLOCK' end,format('community tables=%s/5',tables) from community_state
), summary as (
  select count(*) filter(where result='BLOCK')::int blockers from findings
)
select report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',blockers) from summary
union all select 'READINESS','OVERALL',case when blockers=0 then 'PASS' else 'BLOCK' end,case when blockers=0 then 'PASS: SAFE TO APPLY REVIEWED LAB TOOL SEED' else 'BLOCK: DO NOT APPLY LAB TOOL SEED' end from summary
order by report_section,code;

rollback;
