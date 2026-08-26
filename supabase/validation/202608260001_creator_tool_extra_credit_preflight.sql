-- Read-only: performs no writes.
with findings(report_section,code,result,details) as (
select 'TARGET SCHEMA','TABLES_ABSENT',case when count(*)=0 then 'PASS' else 'BLOCK' end,format('existing target tables=%s',count(*)) from information_schema.tables where table_schema='public' and table_name in ('creator_tool_extra_credit_submissions','creator_tool_extra_credit_submission_events')
union all select 'TARGET SCHEMA','FUNCTIONS_ABSENT',case when count(*)=0 then 'PASS' else 'BLOCK' end,format('existing target functions=%s',count(*)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('creator_tool_extra_credit_log_submission','creator_tool_extra_credit_withdraw','creator_tool_extra_credit_review')
union all select 'DEPENDENCIES','PROFILES',case when to_regclass('public.profiles') is not null then 'PASS' else 'BLOCK' end,'public.profiles must exist'
union all select 'DEPENDENCIES','STAFF_HELPER',case when to_regprocedure('public.is_staff()') is not null then 'PASS' else 'BLOCK' end,'public.is_staff() must exist'
union all select 'DEPENDENCIES','UPDATED_AT_HELPER',case when to_regprocedure('public.set_updated_at()') is not null then 'PASS' else 'BLOCK' end,'public.set_updated_at() must exist'
union all select 'SAFETY','PROTECTED_TABLES',case when count(*)=7 then 'PASS' else 'BLOCK' end,format('protected tables present=%s/7',count(*)) from information_schema.tables where table_schema='public' and table_name in ('courses','course_modules','enrollments','submissions','xp_ledger','lesson_progress','certificates')),
overall as(select 'OVERALL','PREFLIGHT',case when count(*) filter(where result='BLOCK')=0 then 'PASS' else 'BLOCK' end,format('blockers=%s',count(*) filter(where result='BLOCK')) from findings)
select * from findings union all select * from overall order by 1,2;
