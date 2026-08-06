-- Block A7: production completion validation and readiness reporting.

create or replace view public.jpac_block_a_readiness as
with checks as (
  select 'identity_sync'::text as check_key,
         (to_regclass('public.wix_member_links') is not null) as installed,
         coalesce((select count(*) from public.wix_member_links),0)::bigint as record_count,
         'Wix members can be linked to JPAC profiles.'::text as description
  union all
  select 'access_entitlements',to_regclass('public.wix_access_entitlements') is not null,
         coalesce((select count(*) from public.wix_access_entitlements),0),
         'Wix subscription access can be synchronized.'
  union all
  select 'program_enrollments',to_regclass('public.wix_program_enrollments') is not null,
         coalesce((select count(*) from public.wix_program_enrollments),0),
         'Wix program enrollments and progress can be synchronized.'
  union all
  select 'assignment_bridge',to_regclass('public.wix_assignments') is not null,
         coalesce((select count(*) from public.wix_assignments),0),
         'Wix assignments can be linked to JPAC submissions.'
  union all
  select 'performance_storage',exists(select 1 from storage.buckets where id='performance-submissions'),
         coalesce((select count(*) from storage.objects where bucket_id='performance-submissions'),0),
         'Private performance media storage is available.'
  union all
  select 'submission_approval',to_regprocedure('public.jpac_review_submission(uuid,text,numeric,text)') is not null,
         coalesce((select count(*) from public.submission_automation_events where event_type='approval_completed'),0),
         'Teacher approval automation is installed.'
  union all
  select 'xp_progress_engine',to_regclass('public.student_learning_state') is not null and to_regclass('public.student_xp_ledger') is not null,
         coalesce((select count(*) from public.student_learning_state),0),
         'XP, progress, next assignment, and ARIA state are tracked.'
  union all
  select 'certificate_graduation',to_regclass('public.graduation_events') is not null and to_regprocedure('public.jpac_issue_completion_certificate(uuid)') is not null,
         coalesce((select count(*) from public.graduation_events where status='certificate_issued'),0),
         'Course completion can issue a verified certificate.'
  union all
  select 'notification_routing',to_regclass('public.notification_routes') is not null,
         coalesce((select count(*) from public.notification_routes where enabled),0),
         'Operational notification recipients are configurable.'
  union all
  select 'outbound_reliability',to_regclass('public.integration_outbox') is not null,
         coalesce((select count(*) from public.integration_outbox where delivery_status in ('pending','processing','retry')),0),
         'Outbound Wix updates are queued and retry-safe.'
)
select check_key,installed,record_count,description,
       case when installed then 'ready' else 'missing' end as status
from checks;

grant select on public.jpac_block_a_readiness to authenticated;

create or replace function public.jpac_validate_block_a()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  caller_role text;
  total_checks integer;
  ready_checks integer;
  missing_checks integer;
  failed_events integer:=0;
  pending_events integer:=0;
  result_checks jsonb;
begin
  select role into caller_role from public.profiles where id=auth.uid();
  if auth.uid() is not null and coalesce(caller_role,'student') not in ('admin','developer') then
    raise exception 'Admin or Developer access required';
  end if;

  select count(*),count(*) filter(where installed),count(*) filter(where not installed),jsonb_agg(to_jsonb(r) order by check_key)
  into total_checks,ready_checks,missing_checks,result_checks
  from public.jpac_block_a_readiness r;

  if to_regclass('public.integration_events') is not null then
    select count(*) into failed_events from public.integration_events where processing_status='error';
  end if;
  if to_regclass('public.integration_outbox') is not null then
    select count(*) into pending_events from public.integration_outbox where delivery_status in ('pending','processing','retry','failed');
  end if;

  return jsonb_build_object(
    'ok',missing_checks=0,
    'status',case when missing_checks=0 then 'ready_for_end_to_end_test' else 'database_setup_incomplete' end,
    'totalChecks',total_checks,
    'readyChecks',ready_checks,
    'missingChecks',missing_checks,
    'inboundErrors',failed_events,
    'outboundUnresolved',pending_events,
    'checks',coalesce(result_checks,'[]'::jsonb),
    'generatedAt',now()
  );
end;
$$;

grant execute on function public.jpac_validate_block_a() to authenticated;
