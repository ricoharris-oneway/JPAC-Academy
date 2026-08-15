-- Music Production/Songwriting rubric alignment validation. READ ONLY.
-- Corrects the order-sensitive category-name comparison in 202608140006 post-validation.
begin transaction read only;

with course_identity as (
 select count(*)::int n,(array_agg(id order by id::text))[1] id
 from public.courses
 where slug='music-production-songwriting'
), canonical_modules as (
 select m.id,m.course_level_id,m.level_module_number,m.sort_order,m.title,m.status,m.core_xp,m.intro_core_xp,m.video_core_xp,m.assignment_core_xp,m.mastery_core_xp,m.core_unlock_threshold,m.lab_tool_id,m.active_instructional_media_id,m.primary_video_url
 from public.course_modules m
 join public.course_levels l on l.id=m.course_level_id
 where m.course_id=(select id from course_identity)
 and l.level_number between 1 and 4
 and m.level_module_number between 1 and 12
 and m.sort_order between 1 and 48
 and m.review_notes like 'Music Production/Songwriting full draft rollout 202608140006;%'
), expected_categories(name,weight) as (
 values
 ('Creative Concept & Songwriting',20),
 ('Rhythm, Melody, Harmony & Arrangement',20),
 ('Production / Sound Selection / DAW Workflow',20),
 ('Recording, Mixing & Technical Quality',20),
 ('Professional Delivery, Credits & Reflection',20)
), core_challenges as (
 select a.*
 from public.activities a
 join canonical_modules m on m.id=a.module_id
 where a.course_id=(select id from course_identity)
 and a.activity_type='performance'
 and a.required
 and a.xp_type='core'
), rubric_summary as (
 select
  count(*)::int challenges,
  coalesce(sum(case when jsonb_typeof(rubric->'criteria')='array' then jsonb_array_length(rubric->'criteria') else 0 end),0)::int criteria,
  count(*) filter(where
   jsonb_typeof(rubric->'criteria')='array'
   and jsonb_array_length(rubric->'criteria')=5
   and (select count(*) from jsonb_array_elements(rubric->'criteria') criterion where criterion->>'name' in(select name from expected_categories))=5
   and (select count(distinct criterion->>'name') from jsonb_array_elements(rubric->'criteria') criterion)=5
   and not exists(
    select 1 from expected_categories expected
    where not exists(
     select 1 from jsonb_array_elements(rubric->'criteria') criterion
     where criterion->>'name'=expected.name
     and (criterion->>'weight')::int=expected.weight
    )
   )
   and (select sum((criterion->>'weight')::int) from jsonb_array_elements(rubric->'criteria') criterion)=100
   and not exists(
    select 1 from jsonb_array_elements(rubric->'criteria') criterion
    where jsonb_typeof(criterion->'bands')<>'object'
    or (select count(*) from jsonb_object_keys(criterion->'bands'))<>4
    or not (criterion->'bands' ?& array['Exceeds','Meets','Developing','Not Yet'])
    or exists(select 1 from jsonb_each_text(criterion->'bands') band where btrim(band.value)='')
   )
  )::int exact
 from core_challenges
), structure as (
 select
  (select count(*) from public.course_levels where course_id=(select id from course_identity))::int levels,
  (select count(*) from canonical_modules)::int modules,
  (select count(distinct sort_order) from canonical_modules)::int module_sorts,
  (select count(*) from public.lessons l join canonical_modules m on m.id=l.module_id)::int lessons,
  (select count(*) from public.activities a join canonical_modules m on m.id=a.module_id where a.activity_type='practice' and not a.required and a.xp_type='bonus' and a.xp_reward=0)::int practices
), draft_safety as (
 select
  (select count(*) from public.course_levels where course_id=(select id from course_identity) and status<>'draft')
  +(select count(*) from canonical_modules where status<>'draft')
  +(select count(*) from public.lessons l join canonical_modules m on m.id=l.module_id where l.status<>'draft')
  +(select count(*) from public.activities a join canonical_modules m on m.id=a.module_id where a.status<>'draft') as nondraft,
  (select count(*) from canonical_modules where core_xp<>625 or intro_core_xp<>50 or video_core_xp<>100 or assignment_core_xp<>350 or mastery_core_xp<>125 or core_unlock_threshold<>438)::int xp_changes
), assets as (
 select
  (select count(*) from public.module_instructional_media media join canonical_modules m on m.id=media.module_id)::int media,
  (select count(*) from canonical_modules where lab_tool_id is not null or active_instructional_media_id is not null or primary_video_url is not null)
  +(select count(*) from public.lab_tool_courses where course_id=(select id from course_identity))::int tools
), student_state as (
 select
  (select count(*) from public.xp_ledger)::int xp_ledger,
  (select count(*) from public.enrollments)::int enrollments,
  (select count(*) from public.submissions)::int submissions,
  (select count(*) from public.certificates)::int certificates,
  (select count(*) from public.lesson_progress)::int lesson_progress
), protected_courses as (
 select
  count(*) filter(where c.slug='singing')::int singing,
  count(*) filter(where c.slug='piano')::int piano,
  count(*) filter(where c.slug='guitar')::int guitar,
  count(*) filter(where c.slug='acting')::int acting,
  count(*) filter(where c.slug='dance')::int dance,
  count(*) filter(where c.slug='video-production')::int video_production,
  count(*) filter(where c.slug='audio-engineering')::int audio_engineering
 from public.course_modules m
 join public.courses c on c.id=m.course_id
), protected_hashes as (
 select upper(replace(c.slug,'-','_'))||'_CURRICULUM_BASELINE' code,
 md5(coalesce(string_agg(payload,E'\n' order by payload),'')) details
 from public.courses c
 cross join lateral (
  select m.id||':'||m.status||':'||m.title payload from public.course_modules m where m.course_id=c.id
  union all
  select l.id||':'||l.status||':'||l.title from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=c.id
  union all
  select a.id||':'||a.status||':'||a.title from public.activities a where a.course_id=c.id
 ) q
 where c.slug in('singing','piano','guitar','acting','dance','video-production','audio-engineering')
 group by c.slug
), assignment_swap as (
 select
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int functions,
  (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), findings as (
 select 'IDENTITY' section,'COURSE_IDENTITY' code,case when n=1 then 'PASS' else 'BLOCK' end result,format('canonical course rows=%s; id=%s',n,coalesce(id::text,'NULL')) details from course_identity
 union all select 'STRUCTURE','MODULES',case when modules=48 and module_sorts=48 then 'PASS' else 'BLOCK' end,format('canonical modules=%s/48; distinct sort orders=%s/48',modules,module_sorts) from structure
 union all select 'STRUCTURE','LEVELS_LESSONS_PRACTICES',case when levels=4 and lessons=144 and practices=48 then 'PASS' else 'BLOCK' end,format('levels=%s/4; lessons=%s/144; practices=%s/48',levels,lessons,practices) from structure
 union all select 'ASSESSMENT','CORE_CHALLENGES',case when challenges=48 then 'PASS' else 'BLOCK' end,format('Core Challenges=%s/48',challenges) from rubric_summary
 union all select 'ASSESSMENT','RUBRIC_CRITERIA',case when criteria=240 then 'PASS' else 'BLOCK' end,format('rubric criteria=%s/240',criteria) from rubric_summary
 union all select 'ASSESSMENT','EXACT_RUBRICS',case when exact=48 then 'PASS' else 'BLOCK' end,format('order-independent exact rubrics=%s/48; five approved categories at 20 points each; total=100; four non-empty bands each',exact) from rubric_summary
 union all select 'SAFETY','DRAFT_AND_XP',case when nondraft=0 and xp_changes=0 then 'PASS' else 'BLOCK' end,format('non-draft records=%s; noncanonical XP modules=%s',nondraft,xp_changes) from draft_safety
 union all select 'SAFETY','MEDIA_TOOLS',case when media=0 and tools=0 then 'PASS' else 'BLOCK' end,format('media rows=%s; active/bound tool or media references=%s',media,tools) from assets
 union all select 'PRESERVATION','STUDENT_STATE',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
 union all select 'PRESERVATION','PROTECTED_COURSE_COUNTS',case when singing=40 and piano=48 and guitar=50 and acting=46 and dance=47 and video_production=49 and audio_engineering=48 then 'PASS' else 'BLOCK' end,format('Singing=%s/40; Piano=%s/48; Guitar=%s/50; Acting=%s/46; Dance=%s/47; Video Production=%s/49; Audio Engineering=%s/48',singing,piano,guitar,acting,dance,video_production,audio_engineering) from protected_courses
 union all select 'PRESERVATION','ASSIGNMENT_SWAP',case when functions=2 then 'PASS' else 'BLOCK' end,format('RPC functions=%s/2; audit rows=%s; compare audit count with approved baseline',functions,audit_rows) from assignment_swap
 union all select 'PRESERVATION',code,'INFO','Compare hash with the successful 202608140006 post-validation baseline: '||details from protected_hashes
), blockers as (
 select count(*) filter(where result='BLOCK')::int n from findings
)
select section as report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when n=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',n) from blockers
union all select 'READINESS','OVERALL',case when n=0 then 'PASS' else 'BLOCK' end,case when n=0 then 'PASS: MUSIC PRODUCTION/SONGWRITING RUBRIC ALIGNMENT VALID' else 'BLOCK: REVIEW RUBRIC ALIGNMENT' end from blockers
order by report_section,code;

rollback;
