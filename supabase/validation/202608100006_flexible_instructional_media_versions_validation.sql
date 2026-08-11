begin;
set local transaction read only;

select
  to_regclass('public.module_instructional_media') is not null as media_table_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='course_modules' and column_name='active_instructional_media_id') as active_pointer_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='module_video_progress' and column_name='media_id' and is_nullable='NO') as progress_media_identity_required,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='module_video_progress' and column_name='last_reported_position_seconds' and is_nullable='NO') as playback_position_available_without_100005,
  exists(select 1 from pg_constraint where conrelid='public.module_video_progress'::regclass and conname='module_video_progress_pkey' and pg_get_constraintdef(oid) ilike '%student_id, module_id, media_id%') as versioned_progress_primary_key,
  exists(select 1 from pg_constraint where conrelid='public.module_video_progress'::regclass and conname='module_video_progress_media_module_fkey') as progress_media_module_integrity,
  exists(select 1 from pg_constraint where conrelid='public.course_modules'::regclass and conname='course_modules_active_instructional_media_module_fkey') as active_media_module_integrity,
  exists(select 1 from pg_indexes where schemaname='public' and tablename='module_instructional_media' and indexname='module_instructional_media_one_active_idx') as one_active_index_exists;

select
  count(*) as media_versions,
  count(*) filter(where status='active') as active_versions,
  count(*) filter(where status='retired') as retired_versions,
  count(*) filter(where status='draft') as draft_versions,
  count(*)-count(distinct (module_id,version_number)) as duplicate_module_versions,
  count(*) filter(where status='active' and duration_seconds is null) as active_without_duration
from public.module_instructional_media;

select
  count(*) as progress_rows,
  count(*) filter(where media_id is null) as unmapped_progress_rows,
  count(*) filter(where media.module_id<>p.module_id) as cross_module_mappings,
  count(*) filter(where p.watched_seconds<0 or p.watched_seconds>p.duration_seconds or p.percent_watched<0 or p.percent_watched>100) as invalid_progress_rows
from public.module_video_progress p
left join public.module_instructional_media media on media.id=p.media_id;

select
  count(*) as configured_modules,
  count(*) filter(where active_instructional_media_id is null) as configured_without_active_version,
  count(*) filter(where media.id is null) as broken_active_pointer,
  count(*) filter(where media.id is not null and (
    media.module_id<>m.id or media.status<>'active' or media.normalized_url is distinct from m.primary_video_url
    or media.title is distinct from m.video_title or media.provider is distinct from m.video_provider
    or media.duration_seconds is distinct from m.video_duration_seconds
  )) as projection_mismatches
from public.course_modules m
left join public.module_instructional_media media on media.id=m.active_instructional_media_id
where nullif(trim(coalesce(m.primary_video_url,'')),'') is not null;

select
  to_regprocedure('public.curriculum_set_instructional_media(uuid,text,text,integer)') is not null as atomic_set_rpc_exists,
  to_regprocedure('public.curriculum_update_instructional_media_metadata(uuid,text,integer)') is not null as metadata_rpc_exists,
  to_regprocedure('public.curriculum_activate_instructional_media(uuid,text,integer)') is not null as activation_rpc_exists,
  to_regprocedure('public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer)') is not null as progress_rpc_exists,
  to_regprocedure('public.jpac_complete_instructional_media(uuid,uuid)') is not null as completion_rpc_exists,
  has_function_privilege('anon','public.curriculum_set_instructional_media(uuid,text,text,integer)','EXECUTE') as anon_can_set_media,
  has_function_privilege('authenticated','public.curriculum_set_instructional_media(uuid,text,text,integer)','EXECUTE') as authenticated_reaches_internal_admin_guard,
  has_function_privilege('authenticated','public.curriculum_create_instructional_media(uuid,text,text)','EXECUTE') as authenticated_can_call_non_atomic_create,
  has_function_privilege('authenticated','public.curriculum_activate_instructional_media(uuid,text,integer)','EXECUTE') as authenticated_reaches_guarded_draft_activation,
  coalesce(not has_function_privilege('authenticated',to_regprocedure('public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)'),'EXECUTE'),true) as optional_100005_attachment_absent_or_revoked,
  coalesce(not has_function_privilege('authenticated',to_regprocedure('public.jpac_record_module_video_progress(uuid,integer,integer)'),'EXECUTE'),true) as optional_100005_progress_absent_or_revoked,
  coalesce(not has_function_privilege('anon',to_regprocedure('public.curriculum_attach_initial_module_media(uuid,text,text,text,integer)'),'EXECUTE'),true) as optional_100005_attachment_not_anonymous,
  coalesce(not has_function_privilege('anon',to_regprocedure('public.jpac_record_module_video_progress(uuid,integer,integer)'),'EXECUTE'),true) as optional_100005_progress_not_anonymous,
  has_function_privilege('authenticated','public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer)','EXECUTE') as versioned_progress_callable,
  has_function_privilege('anon','public.jpac_complete_instructional_media(uuid,uuid)','EXECUTE') as anon_can_complete_media,
  has_function_privilege('authenticated','public.jpac_complete_instructional_media(uuid,uuid)','EXECUTE') as authenticated_completion_reaches_internal_guards;

select
  public.jpac_normalize_instructional_media_url('https://www.youtube.com/watch?v=dQw4w9WgXcQ')->>'provider' as youtube_watch_provider,
  public.jpac_normalize_instructional_media_url('https://youtu.be/dQw4w9WgXcQ?t=10')->>'provider_media_id' as youtube_short_identity,
  public.jpac_normalize_instructional_media_url('https://www.youtube.com/embed/dQw4w9WgXcQ?start=10')->>'normalized_url' as youtube_embed_normalized,
  public.jpac_normalize_instructional_media_url('https://cdn.example.com/media/module-1.MP4?token=test')->>'provider' as direct_provider,
  (public.jpac_normalize_instructional_media_url('https://cdn.example.com/media/module-1.MP4?token=test')->>'provider_media_id')=
    (public.jpac_normalize_instructional_media_url('https://cdn.example.com/media/module-1.MP4?token=test')->>'normalized_url') as direct_identity_is_exact_canonical_url,
  position('digest(' in lower(pg_get_functiondef('public.jpac_normalize_instructional_media_url(text)'::regprocedure)))=0 as normalizer_has_no_pgcrypto_dependency;

select
  position('public.is_admin()' in pg_get_functiondef('public.curriculum_set_instructional_media(uuid,text,text,integer)'::regprocedure))>0 as set_internal_admin_guard,
  position('for update' in lower(pg_get_functiondef('public.curriculum_activate_instructional_media(uuid,text,integer)'::regprocedure)))>0 as replacement_row_lock,
  position('active_instructional_media_id' in pg_get_functiondef('public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer)'::regprocedure))>0 as active_media_enforced,
  position('last_watched_at' in pg_get_functiondef('public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer)'::regprocedure))>0 as recent_forward_credit_enforced,
  position('completed_at' in pg_get_functiondef('public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer)'::regprocedure))=0 as progress_does_not_complete_media,
  position('active_instructional_media_id' in pg_get_functiondef('public.jpac_complete_instructional_media(uuid,uuid)'::regprocedure))>0 as completion_requires_active_media,
  position('jpac_student_has_course_access' in pg_get_functiondef('public.jpac_complete_instructional_media(uuid,uuid)'::regprocedure))>0 as completion_requires_entitlement,
  position('jpac_module_is_unlocked' in pg_get_functiondef('public.jpac_complete_instructional_media(uuid,uuid)'::regprocedure))>0 as completion_requires_unlock,
  position('completed_at is not null' in lower(pg_get_functiondef('public.jpac_finalize_module_mastery(uuid,uuid)'::regprocedure)))>0 as mastery_uses_durable_completion,
  position('percent_watched>=90' in replace(lower(pg_get_functiondef('public.jpac_finalize_module_mastery(uuid,uuid)'::regprocedure)),' ',''))=0 as mastery_has_no_percentage_threshold,
  position('metadata->>''component''=''video''' in pg_get_functiondef('public.jpac_module_completion(uuid,uuid)'::regprocedure))>0 as durable_video_evidence_preserved,
  to_regprocedure('public.jpac_sync_enrollment_progress(uuid,uuid)') is not null as canonical_progress_dependency_exists,
  exists(select 1 from pg_trigger where tgrelid='public.xp_ledger'::regclass and tgname='xp_ledger_sync_canonical_progress' and not tgisinternal) as mastery_progress_trigger_exists;

select
  count(*) filter(where metadata->>'component'='video') as video_xp_rows,
  count(*) filter(where metadata->>'component'='mastery') as mastery_xp_rows,
  count(*) as total_xp_rows
from public.xp_ledger;

select
  (select count(*) from public.submissions) as submission_rows,
  (select count(*) from public.lesson_progress) as lesson_progress_rows,
  (select count(*) from public.enrollments) as enrollment_rows,
  (select count(*) from public.wix_member_links) as wix_link_rows;

rollback;
