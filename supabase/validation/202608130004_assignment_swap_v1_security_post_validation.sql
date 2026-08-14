begin transaction read only;

with
rpc_catalog as (
  select p.oid, p.proname, p.prosecdef, p.proconfig, p.proowner, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid in (to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)'),to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)'))
),
rpc_acl as (
  select r.oid, r.proname,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=0),false) public_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='anon')),false) anon_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='authenticated')),false) authenticated_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='service_role')),false) service_role_execute
  from rpc_catalog r
  left join lateral aclexplode(coalesce((select proacl from pg_proc where oid=r.oid),acldefault('f',r.proowner))) x on true
  group by r.oid,r.proname
),
protected_names(name) as (values
 ('jpac_award_module_core_component'),('jpac_finalize_module_mastery'),('jpac_module_completion'),
 ('jpac_module_is_unlocked'),('jpac_sync_enrollment_progress'),('jpac_enforce_canonical_enrollment_progress'),
 ('jpac_submit_module_activity'),('jpac_review_module_submission'),('jpac_assess_module_submission'),
 ('jpac_review_submission'),('jpac_issue_completion_certificate')
),
rpc_scan as (
  select proname,regexp_replace(lower(definition),E'''(?:''''|[^''])*''','','g') executable_definition from rpc_catalog
),
workflow_calls as (
  select r.proname,n.name from rpc_scan r cross join protected_names n
  where r.executable_definition ~ (E'(^|[^a-z0-9_])(?:public\\.)?'||n.name||E'\\s*\\(')
),
safe_defs as (
  select regexp_replace(lower(pg_get_functiondef(p.oid)),'[[:space:]]+','','g') definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
),
safe_draft as (
  select count(*)=2 and bool_and((select count(*) from regexp_matches(definition,E'm\\.status=''published''','g'))=2)
    and bool_and(definition not like '%m.status<>''archived''%') ok from safe_defs
),
activity_triggers as (
  select count(*) total,count(*) filter(where t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D') expected
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
  where n.nspname='public' and c.relname='activities' and not t.tgisinternal
),
target_module as (
  select m.* from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id
  where c.slug='piano' and l.level_number=1 and m.level_module_number=13
),
target_state as (
  select count(*) module_count,
    coalesce(bool_and(m.sort_order=49 and m.title='Save Draft Test Module' and m.status='draft' and m.core_xp=625
      and m.intro_core_xp=50 and m.video_core_xp=100 and m.assignment_core_xp=350 and m.mastery_core_xp=125 and m.core_unlock_threshold=438),false) exact,
    (select count(*) from public.lessons where module_id in(select id from target_module)) lesson_count,
    (select count(*) from public.activities where module_id in(select id from target_module)) activity_count
  from target_module m
),
student_state as (
  select (select count(*) from public.xp_ledger) xp_ledger,(select count(*) from public.enrollments) enrollments,
    (select count(*) from public.submissions) submissions,(select count(*) from public.certificates) certificates,
    (select count(*) from public.lesson_progress) lesson_progress
),
audit_state as (select count(*) row_count from public.curriculum_assignment_swap_operations),
reports(ord,report_section,code,result,details) as (
  select 10,'FOUNDATION','ASV1HP-FOUNDATION',case when to_regclass('public.curriculum_assignment_swap_operations') is not null and (select count(*) from rpc_catalog)=2 then 'PASS' else 'BLOCK' end,
    jsonb_build_object('audit_table',to_regclass('public.curriculum_assignment_swap_operations'),'rpc_count',(select count(*) from rpc_catalog))::text
  union all select 20,'AUDIT_ROWS','ASV1HP-AUDIT',case when row_count=0 then 'PASS' else 'BLOCK' end,to_jsonb(a)::text from audit_state a
  union all select 30,'RPC_SECURITY','ASV1HP-SECURITY',
    case when (select count(*) from rpc_catalog)=2 and (select bool_and(prosecdef and proconfig @> array['search_path=public']) from rpc_catalog)
      and (select bool_and(not public_execute and not anon_execute and not service_role_execute and authenticated_execute) from rpc_acl) then 'PASS' else 'BLOCK' end,
    coalesce((select jsonb_agg(to_jsonb(a) order by proname)::text from rpc_acl a),'[]')
  union all select 40,'INTERNAL_ADMIN_GUARD','ASV1HP-ADMIN-GUARD',
    case when (select count(*) from rpc_catalog)=2 and (select bool_and(definition ~ E'public\\.is_admin\\s*\\(\\s*\\)') from rpc_catalog) then 'PASS' else 'BLOCK' end,
    'Both RPC definitions must call public.is_admin()'
  union all select 50,'PROTECTED_WORKFLOW_CALLS','ASV1HP-WORKFLOWS',case when not exists(select 1 from workflow_calls) then 'PASS' else 'BLOCK' end,
    coalesce((select jsonb_agg(to_jsonb(w))::text from workflow_calls w),'No executable protected workflow calls detected')
  union all select 60,'SAFE_DRAFT_ISOLATION','ASV1HP-DRAFT',case when ok then 'PASS' else 'BLOCK' end,jsonb_build_object('published_only',ok)::text from safe_draft
  union all select 70,'ACTIVITY_TRIGGER_BASELINE','ASV1HP-TRIGGER',case when total=1 and expected=1 then 'PASS' else 'BLOCK' end,to_jsonb(t)::text from activity_triggers t
  union all select 80,'PIANO_TEST_MODULE','ASV1HP-PIANO',case when module_count=1 and exact and lesson_count=3 and activity_count=2 then 'PASS' else 'BLOCK' end,to_jsonb(t)::text from target_state t
  union all select 90,'STUDENT_STATE','ASV1HP-STUDENT',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,to_jsonb(s)::text from student_state s
),
blockers as (select code,details from reports where result='BLOCK'),
final as (
 select * from reports
 union all select 900,'BLOCKERS','ASV1HP-BLOCKERS',case when exists(select 1 from blockers) then 'BLOCK' else 'PASS' end,coalesce((select jsonb_agg(to_jsonb(b))::text from blockers b),'No blockers detected')
 union all select 999,'OVERALL','ASV1HP-OVERALL',case when exists(select 1 from blockers) then 'BLOCK' else 'PASS' end,
   case when exists(select 1 from blockers) then 'BLOCK: REVIEW BEFORE RPC TESTING' else 'PASS: ASSIGNMENT SWAP V1 SECURITY HARDENING VALID' end
)
select report_section,code,result,details from final order by ord,code;

rollback;
