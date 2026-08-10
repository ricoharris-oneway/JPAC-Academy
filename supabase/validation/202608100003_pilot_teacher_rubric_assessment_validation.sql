begin transaction read only;

select
  'schema' as report,
  exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='submissions'
      and column_name='rubric_assessment'
      and data_type='jsonb'
      and is_nullable='YES'
  ) as nullable_jsonb_column_exists,
  exists(
    select 1 from pg_constraint
    where conrelid='public.submissions'::regclass
      and conname='submissions_rubric_assessment_object_check'
      and pg_get_constraintdef(oid) ilike '%jsonb_typeof%object%'
  ) as object_constraint_exists,
  to_regprocedure('public.jpac_assess_module_submission(uuid,jsonb,text)') is not null as assessment_rpc_exists,
  exists(
    select 1 from pg_trigger
    where tgrelid='public.submissions'::regclass
      and tgname='submissions_protect_rubric_assessment_history'
      and not tgisinternal
  ) as immutable_history_trigger_exists;

select
  'privileges' as report,
  has_function_privilege('anon','public.jpac_assess_module_submission(uuid,jsonb,text)','EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated','public.jpac_assess_module_submission(uuid,jsonb,text)','EXECUTE') as authenticated_rpc_exposed,
  pg_get_functiondef('public.jpac_assess_module_submission(uuid,jsonb,text)'::regprocedure) like '%if not public.is_staff()%' as staff_guard_present,
  pg_get_functiondef('public.jpac_assess_module_submission(uuid,jsonb,text)'::regprocedure) like '%public.jpac_review_module_submission%' as established_review_chain_used,
  not has_function_privilege('authenticated','public.jpac_protect_rubric_assessment_history()','EXECUTE') as protection_trigger_not_client_callable;

select
  'preservation_counts' as report,
  count(*) as submission_rows,
  count(*) filter(where rubric_assessment is not null) as assessed_submission_rows,
  count(*) filter(where rubric_assessment is not null and jsonb_typeof(rubric_assessment)<>'object') as invalid_assessment_rows,
  (select count(*) from public.xp_ledger) as xp_rows,
  (select count(*) from public.enrollments) as enrollment_rows
from public.submissions;

select
  'assessment_integrity' as report,
  count(*) filter(where rubric_assessment is not null) as persisted_assessments,
  count(*) filter(
    where rubric_assessment is not null
      and rubric_assessment->>'schema_version'='1'
      and jsonb_typeof(rubric_assessment->'rubric'->'criteria')='array'
      and jsonb_typeof(rubric_assessment->'criterion_scores')='array'
      and rubric_assessment ? 'calculated_score'
      and rubric_assessment ? 'passing_score'
      and rubric_assessment->>'result' in('approved','revision_requested')
  ) as structurally_valid_assessments
from public.submissions;

rollback;
