begin;
set local transaction read only;

with singing as(
  select id from public.courses where slug='singing'
), module_one as(
  select m.*
  from public.course_modules m
  join public.course_levels l on l.id=m.course_level_id
  join singing c on c.id=m.course_id
  where l.level_number=1 and m.level_module_number=1
), facts as(
  select
    m.id module_id,
    m.title,
    m.status,
    m.primary_video_url,
    m.video_title,
    m.video_provider,
    m.video_duration_seconds,
    (select count(*) from public.module_video_progress p where p.module_id=m.id) progress_rows,
    (select count(*) from public.xp_ledger x where x.module_id=m.id and x.metadata->>'component'='video') video_xp_rows,
    (select count(*) from public.xp_ledger x where x.module_id=m.id and x.metadata->>'component'='mastery') mastery_rows
  from module_one m
)
select *,
  case
    when status<>'published' then 'BLOCKED: MODULE_NOT_PUBLISHED'
    when nullif(trim(coalesce(primary_video_url,'')),'') is null then 'READY_FOR_INITIAL_MEDIA_ATTACHMENT'
    when primary_video_url !~* '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}/[^[:space:]?#]+\.(mp4|webm|m4v)(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then 'BLOCKED: UNSUPPORTED_MEDIA_URL'
    when nullif(trim(coalesce(video_title,'')),'') is null or video_provider not in('direct','cdn','supabase_storage') or video_duration_seconds is null then 'BLOCKED: INCOMPLETE_CANONICAL_MEDIA'
    else 'MEDIA_ATTACHED'
  end media_state
from facts;

select
  to_regprocedure('public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)') is not null attach_rpc_exists,
  to_regprocedure('public.jpac_record_module_video_progress(uuid,integer,integer)') is not null progress_rpc_exists,
  has_function_privilege('anon','public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)','EXECUTE') anon_can_attach,
  has_function_privilege('authenticated','public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)','EXECUTE') authenticated_can_reach_guarded_attach,
  has_function_privilege('anon','public.jpac_record_module_video_progress(uuid,integer,integer)','EXECUTE') anon_can_record_progress,
  has_function_privilege('authenticated','public.jpac_record_module_video_progress(uuid,integer,integer)','EXECUTE') authenticated_can_record_own_progress;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='module_video_progress' and column_name='last_reported_position_seconds') reported_position_column_exists,
  position('public.is_admin()' in pg_get_functiondef('public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)'::regprocedure))>0 internal_admin_guard_exists,
  position('for update' in lower(pg_get_functiondef('public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)'::regprocedure)))>0 module_row_lock_exists,
  position('last_watched_at' in pg_get_functiondef('public.jpac_record_module_video_progress(uuid,integer,integer)'::regprocedure))>0 recent_report_window_exists,
  position('video_duration_seconds' in pg_get_functiondef('public.jpac_record_module_video_progress(uuid,integer,integer)'::regprocedure))>0 canonical_duration_enforced,
  to_regprocedure('public.jpac_sync_enrollment_progress(uuid,uuid)') is not null canonical_progress_dependency_exists,
  exists(select 1 from pg_trigger where tgrelid='public.xp_ledger'::regclass and tgname='xp_ledger_sync_canonical_progress' and not tgisinternal) canonical_progress_trigger_exists;

select
  count(*) filter(where m.status<>'archived') beginner_modules,
  count(*) filter(where exists(
    select 1 from public.xp_ledger x
    where x.module_id=m.id and x.xp_type='core' and x.metadata->>'component'='mastery'
  )) modules_with_mastery_evidence,
  sum(m.core_xp) filter(where m.status<>'archived') beginner_core_xp
from public.course_modules m
join public.course_levels l on l.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and l.level_number=1;

rollback;
