-- JPAC controlled test-student pilot post-validation. READ ONLY.
begin transaction read only;

with expected_courses(slug,modules) as (
  values ('singing',40),('piano',49),('guitar',50),('acting',46),('dance',47),('video-production',49),('audio-engineering',48),('music-production-songwriting',48),('music-business',48),('digital-ai-creator',48)
), protected_counts as (
  select e.slug,e.modules expected,count(m.id)::int actual from expected_courses e left join public.courses c on c.slug=e.slug left join public.course_modules m on m.course_id=c.id group by e.slug,e.modules
), protected_summary as (
  select count(*) filter(where actual<>expected)::int mismatches,coalesce(jsonb_object_agg(slug,jsonb_build_object('actual',actual,'expected',expected) order by slug),'{}'::jsonb) counts from protected_counts
), expected_functions(name) as (
  values ('jpac_award_module_core_component'),('jpac_finalize_module_mastery'),('jpac_complete_module_intro'),('jpac_record_module_video_progress'),('jpac_module_completion'),('jpac_module_is_unlocked'),('jpac_submit_module_activity'),('jpac_review_module_submission'),('jpac_assess_module_submission')
), functions as (
  select count(*) filter(where found)::int found,coalesce(string_agg(name,', ' order by name) filter(where not found),'none') missing from (select e.name,exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=e.name) found from expected_functions e) q
), assignment_swap as (
  select (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpcs,(select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), current_state as (
  select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,(select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,(select count(*) from public.lesson_progress)::int lesson_progress,(select count(*) from public.module_video_progress)::int module_video_progress,(select count(*) from public.activity_progress)::int activity_progress
), draft_safety as (
  select
    (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id where m.status='published' and not(c.slug='singing' and l.level_number=1 and m.level_module_number in(1,2)))::int unexpected_published,
    (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug<>'singing' and c.slug in(select slug from expected_courses) and m.status='draft')::int draft_modules,
    (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.status='draft' and mi.status='active')::int active_media,
    (select count(*) from public.course_modules m left join public.lab_tools lt on lt.id=m.lab_tool_id where m.status='draft' and (m.active_instructional_media_id is not null or m.primary_video_url is not null or (m.lab_tool_id is not null and lt.status='ready')))::int active_module_bindings,
    (select count(*) from public.lab_tool_courses ltc join public.course_modules m on m.course_id=ltc.course_id where m.status='draft')::int draft_course_tool_links
), findings as (
  select 'CURRENT COUNTS' section,'STUDENT_STATE' code,'INFO' result,format('xp_ledger=%s; enrollments=%s; submissions=%s; certificates=%s; lesson_progress=%s; module_video_progress=%s; activity_progress=%s',xp_ledger,enrollments,submissions,certificates,lesson_progress,module_video_progress,activity_progress) details from current_state
  union all select 'PILOT DELTAS','EXPECTED_TEST_INCREASES',case when xp_ledger<5 or enrollments<1 or submissions<1 or lesson_progress<5 then 'BLOCK' when xp_ledger>5 or enrollments>1 or submissions>1 or lesson_progress>5 or module_video_progress>0 or activity_progress>0 then 'WARN' else 'PASS' end,format('baseline xp/enrollments/submissions/lesson_progress=5/1/1/5; current=%s/%s/%s/%s; video=%s; activity=%s',xp_ledger,enrollments,submissions,lesson_progress,module_video_progress,activity_progress) from current_state
  union all select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificates=%s/0',certificates) from current_state
  union all select 'DRAFT SAFETY','DRAFT_MODULE_COUNT',case when draft_modules=433 then 'PASS' else 'BLOCK' end,format('non-Singing draft modules=%s/433',draft_modules) from draft_safety
  union all select 'DRAFT SAFETY','NO_DRAFT_PUBLICATION',case when unexpected_published=0 then 'PASS' else 'BLOCK' end,format('unexpected published modules=%s/0',unexpected_published) from draft_safety
  union all select 'MEDIA/TOOL SAFETY','NO_UNEXPECTED_ACTIVATION',case when active_media=0 and active_module_bindings=0 and draft_course_tool_links=0 then 'PASS' else 'BLOCK' end,format('active draft media=%s/0; active module bindings=%s/0; draft-course tool links=%s/0',active_media,active_module_bindings,draft_course_tool_links) from draft_safety
  union all select 'ASSIGNMENT SWAP','BASELINE',case when rpcs=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('RPCs=%s/2; audit rows=%s/2',rpcs,audit_rows) from assignment_swap
  union all select 'PROTECTED CURRICULUM','MODULE_COUNTS',case when mismatches=0 then 'PASS' else 'BLOCK' end,format('mismatches=%s; counts=%s',mismatches,counts) from protected_summary
  union all select 'XP/MASTERY/SUBMISSION','REQUIRED_FUNCTIONS',case when found=9 then 'PASS' else 'BLOCK' end,format('functions=%s/9; missing=%s',found,missing) from functions
), summary as(select count(*) filter(where result='BLOCK')::int blockers,count(*) filter(where result='WARN')::int warnings from findings)
select section as report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when blockers=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',blockers) from summary
union all select 'READINESS','OVERALL',case when blockers>0 then 'BLOCK' when warnings>0 then 'WARN' else 'PASS' end,format('blockers=%s; expected pilot-change warnings=%s',blockers,warnings) from summary
order by report_section,code;

rollback;
