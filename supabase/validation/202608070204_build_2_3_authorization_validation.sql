-- Build 2.3 final authorization validation.
-- Run after 202608070201 through 202608070204.

-- Complete function/role matrix. PUBLIC must be false for every public-schema
-- function. Review every true value for anon/authenticated/service_role.
select
  p.oid::regprocedure::text as function_signature,
  exists(
    select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
    where acl.grantee=0 and acl.privilege_type='EXECUTE'
  ) as public_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.oid::regprocedure::text;

-- Must return zero rows: no function may retain ambient PUBLIC execution.
select p.oid::regprocedure::text as unexpected_public_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and exists(
    select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
    where acl.grantee=0 and acl.privilege_type='EXECUTE'
  );

-- Exact authenticated surface after Build 2.3. Any row outside this list is
-- an unexpected grant and fails the release review.
with expected(signature) as (values
  ('admin_award_xp(uuid,integer,text)'),
  ('admin_enroll_student(uuid,uuid,uuid)'),
  ('admin_save_notification_route(text,text[],boolean)'),
  ('admin_set_user_role(uuid,app_role)'),
  ('admissions_update_stage(uuid,text)'),
  ('curriculum_add_activity(uuid,uuid,uuid,text,text,integer,text)'),
  ('curriculum_add_lesson(uuid,text,text,integer,text)'),
  ('curriculum_add_module(uuid,text,text,integer)'),
  ('curriculum_create_course(text,text,text,integer,text)'),
  ('developer_toggle_feature(text,boolean)'),
  ('enrollment_manager_add_guardian(uuid,text,text,text,text,boolean)'),
  ('enrollment_manager_create(uuid,uuid,uuid,text,date,date,text,text)'),
  ('enrollment_manager_update_status(uuid,text)'),
  ('is_admin()'),('is_staff()'),('is_academy_admin()'),('is_academy_staff()'),('current_app_role()'),
  ('jpac_create_wix_submission(text,uuid,text,text,text)'),
  ('jpac_has_active_wix_access(uuid)'),
  ('jpac_my_entitled_courses()'),
  ('jpac_rebuild_student_progress(uuid,text)'),
  ('jpac_retry_failed_outbox(uuid)'),
  ('jpac_review_submission(uuid,text,numeric,text)'),
  ('jpac_student_has_course_access(uuid)'),
  ('jpac_validate_block_a()'),
  ('lab_manager_save_tool(uuid,text,text,text,text,text,text,text,integer,text,text,integer,boolean,text,uuid[])'),
  ('manual_student_create(text,text,text,text,date,text,text,uuid,uuid,text,date,date,text,text,text,text,text)'),
  ('refresh_student_digital_twin(uuid,text)'),
  ('teacher_review_submission(uuid,text,numeric,text)'),
  ('verify_credential(text)')
), expected_oids as (
  select to_regprocedure('public.'||signature) as oid from expected
)
select p.oid::regprocedure::text as unexpected_authenticated_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
left join expected_oids e on e.oid=p.oid
where n.nspname='public'
  and has_function_privilege('authenticated',p.oid,'EXECUTE')
  and e.oid is null
order by 1;

-- Every result must be true. These are the highest-impact negative grants.
select
  not has_function_privilege('authenticated','public.claim_initial_owner()','EXECUTE') as users_cannot_claim_owner,
  not has_function_privilege('authenticated','public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text)','EXECUTE') as users_cannot_issue_manual_certificate,
  not has_function_privilege('authenticated','public.jpac_issue_completion_certificate(uuid)','EXECUTE') as users_cannot_issue_automatic_certificate,
  not has_function_privilege('authenticated','public.jpac_refresh_student_learning_state(uuid)','EXECUTE') as users_cannot_refresh_official_progress,
  not has_function_privilege('authenticated','public.jpac_claim_integration_outbox(integer)','EXECUTE') as users_cannot_claim_outbox,
  not has_function_privilege('authenticated','public.jpac_complete_integration_delivery(uuid,boolean,integer,text,text)','EXECUTE') as users_cannot_complete_outbox,
  not has_function_privilege('authenticated','public.jpac_claim_certificate_email_queue(integer)','EXECUTE') as users_cannot_claim_email_queue,
  not has_function_privilege('authenticated','public.jpac_complete_certificate_email_delivery(uuid,boolean,text)','EXECUTE') as users_cannot_complete_email_queue;

-- Every result must be true. Trusted operations remain available.
select
  has_function_privilege('service_role','public.claim_initial_owner()','EXECUTE') as service_can_bootstrap_owner,
  has_function_privilege('service_role','public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text)','EXECUTE') as service_can_run_legacy_certificate_operation,
  has_function_privilege('service_role','public.jpac_issue_completion_certificate(uuid)','EXECUTE') as service_can_issue_completion_certificate,
  has_function_privilege('service_role','public.jpac_refresh_student_learning_state(uuid)','EXECUTE') as service_can_refresh_learning_state,
  has_function_privilege('service_role','public.jpac_claim_integration_outbox(integer)','EXECUTE') as service_can_claim_outbox,
  has_function_privilege('service_role','public.jpac_claim_certificate_email_queue(integer)','EXECUTE') as service_can_claim_email_queue;

-- Credential verification must be read-only and callable through exactly one
-- canonical text signature. UUID-shaped legacy values are passed as text.
select
  p.oid::regprocedure::text as signature,
  pg_get_function_result(p.oid) as result_shape,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  p.provolatile,
  p.prosecdef
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='verify_credential'
order by 1;

-- Token strength/type and uniqueness. Expect text, a cryptographically random
-- 24-byte hex default, a unique index, and no duplicate non-null token groups.
select data_type,udt_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='certificates' and column_name='verification_token';

select indexname,indexdef
from pg_indexes
where schemaname='public' and tablename='certificates' and indexdef ilike '%verification_token%';

select verification_token,count(*)
from public.certificates
where verification_token is not null
group by verification_token
having count(*)>1;
