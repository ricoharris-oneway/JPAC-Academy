-- Block A4: completion reliability, outbound Wix progress queue, retry state, and verification.

create table if not exists public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'wix',
  event_type text not null,
  dedupe_key text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check(delivery_status in ('pending','processing','delivered','retry','failed')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 8,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  response_code integer,
  response_body text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,dedupe_key)
);

create index if not exists integration_outbox_ready_idx
  on public.integration_outbox(provider,delivery_status,next_attempt_at)
  where delivery_status in ('pending','retry');

alter table public.integration_outbox enable row level security;

-- Only Admin and Developer accounts can inspect integration delivery state in authenticated clients.
drop policy if exists "staff read integration outbox" on public.integration_outbox;
create policy "staff read integration outbox" on public.integration_outbox
  for select to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  );

create or replace function public.jpac_queue_wix_completion()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  submission_row public.submissions%rowtype;
  assignment_external text;
  program_external text;
  member_external text;
  event_payload jsonb;
begin
  if new.event_type <> 'approval_completed' then return new; end if;

  select * into submission_row from public.submissions where id=new.submission_id;
  if submission_row.id is null or submission_row.wix_assignment_id is null then return new; end if;

  select wa.wix_assignment_id,wa.wix_program_id
    into assignment_external,program_external
  from public.wix_assignments wa
  where wa.id=submission_row.wix_assignment_id;

  select wml.wix_member_id into member_external
  from public.wix_member_links wml
  where wml.profile_id=submission_row.student_id;

  if assignment_external is null or program_external is null or member_external is null then
    return new;
  end if;

  event_payload=jsonb_build_object(
    'eventType','jpac_assignment_approved',
    'eventId','jpac-completion-'||submission_row.id::text,
    'memberId',member_external,
    'programId',program_external,
    'assignmentId',assignment_external,
    'submissionId',submission_row.id,
    'status','approved',
    'score',submission_row.score,
    'feedback',submission_row.teacher_feedback,
    'xpAwarded',submission_row.xp_awarded,
    'approvedAt',coalesce(submission_row.reviewed_at,now())
  );

  insert into public.integration_outbox(provider,event_type,dedupe_key,profile_id,submission_id,payload)
  values('wix','assignment_completion','assignment_completion:'||submission_row.id::text,submission_row.student_id,submission_row.id,event_payload)
  on conflict(provider,dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists queue_wix_completion_after_approval on public.submission_automation_events;
create trigger queue_wix_completion_after_approval
  after insert on public.submission_automation_events
  for each row execute function public.jpac_queue_wix_completion();

create or replace function public.jpac_claim_integration_outbox(batch_size integer default 20)
returns setof public.integration_outbox
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select id
    from public.integration_outbox
    where provider='wix'
      and delivery_status in ('pending','retry')
      and next_attempt_at<=now()
      and attempt_count<max_attempts
    order by created_at
    limit greatest(1,least(batch_size,100))
    for update skip locked
  )
  update public.integration_outbox o
  set delivery_status='processing',
      attempt_count=o.attempt_count+1,
      last_attempt_at=now(),
      updated_at=now()
  from candidates c
  where o.id=c.id
  returning o.*;
end;
$$;

create or replace function public.jpac_complete_integration_delivery(
  target_id uuid,
  delivered boolean,
  http_status integer default null,
  response_text text default null,
  error_text text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  row_data public.integration_outbox%rowtype;
  delay_minutes integer;
begin
  select * into row_data from public.integration_outbox where id=target_id for update;
  if row_data.id is null then raise exception 'Outbox record not found'; end if;

  if delivered then
    update public.integration_outbox
    set delivery_status='delivered',delivered_at=now(),response_code=http_status,response_body=left(response_text,4000),last_error=null,updated_at=now()
    where id=target_id;
  else
    delay_minutes := least(1440,greatest(1,power(2,greatest(0,row_data.attempt_count-1))::integer));
    update public.integration_outbox
    set delivery_status=case when attempt_count>=max_attempts then 'failed' else 'retry' end,
        next_attempt_at=now()+make_interval(mins=>delay_minutes),
        response_code=http_status,
        response_body=left(response_text,4000),
        last_error=left(coalesce(error_text,'Delivery failed'),2000),
        updated_at=now()
    where id=target_id;
  end if;
end;
$$;

create or replace view public.jpac_block_a_status as
select
  (select count(*) from public.wix_member_links where sync_status='active') as linked_members,
  (select count(*) from public.wix_program_enrollments where status='active') as active_program_enrollments,
  (select count(*) from public.wix_assignments where status='active') as active_assignments,
  (select count(*) from public.submissions where source='wix_bridge') as bridged_submissions,
  (select count(*) from public.submissions where source='wix_bridge' and status='approved') as approved_bridged_submissions,
  (select count(*) from public.integration_outbox where delivery_status in ('pending','processing','retry')) as pending_outbound_events,
  (select count(*) from public.integration_outbox where delivery_status='failed') as failed_outbound_events,
  (select max(delivered_at) from public.integration_outbox where delivery_status='delivered') as last_successful_wix_delivery;

grant select on public.jpac_block_a_status to authenticated;
