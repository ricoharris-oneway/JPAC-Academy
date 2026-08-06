-- Block A8: operations monitoring, audit visibility, recovery actions, and launch readiness.

create table if not exists public.system_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  result text not null default 'success' check(result in ('success','warning','error')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_audit_events_created_idx on public.system_audit_events(created_at desc);
create index if not exists system_audit_events_entity_idx on public.system_audit_events(entity_type,entity_id,created_at desc);

alter table public.system_audit_events enable row level security;
drop policy if exists "staff read system audit events" on public.system_audit_events;
create policy "staff read system audit events" on public.system_audit_events
  for select to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  );

create or replace function public.jpac_retry_failed_outbox(target_event uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor_role text;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role not in ('admin','developer') then raise exception 'Admin or Developer access required'; end if;

  update public.integration_outbox
  set delivery_status='retry',next_attempt_at=now(),last_error=null,updated_at=now()
  where id=target_event and delivery_status in ('failed','retry');

  insert into public.system_audit_events(actor_id,action,entity_type,entity_id,detail)
  values(auth.uid(),'retry_integration_event','integration_outbox',target_event::text,jsonb_build_object('requestedAt',now()));

  return jsonb_build_object('ok',true,'eventId',target_event);
end;
$$;
grant execute on function public.jpac_retry_failed_outbox(uuid) to authenticated;

create or replace function public.jpac_rebuild_student_progress(target_student uuid,target_program text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor_role text; latest_submission uuid; result jsonb;
begin
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role not in ('admin','developer') then raise exception 'Admin or Developer access required'; end if;

  select s.id into latest_submission
  from public.submissions s
  join public.wix_assignments wa on wa.id=s.wix_assignment_id
  where s.student_id=target_student and wa.wix_program_id=target_program and s.status='approved'
  order by s.reviewed_at desc nulls last,s.submitted_at desc limit 1;

  if latest_submission is null then raise exception 'No approved Wix submission found for this student and program'; end if;
  result:=public.jpac_refresh_student_learning_state(latest_submission);

  insert into public.system_audit_events(actor_id,action,entity_type,entity_id,detail)
  values(auth.uid(),'rebuild_student_progress','student',target_student::text,jsonb_build_object('programId',target_program,'submissionId',latest_submission,'result',result));

  return result;
end;
$$;
grant execute on function public.jpac_rebuild_student_progress(uuid,text) to authenticated;

create or replace view public.jpac_operations_monitor as
select
  (select count(*) from public.integration_events where processing_status='error') as inbound_errors,
  (select count(*) from public.integration_outbox where delivery_status in ('pending','processing','retry')) as outbound_waiting,
  (select count(*) from public.integration_outbox where delivery_status='failed') as outbound_failed,
  (select count(*) from public.submissions where status in ('submitted','under_review','revision_requested')) as review_queue,
  (select count(*) from public.certificate_email_queue where delivery_status in ('pending','processing','retry')) as notification_waiting,
  (select count(*) from public.certificate_email_queue where delivery_status='failed') as notification_failed,
  (select count(*) from public.graduation_events where status='error') as graduation_errors,
  (select max(processed_at) from public.integration_events where processing_status='processed') as last_inbound_sync,
  (select max(delivered_at) from public.integration_outbox where delivery_status='delivered') as last_outbound_delivery,
  (select max(created_at) from public.system_audit_events) as last_audit_event;

grant select on public.jpac_operations_monitor to authenticated;

create or replace view public.jpac_launch_readiness as
select * from (
  values
    ('database_migrations','Block A readiness view exists',to_regclass('public.jpac_block_a_readiness') is not null),
    ('identity_sync','Wix member links table exists',to_regclass('public.wix_member_links') is not null),
    ('assignment_bridge','Wix assignments table exists',to_regclass('public.wix_assignments') is not null),
    ('media_storage','Performance submissions bucket exists',exists(select 1 from storage.buckets where id='performance-submissions')),
    ('approval_automation','Approval automation function exists',to_regprocedure('public.jpac_review_submission(uuid,text,numeric,text)') is not null),
    ('progress_engine','Learning state table exists',to_regclass('public.student_learning_state') is not null),
    ('certificate_engine','Graduation events table exists',to_regclass('public.graduation_events') is not null),
    ('notification_routing','Notification routing exists',to_regclass('public.notification_routes') is not null),
    ('outbound_reliability','Integration outbox exists',to_regclass('public.integration_outbox') is not null),
    ('operations_monitoring','Operations monitor exists',to_regclass('public.jpac_operations_monitor') is not null)
) as checks(check_key,check_label,passed);

grant select on public.jpac_launch_readiness to authenticated;
