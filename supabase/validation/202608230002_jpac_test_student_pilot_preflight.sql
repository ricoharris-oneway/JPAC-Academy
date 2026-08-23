-- JPAC controlled test-student pilot preflight. READ ONLY; does not execute the pilot.
begin transaction read only;

with expected_courses(slug,title,modules) as (
  values ('singing','Singing',40),('piano','Piano',49),('guitar','Guitar',50),('acting','Acting',46),('dance','Dance',47),('video-production','Video Production',49),('audio-engineering','Audio Engineering',48),('music-production-songwriting','Music Production / Songwriting',48),('music-business','Music Business / Artist Development',48),('digital-ai-creator','Digital AI Creator',48)
), protected_catalog as (
  select e.slug,e.title,e.modules expected,count(distinct c.id)::int course_rows,count(m.id)::int actual from expected_courses e left join public.courses c on c.slug=e.slug and c.title=e.title left join public.course_modules m on m.course_id=c.id group by e.slug,e.title,e.modules
), singing_module as (
  select m.* from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and l.level_number=1 and m.level_module_number=1
), pilot as (
  select
    (select count(*) from public.courses where slug='singing' and title='Singing')::int singing_courses,
    (select count(*) from singing_module where title='Breath, Alignment & Vocal Health' and status='published')::int modules,
    (select count(*) from public.lessons where module_id in(select id from singing_module) and status='published')::int lessons,
    (select count(*) from public.activities where module_id in(select id from singing_module) and status='published' and required and xp_type='core' and xp_reward=350 and passing_score=70)::int challenges,
    (select count(*) from public.activities a where a.module_id in(select id from singing_module) and a.status='published' and a.required and jsonb_typeof(a.rubric->'criteria')='array' and jsonb_array_length(a.rubric->'criteria')=5 and (select coalesce(sum((x->>'weight')::numeric),0) from jsonb_array_elements(a.rubric->'criteria') x)=100)::int rubrics,
    (select count(*) from singing_module where core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438)::int canonical_xp
), expected_functions(name) as (
  values ('jpac_award_module_core_component'),('jpac_finalize_module_mastery'),('jpac_complete_module_intro'),('jpac_record_module_video_progress'),('jpac_module_completion'),('jpac_module_is_unlocked'),('jpac_submit_module_activity'),('jpac_review_module_submission'),('jpac_assess_module_submission')
), functions as (
  select count(*) filter(where found)::int found,coalesce(string_agg(name,', ' order by name) filter(where not found),'none') missing
  from (select e.name,exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=e.name) found from expected_functions e) q
), assignment_swap as (
  select (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpcs,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,(select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,(select count(*) from public.lesson_progress)::int lesson_progress,(select count(*) from public.module_video_progress)::int module_video_progress,(select count(*) from public.activity_progress)::int activity_progress
), draft_safety as (
  select
    (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id where m.status='published' and not(c.slug='singing' and l.level_number=1 and m.level_module_number in(1,2)))::int unexpected_published,
    (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and l.level_number=1 and m.level_module_number in(1,2) and m.status='published')::int approved_singing_published,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)::int isolation_functions,
    (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.status='draft' and mi.status='active')::int active_media,
    (select count(*) from public.course_modules m left join public.lab_tools lt on lt.id=m.lab_tool_id where m.status='draft' and (m.active_instructional_media_id is not null or m.primary_video_url is not null or (m.lab_tool_id is not null and lt.status='ready')))::int active_module_bindings,
    (select count(*) from public.lab_tool_courses ltc join public.course_modules m on m.course_id=ltc.course_id where m.status='draft')::int draft_course_tool_links
), base_findings as (
  select 'READINESS AUDIT' section,upper(replace(slug,'-','_'))||'_CATALOG_BASELINE' code,case when course_rows=1 and actual=expected then 'PASS' else 'BLOCK' end result,format('%s exact shells=%s/1; modules=%s/%s',title,course_rows,actual,expected) details from protected_catalog
  union all select 'SINGING PILOT','COURSE_AND_MODULE',case when singing_courses=1 and modules=1 then 'PASS' else 'BLOCK' end,format('Singing courses=%s/1; exact published Beginner Module 1=%s/1',singing_courses,modules) from pilot
  union all select 'SINGING PILOT','LESSONS_AND_CHALLENGE',case when lessons>=2 and challenges=1 then 'PASS' else 'BLOCK' end,format('published lessons=%s (minimum 2); required published Core Challenges=%s/1; passing score=70',lessons,challenges) from pilot
  union all select 'SINGING PILOT','RUBRIC_AND_XP',case when rubrics=1 and canonical_xp=1 then 'PASS' else 'BLOCK' end,format('valid 100-point rubrics=%s/1; canonical XP/unlock modules=%s/1; threshold=438',rubrics,canonical_xp) from pilot
  union all select 'XP/MASTERY/SUBMISSION','REQUIRED_FUNCTIONS',case when found=9 then 'PASS' else 'BLOCK' end,format('functions=%s/9; missing=%s',found,missing) from functions
  union all select 'ASSIGNMENT SWAP','BASELINE',case when rpcs=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('RPCs=%s/2; audit rows=%s/2',rpcs,audit_rows) from assignment_swap
  union all select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificates=%s/0',certificates) from student_state
  union all select 'DRAFT VISIBILITY','APPROVED_PILOT_BOUNDARY',case when approved_singing_published=2 and unexpected_published=0 and isolation_functions=2 then 'PASS' else 'BLOCK' end,format('approved published Singing modules=%s/2; unexpected published modules=%s/0; published-only isolation functions=%s/2',approved_singing_published,unexpected_published,isolation_functions) from draft_safety
  union all select 'MEDIA/TOOL SAFETY','NO_ACTIVE_DRAFT_BINDINGS',case when active_media=0 and active_module_bindings=0 and draft_course_tool_links=0 then 'PASS' else 'BLOCK' end,format('active draft media=%s/0; active module bindings=%s/0; draft-course tool links=%s/0',active_media,active_module_bindings,draft_course_tool_links) from draft_safety
  union all select 'STUDENT STATE BASELINE','PRE_PILOT_COUNTS',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
  union all select 'STUDENT STATE BASELINE','OPTIONAL_PROGRESS_COUNTS','INFO',format('module_video_progress=%s; activity_progress=%s; capture for post-pilot comparison',module_video_progress,activity_progress) from student_state
), summary as(select count(*) filter(where result='BLOCK')::int blockers from base_findings)
select section as report_section,code,result,details from base_findings
union all select 'READINESS','BLOCKERS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',blockers) from summary
union all select 'READINESS','OVERALL',case when blockers=0 then 'PASS' else 'BLOCK' end,case when blockers=0 then 'PASS: READY FOR HUMAN-APPROVED CONTROLLED PILOT EXECUTION' else 'BLOCK: DO NOT EXECUTE PILOT' end from summary
order by report_section,code;

rollback;
