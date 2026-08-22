-- Digital AI Creator course-shell seed post-validation. READ ONLY.
begin transaction read only;

with course_identity as (
  select count(*)::int n,
    (array_agg(id order by id::text))[1] id,
    (array_agg(title order by id::text))[1] title,
    (array_agg(status order by id::text))[1] status,
    (array_agg(module_count order by id::text))[1] module_count
  from public.courses
  where slug='digital-ai-creator'
), shell_counts as (
  select
    (select count(*) from public.course_levels where course_id=(select id from course_identity))::int levels,
    (select count(*) from public.course_modules where course_id=(select id from course_identity))::int modules,
    (select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity))::int lessons,
    (select count(*) from public.activities where course_id=(select id from course_identity))::int activities,
    (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.course_id=(select id from course_identity))::int media,
    (select count(*) from public.lab_tool_courses where course_id=(select id from course_identity))::int tools,
    (select count(*) from public.enrollments where course_id=(select id from course_identity))::int enrollments,
    (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=(select id from course_identity))::int submissions,
    (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity))::int lesson_progress,
    (select count(*) from public.xp_ledger where course_id=(select id from course_identity))::int xp_ledger,
    (select count(*) from public.certificates where course_id=(select id from course_identity))::int certificates,
    (select count(*) from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))::int activity_progress,
    (select count(*) from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))::int practice_logs,
    (select count(*) from public.module_video_progress p join public.course_modules m on m.id=p.module_id where m.course_id=(select id from course_identity))::int module_video_progress,
    (select count(*) from public.course_progress where course_id=(select id from course_identity))::int course_progress
), protected_counts as (
  select
    count(*) filter (where c.slug='singing' and m.id is not null)::int singing,
    count(*) filter (where c.slug='piano' and m.id is not null)::int piano,
    count(*) filter (where c.slug='guitar' and m.id is not null)::int guitar,
    count(*) filter (where c.slug='acting' and m.id is not null)::int acting,
    count(*) filter (where c.slug='dance' and m.id is not null)::int dance,
    count(*) filter (where c.slug='video-production' and m.id is not null)::int video_production,
    count(*) filter (where c.slug='audio-engineering' and m.id is not null)::int audio_engineering,
    count(*) filter (where c.slug='music-production-songwriting' and m.id is not null)::int music_production_songwriting,
    count(*) filter (where c.slug='music-business' and m.id is not null)::int music_business
  from public.courses c
  left join public.course_modules m on m.course_id=c.id
), assignment_swap as (
  select
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpc_count,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select
    (select count(*) from public.xp_ledger)::int xp_ledger,
    (select count(*) from public.enrollments)::int enrollments,
    (select count(*) from public.submissions)::int submissions,
    (select count(*) from public.certificates)::int certificates,
    (select count(*) from public.lesson_progress)::int lesson_progress
), findings as (
  select 'IDENTITY' section, 'CANONICAL_COURSE_SHELL' code,
    case when n=1 and title='Digital AI Creator' and status='published' and module_count=10 then 'PASS' else 'BLOCK' end result,
    format('rows=%s/1; title=%s; status=%s; module_count=%s/10', n, coalesce(title,'NULL'), coalesce(status,'NULL'), coalesce(module_count::text,'NULL')) details
  from course_identity
  union all
  select 'SHELL', 'EMPTY_CURRICULUM',
    case when levels=0 and modules=0 and lessons=0 and activities=0 then 'PASS' else 'BLOCK' end,
    format('levels=%s/0; modules=%s/0; lessons=%s/0; activities=%s/0', levels,modules,lessons,activities)
  from shell_counts
  union all
  select 'SHELL', 'NO_MEDIA_TOOLS',
    case when media=0 and tools=0 then 'PASS' else 'BLOCK' end,
    format('media=%s/0; tools=%s/0', media,tools)
  from shell_counts
  union all
  select 'SHELL', 'NO_STUDENT_STATE',
    case when enrollments=0 and submissions=0 and lesson_progress=0 and xp_ledger=0 and certificates=0 and activity_progress=0 and practice_logs=0 and module_video_progress=0 and course_progress=0 then 'PASS' else 'BLOCK' end,
    format('enrollments=%s/0; submissions=%s/0; lesson_progress=%s/0; xp_ledger=%s/0; certificates=%s/0; activity_progress=%s/0; practice_logs=%s/0; module_video_progress=%s/0; course_progress=%s/0', enrollments,submissions,lesson_progress,xp_ledger,certificates,activity_progress,practice_logs,module_video_progress,course_progress)
  from shell_counts
  union all
  select 'PRESERVATION', 'PROTECTED_COURSE_COUNTS',
    case when singing=40 and piano=49 and guitar=50 and acting=46 and dance=47 and video_production=49 and audio_engineering=48 and music_production_songwriting=48 and music_business=48 then 'PASS' else 'BLOCK' end,
    format('Singing=%s/40; Piano=%s/49; Guitar=%s/50; Acting=%s/46; Dance=%s/47; Video Production=%s/49; Audio Engineering=%s/48; Music Production/Songwriting=%s/48; Music Business=%s/48', singing,piano,guitar,acting,dance,video_production,audio_engineering,music_production_songwriting,music_business)
  from protected_counts
  union all
  select 'PRESERVATION', 'ASSIGNMENT_SWAP_CONTRACT',
    case when rpc_count=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,
    format('required RPCs=%s/2; curriculum_assignment_swap_operations=%s/2', rpc_count, audit_rows)
  from assignment_swap
  union all
  select 'PRESERVATION', 'STUDENT_STATE_COUNTS',
    case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,
    format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5', xp_ledger,enrollments,submissions,certificates,lesson_progress)
  from student_state
), blockers as (
  select count(*) filter (where result='BLOCK')::int n from findings
)
select section as report_section, code, result, details from findings
union all
select 'READINESS', 'BLOCKERS', case when n=0 then 'PASS' else 'BLOCK' end, format('blocking findings=%s', n) from blockers
union all
select 'READINESS', 'OVERALL', case when n=0 then 'PASS' else 'BLOCK' end,
  case when n=0 then 'PASS: DIGITAL AI CREATOR COURSE SHELL VALID' else 'BLOCK: DIGITAL AI CREATOR COURSE SHELL INVALID' end
from blockers
order by report_section, code;

rollback;
