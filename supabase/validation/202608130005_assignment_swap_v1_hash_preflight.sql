begin transaction read only;

with
rpcs as (
  select p.oid,p.proname,p.prosecdef,p.proconfig,p.proowner,pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.oid in(to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)'),to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)'))
),
acl as (
  select r.proname,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=0),false) public_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='anon')),false) anon_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='service_role')),false) service_role_execute,
    coalesce(bool_or(x.privilege_type='EXECUTE' and x.grantee=(select oid from pg_roles where rolname='authenticated')),false) authenticated_execute
  from rpcs r left join lateral aclexplode(coalesce((select proacl from pg_proc where oid=r.oid),acldefault('f',r.proowner))) x on true group by r.proname
),
hash_state as (
  select
    (select count(*) from rpcs where definition ~ E'(?<![a-z0-9_.])digest\\s*\\(') digest_rpc_count,
    (select count(*) from rpcs r cross join lateral regexp_matches(r.definition,E'(?<![a-z0-9_.])digest\\s*\\(','g')) digest_call_count,
    (select count(*) from rpcs where definition like '%pg_catalog.sha256%') sha_rpc_count
),
safe_defs as (select regexp_replace(lower(pg_get_functiondef(p.oid)),'[[:space:]]+','','g') definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')),
safe_draft as (select count(*)=2 and bool_and((select count(*) from regexp_matches(definition,E'm\\.status=''published''','g'))=2) and bool_and(definition not like '%m.status<>''archived''%') ok from safe_defs),
triggers as (select count(*) total,count(*) filter(where t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D') expected from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal),
target as (select m.* from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='piano' and l.level_number=1 and m.level_module_number=13),
target_state as (select count(*) module_count,coalesce(bool_and(sort_order=49 and title='Save Draft Test Module' and status='draft' and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438),false) exact,(select count(*) from public.lessons where module_id in(select id from target)) lessons,(select count(*) from public.activities where module_id in(select id from target)) activities from target),
student_state as (select (select count(*) from public.xp_ledger) xp_ledger,(select count(*) from public.enrollments) enrollments,(select count(*) from public.submissions) submissions,(select count(*) from public.certificates) certificates,(select count(*) from public.lesson_progress) lesson_progress),
reports(ord,report_section,code,result,details) as (
 select 10,'FOUNDATION','ASV1HASH-FOUNDATION',case when to_regclass('public.curriculum_assignment_swap_operations') is not null and (select count(*) from rpcs)=2 then 'PASS' else 'BLOCK' end,jsonb_build_object('audit_table',to_regclass('public.curriculum_assignment_swap_operations'),'rpc_count',(select count(*) from rpcs))::text
 union all select 20,'AUDIT_ROWS','ASV1HASH-AUDIT',case when count(*)=0 then 'PASS' else 'BLOCK' end,jsonb_build_object('row_count',count(*))::text from public.curriculum_assignment_swap_operations
 union all select 30,'CURRENT_HASH_IMPLEMENTATION','ASV1HASH-CURRENT',case when digest_rpc_count=2 and digest_call_count=3 and sha_rpc_count=0 then 'PASS' else 'BLOCK' end,to_jsonb(h)::text from hash_state h
 union all select 40,'CORE_SHA256','ASV1HASH-SHA256',case when to_regprocedure('pg_catalog.sha256(bytea)') is not null and length(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('assignment-swap-hash-probe','UTF8')),'hex'))=64 then 'PASS' else 'BLOCK' end,jsonb_build_object('function',to_regprocedure('pg_catalog.sha256(bytea)'),'probe',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('assignment-swap-hash-probe','UTF8')),'hex'))::text
 union all select 50,'RPC_SECURITY','ASV1HASH-SECURITY',case when (select count(*) from rpcs)=2 and (select bool_and(prosecdef and proconfig @> array['search_path=public'] and definition ~ E'public\\.is_admin\\s*\\(\\s*\\)') from rpcs) and (select bool_and(not public_execute and not anon_execute and not service_role_execute and authenticated_execute) from acl) then 'PASS' else 'BLOCK' end,(select jsonb_agg(to_jsonb(a) order by proname)::text from acl a)
 union all select 60,'SAFE_DRAFT_ISOLATION','ASV1HASH-DRAFT',case when ok then 'PASS' else 'BLOCK' end,jsonb_build_object('published_only',ok)::text from safe_draft
 union all select 70,'ACTIVITY_TRIGGER_BASELINE','ASV1HASH-TRIGGER',case when total=1 and expected=1 then 'PASS' else 'BLOCK' end,to_jsonb(t)::text from triggers t
 union all select 80,'PIANO_TEST_MODULE','ASV1HASH-PIANO',case when module_count=1 and exact and lessons=3 and activities=2 then 'PASS' else 'BLOCK' end,to_jsonb(t)::text from target_state t
 union all select 90,'STUDENT_STATE','ASV1HASH-STUDENT',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,to_jsonb(s)::text from student_state s
),
blockers as (select code,details from reports where result='BLOCK'),
final as (select * from reports union all select 900,'BLOCKERS','ASV1HASH-BLOCKERS',case when exists(select 1 from blockers) then 'BLOCK' else 'PASS' end,coalesce((select jsonb_agg(to_jsonb(b))::text from blockers b),'No blockers detected') union all select 999,'OVERALL','ASV1HASH-OVERALL',case when exists(select 1 from blockers) then 'BLOCK' else 'PASS' end,case when exists(select 1 from blockers) then 'BLOCK: DO NOT RUN HASH PATCH' else 'PASS: READY FOR ASSIGNMENT SWAP V1 HASH PATCH' end)
select report_section,code,result,details from final order by ord,code;

rollback;
