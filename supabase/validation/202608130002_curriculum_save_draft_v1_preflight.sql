begin transaction read only;

-- Supabase SQL Editor emphasizes the final result-producing statement. Keep all
-- readiness checks and preservation baselines in this single consolidated query.
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
required_columns(table_name,column_name) as(values
  ('courses','id'),('courses','slug'),
  ('course_levels','id'),('course_levels','course_id'),('course_levels','level_number'),
  ('course_modules','id'),('course_modules','course_id'),('course_modules','course_level_id'),
  ('course_modules','level_module_number'),('course_modules','title'),('course_modules','description'),
  ('course_modules','short_intro'),('course_modules','sort_order'),('course_modules','xp_value'),
  ('course_modules','status'),('course_modules','core_xp'),('course_modules','intro_core_xp'),
  ('course_modules','video_core_xp'),('course_modules','assignment_core_xp'),
  ('course_modules','mastery_core_xp'),('course_modules','core_unlock_threshold'),
  ('course_modules','bonus_xp_available'),('course_modules','jpac_tool_activity'),
  ('course_modules','real_world_activity'),('course_modules','career_connection'),
  ('course_modules','portfolio_moment'),('course_modules','video_brief'),
  ('course_modules','aria_coaching_targets'),('course_modules','career_mission_ideas'),
  ('course_modules','portfolio_ready_threshold'),('course_modules','review_notes'),
  ('course_modules','primary_video_url'),('course_modules','lab_tool_id'),
  ('course_modules','active_instructional_media_id'),('course_modules','approved_by'),
  ('course_modules','approved_at'),
  ('lessons','id'),('lessons','module_id'),('lessons','title'),('lessons','description'),
  ('lessons','lesson_type'),('lessons','duration_minutes'),('lessons','sort_order'),
  ('lessons','xp_value'),('lessons','status'),('lessons','short_summary'),
  ('lessons','learning_objective'),('lessons','content_blocks'),('lessons','technique_cues'),
  ('lessons','common_mistakes'),('lessons','self_check'),('lessons','resource_brief'),
  ('lessons','wix_lesson_url'),
  ('activities','id'),('activities','course_id'),('activities','module_id'),
  ('activities','title'),('activities','description'),('activities','activity_type'),
  ('activities','instructions'),('activities','submission_type'),('activities','xp_reward'),
  ('activities','required'),('activities','status'),('activities','rubric'),
  ('activities','skill_tags'),('activities','ai_summary'),('activities','xp_type'),
  ('activities','passing_score'),('activities','allows_resubmission'),
  ('activities','portfolio_candidate'),('activities','certificate_eligible')
),
missing_columns as(
  select r.table_name,r.column_name from required_columns r
  left join information_schema.columns c
    on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
  where c.column_name is null
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
      'trigger_name',t.tgname,'enabled',t.tgenabled,
      'function_name',p.proname,'definition',pg_get_triggerdef(t.oid,true)
    ) order by t.tgname),'[]'::jsonb) details
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_proc p on p.oid=t.tgfoid
  where t.tgname='enrollments_enforce_canonical_progress'
    and c.oid='public.enrollments'::regclass
    and p.proname='jpac_enforce_canonical_enrollment_progress'
    and not t.tgisinternal and t.tgenabled<>'D'
),
module_identity as(
  select
    exists(select 1 from pg_indexes where schemaname='public'
      and tablename='course_modules' and indexname='course_modules_level_number_uidx') index_exists,
    (select count(*) from(
      select course_level_id,level_module_number
      from public.course_modules
      where course_level_id is not null and level_module_number is not null
      group by course_level_id,level_module_number having count(*)>1
    ) duplicates) duplicate_count
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
curriculum_insert_triggers as(
  select count(*) trigger_count,
    coalesce(jsonb_agg(jsonb_build_object(
      'table_name',c.relname,'trigger_name',t.tgname,'function_name',p.proname,
      'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)
    ) order by c.relname,t.tgname),'[]'::jsonb) details
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  join pg_proc p on p.oid=t.tgfoid
  where n.nspname='public' and c.relname in('course_modules','lessons','activities')
    and not t.tgisinternal
),
base_reports(sort_order,report_section,code,result,details) as(
  select 10,'REQUIRED_TABLES','SAD-TABLES',
    case when not exists(select 1 from missing_tables) then 'PASS' else 'BLOCK' end,
    jsonb_build_object('required_count',(select count(*) from required_tables),
      'missing',coalesce((select jsonb_agg(table_name order by table_name) from missing_tables),'[]'::jsonb))::text
  union all
  select 20,'REQUIRED_COLUMNS','SAD-COLUMNS',
    case when not exists(select 1 from missing_columns) then 'PASS' else 'BLOCK' end,
    jsonb_build_object('required_count',(select count(*) from required_columns),
      'missing',coalesce((select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name)
        order by table_name,column_name) from missing_columns),'[]'::jsonb))::text
  union all
  select 30,'UUID_SUPPORT','SAD-UUID',case when to_regprocedure('gen_random_uuid()') is not null then 'PASS' else 'BLOCK' end,
    jsonb_build_object('signature',to_regprocedure('gen_random_uuid()')::text)::text
  union all
  select 40,'ADMIN_AUTHORIZATION','SAD-AUTH',case when to_regprocedure('public.is_admin()') is not null
      and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%current_app_role()%'
      and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%admin%'
      and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%developer%' then 'PASS' else 'BLOCK' end,
    case when to_regprocedure('public.is_admin()') is null then 'is_admin() is missing'
      else jsonb_build_object('signature','public.is_admin()','definition_hash',md5(pg_get_functiondef(to_regprocedure('public.is_admin()'))))::text end
  union all
  select 50,'MODULE_UNIQUENESS','SAD-MODULE-IDENTITY',
    case when index_exists and duplicate_count=0 then 'PASS' else 'BLOCK' end,
    jsonb_build_object('index','course_modules_level_number_uidx','index_exists',index_exists,'duplicate_identity_count',duplicate_count)::text
    from module_identity
  union all
  select 60,'SAFE_DRAFT_ISOLATION','SAD-DRAFT-ISOLATION',case when ok then 'PASS' else 'BLOCK' end,
    jsonb_build_object('function_count',(select count(*) from progress_definitions),
      'published_predicates_required_per_function',2,'legacy_predicates_allowed',0)::text from safe_draft_isolation
  union all
  select 70,'CANONICAL_TRIGGER','SAD-CANONICAL-TRIGGER',case when ok then 'PASS' else 'BLOCK' end,details::text from canonical_trigger
  union all
  select 80,'PROTECTED_SHARED_FUNCTIONS_BASELINE','SAD-SHARED-FUNCTIONS',
    case when function_name_count=6 then 'INFO' else 'BLOCK' end,
    jsonb_build_object('expected_function_names',6,'found_function_names',function_name_count,'functions',details)::text from protected_functions
  union all
  select 90,'SINGING_CURRICULUM_BASELINE','SAD-SINGING-CURRICULUM',case when count(*)=1 then 'INFO' else 'BLOCK' end,
    coalesce((select to_jsonb(cb)::text from course_baselines cb where slug='singing'),'Singing course missing or ambiguous')
    from course_baselines where slug='singing'
  union all
  select 100,'SINGING_EVIDENCE_BASELINE','SAD-SINGING-EVIDENCE','INFO',to_jsonb(se)::text from singing_evidence se
  union all
  select 110,'PIANO_CURRICULUM_BASELINE','SAD-PIANO-CURRICULUM',case when count(*)=1 then 'INFO' else 'BLOCK' end,
    coalesce((select to_jsonb(cb)::text from course_baselines cb where slug='piano'),'Piano course missing or ambiguous')
    from course_baselines where slug='piano'
  union all
  select 120,'STUDENT_STATE_BASELINE','SAD-STUDENT-STATE','INFO',details::text from student_state
  union all
  select 130,'CAREER_PATHS_BASELINE','SAD-CAREER-PATHS','INFO',
    jsonb_build_object('path_count',path_count,'identity_hash',identity_hash)::text from career_paths_baseline
  union all
  select 140,'CURRICULUM_INSERT_TRIGGER_BASELINE','SAD-CURRICULUM-TRIGGERS','INFO',
    jsonb_build_object('trigger_count',trigger_count,'triggers',details)::text from curriculum_insert_triggers
  union all
  select 150,'RPC_ABSENT','SAD-RPC-ABSENT',
    case when to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)') is null then 'PASS' else 'BLOCK' end,
    'The first installation requires the Save as Draft v1 RPC to be absent'
),
extra_blockers(code,details) as(
  select 'SAD-MIGRATION-TRIGGER-GUARD',
    'The current migration rejects every user trigger on course_modules, lessons, or activities, but preflight found '
      ||trigger_count||'. Review the migration guard before execution.'
  from curriculum_insert_triggers where trigger_count>0
),
all_blockers as(
  select code,details from base_reports where result='BLOCK'
  union all select code,details from extra_blockers
),
final_reports(sort_order,report_section,code,result,details) as(
  select * from base_reports
  union all
  select 900,'BLOCKERS','SAD-BLOCKERS',case when exists(select 1 from all_blockers) then 'BLOCK' else 'PASS' end,
    case when exists(select 1 from all_blockers)
      then coalesce((select jsonb_agg(jsonb_build_object('code',code,'details',details) order by code)::text from all_blockers),'[]')
      else 'No blockers detected' end
  union all
  select 999,'OVERALL','SAD-OVERALL',case when exists(select 1 from all_blockers) then 'BLOCK' else 'PASS' end,
    case when exists(select 1 from all_blockers) then 'BLOCK: DO NOT RUN MIGRATION' else 'PASS: READY FOR MIGRATION REVIEW' end
)
select report_section,code,result,details
from final_reports
order by sort_order,code;

rollback;
