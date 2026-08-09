begin transaction read only;

select t.table_name,c.relrowsecurity as row_security
from information_schema.tables t
join pg_class c on c.relname=t.table_name
join pg_namespace n on n.oid=c.relnamespace and n.nspname=t.table_schema
where t.table_schema='public' and t.table_name in('curriculum_sources','curriculum_source_sections','curriculum_change_requests','curriculum_proposals')
order by table_name;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename in('curriculum_sources','curriculum_source_sections','curriculum_change_requests','curriculum_proposals')
order by tablename,policyname;

select
  has_table_privilege('anon','public.curriculum_sources','SELECT') as anon_sources_select,
  has_table_privilege('anon','public.curriculum_proposals','SELECT') as anon_proposals_select,
  has_table_privilege('authenticated','public.curriculum_sources','SELECT') as authenticated_sources_grant_with_rls,
  has_table_privilege('authenticated','public.curriculum_proposals','SELECT') as authenticated_proposals_grant_with_rls;

select
  (select count(*) from public.lesson_progress) as lesson_progress_rows,
  (select count(*) from public.submissions) as submission_rows,
  (select count(*) from public.xp_ledger) as xp_ledger_rows,
  (select count(*) from public.enrollments) as enrollment_rows;

rollback;
