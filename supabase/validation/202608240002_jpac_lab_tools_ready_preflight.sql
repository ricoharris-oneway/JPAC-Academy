-- JPAC Singing-safe lab-tools ready promotion preflight. READ ONLY.
begin transaction read only;

with expected_tools(slug,should_promote) as (
  values
    ('vocal-practice-planner',true),
    ('performance-prep-checklist',true),
    ('assignment-practice-builder',true),
    ('portfolio-builder-checklist',true),
    ('script-scene-rehearsal-tool',false),
    ('dance-rehearsal-tracker',false),
    ('songwriting-idea-pad',false),
    ('video-shot-planner',false)
), tool_state as (
  select
    (select count(*) from public.lab_tools t join expected_tools e on e.slug=t.slug
      where t.status='testing' and t.tool_type='built_in' and t.launch_url is null and t.xp_reward=0
        and t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed')::int seeded_testing,
    (select count(*) from public.lab_tools)::int total_tools,
    (select count(*) from public.lab_tools where status='ready')::int ready_tools,
    (select count(*) from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
      join public.courses c on c.id=ltc.course_id
      where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed' and c.slug='singing')::int singing_links,
    (select count(*) from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
      join public.courses c on c.id=ltc.course_id
      where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed' and c.slug<>'singing')::int other_links,
    (select count(*) from public.lab_tool_courses)::int total_links,
    (select count(*) from public.course_modules where lab_tool_id is not null)::int direct_module_bindings
), expected_courses(slug,title,modules) as (
  values ('singing','Singing',40),('piano','Piano',49),('guitar','Guitar',50),('acting','Acting',46),('dance','Dance',47),('video-production','Video Production',49),('audio-engineering','Audio Engineering',48),('music-production-songwriting','Music Production / Songwriting',48),('music-business','Music Business / Artist Development',48),('digital-ai-creator','Digital AI Creator',48)
), protected_catalog as (
  select e.slug,e.modules expected,count(distinct c.id)::int course_rows,count(m.id)::int actual
  from expected_courses e left join public.courses c on c.slug=e.slug and c.title=e.title
  left join public.course_modules m on m.course_id=c.id group by e.slug,e.modules
), protected_summary as (
  select count(*) filter(where course_rows<>1 or actual<>expected)::int blockers,
    jsonb_object_agg(slug,jsonb_build_object('actual',actual,'expected',expected) order by slug) counts
  from protected_catalog
), assignment_swap as (
  select (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpcs,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,
    (select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,
    (select count(*) from public.lesson_progress)::int lesson_progress
), community_state as (
  select count(*)::int tables from information_schema.tables where table_schema='public'
    and table_name in('community_posts','community_comments','community_reactions','community_moderation_actions','community_reports')
), findings(report_section,code,result,details) as (
  select 'CATALOG','EIGHT_SEEDED_TOOLS_TESTING',case when seeded_testing=8 and total_tools=8 then 'PASS' else 'BLOCK' end,format('exact seed tools in testing=%s/8; total lab_tools=%s/8',seeded_testing,total_tools) from tool_state
  union all select 'VISIBILITY','ZERO_READY_TOOLS',case when ready_tools=0 then 'PASS' else 'BLOCK' end,format('ready tools=%s/0',ready_tools) from tool_state
  union all select 'COURSE ASSIGNMENTS','FOUR_SINGING_LINKS_ONLY',case when singing_links=4 and other_links=0 and total_links=4 then 'PASS' else 'BLOCK' end,format('Singing seed links=%s/4; other-course seed links=%s/0; total links=%s/4',singing_links,other_links,total_links) from tool_state
  union all select 'MODULE SAFETY','NO_DIRECT_BINDINGS',case when direct_module_bindings=0 then 'PASS' else 'BLOCK' end,format('course_modules.lab_tool_id bindings=%s/0',direct_module_bindings) from tool_state
  union all select 'PROTECTED CURRICULUM','MODULE_COUNTS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('mismatches=%s; counts=%s',blockers,counts) from protected_summary
  union all select 'ASSIGNMENT SWAP','BASELINE',case when rpcs=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('RPCs=%s/2; audit rows=%s/2',rpcs,audit_rows) from assignment_swap
  union all select 'STUDENT STATE','BASELINE',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
  union all select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificates=%s/0',certificates) from student_state
  union all select 'COMMUNITY WALL','TABLES_PRESERVED',case when tables=5 then 'PASS' else 'BLOCK' end,format('community tables=%s/5',tables) from community_state
), summary as(select count(*) filter(where result='BLOCK')::int blockers from findings)
select report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',blockers) from summary
union all select 'READINESS','OVERALL',case when blockers=0 then 'PASS' else 'BLOCK' end,case when blockers=0 then 'PASS: SAFE TO PROMOTE FOUR SINGING TOOLS' else 'BLOCK: DO NOT PROMOTE TOOLS' end from summary
order by report_section,code;

rollback;
