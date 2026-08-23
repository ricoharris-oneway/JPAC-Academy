-- JPAC Community Wall v1 post-validation. READ ONLY.
begin transaction read only;

with expected_tables(table_name) as (
  values ('community_posts'),('community_comments'),('community_reactions'),('community_moderation_actions'),('community_reports')
), table_state as (
  select count(*) filter (where to_regclass(format('public.%I',table_name)) is not null)::int found,
    coalesce(string_agg(table_name,', ' order by table_name) filter (where to_regclass(format('public.%I',table_name)) is null),'none') missing
  from expected_tables
), expected_columns(table_name,column_name) as (
  values
    ('community_posts','id'),('community_posts','author_id'),('community_posts','post_type'),('community_posts','body'),('community_posts','status'),('community_posts','media_url'),('community_posts','submission_id'),('community_posts','is_announcement'),('community_posts','reviewed_by'),('community_posts','reviewed_at'),('community_posts','review_note'),('community_posts','created_at'),('community_posts','updated_at'),
    ('community_comments','id'),('community_comments','post_id'),('community_comments','author_id'),('community_comments','body'),('community_comments','status'),('community_comments','reviewed_by'),('community_comments','reviewed_at'),('community_comments','review_note'),('community_comments','created_at'),('community_comments','updated_at'),
    ('community_reactions','id'),('community_reactions','actor_id'),('community_reactions','post_id'),('community_reactions','comment_id'),('community_reactions','reaction_type'),('community_reactions','created_at'),
    ('community_moderation_actions','id'),('community_moderation_actions','actor_id'),('community_moderation_actions','post_id'),('community_moderation_actions','comment_id'),('community_moderation_actions','report_id'),('community_moderation_actions','action'),('community_moderation_actions','previous_status'),('community_moderation_actions','new_status'),('community_moderation_actions','reason'),('community_moderation_actions','metadata'),('community_moderation_actions','created_at'),
    ('community_reports','id'),('community_reports','reporter_id'),('community_reports','post_id'),('community_reports','comment_id'),('community_reports','reason_category'),('community_reports','details'),('community_reports','status'),('community_reports','assigned_to'),('community_reports','resolution'),('community_reports','resolved_at'),('community_reports','created_at'),('community_reports','updated_at')
), column_state as (
  select count(*)::int expected,count(*) filter (where c.column_name is not null)::int found,
    coalesce(string_agg(e.table_name||'.'||e.column_name,', ' order by e.table_name,e.column_name) filter (where c.column_name is null),'none') missing
  from expected_columns e
  left join information_schema.columns c on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
), constraint_state as (
  select
    count(*) filter (where con.contype='p')::int primary_keys,
    count(*) filter (where con.contype='f')::int foreign_keys,
    count(*) filter (where con.contype='c')::int check_constraints,
    count(*) filter (where con.contype='c' and cls.relname='community_posts' and pg_get_constraintdef(con.oid) like '%needs_revision%')::int post_status_checks,
    count(*) filter (where con.contype='c' and cls.relname='community_comments' and pg_get_constraintdef(con.oid) like '%needs_revision%')::int comment_status_checks,
    count(*) filter (where con.contype='c' and cls.relname='community_reactions' and pg_get_constraintdef(con.oid) like '%applause%' and pg_get_constraintdef(con.oid) like '%encourage%')::int reaction_type_checks,
    count(*) filter (where con.contype='c' and cls.relname='community_moderation_actions' and pg_get_constraintdef(con.oid) like '%resolved_report%' and pg_get_constraintdef(con.oid) like '%requested_revision%')::int action_checks,
    count(*) filter (where con.contype='c' and cls.relname='community_reports' and pg_get_constraintdef(con.oid) like '%resolved%' and pg_get_constraintdef(con.oid) like '%dismissed%')::int report_status_checks
  from pg_constraint con
  join pg_class cls on cls.oid=con.conrelid
  join pg_namespace n on n.oid=cls.relnamespace
  where n.nspname='public' and cls.relname in (select table_name from expected_tables)
), expected_indexes(index_name) as (
  values
    ('community_reactions_actor_post_type_uidx'),('community_reactions_actor_comment_type_uidx'),
    ('community_posts_moderation_queue_idx'),('community_posts_approved_feed_idx'),('community_posts_author_idx'),
    ('community_comments_post_approved_idx'),('community_comments_moderation_queue_idx'),('community_comments_author_idx'),
    ('community_reactions_post_idx'),('community_reactions_comment_idx'),
    ('community_reports_open_queue_idx'),('community_reports_reporter_idx'),
    ('community_moderation_actions_post_idx'),('community_moderation_actions_comment_idx'),('community_moderation_actions_report_idx')
), index_state as (
  select count(*)::int expected,count(i.indexname)::int found,
    coalesce(string_agg(e.index_name,', ' order by e.index_name) filter (where i.indexname is null),'none') missing
  from expected_indexes e
  left join pg_indexes i on i.schemaname='public' and i.indexname=e.index_name
), rls_state as (
  select count(*)::int tables,count(*) filter (where c.relrowsecurity)::int enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (select table_name from expected_tables)
), policy_state as (
  select count(*)::int policies from pg_policies where schemaname='public' and tablename in (select table_name from expected_tables)
), privilege_state as (
  select count(*) filter (where
    has_table_privilege('anon',format('public.%I',table_name),'SELECT')
    or has_table_privilege('anon',format('public.%I',table_name),'INSERT')
    or has_table_privilege('anon',format('public.%I',table_name),'UPDATE')
    or has_table_privilege('anon',format('public.%I',table_name),'DELETE')
  )::int anon_privileged
  from expected_tables
), row_state as (
  select
    (select count(*) from public.community_posts)::int posts,
    (select count(*) from public.community_comments)::int comments,
    (select count(*) from public.community_reactions)::int reactions,
    (select count(*) from public.community_moderation_actions)::int moderation_actions,
    (select count(*) from public.community_reports)::int reports
), expected_courses(slug,expected_modules) as (
  values ('singing',40),('piano',49),('guitar',50),('acting',46),('dance',47),('video-production',49),('audio-engineering',48),('music-production-songwriting',48),('music-business',48),('digital-ai-creator',48)
), protected_counts as (
  select e.slug,e.expected_modules,count(distinct c.id)::int course_rows,count(m.id)::int actual_modules
  from expected_courses e left join public.courses c on c.slug=e.slug left join public.course_modules m on m.course_id=c.id
  group by e.slug,e.expected_modules
), protected_summary as (
  select count(*) filter (where course_rows<>1 or actual_modules<>expected_modules)::int mismatches,
    jsonb_object_agg(slug,jsonb_build_object('courses',course_rows,'modules',actual_modules,'expected',expected_modules) order by slug) counts
  from protected_counts
), assignment_swap as (
  select
    (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpc_count,
    (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), student_state as (
  select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,(select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,(select count(*) from public.lesson_progress)::int lesson_progress
), findings as (
  select 'SCHEMA','FIVE_TABLES',case when found=5 then 'PASS' else 'BLOCK' end result,format('tables=%s/5; missing=%s',found,missing) details from table_state
  union all select 'SCHEMA','REQUIRED_COLUMNS',case when found=expected then 'PASS' else 'BLOCK' end,format('columns=%s/%s; missing=%s',found,expected,missing) from column_state
  union all select 'SCHEMA','CONSTRAINTS',case when primary_keys=5 and foreign_keys=17 and check_constraints>=23 and post_status_checks=1 and comment_status_checks=1 and reaction_type_checks=1 and action_checks>=1 and report_status_checks>=1 then 'PASS' else 'BLOCK' end,format('primary keys=%s/5; foreign keys=%s/17; checks=%s (minimum 23); status/action/reaction definitions=%s/%s/%s/%s/%s',primary_keys,foreign_keys,check_constraints,post_status_checks,comment_status_checks,reaction_type_checks,action_checks,report_status_checks) from constraint_state
  union all select 'SCHEMA','INDEXES',case when found=expected then 'PASS' else 'BLOCK' end,format('indexes=%s/%s; missing=%s',found,expected,missing) from index_state
  union all select 'DATA SAFETY','NO_SEED_ROWS',case when posts+comments+reactions+moderation_actions+reports=0 then 'PASS' else 'BLOCK' end,format('posts=%s; comments=%s; reactions=%s; moderation actions=%s; reports=%s',posts,comments,reactions,moderation_actions,reports) from row_state
  union all select 'ACCESS CONTROL','RLS_ENABLED',case when tables=5 and enabled=5 then 'PASS' else 'BLOCK' end,format('RLS enabled=%s/%s',enabled,tables) from rls_state
  union all select 'ACCESS CONTROL','CONSERVATIVE_POLICIES',case when policies=17 then 'PASS' else 'BLOCK' end,format('RLS policies=%s/17; approved feed is authenticated/internal and moderation is staff-scoped',policies) from policy_state
  union all select 'ACCESS CONTROL','NO_ANON_TABLE_PRIVILEGES',case when anon_privileged=0 then 'PASS' else 'BLOCK' end,format('community tables with anonymous CRUD privileges=%s/0',anon_privileged) from privilege_state
  union all select 'PROTECTED CURRICULUM','MODULE_COUNTS',case when mismatches=0 then 'PASS' else 'BLOCK' end,format('mismatches=%s; counts=%s',mismatches,counts) from protected_summary
  union all select 'ASSIGNMENT SWAP','BASELINE',case when rpc_count=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('required RPCs=%s/2; approved audit rows=%s/2',rpc_count,audit_rows) from assignment_swap
  union all select 'STUDENT STATE','BASELINE',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
  union all select 'CERTIFICATE SAFETY','ZERO_CERTIFICATES',case when certificates=0 then 'PASS' else 'BLOCK' end,format('certificate rows=%s/0',certificates) from student_state
), summary as (
  select count(*) filter (where result='BLOCK')::int blockers from findings
)
select report_section,code,result,details from findings
union all select 'COMMUNITY WALL POST-VALIDATION','OVERALL',case when blockers=0 then 'PASS' else 'BLOCK' end,format('blockers=%s',blockers) from summary
order by report_section,code;

rollback;
