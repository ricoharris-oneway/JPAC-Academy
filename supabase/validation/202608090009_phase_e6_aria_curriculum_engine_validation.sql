begin transaction read only;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('curriculum_proposal_sources','curriculum_versions','curriculum_version_items') order by c.relname;
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename in('curriculum_sources','curriculum_source_sections','curriculum_proposals','curriculum_proposal_sources','curriculum_versions','curriculum_version_items') order by tablename,policyname;
select schemaname,tablename,policyname,roles,cmd from pg_policies where schemaname='storage' and tablename='objects' and policyname='curriculum_source_files_admin_only';
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='curriculum-sources';
select has_table_privilege('anon','public.curriculum_versions','SELECT') as anon_versions_select,has_table_privilege('anon','public.curriculum_source_sections','SELECT') as anon_sources_select;
select (select count(*) from public.lesson_progress) lesson_progress_rows,(select count(*) from public.submissions) submission_rows,(select count(*) from public.xp_ledger) xp_ledger_rows,(select count(*) from public.enrollments) enrollment_rows;
select count(*) filter(where status='published') as published_versions,count(*) filter(where status='staged') as staged_versions from public.curriculum_versions;
rollback;
