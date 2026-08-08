-- EXPECT every boolean in this first result to match its column name.
select
  not has_function_privilege('anon','public.jpac_refresh_student_learning_state(uuid)','EXECUTE') as anon_cannot_refresh_progress,
  not has_function_privilege('authenticated','public.jpac_refresh_student_learning_state(uuid)','EXECUTE') as users_cannot_refresh_progress,
  not has_function_privilege('authenticated','public.jpac_issue_completion_certificate(uuid)','EXECUTE') as users_cannot_issue_certificates,
  not has_function_privilege('authenticated','public.claim_initial_owner()','EXECUTE') as users_cannot_claim_owner,
  not has_function_privilege('authenticated','public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text)','EXECUTE') as users_cannot_issue_manual_certificates,
  not has_function_privilege('authenticated','public.jpac_claim_integration_outbox(integer)','EXECUTE') as users_cannot_claim_outbox,
  not has_function_privilege('authenticated','public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text)','EXECUTE') as users_cannot_complete_outbox,
  has_function_privilege('service_role','public.jpac_claim_integration_outbox(integer)','EXECUTE') as worker_can_claim_outbox,
  has_function_privilege('service_role','public.claim_initial_owner()','EXECUTE') as controlled_owner_bootstrap_available,
  has_function_privilege('authenticated','public.is_staff()','EXECUTE') as rls_staff_helper_available,
  has_function_privilege('authenticated','public.is_academy_staff()','EXECUTE') as rls_academy_staff_helper_available;

-- EXPECT exactly the membership policy, with Wix enrollment and staff checks.
select policyname,roles,cmd,qual
from pg_policies
where schemaname='public' and tablename='wix_assignments';

-- EXPECT own-folder delete plus the existing upload/read/update policies.
select policyname,roles,cmd,qual,with_check
from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname like '%performance media%'
order by cmd,policyname;

-- Auth-context negative test template. Replace UUIDs/IDs and expect an error.
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claim.sub','STUDENT_UUID',true);
-- select public.jpac_create_wix_submission(
--   'ASSIGNMENT_FROM_ANOTHER_PROGRAM','STUDENT_UUID','test.mp4','video/mp4','STUDENT_UUID/test.mp4'
-- );
-- rollback;
