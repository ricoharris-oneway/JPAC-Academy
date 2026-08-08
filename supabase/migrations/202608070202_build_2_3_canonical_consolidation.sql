-- Build 2.3 / High remediation: explicit Wix program mappings, LAB mapping
-- compatibility, and canonical-model declarations. No production rows are
-- deleted and legacy tables remain readable for backward compatibility.

-- C1 created tool_id; LC1.4 later expected lab_tool_id. Rename only when the
-- legacy column exists and the target does not, preserving the PK/FKs/data.
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lab_tool_courses' and column_name='tool_id'
  ) and not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lab_tool_courses' and column_name='lab_tool_id'
  ) then
    alter table public.lab_tool_courses rename column tool_id to lab_tool_id;
  end if;
end;
$$;

alter table public.lab_tool_courses add column if not exists recommended boolean not null default true;
alter table public.lab_tool_courses add column if not exists sort_order integer not null default 0;
alter table public.lab_tool_courses add column if not exists created_at timestamptz not null default now();

-- Rebuild learning state only when an explicit Wix Program mapping already
-- exists. This replaces the A5 implementation that inferred and inserted a
-- mapping from normalized display titles.
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

  if mapped_course is null then
    raise exception 'Explicit Wix Program mapping required for program %',wa.wix_program_id;
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

  insert into public.student_learning_state(
    student_id,wix_program_id,course_id,approved_assignments,total_assignments,
    progress,average_score,next_wix_assignment_id,next_assignment_title,
    completion_status,aria_signal,last_submission_id,updated_at
  ) values(
    s.student_id,wa.wix_program_id,mapped_course,approved_count,assignment_count,
    computed_progress,score_average,next_external,next_title,state_status,signal,s.id,now()
  )
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

  -- enrollments is retained as academic assignment metadata, never as a
  -- purchase authorization source.
  select e.id into enrollment_id from public.enrollments e
  where e.student_id=s.student_id and e.course_id=mapped_course limit 1;
  if enrollment_id is not null then
    update public.enrollments
    set progress=greatest(coalesce(progress,0),computed_progress),
        status=case when computed_progress>=100 then 'completed' else status end
    where id=enrollment_id;
  end if;

  -- XP was already awarded idempotently by the trusted A3 approval workflow in
  -- xp_ledger. Do not create a second official entry in student_xp_ledger.
  insert into public.integration_outbox(provider,event_type,dedupe_key,profile_id,submission_id,payload)
  values('wix','program_progress','program_progress:'||s.student_id::text||':'||wa.wix_program_id||':'||s.id::text,s.student_id,s.id,
    jsonb_build_object(
      'eventType','jpac_program_progress_updated','eventId','jpac-progress-'||s.id::text,
      'programId',wa.wix_program_id,'assignmentId',wa.wix_assignment_id,
      'submissionId',s.id,'progress',computed_progress,
      'approvedAssignments',approved_count,'totalAssignments',assignment_count,
      'status',state_status,'nextAssignmentId',next_external,'updatedAt',now()
    ))
  on conflict(provider,dedupe_key) do nothing;

  return jsonb_build_object(
    'ok',true,'studentId',s.student_id,'programId',wa.wix_program_id,
    'courseId',mapped_course,'progress',computed_progress,
    'approvedAssignments',approved_count,'totalAssignments',assignment_count,
    'nextAssignmentId',next_external,'completionStatus',state_status,
    'ariaSignal',signal,'xpLedgerCreated',false
  );
end;
$$;
revoke all on function public.jpac_refresh_student_learning_state(uuid) from public,anon,authenticated;
grant execute on function public.jpac_refresh_student_learning_state(uuid) to service_role;

-- Canonical ownership declarations preserve old data while stopping new code
-- from treating competing structures as co-equal sources of truth.
comment on table public.xp_ledger is 'Canonical append-only Academy XP ledger. profiles.total_xp is its cached total.';
comment on table public.student_xp_ledger is 'Legacy A5 compatibility history. Retained read-only by convention; no new production writes.';
comment on table public.badges is 'Canonical achievement definition table.';
comment on table public.student_badges is 'Canonical student achievement award table.';
comment on table public.achievement_definitions is 'Legacy credential-era achievement definitions retained for compatibility.';
comment on table public.student_achievements is 'Legacy credential-era achievement awards retained for compatibility.';
comment on table public.student_notifications is 'Canonical Academy notification event inbox.';
comment on table public.notifications is 'Legacy notification records retained for compatibility.';
comment on table public.portfolio_projects is 'Canonical student-created portfolio project records.';
comment on table public.media_assets is 'Canonical media/link evidence for portfolio projects.';
comment on table public.system_audit_events is 'Canonical general system audit ledger; domain integration/automation events remain domain history.';
comment on table public.enrollments is 'Academic course assignment metadata. Never a Wix purchase authorization source.';
comment on table public.student_learning_state is 'Canonical derived Wix Program learning aggregate; lesson_progress remains canonical lesson evidence.';

create index if not exists lab_tool_courses_course_idx on public.lab_tool_courses(course_id);
