begin transaction read only;

-- Save these baselines before installing the RPC. Post-validation emits the same
-- shapes so a reviewer can compare them. This script performs no writes.
with required_columns(table_name,column_name) as(values
 ('courses','id'),('courses','slug'),('course_levels','id'),('course_levels','course_id'),('course_levels','level_number'),
 ('course_modules','course_level_id'),('course_modules','level_module_number'),('course_modules','status'),('course_modules','core_xp'),
 ('lessons','module_id'),('lessons','learning_objective'),('lessons','content_blocks'),
 ('activities','module_id'),('activities','rubric'),('activities','xp_type'),('activities','passing_score'),
 ('course_modules','sort_order'),('course_modules','intro_core_xp'),('course_modules','video_core_xp'),
 ('course_modules','assignment_core_xp'),('course_modules','mastery_core_xp'),('course_modules','core_unlock_threshold'),
 ('course_modules','id'),('course_modules','course_id'),('course_modules','title'),('course_modules','description'),
 ('course_modules','short_intro'),('course_modules','xp_value'),('course_modules','bonus_xp_available'),
 ('course_modules','jpac_tool_activity'),('course_modules','real_world_activity'),('course_modules','career_connection'),
 ('course_modules','portfolio_moment'),('course_modules','video_brief'),('course_modules','aria_coaching_targets'),
 ('course_modules','career_mission_ideas'),('course_modules','portfolio_ready_threshold'),('course_modules','review_notes'),
 ('course_modules','primary_video_url'),('course_modules','lab_tool_id'),('course_modules','active_instructional_media_id'),
 ('course_modules','approved_by'),('course_modules','approved_at'),
 ('lessons','id'),('lessons','title'),('lessons','description'),('lessons','lesson_type'),('lessons','duration_minutes'),
 ('lessons','sort_order'),('lessons','xp_value'),('lessons','status'),('lessons','short_summary'),
 ('lessons','technique_cues'),('lessons','common_mistakes'),('lessons','self_check'),('lessons','resource_brief'),('lessons','wix_lesson_url'),
 ('activities','id'),('activities','course_id'),('activities','title'),('activities','description'),('activities','activity_type'),
 ('activities','instructions'),('activities','submission_type'),('activities','xp_reward'),('activities','required'),('activities','status'),
 ('activities','skill_tags'),('activities','ai_summary'),('activities','allows_resubmission'),('activities','portfolio_candidate'),('activities','certificate_eligible')
), missing as(
 select r.* from required_columns r left join information_schema.columns c
 on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name where c.column_name is null
), defs as(
 select p.proname,regexp_replace(pg_get_functiondef(p.oid),'\s+','','g') definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
), draft_isolation as(
 select count(*)=2
   and bool_and((length(definition)-length(replace(definition,'m.status=''published''','')))/length('m.status=''published''')=2)
   and bool_and(strpos(definition,'m.status<>''archived''')=0) ok from defs
), trigger_check as(
 select count(*)=1 ok from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
 where t.tgname='enrollments_enforce_canonical_progress' and c.oid='public.enrollments'::regclass
 and p.proname='jpac_enforce_canonical_enrollment_progress' and not t.tgisinternal and t.tgenabled<>'D'
), checks(code,review_status,detail) as(
 values
 ('SAD-SCHEMA',case when not exists(select 1 from missing) then 'PASS' else 'FAIL' end,
   case when not exists(select 1 from missing) then 'Required canonical columns exist' else 'Missing required canonical columns' end),
 ('SAD-AUTH',case when to_regprocedure('public.is_admin()') is not null
   and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%current_app_role()%'
   and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%admin%'
   and pg_get_functiondef(to_regprocedure('public.is_admin()')) like '%developer%' then 'PASS' else 'FAIL' end,
   'Existing is_admin authorization must retain admin/developer app-role checks'),
 ('SAD-UUID',case when to_regprocedure('gen_random_uuid()') is not null then 'PASS' else 'FAIL' end,'UUID generation must be available'),
 ('SAD-DRAFT-ISOLATION',case when (select ok from draft_isolation) then 'PASS' else 'FAIL' end,'Both progress functions must use exactly two published predicates and no legacy predicate'),
 ('SAD-TRIGGER',case when (select ok from trigger_check) then 'PASS' else 'FAIL' end,'Canonical enrollment progress trigger must remain enabled'),
 ('SAD-IDENTITY',case when exists(select 1 from pg_indexes where schemaname='public' and tablename='course_modules' and indexdef like '%course_level_id%level_module_number%') then 'PASS' else 'FAIL' end,'Module semantic identity index must exist'),
 ('SAD-INSERT-TRIGGERS',case when not exists(select 1 from pg_trigger t where t.tgrelid in('public.course_modules'::regclass,'public.lessons'::regclass,'public.activities'::regclass) and not t.tgisinternal) then 'PASS' else 'FAIL' end,'No user trigger may add indirect write behavior to the three insert tables'),
 ('SAD-RPC-ABSENT',case when to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)') is null then 'PASS' else 'FAIL' end,'First installation requires the RPC to be absent')
)
select code,review_status,detail from checks
union all
select 'SAD-OVERALL',case when bool_and(review_status='PASS') then 'PASS: READY FOR MANUAL REVIEW' else 'FAIL' end,'All prerequisite findings must pass'
from checks order by code;

select 'PROTECTED_FUNCTION_BASELINE' report_section,p.oid::regprocedure::text object_name,
 md5(pg_get_functiondef(p.oid)) definition_hash
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in(
 'jpac_module_completion','jpac_module_is_unlocked','jpac_finalize_module_mastery','jpac_sync_enrollment_progress',
 'jpac_enforce_canonical_enrollment_progress','jpac_assess_module_submission'
) order by object_name;

select 'SINGING_CURRICULUM_BASELINE' report_section,
 count(distinct l.id) level_count,count(distinct m.id) module_count,count(distinct le.id) lesson_count,count(distinct a.id) activity_count,
 md5(coalesce(string_agg(distinct concat_ws('|',l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,le.id,le.status,a.id,a.status),',' order by concat_ws('|',l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,le.id,le.status,a.id,a.status)),'')) curriculum_hash
from public.courses c left join public.course_levels l on l.course_id=c.id left join public.course_modules m on m.course_level_id=l.id
left join public.lessons le on le.module_id=m.id left join public.activities a on a.module_id=m.id where c.slug='singing';

select 'STUDENT_STATE_COUNT_BASELINE' report_section,'enrollments' table_name,count(*) row_count from public.enrollments
union all select 'STUDENT_STATE_COUNT_BASELINE','lesson_progress',count(*) from public.lesson_progress
union all select 'STUDENT_STATE_COUNT_BASELINE','submissions',count(*) from public.submissions
union all select 'STUDENT_STATE_COUNT_BASELINE','xp_ledger',count(*) from public.xp_ledger
union all select 'STUDENT_STATE_COUNT_BASELINE','certificates',count(*) from public.certificates;

select 'STUDENT_STATE_HASH_BASELINE' report_section,'enrollments' table_name,
 md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,level,progress),',' order by id::text),'')) state_hash from public.enrollments
union all select 'STUDENT_STATE_HASH_BASELINE','lesson_progress',md5(coalesce(string_agg(concat_ws('|',id,student_id,lesson_id,status,percent_complete),',' order by id::text),'')) from public.lesson_progress
union all select 'STUDENT_STATE_HASH_BASELINE','submissions',md5(coalesce(string_agg(concat_ws('|',id,student_id,activity_id,status,attempt_number),',' order by id::text),'')) from public.submissions
union all select 'STUDENT_STATE_HASH_BASELINE','xp_ledger',md5(coalesce(string_agg(concat_ws('|',id,student_id,amount,xp_type,module_id),',' order by id::text),'')) from public.xp_ledger
union all select 'STUDENT_STATE_HASH_BASELINE','certificates',md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,certificate_number),',' order by id::text),'')) from public.certificates;

select 'CANONICAL_ROW_COUNT_BASELINE' report_section,'course_modules' table_name,count(*) row_count from public.course_modules
union all select 'CANONICAL_ROW_COUNT_BASELINE','lessons',count(*) from public.lessons
union all select 'CANONICAL_ROW_COUNT_BASELINE','activities',count(*) from public.activities;

select 'PROTECTED_COURSE_BASELINE' report_section,c.slug,count(distinct m.id) module_count,count(distinct le.id) lesson_count,
 count(distinct a.id) activity_count,md5(coalesce(string_agg(distinct concat_ws('|',m.id,m.status,le.id,le.status,a.id,a.status),',' order by concat_ws('|',m.id,m.status,le.id,le.status,a.id,a.status)),'')) object_hash
from public.courses c left join public.course_modules m on m.course_id=c.id left join public.lessons le on le.module_id=m.id
left join public.activities a on a.module_id=m.id where c.slug in('singing','piano') group by c.slug order by c.slug;

select 'SINGING_EVIDENCE_BASELINE' report_section,
 (select count(*) from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='singing') enrollment_count,
 (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug='singing') submission_count,
 (select count(*) from public.xp_ledger x join public.courses c on c.id=x.course_id where c.slug='singing') xp_count,
 (select count(*) from public.certificates ce join public.courses c on c.id=ce.course_id where c.slug='singing') certificate_count;

select 'CAREER_PATH_BASELINE' report_section,count(*) path_count,
 md5(coalesce(string_agg(concat_ws('|',id,slug,name),',' order by id::text),'')) identity_hash from public.career_paths;

select 'MODULE_IDENTITY_CONFLICTS' report_section,c.slug,l.level_number,m.level_module_number,count(*) conflict_count
from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id
where m.level_module_number is not null group by c.slug,l.level_number,m.level_module_number having count(*)>1;

select 'CURRICULUM_INSERT_TRIGGER_BASELINE' report_section,c.relname table_name,t.tgname,
 md5(pg_get_triggerdef(t.oid,true)) trigger_hash
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('course_modules','lessons','activities') and not t.tgisinternal
order by c.relname,t.tgname;

rollback;
