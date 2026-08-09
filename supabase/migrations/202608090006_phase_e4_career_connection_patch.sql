begin;

-- Phase E4 canonical metadata repair. This is not a publication transition.
create temporary table phase_e4_career_patch_baseline on commit drop as
select
  (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing') as singing_modules,
  (select count(*) from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and cl.level_number=1) as beginner_modules,
  (select coalesce(sum(m.core_xp),0) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing') as singing_core_xp,
  (select m.id from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and cl.level_number=1 and m.level_module_number=1 and m.title='Breath, Alignment & Vocal Health' and m.status='published') as module_1_id,
  (select m.id from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and cl.level_number=1 and m.level_module_number=2 and m.title='Pitch, Tone & First Performance' and m.status='published') as module_2_id,
  (select count(*) from public.lesson_progress) as progress_rows,
  (select count(*) from public.submissions) as submission_rows,
  (select count(*) from public.xp_ledger) as xp_rows,
  (select count(*) from public.enrollments) as enrollment_rows,
  (select count(*) from public.lessons where status='published') as published_lessons,
  (select count(*) from public.activities where status='published') as published_activities;

do $$
declare b phase_e4_career_patch_baseline%rowtype;
begin
  select * into b from phase_e4_career_patch_baseline;
  if b.singing_modules<>40 or b.beginner_modules<>10 or b.singing_core_xp<>25000 then
    raise exception 'Phase E4 baseline mismatch: expected 40 Singing modules, 10 Beginner modules, and 25,000 Core XP';
  end if;
  if b.module_1_id is null then
    raise exception 'Expected exactly one published Beginner Module 1 named Breath, Alignment & Vocal Health';
  end if;
  if b.module_2_id is null then
    raise exception 'Expected exactly one published legacy Beginner Module 2 named Pitch, Tone & First Performance';
  end if;
end $$;

update public.course_modules m
set career_connection='Alignment, breath coordination, and healthy vocal production support reliable work for live performers, recording artists, voice actors, and other vocal creators.',
    updated_at=now()
from public.course_levels cl, public.courses c
where m.course_level_id=cl.id
  and m.course_id=c.id
  and c.slug='singing'
  and cl.level_number=1
  and m.level_module_number=1
  and m.title='Breath, Alignment & Vocal Health'
  and m.status='published'
  and nullif(trim(m.career_connection),'') is null;

do $$
declare b phase_e4_career_patch_baseline%rowtype;
begin
  select * into b from phase_e4_career_patch_baseline;
  if (select count(*) from public.course_modules m where m.id=b.module_1_id and m.status='published' and m.level_module_number=1 and m.core_xp=625 and m.core_unlock_threshold=438 and m.career_connection='Alignment, breath coordination, and healthy vocal production support reliable work for live performers, recording artists, voice actors, and other vocal creators.')<>1 then
    raise exception 'Module 1 canonical Career Connection assertion failed';
  end if;
  if (select count(*) from public.course_modules m where m.id=b.module_2_id and m.status='published' and m.level_module_number=2 and m.title='Pitch, Tone & First Performance' and m.core_xp=625 and m.core_unlock_threshold=438)<>1 then
    raise exception 'Legacy Module 2 protection assertion failed';
  end if;
  if (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing')<>b.singing_modules
     or (select count(*) from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and cl.level_number=1)<>b.beginner_modules
     or (select coalesce(sum(m.core_xp),0) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing')<>b.singing_core_xp
     or (select count(*) from public.lesson_progress)<>b.progress_rows
     or (select count(*) from public.submissions)<>b.submission_rows
     or (select count(*) from public.xp_ledger)<>b.xp_rows
     or (select count(*) from public.enrollments)<>b.enrollment_rows
     or (select count(*) from public.lessons where status='published')<>b.published_lessons
     or (select count(*) from public.activities where status='published')<>b.published_activities then
    raise exception 'Phase E4 preservation assertion failed';
  end if;
end $$;

commit;
