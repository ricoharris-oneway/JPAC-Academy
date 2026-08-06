-- Block A5 guard: ensure queued Wix progress payloads always use the persisted learning-state counts.
-- This keeps outbound data authoritative even if a prior function-local row-count diagnostic changes a variable.

create or replace function public.jpac_normalize_program_progress_payload()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  state_row public.student_learning_state%rowtype;
  program_external text;
begin
  if new.provider<>'wix' or new.event_type<>'program_progress' then return new; end if;
  program_external:=new.payload->>'programId';
  if program_external is null or new.profile_id is null then return new; end if;

  select * into state_row
  from public.student_learning_state
  where student_id=new.profile_id and wix_program_id=program_external;

  if state_row.id is not null then
    new.payload:=new.payload||jsonb_build_object(
      'progress',state_row.progress,
      'approvedAssignments',state_row.approved_assignments,
      'totalAssignments',state_row.total_assignments,
      'status',state_row.completion_status,
      'nextAssignmentId',state_row.next_wix_assignment_id,
      'ariaSignal',state_row.aria_signal
    );
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_program_progress_payload on public.integration_outbox;
create trigger normalize_program_progress_payload
  before insert or update of payload on public.integration_outbox
  for each row execute function public.jpac_normalize_program_progress_payload();
