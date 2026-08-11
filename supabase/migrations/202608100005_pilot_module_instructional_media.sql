begin;

do $$
begin
  if to_regprocedure('public.jpac_sync_enrollment_progress(uuid,uuid)') is null
    or not exists(
      select 1 from pg_trigger
      where tgrelid='public.xp_ledger'::regclass
        and tgname='xp_ledger_sync_canonical_progress'
        and not tgisinternal
    ) then
    raise exception 'Migration 202608100004_pilot_canonical_progress_consistency.sql must be installed first';
  end if;
end $$;

-- Preserve the last server-accepted playback position separately from credited
-- watch time. Existing credited progress is retained exactly during backfill.
alter table public.module_video_progress
  add column if not exists last_reported_position_seconds integer;

update public.module_video_progress
set last_reported_position_seconds=watched_seconds
where last_reported_position_seconds is null;

alter table public.module_video_progress
  alter column last_reported_position_seconds set default 0,
  alter column last_reported_position_seconds set not null;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conrelid='public.module_video_progress'::regclass
      and conname='module_video_progress_reported_position_check'
  ) then
    alter table public.module_video_progress
      add constraint module_video_progress_reported_position_check
      check(last_reported_position_seconds>=0);
  end if;
end $$;

create or replace function public.curriculum_attach_initial_module_media(
  target_module uuid,
  media_title text,
  media_provider text,
  media_url text,
  media_duration_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  module_row public.course_modules%rowtype;
  normalized_provider text:=lower(trim(coalesce(media_provider,'')));
  normalized_url text:=trim(coalesce(media_url,''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator or developer access required';
  end if;

  select * into module_row
  from public.course_modules
  where id=target_module
  for update;

  if module_row.id is null then raise exception 'Module not found'; end if;
  if module_row.status<>'published' then raise exception 'Initial-media attachment is limited to published modules'; end if;
  if nullif(trim(coalesce(module_row.primary_video_url,'')),'') is not null then raise exception 'Instructional media is already attached and cannot be replaced'; end if;
  if exists(select 1 from public.module_video_progress where module_id=target_module) then raise exception 'Instructional media cannot be attached after video progress exists'; end if;
  if nullif(trim(coalesce(media_title,'')),'') is null then raise exception 'Video title is required'; end if;
  if normalized_provider not in('direct','cdn','supabase_storage') then raise exception 'Unsupported instructional media provider'; end if;
  if normalized_url !~* '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}/[^[:space:]?#]+\.(mp4|webm|m4v)(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then raise exception 'An approved HTTPS MP4, WebM, or M4V media URL with a valid public hostname is required'; end if;
  if media_duration_seconds is null or media_duration_seconds<1 or media_duration_seconds>7200 then raise exception 'Video duration must be between 1 and 7200 seconds'; end if;

  update public.course_modules
  set primary_video_url=normalized_url,
      video_title=trim(media_title),
      video_provider=normalized_provider,
      video_duration_seconds=media_duration_seconds,
      updated_at=now()
  where id=target_module;

  return jsonb_build_object(
    'module_id',target_module,
    'video_title',trim(media_title),
    'video_provider',normalized_provider,
    'primary_video_url',normalized_url,
    'video_duration_seconds',media_duration_seconds
  );
end;
$$;

revoke all on function public.curriculum_attach_initial_module_media(uuid,text,text,text,integer) from public,anon;
grant execute on function public.curriculum_attach_initial_module_media(uuid,text,text,text,integer) to authenticated;

create or replace function public.jpac_record_module_video_progress(target_module uuid,watched integer,duration integer)
returns numeric
language plpgsql
security definer
set search_path=public
as $$
declare
  pct numeric;
  canonical_duration integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if watched<0 or duration<=0 or watched>duration+5 then raise exception 'Invalid video progress'; end if;

  select m.video_duration_seconds into canonical_duration
  from public.course_modules m
  where m.id=target_module
    and m.status='published'
    and nullif(trim(coalesce(m.primary_video_url,'')),'') is not null
    and public.jpac_student_has_course_access(m.course_id);

  if canonical_duration is null or not public.jpac_module_is_unlocked(target_module,auth.uid()) then raise exception 'Module media access required'; end if;
  if abs(duration-canonical_duration)>2 then raise exception 'Reported duration does not match canonical instructional media'; end if;
  if exists(
    select 1 from public.module_video_progress p
    where p.student_id=auth.uid() and p.module_id=target_module
      and p.duration_seconds<>canonical_duration
  ) then raise exception 'Historical video duration conflicts with canonical instructional media'; end if;

  insert into public.module_video_progress(
    student_id,module_id,watched_seconds,duration_seconds,last_reported_position_seconds
  ) values(
    auth.uid(),target_module,least(watched,canonical_duration,10),canonical_duration,least(watched,canonical_duration)
  )
  on conflict(student_id,module_id) do update set
    watched_seconds=least(
      canonical_duration,
      module_video_progress.watched_seconds+least(
        greatest(excluded.last_reported_position_seconds-module_video_progress.last_reported_position_seconds,0),
        greatest(floor(extract(epoch from now()-module_video_progress.last_watched_at))::integer,0),
        10
      )
    ),
    duration_seconds=canonical_duration,
    last_reported_position_seconds=least(
      canonical_duration,
      module_video_progress.last_reported_position_seconds+least(
        greatest(excluded.last_reported_position_seconds-module_video_progress.last_reported_position_seconds,0),
        greatest(floor(extract(epoch from now()-module_video_progress.last_watched_at))::integer,0),
        10
      )
    ),
    last_watched_at=now();

  update public.module_video_progress
  set completed_at=coalesce(completed_at,now())
  where student_id=auth.uid() and module_id=target_module and percent_watched>=90;

  select p.percent_watched into pct
  from public.module_video_progress p
  where p.student_id=auth.uid() and p.module_id=target_module;

  if pct>=90 then
    perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');
    perform public.jpac_finalize_module_mastery(auth.uid(),target_module);
  end if;
  return pct;
end;
$$;

revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_module_video_progress(uuid,integer,integer) to authenticated;

commit;
