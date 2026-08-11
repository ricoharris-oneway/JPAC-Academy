begin;

-- Canonical Academy enrollment progress is active-level mastery:
-- mastered modules / all non-archived modules in the enrollment's current level.
-- Lesson progress and XP remain distinct evidence dimensions.
create or replace function public.jpac_sync_enrollment_progress(
  target_student uuid,
  target_course uuid
)
returns numeric
language plpgsql
security definer
set search_path=public
as $$
declare
  enrollment_row public.enrollments%rowtype;
  total_modules integer:=0;
  mastered_modules integer:=0;
  computed_progress numeric(5,2):=0;
begin
  select * into enrollment_row
  from public.enrollments
  where student_id=target_student and course_id=target_course
  for update;

  if enrollment_row.id is null then
    return 0;
  end if;

  select count(*) into total_modules
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  where m.course_id=target_course
    and l.level_number=enrollment_row.level
    and m.status<>'archived';

  if total_modules>0 then
    select count(distinct m.id) into mastered_modules
    from public.course_modules m
    join public.course_levels l on l.id=m.course_level_id
    where m.course_id=target_course
      and l.level_number=enrollment_row.level
      and m.status<>'archived'
      and exists(
        select 1 from public.xp_ledger x
        where x.student_id=target_student
          and x.module_id=m.id
          and x.xp_type='core'
          and x.metadata->>'component'='mastery'
      );
    computed_progress:=round(mastered_modules::numeric/total_modules::numeric*100,2);
  end if;

  update public.enrollments
  set progress=computed_progress,updated_at=now()
  where id=enrollment_row.id;

  update public.course_progress
  set percent_complete=computed_progress,updated_at=now()
  where enrollment_id=enrollment_row.id
    and student_id=target_student
    and course_id=target_course;

  return computed_progress;
end;
$$;

revoke all on function public.jpac_sync_enrollment_progress(uuid,uuid) from public,anon,authenticated;

-- Enrollment progress is an Academy-owned projection. Intercept every proposed
-- progress update, including the retained legacy review function's +10 write,
-- and replace it with the canonical mastery-derived value before commit. This
-- trigger assigns NEW only and performs no UPDATE, so it cannot recurse.
create or replace function public.jpac_enforce_canonical_enrollment_progress()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  total_modules integer:=0;
  mastered_modules integer:=0;
begin
  select count(*) into total_modules
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  where m.course_id=new.course_id
    and l.level_number=new.level
    and m.status<>'archived';

  if total_modules=0 then
    new.progress:=0;
    return new;
  end if;

  select count(distinct m.id) into mastered_modules
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  where m.course_id=new.course_id
    and l.level_number=new.level
    and m.status<>'archived'
    and exists(
      select 1 from public.xp_ledger x
      where x.student_id=new.student_id
        and x.module_id=m.id
        and x.xp_type='core'
        and x.metadata->>'component'='mastery'
    );

  new.progress:=round(mastered_modules::numeric/total_modules::numeric*100,2);
  return new;
end;
$$;

revoke all on function public.jpac_enforce_canonical_enrollment_progress() from public,anon,authenticated;

drop trigger if exists enrollments_enforce_canonical_progress on public.enrollments;
create trigger enrollments_enforce_canonical_progress
before update of progress on public.enrollments
for each row execute function public.jpac_enforce_canonical_enrollment_progress();

create or replace function public.jpac_sync_progress_from_mastery_ledger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  affected_course uuid;
begin
  if tg_op in('UPDATE','DELETE') and coalesce(old.metadata->>'component','')='mastery' then
    select m.course_id into affected_course from public.course_modules m where m.id=old.module_id;
    if affected_course is not null then
      perform public.jpac_sync_enrollment_progress(old.student_id,affected_course);
    end if;
  end if;

  if tg_op in('INSERT','UPDATE') and coalesce(new.metadata->>'component','')='mastery' then
    select m.course_id into affected_course from public.course_modules m where m.id=new.module_id;
    if affected_course is not null then
      perform public.jpac_sync_enrollment_progress(new.student_id,affected_course);
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.jpac_sync_progress_from_mastery_ledger() from public,anon,authenticated;

drop trigger if exists xp_ledger_sync_canonical_progress on public.xp_ledger;
create trigger xp_ledger_sync_canonical_progress
after insert or update or delete on public.xp_ledger
for each row execute function public.jpac_sync_progress_from_mastery_ledger();

-- The retained legacy review workflow may increment enrollment progress before
-- the Phase E wrapper finishes its idempotent XP/mastery work. Reassert the
-- canonical projection at the wrapper's final xp_awarded update, including a
-- later approved resubmission where no new mastery ledger row is inserted.
create or replace function public.jpac_sync_progress_after_assessment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  affected_course uuid;
begin
  if new.status='approved' then
    select coalesce(a.course_id,m.course_id) into affected_course
    from public.activities a
    left join public.course_modules m on m.id=a.module_id
    where a.id=new.activity_id;
    if affected_course is not null then
      perform public.jpac_sync_enrollment_progress(new.student_id,affected_course);
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.jpac_sync_progress_after_assessment() from public,anon,authenticated;

drop trigger if exists submissions_sync_canonical_progress on public.submissions;
create trigger submissions_sync_canonical_progress
after update of xp_awarded on public.submissions
for each row execute function public.jpac_sync_progress_after_assessment();

-- Reconcile stored enrollment/course-progress projections from immutable
-- mastery evidence. No progress, XP, assessment, submission, or enrollment
-- records are deleted.
do $$
declare
  enrollment_row record;
begin
  for enrollment_row in
    select student_id,course_id from public.enrollments
  loop
    perform public.jpac_sync_enrollment_progress(enrollment_row.student_id,enrollment_row.course_id);
  end loop;
end;
$$;

comment on column public.enrollments.progress is
  'Canonical active-level mastery percentage: mastered modules divided by all non-archived modules in the enrollment current level. Not lesson progress or XP progress.';

commit;
