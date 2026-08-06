-- Block A5: automatic program progress, next-step state, XP ledger, dashboard synchronization, and ARIA signals.

-- Optional deterministic mapping between Wix Programs and existing JPAC courses.
create table if not exists public.wix_program_course_map (
  id uuid primary key default gen_random_uuid(),
  wix_program_id text not null unique,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wix_program_course_map enable row level security;
drop policy if exists "staff manage wix program course map" on public.wix_program_course_map;
create policy "staff manage wix program course map" on public.wix_program_course_map
  for all to authenticated
  using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer')))
  with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer')));

-- Preserve Wix assignment order so the engine can identify the next available step.
do $$ begin
  alter table public.wix_assignments add column sequence_number integer;
exception when duplicate_column then null; end $$;

create index if not exists wix_assignments_sequence_idx
  on public.wix_assignments(wix_program_id,sequence_number,status);

-- Immutable XP ledger prevents duplicate awards and provides an auditable source of truth.
create table if not exists public.student_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now(),
  unique(student_id,source_type,source_id)
);

create index if not exists student_xp_ledger_student_idx
  on public.student_xp_ledger(student_id,created_at desc);

alter table public.student_xp_ledger enable row level security;
drop policy if exists "students read own xp ledger" on public.student_xp_ledger;
create policy "students read own xp ledger" on public.student_xp_ledger
  for select to authenticated using(student_id=auth.uid());

-- One compact state record feeds dashboards, ARIA, certificate checks, and operational verification.
create table if not exists public.student_learning_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  wix_program_id text not null,
  course_id uuid references public.courses(id) on delete set null,
  approved_assignments integer not null default 0,
  total_assignments integer not null default 0,
  progress numeric(5,2) not null default 0,
  average_score numeric(5,2) not null default 0,
  next_wix_assignment_id text,
  next_assignment_title text,
  completion_status text not null default 'in_progress' check(completion_status in ('not_started','in_progress','complete')),
  aria_signal text not null default 'continue_learning',
  last_submission_id uuid references public.submissions(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(student_id,wix_program_id)
);

create index if not exists student_learning_state_student_idx
  on public.student_learning_state(student_id,completion_status,updated_at desc);

alter table public.student_learning_state enable row level security;
drop policy if exists "students read own learning state" on public.student_learning_state;
create policy "students read own learning state" on public.student_learning_state
  for select to authenticated using(student_id=auth.uid());

-- Recalculate the complete Wix-linked learning state after an approved submission.
create or replace function public.jpac_refresh_student_learning_state(target_submission uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.submissions%rowtype;
  wa public.wix_assignments%rowtype;
  mapped_course uuid;
  approved_count integer:=0;
  assignment_count integer:=0;
  score_average numeric:=0;
  computed_progress numeric:=0;
  next_external text;
  next_title text;
  state_status text:='in_progress';
  signal text:='continue_learning';
  enrollment_id uuid;
  xp_inserted boolean:=false;
begin
  select * into s from public.submissions where id=target_submission for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if s.status<>'approved' or s.wix_assignment_id is null then
    return jsonb_build_object('ok',true,'skipped',true,'reason','Submission is not an approved Wix assignment');
  end if;

  select * into wa from public.wix_assignments where id=s.wix_assignment_id;
  if wa.id is null then raise exception 'Linked Wix assignment not found'; end if;

  select m.course_id into mapped_course
  from public.wix_program_course_map m
  where m.wix_program_id=wa.wix_program_id;

  -- Automatically establish a safe exact-title mapping when one unique course matches the Wix Program title.
  if mapped_course is null then
    select c.id into mapped_course
    from public.courses c
    join public.wix_program_enrollments wpe on wpe.wix_program_id=wa.wix_program_id and wpe.profile_id=s.student_id
    where lower(trim(c.title))=lower(trim(coalesce(wpe.wix_program_title,'')))
    limit 1;
    if mapped_course is not null then
      insert into public.wix_program_course_map(wix_program_id,course_id)
      values(wa.wix_program_id,mapped_course)
      on conflict(wix_program_id) do update set course_id=excluded.course_id,updated_at=now();
    end if;
  end if;

  select count(*) into assignment_count
  from public.wix_assignments a
  where a.wix_program_id=wa.wix_program_id and a.status='active';

  select count(distinct approved_assignment.id),coalesce(avg(approved_submission.score),0)
    into approved_count,score_average
  from public.wix_assignments approved_assignment
  join public.submissions approved_submission on approved_submission.wix_assignment_id=approved_assignment.id
  where approved_assignment.wix_program_id=wa.wix_program_id
    and approved_submission.student_id=s.student_id
    and approved_submission.status='approved';

  computed_progress:=case when assignment_count>0 then round((approved_count::numeric/assignment_count::numeric)*100,2) else 0 end;
  state_status:=case when computed_progress>=100 then 'complete' when approved_count=0 then 'not_started' else 'in_progress' end;
  signal:=case
    when computed_progress>=100 then 'program_complete'
    when score_average<70 and approved_count>0 then 'teacher_support_recommended'
    when computed_progress>=80 then 'completion_near'
    when approved_count>0 then 'continue_learning'
    else 'begin_program'
  end;

  select a.wix_assignment_id,a.title into next_external,next_title
  from public.wix_assignments a
  where a.wix_program_id=wa.wix_program_id and a.status='active'
    and not exists(
      select 1 from public.submissions sx
      where sx.student_id=s.student_id and sx.wix_assignment_id=a.id and sx.status='approved'
    )
  order by a.sequence_number nulls last,a.created_at
  limit 1;

  insert into public.student_learning_state(student_id,wix_program_id,course_id,approved_assignments,total_assignments,progress,average_score,next_wix_assignment_id,next_assignment_title,completion_status,aria_signal,last_submission_id,updated_at)
  values(s.student_id,wa.wix_program_id,mapped_course,approved_count,assignment_count,computed_progress,score_average,next_external,next_title,state_status,signal,s.id,now())
  on conflict(student_id,wix_program_id) do update set
    course_id=excluded.course_id,
    approved_assignments=excluded.approved_assignments,
    total_assignments=excluded.total_assignments,
    progress=excluded.progress,
    average_score=excluded.average_score,
    next_wix_assignment_id=excluded.next_wix_assignment_id,
    next_assignment_title=excluded.next_assignment_title,
    completion_status=excluded.completion_status,
    aria_signal=excluded.aria_signal,
    last_submission_id=excluded.last_submission_id,
    updated_at=now();

  update public.wix_program_enrollments
  set progress=computed_progress,
      status=case when computed_progress>=100 then 'completed' else status end,
      completed_at=case when computed_progress>=100 then coalesce(completed_at,now()) else completed_at end,
      last_synced_at=now(),updated_at=now()
  where profile_id=s.student_id and wix_program_id=wa.wix_program_id;

  -- Keep the existing dashboard's enrollments source synchronized when a course mapping exists.
  if mapped_course is not null then
    select e.id into enrollment_id from public.enrollments e
    where e.student_id=s.student_id and e.course_id=mapped_course limit 1;
    if enrollment_id is not null then
      update public.enrollments
      set progress=greatest(coalesce(progress,0),computed_progress),
          status=case when computed_progress>=100 then 'completed' else status end
      where id=enrollment_id;
    end if;
  end if;

  -- Backfill an auditable ledger entry for the XP already awarded by A3.
  insert into public.student_xp_ledger(student_id,amount,reason,source_type,source_id)
  values(s.student_id,coalesce(s.xp_awarded,0),'Approved performance submission','submission',s.id)
  on conflict(student_id,source_type,source_id) do nothing;
  get diagnostics approved_count = row_count;
  xp_inserted := approved_count>0;

  -- Queue a progress update independently from the approval event; delivery remains retry-safe through A4.
  insert into public.integration_outbox(provider,event_type,dedupe_key,profile_id,submission_id,payload)
  values('wix','program_progress','program_progress:'||s.student_id::text||':'||wa.wix_program_id||':'||s.id::text,s.student_id,s.id,
    jsonb_build_object(
      'eventType','jpac_program_progress_updated',
      'eventId','jpac-progress-'||s.id::text,
      'programId',wa.wix_program_id,
      'assignmentId',wa.wix_assignment_id,
      'submissionId',s.id,
      'progress',computed_progress,
      'approvedAssignments',approved_count,
      'totalAssignments',assignment_count,
      'status',state_status,
      'nextAssignmentId',next_external,
      'updatedAt',now()
    ))
  on conflict(provider,dedupe_key) do nothing;

  return jsonb_build_object(
    'ok',true,
    'studentId',s.student_id,
    'programId',wa.wix_program_id,
    'courseId',mapped_course,
    'progress',computed_progress,
    'approvedAssignments',approved_count,
    'totalAssignments',assignment_count,
    'nextAssignmentId',next_external,
    'completionStatus',state_status,
    'ariaSignal',signal,
    'xpLedgerCreated',xp_inserted
  );
end;
$$;

grant execute on function public.jpac_refresh_student_learning_state(uuid) to authenticated;

create or replace function public.jpac_run_a5_after_approval()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.event_type='approval_completed' then
    perform public.jpac_refresh_student_learning_state(new.submission_id);
  end if;
  return new;
end;
$$;

drop trigger if exists run_a5_after_approval on public.submission_automation_events;
create trigger run_a5_after_approval
  after insert on public.submission_automation_events
  for each row execute function public.jpac_run_a5_after_approval();

create or replace view public.jpac_a5_status as
select
  (select count(*) from public.student_learning_state) as tracked_program_states,
  (select count(*) from public.student_learning_state where completion_status='complete') as completed_program_states,
  (select count(*) from public.student_learning_state where next_wix_assignment_id is not null) as students_with_next_step,
  (select count(*) from public.student_xp_ledger) as xp_ledger_entries,
  (select count(*) from public.wix_program_course_map) as mapped_wix_programs,
  (select max(updated_at) from public.student_learning_state) as last_progress_refresh;

grant select on public.jpac_a5_status to authenticated;
