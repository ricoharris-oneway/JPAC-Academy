-- Build 2.3 / Critical remediation: least-privilege functions, assignment
-- membership enforcement, and recoverable Storage cleanup.

-- PostgreSQL grants function execution to PUBLIC by default. Remove that
-- ambient privilege across the application schema; existing explicit grants
-- to authenticated/anon remain in place.
revoke execute on all functions in schema public from public;

-- RLS helper functions must remain callable by signed-in sessions because
-- policy expressions execute with the querying role.
grant execute on function public.current_app_role() to authenticated,service_role;
grant execute on function public.is_staff() to authenticated,service_role;
grant execute on function public.is_admin() to authenticated,service_role;
grant execute on function public.is_academy_staff() to authenticated,service_role;
grant execute on function public.is_academy_admin() to authenticated,service_role;
grant execute on function public.verify_credential(text) to anon,authenticated,service_role;
grant execute on function public.jpac_validate_block_a() to authenticated,service_role;

-- Official-record and delivery workers are internal. Trigger functions remain
-- executable by their owners; service-role API workers receive explicit access.
revoke execute on function public.jpac_refresh_student_learning_state(uuid) from authenticated,anon;
revoke execute on function public.jpac_issue_completion_certificate(uuid) from authenticated,anon;
revoke execute on function public.claim_initial_owner() from authenticated,anon;
revoke execute on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) from authenticated,anon;
revoke execute on function public.jpac_claim_integration_outbox(integer) from authenticated,anon;
revoke execute on function public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text) from authenticated,anon;
grant execute on function public.jpac_refresh_student_learning_state(uuid) to service_role;
grant execute on function public.jpac_issue_completion_certificate(uuid) to service_role;
grant execute on function public.claim_initial_owner() to service_role;
grant execute on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) to service_role;
grant execute on function public.jpac_claim_integration_outbox(integer) to service_role;
grant execute on function public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text) to service_role;

-- Preserve the legacy helper signature without permitting a student to probe
-- another profile. Staff may inspect a target; students can inspect only self.
create or replace function public.jpac_has_active_wix_access(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when target_profile<>auth.uid() and not public.is_staff() then false
    else exists(
      select 1
      from public.wix_access_entitlements e
      join public.wix_entitlement_status_rules r
        on r.status=lower(trim(e.status)) and r.grants_access
      where e.profile_id=target_profile
        and (e.starts_at is null or e.starts_at<=now())
        and (e.ends_at is null or e.ends_at>now())
    )
  end;
$$;
revoke all on function public.jpac_has_active_wix_access(uuid) from public,anon;
grant execute on function public.jpac_has_active_wix_access(uuid) to authenticated,service_role;

-- Assignment metadata is visible only to staff or a student enrolled in that
-- exact Wix Program. This replaces the all-authenticated active-row policy.
drop policy if exists "authenticated read active wix assignments" on public.wix_assignments;
drop policy if exists "members read active wix assignments" on public.wix_assignments;
create policy "members read active wix assignments" on public.wix_assignments
for select to authenticated
using(
  status='active' and (
    public.is_staff()
    or exists(
      select 1 from public.wix_program_enrollments e
      where e.profile_id=auth.uid()
        and e.wix_program_id=wix_assignments.wix_program_id
        and lower(trim(e.status)) in ('active','enrolled','in_progress','completed')
    )
  )
);

-- Replace the final A2 overload with the same interface plus exact Wix Program
-- membership enforcement for student callers.
create or replace function public.jpac_create_wix_submission(
  assignment_external_id text,
  target_student uuid,
  file_name text,
  file_type text,
  file_url text
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  assignment_record public.wix_assignments%rowtype;
  submission_id uuid;
  caller_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select role into caller_role from public.profiles where id=auth.uid();
  if target_student<>auth.uid() and coalesce(caller_role,'student') not in ('teacher','admin','developer') then
    raise exception 'Not authorized for target student';
  end if;

  select * into assignment_record
  from public.wix_assignments
  where wix_assignment_id=assignment_external_id and status='active';
  if assignment_record.id is null then raise exception 'Wix assignment not found or inactive'; end if;

  if coalesce(caller_role,'student')='student' and not exists(
    select 1 from public.wix_program_enrollments e
    where e.profile_id=target_student
      and e.wix_program_id=assignment_record.wix_program_id
      and lower(trim(e.status)) in ('active','enrolled','in_progress','completed')
  ) then
    raise exception 'Student is not enrolled in this Wix Program';
  end if;

  if coalesce(caller_role,'student')='student'
     and file_url not like target_student::text || '/%' then
    raise exception 'Submission media must belong to the authenticated student';
  end if;

  insert into public.submissions(
    student_id,status,submitted_at,wix_assignment_id,
    media_name,media_type,media_url,source
  ) values(
    target_student,'submitted',now(),assignment_record.id,
    file_name,file_type,file_url,'wix'
  ) returning id into submission_id;
  return submission_id;
end;
$$;
revoke all on function public.jpac_create_wix_submission(text,uuid,text,text,text) from public,anon;
grant execute on function public.jpac_create_wix_submission(text,uuid,text,text,text) to authenticated,service_role;

-- The client removes an uploaded object when submission creation fails. The
-- previous policies allowed insert/read/update but made that cleanup impossible.
drop policy if exists "students delete own performance media" on storage.objects;
create policy "students delete own performance media" on storage.objects
for delete to authenticated
using(bucket_id='performance-submissions' and (storage.foldername(name))[1]=auth.uid()::text);

comment on function public.jpac_refresh_student_learning_state(uuid) is
  'Internal official-record worker. Not callable by authenticated clients.';
comment on function public.jpac_issue_completion_certificate(uuid) is
  'Internal certificate worker. Invoked by trusted completion workflows only.';
comment on function public.claim_initial_owner() is
  'Controlled owner bootstrap. Not callable by authenticated clients.';
comment on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) is
  'Legacy controlled certificate operation. Not callable by authenticated clients.';
