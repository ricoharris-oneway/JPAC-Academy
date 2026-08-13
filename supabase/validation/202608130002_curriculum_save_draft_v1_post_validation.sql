begin transaction read only;

-- Supabase SQL Editor emphasizes the final result-producing statement. All
-- installation checks and preservation baselines therefore feed one report.
-- Baseline rows are INFO because this artifact does not persist preflight values;
-- reviewers must compare their details with the previously captured preflight.
with
required_tables(table_name) as(values
  ('courses'),('course_levels'),('course_modules'),('lessons'),('activities'),
  ('enrollments'),('lesson_progress'),('submissions'),('xp_ledger'),('certificates'),('career_paths')
),
missing_tables as(
  select r.table_name from required_tables r
  left join information_schema.tables t
    on t.table_schema='public' and t.table_name=r.table_name
  where t.table_name is null
),
rpc_state as(
  select p.oid,p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,
    regexp_replace(pg_get_functiondef(p.oid),'\s+',' ','g') normalized_definition,
    p.prosecdef,array_to_string(p.proconfig,',') settings,
    has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
    md5(pg_get_functiondef(p.oid)) definition_hash,
    obj_description(p.oid,'pg_proc') function_comment
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.oid=to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)')
),
progress_definitions as(
  select p.proname,regexp_replace(pg_get_functiondef(p.oid),'\s+','','g') definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
),
safe_draft_isolation as(
  select count(*)=2
    and bool_and((length(definition)-length(replace(definition,'m.status=''published''','')))
      /length('m.status=''published''')=2)
    and bool_and(strpos(definition,'m.status<>''archived''')=0) ok
  from progress_definitions
),
canonical_trigger as(
  select count(*)=1 ok,
    coalesce(jsonb_agg(jsonb_build_object(
      'trigger_name',t.tgname,'enabled',t.tgenabled,'function_name',p.proname,
      'definition',pg_get_triggerdef(t.oid,true),'definition_hash',md5(pg_get_triggerdef(t.oid,true))
    ) order by t.tgname),'[]'::jsonb) details
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_proc p on p.oid=t.tgfoid
  where t.tgname='enrollments_enforce_canonical_progress'
    and c.oid='public.enrollments'::regclass
    and p.proname='jpac_enforce_canonical_enrollment_progress'
    and not t.tgisinternal and t.tgenabled<>'D'
),
protected_functions as(
  select count(distinct p.proname) function_name_count,
    coalesce(jsonb_agg(jsonb_build_object(
      'signature',p.oid::regprocedure::text,'definition_hash',md5(pg_get_functiondef(p.oid))
    ) order by p.oid::regprocedure::text),'[]'::jsonb) details
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in(
    'jpac_module_completion','jpac_module_is_unlocked','jpac_finalize_module_mastery',
    'jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress',
    'jpac_assess_module_submission'
  )
),
course_baselines as(
  select c.slug,count(distinct l.id) level_count,count(distinct m.id) module_count,
    count(distinct le.id) lesson_count,count(distinct a.id) activity_count,
    md5(coalesce(string_agg(distinct concat_ws('|',
      l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,
      le.id,le.status,a.id,a.status
    ),',' order by concat_ws('|',
      l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,
      le.id,le.status,a.id,a.status
    )),'')) curriculum_hash
  from public.courses c
  left join public.course_levels l on l.course_id=c.id
  left join public.course_modules m on m.course_level_id=l.id
  left join public.lessons le on le.module_id=m.id
  left join public.activities a on a.module_id=m.id
  where c.slug in('singing','piano')
  group by c.slug
),
singing_evidence as(
  select
    (select count(*) from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='singing') enrollment_count,
    (select count(*) from public.lesson_progress lp join public.lessons le on le.id=lp.lesson_id
      join public.course_modules m on m.id=le.module_id join public.courses c on c.id=m.course_id where c.slug='singing') lesson_progress_count,
    (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id
      join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug='singing') submission_count,
    (select count(*) from public.xp_ledger x join public.courses c on c.id=x.course_id where c.slug='singing') xp_count,
    (select count(*) from public.certificates ce join public.courses c on c.id=ce.course_id where c.slug='singing') certificate_count
),
student_state as(
  select jsonb_build_object(
    'enrollments',jsonb_build_object('count',(select count(*) from public.enrollments),
      'hash',(select md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,level,progress),',' order by id::text),'')) from public.enrollments)),
    'lesson_progress',jsonb_build_object('count',(select count(*) from public.lesson_progress),
      'hash',(select md5(coalesce(string_agg(concat_ws('|',id,student_id,lesson_id,status,percent_complete),',' order by id::text),'')) from public.lesson_progress)),
    'submissions',jsonb_build_object('count',(select count(*) from public.submissions),
      'hash',(select md5(coalesce(string_agg(concat_ws('|',id,student_id,activity_id,status,attempt_number),',' order by id::text),'')) from public.submissions)),
    'xp_ledger',jsonb_build_object('count',(select count(*) from public.xp_ledger),
      'hash',(select md5(coalesce(string_agg(concat_ws('|',id,student_id,amount,xp_type,module_id),',' order by id::text),'')) from public.xp_ledger)),
    'certificates',jsonb_build_object('count',(select count(*) from public.certificates),
      'hash',(select md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,certificate_number),',' order by id::text),'')) from public.certificates))
  ) details
),
career_paths_baseline as(
  select count(*) path_count,
    md5(coalesce(string_agg(concat_ws('|',id,slug,name,status),',' order by id::text),'')) identity_hash
  from public.career_paths
),
curriculum_trigger_rows as(
  select c.relname table_name,t.tgname trigger_name,p.proname function_name,
    fn.nspname function_schema,t.tgenabled enabled,pg_get_triggerdef(t.oid,true) definition,
    (t.tgname='set_updated_at' and fn.nspname='public' and p.proname='set_updated_at'
      and lower(regexp_replace(p.prosrc,'\s+','','g'))='beginnew.updated_at=now();returnnew;end;'
      and t.tgenabled<>'D' and pg_get_triggerdef(t.oid,true) ilike '%BEFORE UPDATE ON %') is_expected
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  join pg_proc p on p.oid=t.tgfoid
  join pg_namespace fn on fn.oid=p.pronamespace
  where n.nspname='public' and c.relname in('course_modules','lessons','activities')
    and not t.tgisinternal
),
curriculum_triggers as(
  select count(*) trigger_count,count(*) filter(where is_expected) expected_trigger_count,
    count(distinct table_name) filter(where is_expected) expected_table_count,
    count(*) filter(where not is_expected) unexpected_trigger_count,
    coalesce(jsonb_agg(jsonb_build_object(
      'table_name',table_name,'trigger_name',trigger_name,'function_schema',function_schema,
      'function_name',function_name,'enabled',enabled,'is_expected',is_expected,
      'definition',definition,'definition_hash',md5(definition)
    ) order by table_name,trigger_name),'[]'::jsonb) details
  from curriculum_trigger_rows
),
curriculum_counts as(
  select jsonb_build_object(
    'course_modules',(select count(*) from public.course_modules),
    'lessons',(select count(*) from public.lessons),
    'activities',(select count(*) from public.activities)
  ) details
),
base_reports(sort_order,report_section,code,result,details) as(
  select 10,'RPC_EXISTS','SAD-RPC-EXISTS',case when count(*)=1 then 'PASS' else 'BLOCK' end,
    jsonb_build_object('matching_signatures',count(*))::text from rpc_state
  union all
  select 20,'RPC_SIGNATURE','SAD-RPC-SIGNATURE',
    case when count(*)=1 and min(signature)='curriculum_save_module_as_draft_v1(jsonb)' then 'PASS' else 'BLOCK' end,
    coalesce((select jsonb_build_object('signature',signature,'definition_hash',definition_hash,
      'comment',function_comment)::text from rpc_state),'Expected JSONB RPC signature not found') from rpc_state
  union all
  select 30,'RPC_SECURITY','SAD-RPC-SECURITY',
    case when count(*)=1 and bool_and(prosecdef and settings like '%search_path=public%') then 'PASS' else 'BLOCK' end,
    coalesce((select jsonb_build_object('security_definer',prosecdef,'settings',settings)::text from rpc_state),
      'RPC security metadata unavailable') from rpc_state
  union all
  select 40,'RPC_PRIVILEGES','SAD-RPC-PRIVILEGES',
    case when count(*)=1 and bool_and(not anon_execute and authenticated_execute)
      and bool_and(normalized_definition like '%auth.uid() is null or not public.is_admin()%') then 'PASS' else 'BLOCK' end,
    coalesce((select jsonb_build_object('anon_execute',anon_execute,'authenticated_execute',authenticated_execute,
      'internal_admin_guard',normalized_definition like '%auth.uid() is null or not public.is_admin()%')::text from rpc_state),
      'RPC privilege metadata unavailable') from rpc_state
  union all
  select 50,'REQUIRED_TABLES_UNCHANGED','SAD-TABLES',
    case when not exists(select 1 from missing_tables) then 'INFO' else 'BLOCK' end,
    jsonb_build_object('comparison_required','Compare with preflight',
      'required_count',(select count(*) from required_tables),
      'missing',coalesce((select jsonb_agg(table_name order by table_name) from missing_tables),'[]'::jsonb))::text
  union all
  select 60,'SAFE_DRAFT_ISOLATION','SAD-DRAFT-ISOLATION',case when ok then 'PASS' else 'BLOCK' end,
    jsonb_build_object('function_count',(select count(*) from progress_definitions),
      'published_predicates_required_per_function',2,'legacy_predicates_allowed',0)::text from safe_draft_isolation
  union all
  select 70,'CANONICAL_TRIGGER','SAD-CANONICAL-TRIGGER',case when ok then 'PASS' else 'BLOCK' end,details::text from canonical_trigger
  union all
  select 80,'PROTECTED_SHARED_FUNCTIONS_UNCHANGED','SAD-SHARED-FUNCTIONS',
    case when function_name_count=6 then 'INFO' else 'BLOCK' end,
    jsonb_build_object('comparison_required','Compare hashes with preflight','expected_function_names',6,
      'found_function_names',function_name_count,'functions',details)::text from protected_functions
  union all
  select 90,'SINGING_CURRICULUM_UNCHANGED','SAD-SINGING-CURRICULUM',
    case when (select count(*) from course_baselines where slug='singing')=1 then 'INFO' else 'BLOCK' end,
    coalesce((select jsonb_build_object('comparison_required','Compare with preflight','baseline',to_jsonb(cb))::text
      from course_baselines cb where slug='singing'),'Singing course missing or ambiguous')
  union all
  select 100,'SINGING_EVIDENCE_UNCHANGED','SAD-SINGING-EVIDENCE','INFO',
    jsonb_build_object('comparison_required','Compare with preflight','baseline',to_jsonb(se))::text from singing_evidence se
  union all
  select 110,'PIANO_CURRICULUM_UNCHANGED','SAD-PIANO-CURRICULUM',
    case when (select count(*) from course_baselines where slug='piano')=1 then 'INFO' else 'BLOCK' end,
    coalesce((select jsonb_build_object('comparison_required','Compare with preflight','baseline',to_jsonb(cb))::text
      from course_baselines cb where slug='piano'),'Piano course missing or ambiguous')
  union all
  select 120,'STUDENT_STATE_UNCHANGED','SAD-STUDENT-STATE','INFO',
    jsonb_build_object('comparison_required','Compare counts and hashes with preflight','baseline',details)::text from student_state
  union all
  select 130,'CAREER_PATHS_UNCHANGED','SAD-CAREER-PATHS','INFO',
    jsonb_build_object('comparison_required','Compare with preflight','path_count',path_count,
      'identity_hash',identity_hash)::text from career_paths_baseline
  union all
  select 140,'CURRICULUM_INSERT_TRIGGER_POST_BASELINE','SAD-CURRICULUM-TRIGGERS',
    case when trigger_count=3 and expected_trigger_count=3 and expected_table_count=3
      and unexpected_trigger_count=0 then 'PASS' else 'BLOCK' end,
    jsonb_build_object('trigger_count',trigger_count,'expected_trigger_count',expected_trigger_count,
      'expected_table_count',expected_table_count,'unexpected_trigger_count',unexpected_trigger_count,
      'triggers',details)::text from curriculum_triggers
  union all
  select 150,'CURRICULUM_ROW_COUNTS_UNCHANGED','SAD-CURRICULUM-COUNTS','INFO',
    jsonb_build_object('comparison_required','Compare counts with preflight; RPC installation alone must not change rows',
      'baseline',details)::text from curriculum_counts
  union all
  select 160,'RPC_DEFINITION_SAFETY','SAD-RPC-DEFINITION',
    case when count(*)=1 and bool_and(
      normalized_definition like '%insert into public.course_modules%insert into public.lessons%insert into public.activities%'
      and normalized_definition not like '%update public.%'
      and normalized_definition not like '%delete from public.%'
      and normalized_definition not like '%on conflict%'
      and normalized_definition not like '%jpac_finalize_module_mastery(%'
      and normalized_definition not like '%jpac_sync_enrollment_progress(%'
      and normalized_definition not like '%jpac_assess_module_submission(%'
      and normalized_definition not like '%status=''published''%'
    ) then 'PASS' else 'BLOCK' end,
    'RPC must retain draft-only inserts, no update/delete/upsert, no workflow calls, and no published status assignment'
    from rpc_state
),
all_blockers as(
  select code,details from base_reports where result='BLOCK'
),
final_reports(sort_order,report_section,code,result,details) as(
  select * from base_reports
  union all
  select 900,'BLOCKERS','SAD-BLOCKERS',case when exists(select 1 from all_blockers) then 'BLOCK' else 'PASS' end,
    case when exists(select 1 from all_blockers)
      then coalesce((select jsonb_agg(jsonb_build_object('code',code,'details',details) order by code)::text
        from all_blockers),'[]')
      else 'No directly verifiable blockers detected. INFO baselines still require manual preflight comparison.' end
  union all
  select 999,'OVERALL','SAD-OVERALL',case when exists(select 1 from all_blockers) then 'BLOCK' else 'PASS' end,
    case when exists(select 1 from all_blockers)
      then 'BLOCK: REVIEW BEFORE FRONTEND WIRING'
      else 'PASS: SAVE AS DRAFT V1 RPC INSTALL VALID' end
)
select report_section,code,result,details
from final_reports
order by sort_order,code;

rollback;
