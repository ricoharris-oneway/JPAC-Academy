begin transaction read only;

with function_state as(
 select p.oid,pg_get_functiondef(p.oid) definition,p.prosecdef,
   array_to_string(p.proconfig,',') settings,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
   has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.oid=to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)')
), normalized as(select *,regexp_replace(definition,'\s+',' ','g') d from function_state), progress_defs as(
 select regexp_replace(pg_get_functiondef(p.oid),'\s+','','g') definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
), checks(code,review_status,detail) as(values
 ('SAD-RPC',case when (select count(*) from function_state)=1 then 'PASS' else 'FAIL' end,'Exactly one JSONB RPC signature exists'),
 ('SAD-SECURITY',case when coalesce((select prosecdef and settings like '%search_path=public%' from function_state),false) then 'PASS' else 'FAIL' end,'SECURITY DEFINER and stable public search_path are required'),
 ('SAD-GRANTS',case when coalesce((select not anon_execute and authenticated_execute from function_state),false) then 'PASS' else 'FAIL' end,'anon blocked; authenticated wrapper access is internally admin-gated'),
 ('SAD-WRITES',case when coalesce((select d like '%insert into public.course_modules%insert into public.lessons%insert into public.activities%'
   and d not like '%update public.%' and d not like '%delete from public.%' and d not like '%on conflict%' from normalized),false) then 'PASS' else 'FAIL' end,'Only explicit curriculum inserts; no update/delete/upsert'),
 ('SAD-DRAFT',case when coalesce((select d like '%''draft''%' and d not like '%status=''published''%' from normalized),false) then 'PASS' else 'FAIL' end,'RPC inserts and requires draft statuses only'),
 ('SAD-DRAFT-ISOLATION',case when coalesce((select count(*)=2 and bool_and((length(definition)-length(replace(definition,'m.status=''published''','')))/length('m.status=''published''')=2) and bool_and(strpos(definition,'m.status<>''archived''')=0) from progress_defs),false) then 'PASS' else 'FAIL' end,'Published-only progress predicates remain active'),
 ('SAD-TRIGGER',case when (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where t.tgname='enrollments_enforce_canonical_progress' and c.oid='public.enrollments'::regclass and p.proname='jpac_enforce_canonical_enrollment_progress' and not t.tgisinternal and t.tgenabled<>'D')=1 then 'PASS' else 'FAIL' end,'Canonical enrollment trigger remains enabled'),
 ('SAD-INSERT-TRIGGERS',case when not exists(select 1 from pg_trigger t where t.tgrelid in('public.course_modules'::regclass,'public.lessons'::regclass,'public.activities'::regclass) and not t.tgisinternal) then 'PASS' else 'FAIL' end,'No indirect curriculum insert triggers exist'),
 ('SAD-WORKFLOW',case when coalesce((select d not like '%jpac_finalize_module_mastery(%' and d not like '%jpac_sync_enrollment_progress(%'
   and d not like '%jpac_assess_module_submission(%' from normalized),false) then 'PASS' else 'FAIL' end,'No academic workflow function calls')
)
select code,review_status,detail from checks
union all select 'SAD-OVERALL',case when bool_and(review_status='PASS') then 'PASS' else 'FAIL' end,'All installation findings must pass' from checks
order by code;

select 'RPC_DEFINITION' report_section,to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)')::text signature,
 md5(pg_get_functiondef(to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)'))) definition_hash,
 obj_description(to_regprocedure('public.curriculum_save_module_as_draft_v1(jsonb)'),'pg_proc') function_comment;

select 'PROTECTED_FUNCTION_POST_BASELINE' report_section,p.oid::regprocedure::text object_name,md5(pg_get_functiondef(p.oid)) definition_hash
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in(
 'jpac_module_completion','jpac_module_is_unlocked','jpac_finalize_module_mastery','jpac_sync_enrollment_progress',
 'jpac_enforce_canonical_enrollment_progress','jpac_assess_module_submission') order by object_name;

select 'SINGING_CURRICULUM_POST_BASELINE' report_section,
 count(distinct l.id) level_count,count(distinct m.id) module_count,count(distinct le.id) lesson_count,count(distinct a.id) activity_count,
 md5(coalesce(string_agg(distinct concat_ws('|',l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,le.id,le.status,a.id,a.status),',' order by concat_ws('|',l.id,l.level_number,l.status,m.id,m.level_module_number,m.status,le.id,le.status,a.id,a.status)),'')) curriculum_hash
from public.courses c left join public.course_levels l on l.course_id=c.id left join public.course_modules m on m.course_level_id=l.id
left join public.lessons le on le.module_id=m.id left join public.activities a on a.module_id=m.id where c.slug='singing';

select 'STUDENT_STATE_COUNT_POST_BASELINE' report_section,'enrollments' table_name,count(*) row_count from public.enrollments
union all select 'STUDENT_STATE_COUNT_POST_BASELINE','lesson_progress',count(*) from public.lesson_progress
union all select 'STUDENT_STATE_COUNT_POST_BASELINE','submissions',count(*) from public.submissions
union all select 'STUDENT_STATE_COUNT_POST_BASELINE','xp_ledger',count(*) from public.xp_ledger
union all select 'STUDENT_STATE_COUNT_POST_BASELINE','certificates',count(*) from public.certificates;

select 'STUDENT_STATE_HASH_POST_BASELINE' report_section,'enrollments' table_name,
 md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,level,progress),',' order by id::text),'')) state_hash from public.enrollments
union all select 'STUDENT_STATE_HASH_POST_BASELINE','lesson_progress',md5(coalesce(string_agg(concat_ws('|',id,student_id,lesson_id,status,percent_complete),',' order by id::text),'')) from public.lesson_progress
union all select 'STUDENT_STATE_HASH_POST_BASELINE','submissions',md5(coalesce(string_agg(concat_ws('|',id,student_id,activity_id,status,attempt_number),',' order by id::text),'')) from public.submissions
union all select 'STUDENT_STATE_HASH_POST_BASELINE','xp_ledger',md5(coalesce(string_agg(concat_ws('|',id,student_id,amount,xp_type,module_id),',' order by id::text),'')) from public.xp_ledger
union all select 'STUDENT_STATE_HASH_POST_BASELINE','certificates',md5(coalesce(string_agg(concat_ws('|',id,student_id,course_id,status,certificate_number),',' order by id::text),'')) from public.certificates;

select 'CANONICAL_ROW_COUNT_POST_BASELINE' report_section,'course_modules' table_name,count(*) row_count from public.course_modules
union all select 'CANONICAL_ROW_COUNT_POST_BASELINE','lessons',count(*) from public.lessons
union all select 'CANONICAL_ROW_COUNT_POST_BASELINE','activities',count(*) from public.activities;

select 'PROTECTED_COURSE_POST_BASELINE' report_section,c.slug,count(distinct m.id) module_count,count(distinct le.id) lesson_count,
 count(distinct a.id) activity_count,md5(coalesce(string_agg(distinct concat_ws('|',m.id,m.status,le.id,le.status,a.id,a.status),',' order by concat_ws('|',m.id,m.status,le.id,le.status,a.id,a.status)),'')) object_hash
from public.courses c left join public.course_modules m on m.course_id=c.id left join public.lessons le on le.module_id=m.id
left join public.activities a on a.module_id=m.id where c.slug in('singing','piano') group by c.slug order by c.slug;

select 'SINGING_EVIDENCE_POST_BASELINE' report_section,
 (select count(*) from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='singing') enrollment_count,
 (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug='singing') submission_count,
 (select count(*) from public.xp_ledger x join public.courses c on c.id=x.course_id where c.slug='singing') xp_count,
 (select count(*) from public.certificates ce join public.courses c on c.id=ce.course_id where c.slug='singing') certificate_count;

select 'CAREER_PATH_POST_BASELINE' report_section,count(*) path_count,
 md5(coalesce(string_agg(concat_ws('|',id,slug,name),',' order by id::text),'')) identity_hash from public.career_paths;

select 'ENROLLMENT_TRIGGER_POST_BASELINE' report_section,t.tgname,md5(pg_get_triggerdef(t.oid,true)) trigger_hash
from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.oid='public.enrollments'::regclass and not t.tgisinternal order by t.tgname;

select 'CURRICULUM_INSERT_TRIGGER_POST_BASELINE' report_section,c.relname table_name,t.tgname,
 md5(pg_get_triggerdef(t.oid,true)) trigger_hash
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('course_modules','lessons','activities') and not t.tgisinternal
order by c.relname,t.tgname;

rollback;
