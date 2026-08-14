begin transaction read only;

with definition as(
  select pg_get_functiondef('public.curriculum_rollback_assignment_swap_v1(uuid)'::regprocedure) body
), facts as(
  select
    to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)') is not null rpc_exists,
    (select strpos(body,'''passing_score'',v_activity.passing_score::integer')>0 from definition) canonical_score,
    (select strpos(body,'v_audit_hash:=pg_catalog.encode(pg_catalog.sha256')>0 and strpos(body,'v_current_hash:=pg_catalog.encode(pg_catalog.sha256')>0 from definition) hashes_present,
    (select strpos(body,'v_audit_hash<>v_op.after_hash')>0 and strpos(body,'v_current is distinct from v_op.after_payload')>0 and strpos(body,'v_current_hash<>v_op.after_hash')>0 from definition) triple_guard,
    (select strpos(body,'if not public.is_admin()')>0 from definition) admin_guard,
    (select p.prosecdef and p.proconfig @> array['search_path=public'] from pg_proc p where p.oid='public.curriculum_rollback_assignment_swap_v1(uuid)'::regprocedure) security_ok,
    not has_function_privilege('public','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and not has_function_privilege('anon','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and not has_function_privilege('service_role','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and has_function_privilege('authenticated','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') hardened,
    (select count(*) from public.curriculum_assignment_swap_operations)=1 audit_one,
    (select count(*) from public.curriculum_assignment_swap_operations where rollback_of='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid)=0 no_rollback,
    exists(select 1 from public.activities where id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid and title like '%Revised' and status='draft') activity_ok,
    exists(select 1 from public.course_modules m where m.id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid and m.status='draft' and m.level_module_number=13 and m.sort_order=49 and m.core_xp=625 and m.intro_core_xp=50 and m.video_core_xp=100 and m.assignment_core_xp=350 and m.mastery_core_xp=125 and m.core_unlock_threshold=438 and (select count(*) from public.lessons where module_id=m.id)=3 and (select count(*) from public.activities where module_id=m.id)=2) module_ok,
    not exists(select 1 from public.submissions where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.activity_progress where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.practice_logs where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.portfolio_projects where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid) and not exists(select 1 from public.xp_ledger where module_id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid or source_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) evidence_zero,
    (select count(*) from public.xp_ledger)=5 and (select count(*) from public.enrollments)=1 and (select count(*) from public.submissions)=1 and (select count(*) from public.certificates)=0 and (select count(*) from public.lesson_progress)=5 student_ok,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal and t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D')=1 trigger_ok,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g') not like '%m.status<>''archived''%')=2 isolation_ok
), findings as(
 select * from facts cross join lateral(values
  (1,'RPC_DEFINITION','ASV1R-P-RPC',rpc_exists and canonical_score and hashes_present and triple_guard,concat('exists=',rpc_exists,'; canonical_score=',canonical_score,'; hashes=',hashes_present,'; triple_guard=',triple_guard)),
  (2,'RPC_SECURITY','ASV1R-P-SECURITY',admin_guard and security_ok and hardened,concat('admin_guard=',admin_guard,'; security_definer_search_path=',security_ok,'; hardened_grants=',hardened)),
  (3,'AUDIT_STATE','ASV1R-P-AUDIT',audit_one and no_rollback,concat('audit_count_one=',audit_one,'; rollback_count_zero=',no_rollback)),
  (4,'PIANO_ACTIVITY','ASV1R-P-ACTIVITY',activity_ok,concat('revised_draft_activity=',activity_ok)),
  (5,'PIANO_MODULE13','ASV1R-P-MODULE',module_ok,concat('structure_and_xp=',module_ok)),
  (6,'EVIDENCE','ASV1R-P-EVIDENCE',evidence_zero,concat('target_dependencies_zero=',evidence_zero)),
  (7,'STUDENT_STATE','ASV1R-P-STUDENT',student_ok,concat('baseline_counts=',student_ok)),
  (8,'SAFE_DRAFT_ISOLATION','ASV1R-P-ISOLATION',isolation_ok,concat('published_only=',isolation_ok)),
  (9,'ACTIVITY_TRIGGER','ASV1R-P-TRIGGER',trigger_ok,concat('baseline_trigger=',trigger_ok))
 )v(report_order,report_section,code,passed,details)
), final_rows as(
 select report_order,report_section,code,case when passed then 'PASS' else 'BLOCK' end result,details from findings
 union all select 99,'OVERALL','ASV1R-P-OVERALL',case when bool_and(passed) then 'PASS' else 'BLOCK' end,case when bool_and(passed) then 'PASS: ASSIGNMENT SWAP V1 ROLLBACK PATCH VALID' else 'BLOCK: REVIEW BEFORE RETRYING ROLLBACK' end from findings
)
select report_section,code,result,details from final_rows order by report_order;

rollback;
