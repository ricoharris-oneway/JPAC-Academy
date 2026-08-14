begin transaction read only;

with operation as(
  select * from public.curriculum_assignment_swap_operations where id='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid
), snapshot as(
  select o.*,a.title current_title,a.passing_score,
    jsonb_build_object('title',a.title,'description',a.description,'instructions',a.instructions,'submission_type',a.submission_type,'passing_score',a.passing_score,'allows_resubmission',a.allows_resubmission,'rubric',a.rubric) raw_current,
    jsonb_build_object('title',a.title,'description',a.description,'instructions',a.instructions,'submission_type',a.submission_type,'passing_score',a.passing_score::integer,'allows_resubmission',a.allows_resubmission,'rubric',a.rubric) canonical_current
  from operation o join public.activities a on a.id=o.target_activity_id
), facts as(
  select
    (select count(*) from operation)=1 op_exists,
    coalesce((select operation_kind='swap' from operation),false) op_swap,
    (select count(*) from public.curriculum_assignment_swap_operations where rollback_of='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid)=0 no_rollback,
    (select count(*) from public.curriculum_assignment_swap_operations)=1 audit_one,
    coalesce((select current_title like '%Revised' from snapshot),false) title_revised,
    coalesce((select raw_current=after_payload from snapshot),false) logical_equal,
    coalesce((select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(canonical_current::text,'UTF8')),'hex')=after_hash from snapshot),false) canonical_hash_matches,
    coalesce((select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(after_payload::text,'UTF8')),'hex')=after_hash from snapshot),false) audit_hash_matches,
    coalesce((select raw_current->>'passing_score' from snapshot),'missing') raw_score,
    coalesce((select canonical_current->>'passing_score' from snapshot),'missing') canonical_score,
    coalesce((select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(raw_current::text,'UTF8')),'hex')<>after_hash from snapshot),false) raw_hash_differs,
    coalesce(strpos(regexp_replace(pg_get_functiondef('public.curriculum_rollback_assignment_swap_v1(uuid)'::regprocedure),'\s+','','g'),'''passing_score'',v_activity.passing_score,''allows_resubmission''')>0,false) old_behavior,
    not has_function_privilege('public','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and not has_function_privilege('anon','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and not has_function_privilege('service_role','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') and has_function_privilege('authenticated','public.curriculum_rollback_assignment_swap_v1(uuid)','EXECUTE') hardened,
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal and t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D')=1 trigger_ok,
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g') not like '%m.status<>''archived''%')=2 isolation_ok,
    exists(select 1 from public.course_modules m where m.id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid and m.status='draft' and m.level_module_number=13 and m.sort_order=49 and m.core_xp=625 and m.intro_core_xp=50 and m.video_core_xp=100 and m.assignment_core_xp=350 and m.mastery_core_xp=125 and m.core_unlock_threshold=438 and (select count(*) from public.lessons where module_id=m.id)=3 and (select count(*) from public.activities where module_id=m.id)=2) module_ok,
    not exists(select 1 from public.submissions where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.activity_progress where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.practice_logs where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.portfolio_projects where activity_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) and not exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid) and not exists(select 1 from public.xp_ledger where module_id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid or source_id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid) evidence_zero,
    (select count(*) from public.xp_ledger)=5 and (select count(*) from public.enrollments)=1 and (select count(*) from public.submissions)=1 and (select count(*) from public.certificates)=0 and (select count(*) from public.lesson_progress)=5 student_ok
), findings as(
  select * from facts cross join lateral(values
    (1,'OPERATION','ASV1R-OPERATION',op_exists and op_swap,concat('exists=',op_exists,'; operation_kind_swap=',op_swap)),
    (2,'ROLLBACK_STATE','ASV1R-ROLLBACK-STATE',no_rollback and audit_one,concat('no_rollback=',no_rollback,'; audit_count_one=',audit_one)),
    (3,'CANONICAL_DIAGNOSTIC','ASV1R-CANONICAL',logical_equal and canonical_hash_matches and audit_hash_matches,concat('raw_score=',raw_score,'; canonical_score=',canonical_score,'; logical_equal=',logical_equal,'; raw_hash_differs=',raw_hash_differs,'; canonical_hash_matches=',canonical_hash_matches)),
    (4,'CURRENT_RPC','ASV1R-OLD-BEHAVIOR',old_behavior,concat('old_noncanonical_snapshot=',old_behavior)),
    (5,'SECURITY','ASV1R-SECURITY',hardened,concat('hardened_grants=',hardened)),
    (6,'SAFE_DRAFT_ISOLATION','ASV1R-ISOLATION',isolation_ok,concat('published_only=',isolation_ok)),
    (7,'ACTIVITY_TRIGGER','ASV1R-TRIGGER',trigger_ok,concat('baseline_trigger=',trigger_ok)),
    (8,'PIANO_MODULE13','ASV1R-MODULE',module_ok,concat('structure_and_xp=',module_ok,'; revised_title=',title_revised)),
    (9,'EVIDENCE','ASV1R-EVIDENCE',evidence_zero,concat('target_dependencies_zero=',evidence_zero)),
    (10,'STUDENT_STATE','ASV1R-STUDENT',student_ok,concat('baseline_counts=',student_ok))
  )v(report_order,report_section,code,passed,details)
), final_rows as(
  select report_order,report_section,code,case when passed then 'PASS' else 'BLOCK' end result,details from findings
  union all select 99,'OVERALL','ASV1R-OVERALL',case when bool_and(passed) then 'PASS' else 'BLOCK' end,case when bool_and(passed) then 'PASS: READY FOR ASSIGNMENT SWAP V1 ROLLBACK PATCH' else 'BLOCK: DO NOT RUN ROLLBACK PATCH' end from findings
)
select report_section,code,result,details from final_rows order by report_order;

rollback;
