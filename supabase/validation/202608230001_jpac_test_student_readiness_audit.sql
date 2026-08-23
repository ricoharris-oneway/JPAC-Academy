-- JPAC controlled test-student readiness audit. READ ONLY.
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
), course_catalog as (
  select e.slug,e.title,e.modules expected_modules,
    count(distinct c.id)::int course_rows,
    count(m.id)::int actual_modules
  from expected_courses e
  left join public.courses c on c.slug=e.slug and c.title=e.title
  left join public.course_modules m on m.course_id=c.id
  group by e.slug,e.title,e.modules
), published_boundaries as (
  select
    count(*) filter (where c.slug='singing' and l.level_number=1 and m.level_module_number in (1,2) and m.status='published')::int approved_singing_published,
    count(*) filter (where m.status='published' and not (c.slug='singing' and l.level_number=1 and m.level_module_number in (1,2)))::int unexpected_published,
    count(*) filter (where c.slug<>'singing' and m.status<>'draft')::int nonsinging_not_draft,
    count(*) filter (where c.slug<>'singing' and m.status='draft')::int nonsinging_draft
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug in (select slug from expected_courses)
), draft_isolation as (
  select count(*)::int protected_functions
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
    and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2
    and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0
), singing_module_one as (
  select m.id,m.title,m.status,m.core_xp,m.intro_core_xp,m.video_core_xp,
    m.assignment_core_xp,m.mastery_core_xp,m.core_unlock_threshold
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and l.level_number=1 and m.level_module_number=1
), singing_pilot as (
  select
    (select count(*) from singing_module_one)::int module_rows,
    (select count(*) from singing_module_one where title='Breath, Alignment & Vocal Health' and status='published')::int exact_module,
    (select count(*) from public.lessons where module_id in (select id from singing_module_one) and status='published')::int published_lessons,
    (select count(*) from public.activities where module_id in (select id from singing_module_one) and status='published' and required and xp_type='core' and xp_reward=350 and passing_score=70)::int core_challenges,
    (select count(*) from public.activities a where a.module_id in (select id from singing_module_one) and a.status='published' and a.required and a.xp_type='core' and jsonb_typeof(a.rubric->'criteria')='array' and (select coalesce(sum((x->>'weight')::numeric),0) from jsonb_array_elements(a.rubric->'criteria') x)=100)::int valid_rubrics,
    (select count(*) from singing_module_one where core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438)::int canonical_xp
), expected_functions(name) as (
  values
    ('jpac_award_module_core_component'),
    ('jpac_finalize_module_mastery'),
    ('jpac_complete_module_intro'),
    ('jpac_record_module_video_progress'),
    ('jpac_module_completion'),
    ('jpac_module_is_unlocked'),
    ('jpac_submit_module_activity'),
    ('jpac_review_module_submission'),
    ('jpac_assess_module_submission')
), xp_functions as (
  select count(*) filter (where found)::int found,
    coalesce(string_agg(name,', ' order by name) filter (where not found),'none') missing
  from (
    select e.name,exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=e.name) found
    from expected_functions e
  ) q
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
), draft_assets as (
  select
    (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id join public.courses c on c.id=m.course_id where c.slug<>'singing' and c.slug in (select slug from expected_courses) and m.status='draft' and mi.status='active')::int active_media,
    (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id left join public.lab_tools lt on lt.id=m.lab_tool_id where c.slug<>'singing' and c.slug in (select slug from expected_courses) and m.status='draft' and (m.active_instructional_media_id is not null or m.primary_video_url is not null or (m.lab_tool_id is not null and lt.status='ready')))::int active_module_bindings,
    (select count(*) from public.lab_tool_courses ltc join public.courses c on c.id=ltc.course_id where c.slug<>'singing' and c.slug in (select slug from expected_courses))::int course_tool_bindings,
    (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug<>'singing' and m.status='draft' and m.video_brief ilike '%NEEDS REVIEW%')::int media_needs_review
), ai_lab as (
  select
    count(*) filter (where m.real_world_activity::text ilike '%Instructor-Guided AI Lab%' or m.review_notes ilike '%Instructor-Guided AI Lab%')::int guided_modules,
    (select count(*) from public.lab_tool_courses ltc join public.courses c2 on c2.id=ltc.course_id where c2.slug='digital-ai-creator')::int approved_bindings
  from public.course_modules m
  join public.courses c on c.id=m.course_id
  where c.slug='digital-ai-creator'
), findings as (
  select 'COURSE CATALOG' section,upper(replace(slug,'-','_'))||'_SHELL' code,
    case when course_rows=1 then 'PASS' else 'BLOCK' end result,
    format('%s (%s) exact rows=%s/1',title,slug,course_rows) details
  from course_catalog
  union all
  select 'DRAFT PROGRAM COUNTS',upper(replace(slug,'-','_'))||'_MODULES',
    case when course_rows=1 and actual_modules=expected_modules then 'PASS' else 'BLOCK' end,
    format('%s modules=%s/%s',title,actual_modules,expected_modules)
  from course_catalog
  union all
  select 'DRAFT SAFETY','APPROVED_SINGING_PILOT_BOUNDARY',case when approved_singing_published=2 then 'PASS' else 'BLOCK' end,format('approved published Singing L1 M1-M2=%s/2',approved_singing_published) from published_boundaries
  union all
  select 'DRAFT SAFETY','NO_UNEXPECTED_PUBLISHED_MODULES',case when unexpected_published=0 then 'PASS' else 'BLOCK' end,format('published modules outside approved Singing pilot=%s/0',unexpected_published) from published_boundaries
  union all
  select 'DRAFT SAFETY','NONSINGING_DRAFT_ONLY',case when nonsinging_not_draft=0 then 'PASS' else 'BLOCK' end,format('non-Singing modules not draft=%s/0; draft modules=%s',nonsinging_not_draft,nonsinging_draft) from published_boundaries
  union all
  select 'DRAFT SAFETY','PUBLISHED_ONLY_PROGRESS',case when protected_functions=2 then 'PASS' else 'BLOCK' end,format('published-only progress functions=%s/2; draft modules are excluded from student-ready progress',protected_functions) from draft_isolation
  union all
  select 'SINGING PILOT READINESS','MODULE_ONE_IDENTITY',case when module_rows=1 and exact_module=1 then 'PASS' else 'BLOCK' end,format('module rows=%s/1; exact published module=%s/1',module_rows,exact_module) from singing_pilot
  union all
  select 'SINGING PILOT READINESS','STUDENT_FACING_CONTENT',case when published_lessons>=2 and core_challenges=1 then 'PASS' else 'BLOCK' end,format('published lessons=%s (minimum 2); published required Core Challenges=%s/1',published_lessons,core_challenges) from singing_pilot
  union all
  select 'SINGING PILOT READINESS','RUBRIC_AND_XP',case when valid_rubrics=1 and canonical_xp=1 then 'PASS' else 'BLOCK' end,format('valid 100-point rubrics=%s/1; canonical XP modules=%s/1; passing score=70; unlock threshold=438',valid_rubrics,canonical_xp) from singing_pilot
  union all
  select 'XP AND MASTERY FUNCTIONS','REQUIRED_FUNCTIONS',case when found=9 then 'PASS' else 'BLOCK' end,format('functions found=%s/9; missing=%s',found,missing) from xp_functions
  union all
  select 'ASSIGNMENT SWAP','ASSIGNMENT_SWAP_CONTRACT',case when rpc_count=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('required RPCs=%s/2; approved audit rows=%s/2',rpc_count,audit_rows) from assignment_swap
  union all
  select 'STUDENT STATE BASELINE','PROTECTED_COUNTS',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
  union all
  select 'MEDIA AND TOOL SAFETY','NO_ACTIVE_DRAFT_BINDINGS',case when active_media=0 and active_module_bindings=0 and course_tool_bindings=0 then 'PASS' else 'BLOCK' end,format('active draft media=%s/0; active module bindings=%s/0; draft-course tool bindings=%s/0',active_media,active_module_bindings,course_tool_bindings) from draft_assets
  union all
  select 'MEDIA AND TOOL SAFETY','DRAFT_MEDIA_REVIEW','INFO',format('draft modules with media marked NEEDS REVIEW=%s',media_needs_review) from draft_assets
  union all
  select 'MEDIA AND TOOL SAFETY','DRAFT_PROGRAM_PUBLICATION_READINESS',case when nonsinging_draft>0 then 'WARN' else 'INFO' end,format('loaded non-Singing draft modules=%s; media/tool review remains incomplete; do not publish',nonsinging_draft) from published_boundaries
  union all
  select 'MEDIA AND TOOL SAFETY','DIGITAL_AI_GUIDED_LAB',case when guided_modules>0 and approved_bindings=0 then 'WARN' when guided_modules>0 then 'INFO' else 'BLOCK' end,format('Instructor-Guided AI Lab modules=%s; approved Digital AI tool bindings=%s',guided_modules,approved_bindings) from ai_lab
  union all
  select 'CERTIFICATE SAFETY','NO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificate rows=%s/0',certificates) from student_state
), summary as (
  select count(*) filter (where result='BLOCK')::int blockers,count(*) filter (where result='WARN')::int warnings from findings
)
select section as report_section,code,result,details from findings
union all
select 'TEST-STUDENT READINESS','CONTROLLED_INTERNAL_PILOT',case when blockers=0 then 'PASS' else 'BLOCK' end,case when blockers=0 then 'Ready for 3-5 controlled internal test students beginning with Singing Beginner Module 1' else format('Unsafe to test: blockers=%s',blockers) end from summary
union all
select 'TEST-STUDENT READINESS','PUBLIC_LAUNCH',case when blockers>0 then 'BLOCK' else 'WARN' end,case when blockers>0 then 'Public launch blocked by safety failures' else 'Not public-launch ready: draft programs remain unpublished and media/tools require approval' end from summary
union all
select 'TEST-STUDENT READINESS','OVERALL',case when blockers>0 then 'BLOCK' when warnings>0 then 'WARN' else 'PASS' end,format('blockers=%s; warnings=%s; controlled internal pilot only',blockers,warnings) from summary
order by report_section,code;

rollback;
