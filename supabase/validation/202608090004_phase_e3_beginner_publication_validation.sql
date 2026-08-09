-- Read-only post-publication validation for migration 202608090004.
begin transaction read only;

do $$
declare singing_id uuid; beginner_id uuid; module_2 uuid;
begin
  select id into singing_id from public.courses where slug='singing';
  select id into beginner_id from public.course_levels where course_id=singing_id and level_number=1;
  select id into module_2 from public.course_modules where course_level_id=beginner_id and level_module_number=2 and title='Find Your Natural Voice' and status='published';
  if module_2 is null then raise exception 'BLOCKED: published Natural Voice Module 2 not found'; end if;
  if not exists(select 1 from public.course_modules where course_level_id=beginner_id and level_module_number=3 and title='Pitch Control') then raise exception 'BLOCKED: Pitch Control Module 3 changed'; end if;
  if (select count(*) from public.lessons where module_id=module_2 and status='published' and sort_order between 1 and 3
      and title in ('Speaking Into Song','Comfortable Range and Tension Awareness','Natural Tone and Healthy Onset'))<>3 then raise exception 'BLOCKED: replacement lessons are not published'; end if;
  if (select count(*) from public.activities where module_id=module_2 and status='published'
      and title in ('Three Versions, One Authentic Voice','Natural Tone Comparison Lab','Find Your Sound Challenge'))<>3 then raise exception 'BLOCKED: replacement activities are not published'; end if;
  if (select count(*) from public.activities where module_id=module_2 and status='published' and title='Find Your Sound Challenge'
      and required and xp_type='core' and xp_reward=350 and passing_score=70)<>1 then raise exception 'BLOCKED: required Creative Challenge is invalid'; end if;
  if (select count(*) from public.lessons where module_id=module_2 and status='archived' and title in ('Pitch Matching and Listening','Foundation Performance'))<>2 then raise exception 'BLOCKED: legacy lessons missing'; end if;
  if (select count(*) from public.activities where module_id=module_2 and status='archived' and title='Level 1 Foundation Performance')<>1 then raise exception 'BLOCKED: legacy activity missing'; end if;
  if exists(select 1 from public.course_modules where course_level_id=beginner_id group by level_module_number having count(*)>1) then raise exception 'BLOCKED: duplicate module number'; end if;
  if exists(select 1 from public.course_modules where course_level_id=beginner_id group by lower(trim(title)) having count(*)>1) then raise exception 'BLOCKED: duplicate module title'; end if;
  if (select count(*) from public.course_modules where course_id=singing_id)<>40 or (select count(*) from public.course_modules where course_level_id=beginner_id)<>10 then raise exception 'BLOCKED: canonical module totals changed'; end if;
  if exists(select 1 from public.course_modules where course_id=singing_id and core_xp<>625) or (select sum(core_xp) from public.course_modules where course_id=singing_id)<>25000 then raise exception 'BLOCKED: canonical Core XP changed'; end if;
end $$;

with singing as (select id from public.courses where slug='singing'),
beginner as (select l.id from public.course_levels l join singing s on s.id=l.course_id where l.level_number=1),
module_2 as (select m.id,m.title,m.status from public.course_modules m join beginner b on b.id=m.course_level_id where m.level_module_number=2)
select m.id as preserved_module_2_id,m.title,m.status,
  (select count(*) from public.lessons l where l.module_id=m.id and l.status='published') as published_lessons,
  (select count(*) from public.lessons l where l.module_id=m.id and l.status='archived') as archived_legacy_lessons,
  (select count(*) from public.activities a where a.module_id=m.id and a.status='published') as published_activities,
  (select count(*) from public.activities a where a.module_id=m.id and a.status='archived') as archived_legacy_activities,
  (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=m.id) as resolving_progress_rows,
  (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.module_id=m.id) as resolving_submission_rows,
  (select count(*) from public.xp_ledger x where x.module_id=m.id or x.source_id in(select l.id from public.lessons l where l.module_id=m.id) or x.source_id in(select a.id from public.activities a where a.module_id=m.id)) as resolving_xp_rows
from module_2 m;

-- Compare these hashes to the pre-transition audit output. Publication itself
-- also refuses to commit unless the full-table hashes remain identical.
select
  (select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.id::text),'')) from public.lesson_progress p) as progress_hash,
  (select md5(coalesce(string_agg(to_jsonb(s)::text,'|' order by s.id::text),'')) from public.submissions s) as submission_hash,
  (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id::text),'')) from public.xp_ledger x) as xp_hash,
  (select md5(coalesce(string_agg(to_jsonb(e)::text,'|' order by e.id::text),'')) from public.enrollments e) as enrollment_hash;

rollback;
