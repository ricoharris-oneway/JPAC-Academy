-- Digital AI Creator course-shell seed preflight. READ ONLY.
begin transaction read only;

with exact_course as (
  select count(*)::int n
  from public.courses
  where slug = 'digital-ai-creator'
), candidate_courses as (
  select count(*)::int n,
    coalesce(jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'title', title) order by slug), '[]'::jsonb) candidates
  from public.courses
  where slug <> 'digital-ai-creator'
    and (slug ilike '%digital%ai%creator%' or title ilike '%digital%ai%creator%' or title ilike '%ai creator%')
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
  select 'IDENTITY' section, 'CANONICAL_SLUG_AVAILABLE' code,
    case when n=0 then 'PASS' else 'BLOCK' end result,
    format('existing digital-ai-creator rows=%s/0', n) details
  from exact_course
  union all
  select 'IDENTITY', 'DUPLICATE_CANDIDATES',
    case when n=0 then 'PASS' else 'BLOCK' end,
    format('likely duplicate candidates=%s/0; candidates=%s', n, candidates)
  from candidate_courses
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
  case when n=0 then 'PASS: READY TO SEED DIGITAL AI CREATOR COURSE SHELL' else 'BLOCK: DO NOT RUN COURSE-SHELL SEED' end
from blockers
order by report_section, code;

rollback;
