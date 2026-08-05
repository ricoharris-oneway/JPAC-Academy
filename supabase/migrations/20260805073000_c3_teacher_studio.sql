-- JPAC Academy C3: Teacher Studio review workflow
-- Run after the C1 learning engine and C2 role migrations.

create or replace function public.teacher_review_submission(
  submission_target uuid,
  review_status text,
  review_score numeric default null,
  review_feedback text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student uuid;
  reward integer;
  activity_target uuid;
begin
  if not public.is_academy_staff() then
    raise exception 'Teacher or administrator access required.';
  end if;

  if review_status not in ('approved','revision_requested') then
    raise exception 'Unsupported review status.';
  end if;

  if review_score is not null and (review_score < 0 or review_score > 100) then
    raise exception 'Score must be between 0 and 100.';
  end if;

  select s.student_id, s.activity_id, coalesce(a.xp_reward,0)
    into target_student, activity_target, reward
  from public.submissions s
  join public.activities a on a.id = s.activity_id
  where s.id = submission_target;

  if target_student is null then
    raise exception 'Submission not found.';
  end if;

  update public.submissions
  set status = review_status,
      score = review_score,
      teacher_feedback = coalesce(review_feedback,''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = submission_target;

  if review_status = 'approved' and reward > 0 and not exists (
    select 1 from public.xp_ledger
    where student_id = target_student
      and source_type = 'activity'
      and source_id = activity_target
  ) then
    insert into public.xp_ledger(student_id,amount,reason,source_type,source_id,awarded_by)
    values(target_student,reward,'Approved activity submission','activity',activity_target,auth.uid());
  end if;
end;
$$;

grant execute on function public.teacher_review_submission(uuid,text,numeric,text) to authenticated;

-- Staff require read access to the operational learning records shown in Teacher Studio.
drop policy if exists "staff read submissions" on public.submissions;
create policy "staff read submissions" on public.submissions
for select to authenticated using(public.is_academy_staff());

drop policy if exists "staff update submissions" on public.submissions;
create policy "staff update submissions" on public.submissions
for update to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

drop policy if exists "staff read lesson progress" on public.lesson_progress;
create policy "staff read lesson progress" on public.lesson_progress
for select to authenticated using(public.is_academy_staff());

drop policy if exists "staff read practice logs" on public.practice_logs;
create policy "staff read practice logs" on public.practice_logs
for select to authenticated using(public.is_academy_staff());
