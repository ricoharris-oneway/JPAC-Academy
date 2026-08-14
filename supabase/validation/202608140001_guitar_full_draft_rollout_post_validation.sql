-- JPAC Guitar 50-module rollout post-validation. READ ONLY.
begin transaction read only;
with guitar as(select id from public.courses where slug='guitar'), counts as (
 select (select count(*) from public.course_levels where course_id=(select id from guitar))::int levels,(select count(*) from public.course_modules where course_id=(select id from guitar))::int modules,(select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=(select id from guitar))::int lessons,(select count(*) from public.activities where course_id=(select id from guitar) and activity_type='practice')::int practices,(select count(*) from public.activities where course_id=(select id from guitar) and activity_type='performance' and required and xp_type='core')::int challenges
), rubrics as (
 select count(*)::int challenges,coalesce(sum(jsonb_array_length(rubric->'criteria')),0)::int criteria,count(*) filter(where jsonb_array_length(rubric->'criteria')=5 and (select sum((x->>'weight')::int) from jsonb_array_elements(rubric->'criteria') x)=100 and not exists(select 1 from jsonb_array_elements(rubric->'criteria') x where jsonb_typeof(x->'bands')<>'object' or (select count(*) from jsonb_object_keys(x->'bands'))<>4 or exists(select 1 from jsonb_each_text(x->'bands') b where b.value='')))::int valid from public.activities where course_id=(select id from guitar) and activity_type='performance' and required and xp_type='core'
), safety as (
 select (select count(*) from public.course_levels where course_id=(select id from guitar) and status<>'draft')+(select count(*) from public.course_modules where course_id=(select id from guitar) and status<>'draft')+(select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=(select id from guitar) and l.status<>'draft')+(select count(*) from public.activities where course_id=(select id from guitar) and status<>'draft') nondraft,
 (select count(*) from public.course_modules where course_id=(select id from guitar) and status='draft' and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438 and lab_tool_id is null and active_instructional_media_id is null and primary_video_url is null and video_brief='NEEDS REVIEW: no media is activated.' and jpac_tool_activity=jsonb_build_object('review_status','NEEDS CATALOG REVIEW')) payloads,
 (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.course_id=(select id from guitar)) media,
 (select count(*) from public.course_modules where course_id=(select id from guitar) and lab_tool_id is not null) tools
), deps as (
 select (select count(*) from public.enrollments where course_id=(select id from guitar))+(select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=(select id from guitar))+(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=(select id from guitar))+(select count(*) from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=(select id from guitar))+(select count(*) from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=(select id from guitar))+(select count(*) from public.xp_ledger where course_id=(select id from guitar))+(select count(*) from public.certificates where course_id=(select id from guitar))+(select count(*) from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.course_id=(select id from guitar)) n
), draft_isolation as (
 select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)::int functions,
  (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D')::int triggers
), baselines as (
 select 'SINGING_CURRICULUM_BASELINE' code,md5(coalesce(string_agg(v,E'\\n' order by v),'')) details from (
  select m.id||':'||m.status||':'||m.title v from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing'
  union all select l.id||':'||l.status||':'||l.title from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
  union all select a.id||':'||a.status||':'||a.title from public.activities a join public.courses c on c.id=a.course_id where c.slug='singing') q
 union all
 select 'PIANO_CURRICULUM_BASELINE',md5(coalesce(string_agg(v,E'\\n' order by v),'')) from (
  select m.id||':'||m.status||':'||m.title v from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='piano'
  union all select l.id||':'||l.status||':'||l.title from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug='piano'
  union all select a.id||':'||a.status||':'||a.title from public.activities a join public.courses c on c.id=a.course_id where c.slug='piano') q
 union all
 select 'STUDENT_STATE_BASELINE',jsonb_build_object('enrollments',(select count(*) from public.enrollments),'lesson_progress',(select count(*) from public.lesson_progress),'activity_progress',(select count(*) from public.activity_progress),'practice_logs',(select count(*) from public.practice_logs),'submissions',(select count(*) from public.submissions),'xp_ledger',(select count(*) from public.xp_ledger),'certificates',(select count(*) from public.certificates),'portfolio_projects',(select count(*) from public.portfolio_projects))::text
 union all
 select 'ASSIGNMENT_SWAP_BASELINE',jsonb_build_object('definition_hash',(select md5(coalesce(string_agg(p.proname||':'||pg_get_functiondef(p.oid),E'\\n' order by p.proname),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1')),'audit_rows',(select count(*) from public.curriculum_assignment_swap_operations))::text
),
findings as (
 select 'STRUCTURE' section,'LEVELS' code,case when levels=4 then 'PASS' else 'BLOCK' end result,format('levels=%s/4',levels) details from counts
 union all select 'STRUCTURE','MODULES',case when modules=50 then 'PASS' else 'BLOCK' end,format('modules=%s/50',modules) from counts
 union all select 'STRUCTURE','LESSONS',case when lessons=150 then 'PASS' else 'BLOCK' end,format('lessons=%s/150',lessons) from counts
 union all select 'STRUCTURE','PRACTICES',case when practices=50 then 'PASS' else 'BLOCK' end,format('practices=%s/50',practices) from counts
 union all select 'STRUCTURE','CORE_CHALLENGES',case when challenges=50 then 'PASS' else 'BLOCK' end,format('Core Challenges=%s/50',challenges) from counts
 union all select 'ASSESSMENT','RUBRICS',case when challenges=50 and criteria=250 and valid=50 then 'PASS' else 'BLOCK' end,format('challenges=%s; criteria=%s; exact rubrics=%s',challenges,criteria,valid) from rubrics
 union all select 'SAFETY','DRAFT_ONLY',case when nondraft=0 then 'PASS' else 'BLOCK' end,format('non-draft records=%s',nondraft) from safety
 union all select 'SAFETY','CANONICAL_PAYLOAD',case when payloads=50 then 'PASS' else 'BLOCK' end,format('canonical draft modules=%s/50',payloads) from safety
 union all select 'SAFETY','MEDIA_TOOLS',case when media=0 and tools=0 then 'PASS' else 'BLOCK' end,format('media rows=%s; tool bindings=%s',media,tools) from safety
 union all select 'SAFETY','GUITAR_DEPENDENCIES',case when n=0 then 'PASS' else 'BLOCK' end,format('student/evidence dependencies=%s',n) from deps
 union all select 'SAFETY','SAFE_DRAFT_ISOLATION',case when functions=2 and triggers=1 then 'PASS' else 'BLOCK' end,format('published-only functions=%s/2; canonical trigger=%s',functions,triggers) from draft_isolation
 union all select 'PRESERVATION',code,'INFO','Compare exactly with preflight: '||details from baselines
), blockers as(select count(*) filter(where result='BLOCK')::int n from findings)
select section as report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when n=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',n) from blockers
union all select 'READINESS','OVERALL',case when n=0 then 'PASS' else 'BLOCK' end,case when n=0 then 'PASS: GUITAR FULL DRAFT ROLLOUT VALID; COMPARE PRESERVATION BASELINES' else 'BLOCK: REVIEW GUITAR ROLLOUT' end from blockers
order by report_section,code;
rollback;
