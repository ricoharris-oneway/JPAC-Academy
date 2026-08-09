-- CONTROLLED PUBLICATION MIGRATION. Apply only after Phase E3 curriculum
-- leadership approval and successful authoring-seed validation.
begin;

create temporary table phase_e3_publication_baseline on commit drop as
select
  m.id as original_module_2_id,
  (select count(*) from public.lesson_progress) as progress_rows,
  (select count(*) from public.submissions) as submission_rows,
  (select count(*) from public.xp_ledger) as xp_rows,
  (select count(*) from public.enrollments) as enrollment_rows,
  (select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.id::text),'')) from public.lesson_progress p) as progress_hash,
  (select md5(coalesce(string_agg(to_jsonb(s)::text,'|' order by s.id::text),'')) from public.submissions s) as submission_hash,
  (select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id::text),'')) from public.xp_ledger x) as xp_hash,
  (select md5(coalesce(string_agg(to_jsonb(e)::text,'|' order by e.id::text),'')) from public.enrollments e) as enrollment_hash
from public.course_modules m
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1 and m.level_module_number=2
  and m.title='Pitch, Tone & First Performance' and m.status='published';

do $$
declare module_2 uuid; module_3 uuid; rubric_total numeric;
begin
  if (select count(*) from phase_e3_publication_baseline)<>1 then
    raise exception 'Expected exactly one published legacy Beginner Module 2';
  end if;
  select original_module_2_id into module_2 from phase_e3_publication_baseline;
  select m.id into module_3 from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing' and cl.level_number=1 and m.level_module_number=3 and m.title='Pitch Control';
  if module_3 is null then raise exception 'Approved canonical Module 3 Pitch Control is missing'; end if;

  if (select count(*) from public.lessons where module_id=module_2 and status='draft'
      and title in ('Speaking Into Song','Comfortable Range and Tension Awareness','Natural Tone and Healthy Onset')
      and short_summary<>'' and learning_objective<>'' and content_blocks<>'[]'::jsonb
      and cardinality(technique_cues)>0 and cardinality(common_mistakes)>0 and self_check<>'')<>3 then
    raise exception 'Natural Voice replacement lessons are incomplete';
  end if;
  if (select count(*) from public.activities where module_id=module_2 and status='draft'
      and title in ('Three Versions, One Authentic Voice','Natural Tone Comparison Lab')
      and activity_type='practice' and xp_type='bonus' and xp_reward=50 and not required)<>2 then
    raise exception 'Natural Voice Bonus practices are incomplete';
  end if;
  if (select count(*) from public.activities where module_id=module_2 and status='draft'
      and title='Find Your Sound Challenge' and activity_type='performance' and xp_type='core'
      and xp_reward=350 and required and passing_score=70 and allows_resubmission)<>1 then
    raise exception 'Natural Voice Core challenge is incomplete';
  end if;
  select coalesce(sum((criterion->>'weight')::numeric),0) into rubric_total
  from public.activities a cross join lateral jsonb_array_elements(a.rubric->'criteria') criterion
  where a.module_id=module_2 and a.title='Find Your Sound Challenge' and a.status='draft';
  if rubric_total<>100 then raise exception 'Natural Voice Core challenge rubric must total 100'; end if;
end $$;

-- Move historical records out of canonical display ordering without changing IDs.
update public.lessons l set status='archived',
  sort_order=case l.title when 'Pitch Matching and Listening' then 901 else 902 end,
  updated_at=now()
where l.module_id=(select original_module_2_id from phase_e3_publication_baseline)
  and l.title in ('Pitch Matching and Listening','Foundation Performance');

update public.activities a set status='archived',updated_at=now()
where a.module_id=(select original_module_2_id from phase_e3_publication_baseline)
  and a.title='Level 1 Foundation Performance';

-- Publish the reviewed replacement package only after legacy ordering is clear.
update public.lessons l set status='published',
  sort_order=case l.title when 'Speaking Into Song' then 1 when 'Comfortable Range and Tension Awareness' then 2 else 3 end,
  updated_at=now()
where l.module_id=(select original_module_2_id from phase_e3_publication_baseline)
  and l.status='draft'
  and l.title in ('Speaking Into Song','Comfortable Range and Tension Awareness','Natural Tone and Healthy Onset');

update public.activities a set status='published',updated_at=now()
where a.module_id=(select original_module_2_id from phase_e3_publication_baseline)
  and a.status='draft'
  and a.title in ('Three Versions, One Authentic Voice','Natural Tone Comparison Lab','Find Your Sound Challenge');

update public.course_modules m set
  title='Find Your Natural Voice',
  description='Connect speaking and singing, explore healthy onset and tone, and select an authentic sound from three creative takes.',
  short_intro='Discover a comfortable, authentic vocal sound without forcing or imitation.',
  career_connection='A sustainable natural sound helps creators deliver repeatable performances.',
  jpac_tool_activity=jsonb_build_object('title','Natural Tone Comparison','instructions','Record or compare focused takes using the module skill. Identify one measurable difference and one next adjustment.','intended_capability','recording comparison'),
  real_world_activity=jsonb_build_object('title','Three Versions, One Authentic Voice','instructions','Complete a specific before/after, comparison, or continuous-take practice and identify the improvement you can hear or see.'),
  updated_at=now()
where m.id=(select original_module_2_id from phase_e3_publication_baseline);

do $$
declare singing_id uuid; beginner_id uuid; module_2 uuid;
begin
  select id into singing_id from public.courses where slug='singing';
  select id into beginner_id from public.course_levels where course_id=singing_id and level_number=1;
  select original_module_2_id into module_2 from phase_e3_publication_baseline;

  if module_2<>(select id from public.course_modules where course_level_id=beginner_id and level_module_number=2 and title='Find Your Natural Voice') then raise exception 'Module 2 UUID changed'; end if;
  if (select count(*) from public.lessons where module_id=module_2 and status='published' and title in ('Speaking Into Song','Comfortable Range and Tension Awareness','Natural Tone and Healthy Onset'))<>3 then raise exception 'Module 2 published lesson assertion failed'; end if;
  if (select count(*) from public.activities where module_id=module_2 and status='published' and required and xp_type='core' and title='Find Your Sound Challenge')<>1 then raise exception 'Module 2 published challenge assertion failed'; end if;
  if (select count(*) from public.lessons where module_id=module_2 and status='archived' and title in ('Pitch Matching and Listening','Foundation Performance'))<>2 then raise exception 'Legacy lesson preservation failed'; end if;
  if (select count(*) from public.activities where module_id=module_2 and status='archived' and title='Level 1 Foundation Performance')<>1 then raise exception 'Legacy activity preservation failed'; end if;
  if not exists(select 1 from public.course_modules where course_level_id=beginner_id and level_module_number=3 and title='Pitch Control') then raise exception 'Pitch Control Module 3 changed'; end if;
  if exists(select 1 from public.course_modules where course_level_id=beginner_id group by level_module_number having count(*)>1) then raise exception 'Duplicate Beginner module number'; end if;
  if exists(select 1 from public.course_modules where course_level_id=beginner_id group by lower(trim(title)) having count(*)>1) then raise exception 'Duplicate Beginner module title'; end if;
  if (select count(*) from public.course_modules where course_id=singing_id)<>40 or (select count(*) from public.course_modules where course_level_id=beginner_id)<>10 then raise exception 'Canonical module counts changed'; end if;
  if exists(select 1 from public.course_modules where course_id=singing_id and core_xp<>625) or (select sum(core_xp) from public.course_modules where course_id=singing_id)<>25000 then raise exception 'Canonical Core XP changed'; end if;
  if exists(select 1 from phase_e3_publication_baseline b where
       b.progress_rows<>(select count(*) from public.lesson_progress) or b.progress_hash<>(select md5(coalesce(string_agg(to_jsonb(p)::text,'|' order by p.id::text),'')) from public.lesson_progress p)
    or b.submission_rows<>(select count(*) from public.submissions) or b.submission_hash<>(select md5(coalesce(string_agg(to_jsonb(s)::text,'|' order by s.id::text),'')) from public.submissions s)
    or b.xp_rows<>(select count(*) from public.xp_ledger) or b.xp_hash<>(select md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id::text),'')) from public.xp_ledger x)
    or b.enrollment_rows<>(select count(*) from public.enrollments) or b.enrollment_hash<>(select md5(coalesce(string_agg(to_jsonb(e)::text,'|' order by e.id::text),'')) from public.enrollments e)) then
    raise exception 'Historical student data changed during publication';
  end if;
end $$;

commit;
