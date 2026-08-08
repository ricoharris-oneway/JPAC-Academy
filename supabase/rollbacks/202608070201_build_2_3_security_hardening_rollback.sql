-- Build 2.3 security rollback.
-- This rollback restores the prior assignment read shape if operationally
-- required, but intentionally does not restore unsafe PUBLIC/internal-worker
-- execution grants.

drop policy if exists "members read active wix assignments" on public.wix_assignments;
drop policy if exists "authenticated read active wix assignments" on public.wix_assignments;
create policy "authenticated read active wix assignments" on public.wix_assignments
for select to authenticated using(status='active');

drop policy if exists "students delete own performance media" on storage.objects;

-- Keep worker functions restricted to service_role. Restoring broad execution
-- requires a separately approved security exception and is not part of rollback.
revoke execute on function public.jpac_refresh_student_learning_state(uuid) from authenticated,anon,public;
revoke execute on function public.jpac_issue_completion_certificate(uuid) from authenticated,anon,public;
revoke execute on function public.claim_initial_owner() from authenticated,anon,public;
revoke execute on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) from authenticated,anon,public;
revoke execute on function public.jpac_claim_integration_outbox(integer) from authenticated,anon,public;
revoke execute on function public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text) from authenticated,anon,public;
grant execute on function public.jpac_refresh_student_learning_state(uuid) to service_role;
grant execute on function public.jpac_issue_completion_certificate(uuid) to service_role;
grant execute on function public.claim_initial_owner() to service_role;
grant execute on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) to service_role;
grant execute on function public.jpac_claim_integration_outbox(integer) to service_role;
grant execute on function public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text) to service_role;
