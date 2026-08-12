-- READ ONLY. Retain this complete output for post-validation comparison.
begin transaction read only;

with f as(
 select p.oid,p.proname,pg_get_functiondef(p.oid) definition,p.prosecdef,
        pg_get_function_identity_arguments(p.oid) identity_arguments,
        p.proconfig
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
)
select proname,identity_arguments,prosecdef security_definer,proconfig,
 md5(definition) definition_hash,
 (length(definition)-length(replace(definition,'m.status<>''archived''','')))/length('m.status<>''archived''') prior_predicate_count,
 (length(definition)-length(replace(definition,'m.status=''published''','')))/length('m.status=''published''') proposed_predicate_count
from f order by proname;

select t.tgname,t.tgenabled,c.relname table_name,p.proname handler,
 pg_get_triggerdef(t.oid,true) trigger_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal;

select routine_name,grantee,privilege_type
from information_schema.routine_privileges
where specific_schema='public' and routine_name in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
order by routine_name,grantee,privilege_type;

select p.proname,pg_get_function_identity_arguments(p.oid) identity_arguments,
 md5(pg_get_functiondef(p.oid)) definition_hash
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in(
 'jpac_module_completion','jpac_module_is_unlocked','jpac_finalize_module_mastery',
 'jpac_sync_progress_from_mastery_ledger','jpac_sync_progress_after_assessment',
 'jpac_submit_module_activity','jpac_review_module_submission','jpac_assess_module_submission'
) order by p.proname,identity_arguments;

-- Current versus proposed values. This query does not invoke either mutating function.
with calculated as(
 select e.id enrollment_id,e.student_id,e.course_id,c.slug,e.level,e.status,e.progress stored_progress,
  cp.percent_complete stored_course_progress,
  count(distinct m.id) filter(where m.status<>'archived') current_total,
  count(distinct m.id) filter(where m.status<>'archived' and exists(select 1 from public.xp_ledger x where x.student_id=e.student_id and x.module_id=m.id and x.xp_type='core' and x.metadata->>'component'='mastery')) current_mastered,
  count(distinct m.id) filter(where m.status='published') proposed_total,
  count(distinct m.id) filter(where m.status='published' and exists(select 1 from public.xp_ledger x where x.student_id=e.student_id and x.module_id=m.id and x.xp_type='core' and x.metadata->>'component'='mastery')) proposed_mastered
 from public.enrollments e join public.courses c on c.id=e.course_id
 left join public.course_progress cp on cp.enrollment_id=e.id
 left join public.course_levels l on l.course_id=e.course_id and l.level_number=e.level
 left join public.course_modules m on m.course_level_id=l.id
 group by e.id,e.student_id,e.course_id,c.slug,e.level,e.status,e.progress,cp.percent_complete
), results as(
 select *,case when current_total=0 then 0 else round(current_mastered::numeric/current_total*100,2) end current_calculated,
  case when proposed_total=0 then 0 else round(proposed_mastered::numeric/proposed_total*100,2) end proposed_calculated
 from calculated
)
select *,proposed_calculated is distinct from stored_progress stored_progress_would_differ,
 proposed_calculated is distinct from stored_course_progress course_progress_would_differ
from results order by slug,level,enrollment_id;

-- Protected Singing baseline: statuses, counts, and stable full-row hashes.
select c.id,c.slug,c.status,c.module_count,c.total_xp,c.core_xp_total,c.updated_at,
 count(distinct l.id) levels,count(distinct m.id) modules,
 count(distinct m.id) filter(where m.status='published') published_modules,
 count(distinct m.id) filter(where m.status in('draft','review','approved')) unpublished_nonarchived_modules,
 count(distinct m.id) filter(where m.status='archived') archived_modules
from public.courses c left join public.course_levels l on l.course_id=c.id
left join public.course_modules m on m.course_id=c.id
where c.slug='singing' group by c.id;

select c.slug,l.level_number,l.status level_status,m.status module_status,count(*) module_count
from public.courses c join public.course_levels l on l.course_id=c.id join public.course_modules m on m.course_level_id=l.id
where c.slug='singing' group by c.slug,l.level_number,l.status,m.status order by l.level_number,m.status;

select 'singing_course_full' set_name,md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')) set_hash,count(*) row_count from public.courses x where x.slug='singing'
union all select 'singing_levels_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.course_levels x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_modules_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.course_modules x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_lessons_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.lessons x join public.course_modules m on m.id=x.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
union all select 'singing_activities_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.activities x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_media_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.module_instructional_media x join public.course_modules m on m.id=x.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
union all select 'singing_enrollments_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.enrollments x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_course_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.enrollment_id),'')),count(*) from public.course_progress x join public.enrollments e on e.id=x.enrollment_id join public.courses c on c.id=e.course_id where c.slug='singing'
union all select 'singing_lesson_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.lesson_progress x join public.lessons l on l.id=x.lesson_id join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
union all select 'singing_submissions_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.submissions x join public.activities a on a.id=x.activity_id join public.courses c on c.id=a.course_id where c.slug='singing'
union all select 'singing_xp_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.xp_ledger x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_certificates_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.certificates x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_portfolio_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.portfolio_projects x join public.courses c on c.id=x.course_id where c.slug='singing';

-- Must match the identically named post-validation hashes exactly.
select 'all_enrollments_full' set_name,md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')) set_hash,count(*) row_count from public.enrollments x
union all select 'all_course_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.enrollment_id),'')),count(*) from public.course_progress x
union all select 'all_lesson_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.lesson_progress x
union all select 'all_activity_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.activity_progress x
union all select 'all_practice_logs_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.practice_logs x
union all select 'all_xp_ledger_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.xp_ledger x
union all select 'all_submissions_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.submissions x
union all select 'all_module_video_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.student_id,x.module_id),'')),count(*) from public.module_video_progress x
union all select 'all_certificates_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.certificates x
union all select 'all_portfolio_projects_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.portfolio_projects x;

-- Piano Module 1 must remain draft and therefore absent from a published-only denominator.
select c.id course_id,l.id level_id,m.id module_id,m.title,m.status,
 (m.status='published') counts_after_change
from public.courses c join public.course_levels l on l.course_id=c.id and l.level_number=1
join public.course_modules m on m.course_level_id=l.id and m.level_module_number=1
where c.slug='piano';

with f as(
 select p.proname,pg_get_functiondef(p.oid) d,p.prosecdef,p.proconfig
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
), findings as(
 select 'SDI-FUNCTIONS' finding,case when (select count(*) from f)=2 and (select count(*) from f where prosecdef and proconfig @> array['search_path=public'])=2 and (select sum((length(d)-length(replace(d,'m.status<>''archived''','')))/length('m.status<>''archived''')) from f)=4 and (select sum((length(d)-length(replace(d,'m.status=''published''','')))/length('m.status=''published''')) from f)=0 then 'PASS' else 'FAIL: prior function definitions or metadata differ' end result
 union all select 'SDI-TRIGGER',case when (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where t.tgname='enrollments_enforce_canonical_progress' and c.oid='public.enrollments'::regclass and p.proname='jpac_enforce_canonical_enrollment_progress' and not t.tgisinternal and t.tgenabled<>'D' and pg_get_triggerdef(t.oid,true) like '%BEFORE UPDATE OF progress ON %')=1 then 'PASS' else 'FAIL: expected trigger definition missing, ambiguous, or disabled' end
 union all select 'SDI-PRIVILEGES',case when not exists(select 1 from information_schema.routine_privileges where specific_schema='public' and routine_name in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and grantee in('PUBLIC','anon','authenticated')) then 'PASS' else 'FAIL: unexpected direct execute privilege exists' end
 union all select 'SDI-PIANO',case when (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='piano' and l.level_number=1 and m.level_module_number=1 and m.title='Piano Posture and Hand Position' and m.status='draft')=1 then 'PASS' else 'FAIL: exact draft Piano Module 1 not found' end
 union all select 'SDI-SINGING',case when (select count(*) from public.courses where slug='singing')=1 then 'PASS: REVIEW STATUS AND PROGRESS REPORTS' else 'FAIL: Singing identity missing or ambiguous' end
), all_findings as(select * from findings)
select * from all_findings
union all select 'SDI-OVERALL',case when exists(select 1 from all_findings where result like 'FAIL:%') then 'FAIL' else 'PASS: READY FOR MANUAL BASELINE REVIEW' end;

rollback;
