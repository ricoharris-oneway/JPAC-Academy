begin;

do $$
begin
  if to_regprocedure('public.jpac_sync_enrollment_progress(uuid,uuid)') is null
    or to_regprocedure('public.jpac_record_module_video_progress(uuid,integer,integer)') is null
    or not exists(select 1 from pg_trigger where tgrelid='public.xp_ledger'::regclass and tgname='xp_ledger_sync_canonical_progress' and not tgisinternal)
  then raise exception 'Migrations 202608100004 and 202608100005 must be installed first';
  end if;
end $$;

create or replace function public.jpac_normalize_instructional_media_url(media_url text)
returns jsonb
language plpgsql
immutable
set search_path=public
as $$
declare
  source text:=trim(coalesce(media_url,''));
  video_id text;
begin
  if source='' or source~'[<>]' then raise exception 'A supported HTTPS video URL is required'; end if;

  if source~* '^https://(www\.|m\.)?youtube\.com/watch\?[^[:space:]#]+(#[^[:space:]]*)?$' then
    video_id:=substring(source from '(?i)[?&]v=([A-Za-z0-9_-]{11})(&|#|$)');
  elsif source~* '^https://youtu\.be/[A-Za-z0-9_-]{11}(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then
    video_id:=substring(source from '(?i)^https://youtu\.be/([A-Za-z0-9_-]{11})');
  elsif source~* '^https://(www\.)?youtube\.com/embed/[A-Za-z0-9_-]{11}(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then
    video_id:=substring(source from '(?i)/embed/([A-Za-z0-9_-]{11})');
  elsif source~* '^https://www\.youtube-nocookie\.com/embed/[A-Za-z0-9_-]{11}(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then
    video_id:=substring(source from '(?i)/embed/([A-Za-z0-9_-]{11})');
  end if;

  if video_id is not null and video_id~'^[A-Za-z0-9_-]{11}$' then
    return jsonb_build_object(
      'provider','youtube',
      'provider_media_id',video_id,
      'normalized_url','https://www.youtube.com/watch?v='||video_id
    );
  end if;

  if source~* '^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}/[^[:space:]?#]+\.(mp4|webm|m4v)(\?[^[:space:]#]*)?(#[^[:space:]]*)?$' then
    return jsonb_build_object(
      'provider','direct',
      'provider_media_id',encode(digest(source,'sha256'),'hex'),
      'normalized_url',source
    );
  end if;

  raise exception 'Supported media must be a YouTube URL or an HTTPS MP4, WebM, or M4V URL';
end;
$$;

revoke all on function public.jpac_normalize_instructional_media_url(text) from public,anon,authenticated;

create table if not exists public.module_instructional_media(
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete restrict,
  version_number integer not null check(version_number>0),
  provider text not null check(provider in('youtube','direct','legacy')),
  provider_media_id text not null,
  source_url text,
  normalized_url text,
  title text not null default '',
  duration_seconds integer check(duration_seconds is null or duration_seconds between 1 and 7200),
  status text not null default 'draft' check(status in('draft','active','retired')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz,
  replaces_media_id uuid references public.module_instructional_media(id) on delete restrict,
  constraint module_instructional_media_active_duration_check check(status<>'active' or duration_seconds is not null),
  constraint module_instructional_media_source_check check(provider='legacy' or (source_url is not null and normalized_url is not null)),
  unique(id,module_id),
  unique(module_id,version_number),
  unique(module_id,provider,provider_media_id)
);
create unique index if not exists module_instructional_media_one_active_idx on public.module_instructional_media(module_id) where status='active';
create index if not exists module_instructional_media_module_history_idx on public.module_instructional_media(module_id,version_number desc);

alter table public.course_modules add column if not exists active_instructional_media_id uuid;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.course_modules'::regclass and conname='course_modules_active_instructional_media_fkey') then
    alter table public.course_modules add constraint course_modules_active_instructional_media_fkey foreign key(active_instructional_media_id) references public.module_instructional_media(id) on delete restrict;
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.course_modules'::regclass and conname='course_modules_active_instructional_media_module_fkey') then
    alter table public.course_modules add constraint course_modules_active_instructional_media_module_fkey foreign key(active_instructional_media_id,id) references public.module_instructional_media(id,module_id) on delete restrict;
  end if;
end $$;

-- Fail closed if a prior partial/manual implementation conflicts with the
-- canonical version-one backfill target.
do $$
declare module_row record; normalized jsonb;
begin
  for module_row in
    select m.* from public.course_modules m
    where nullif(trim(coalesce(m.primary_video_url,'')),'') is not null
  loop
    normalized:=public.jpac_normalize_instructional_media_url(module_row.primary_video_url);
    if exists(
      select 1 from public.module_instructional_media media
      where media.module_id=module_row.id and media.version_number=1
        and (media.provider<>normalized->>'provider' or media.provider_media_id<>normalized->>'provider_media_id')
    ) then raise exception 'Unexpected version-one media identity for module %',module_row.id;
    end if;
  end loop;
end $$;

insert into public.module_instructional_media(
  module_id,version_number,provider,provider_media_id,source_url,normalized_url,title,duration_seconds,status,activated_at
)
select
  m.id,1,normalized.value->>'provider',normalized.value->>'provider_media_id',m.primary_video_url,normalized.value->>'normalized_url',
  coalesce(nullif(trim(m.video_title),''),case when normalized.value->>'provider'='youtube' then 'YouTube instructional video' else 'Instructional video' end),
  coalesce(m.video_duration_seconds,(select max(p.duration_seconds) from public.module_video_progress p where p.module_id=m.id)),
  case when coalesce(m.video_duration_seconds,(select max(p.duration_seconds) from public.module_video_progress p where p.module_id=m.id)) is null then 'draft' else 'active' end,
  case when coalesce(m.video_duration_seconds,(select max(p.duration_seconds) from public.module_video_progress p where p.module_id=m.id)) is null then null else now() end
from public.course_modules m
cross join lateral (select public.jpac_normalize_instructional_media_url(m.primary_video_url) value) normalized
where nullif(trim(coalesce(m.primary_video_url,'')),'') is not null
on conflict(module_id,version_number) do nothing;

-- Preserve otherwise orphaned historical progress under an auditable legacy
-- version without inventing a playable source.
insert into public.module_instructional_media(
  module_id,version_number,provider,provider_media_id,title,duration_seconds,status
)
select m.id,1,'legacy','legacy:'||m.id::text,'Legacy instructional media',max(p.duration_seconds),'retired'
from public.course_modules m join public.module_video_progress p on p.module_id=m.id
where not exists(select 1 from public.module_instructional_media media where media.module_id=m.id)
group by m.id
on conflict(module_id,version_number) do nothing;

update public.course_modules m
set active_instructional_media_id=media.id,
    primary_video_url=media.normalized_url,
    video_title=media.title,
    video_provider=media.provider,
    video_duration_seconds=media.duration_seconds,
    updated_at=now()
from public.module_instructional_media media
where media.module_id=m.id and media.status='active'
  and (m.active_instructional_media_id is distinct from media.id
    or m.primary_video_url is distinct from media.normalized_url
    or m.video_title is distinct from media.title
    or m.video_provider is distinct from media.provider
    or m.video_duration_seconds is distinct from media.duration_seconds);

alter table public.module_video_progress add column if not exists media_id uuid;
update public.module_video_progress p
set media_id=media.id
from public.module_instructional_media media
where media.module_id=p.module_id and media.version_number=1 and p.media_id is null;

do $$ begin
  if exists(select 1 from public.module_video_progress where media_id is null) then raise exception 'Every historical video-progress row must map to a media version'; end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.module_video_progress'::regclass and conname='module_video_progress_media_module_fkey') then
    alter table public.module_video_progress add constraint module_video_progress_media_module_fkey foreign key(media_id,module_id) references public.module_instructional_media(id,module_id) on delete restrict;
  end if;
end $$;

alter table public.module_video_progress alter column media_id set not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.module_video_progress'::regclass and conname='module_video_progress_media_id_fkey') then
    alter table public.module_video_progress add constraint module_video_progress_media_id_fkey foreign key(media_id) references public.module_instructional_media(id) on delete restrict;
  end if;
end $$;
alter table public.module_video_progress drop constraint if exists module_video_progress_pkey;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.module_video_progress'::regclass and conname='module_video_progress_pkey') then
    alter table public.module_video_progress add constraint module_video_progress_pkey primary key(student_id,module_id,media_id);
  end if;
end $$;
create index if not exists module_video_progress_active_lookup_idx on public.module_video_progress(student_id,module_id,media_id);

alter table public.module_instructional_media enable row level security;
drop policy if exists "staff read instructional media history" on public.module_instructional_media;
drop policy if exists "students read active instructional media" on public.module_instructional_media;
drop policy if exists "students read own historical instructional media" on public.module_instructional_media;
create policy "staff read instructional media history" on public.module_instructional_media for select to authenticated using(public.is_staff());
create policy "students read active instructional media" on public.module_instructional_media for select to authenticated using(
  status='active' and exists(
    select 1 from public.course_modules m
    where m.id=module_id and m.active_instructional_media_id=module_instructional_media.id
      and m.status='published' and public.jpac_student_has_course_access(m.course_id)
      and public.jpac_module_is_unlocked(m.id,auth.uid())
  )
);
create policy "students read own historical instructional media" on public.module_instructional_media for select to authenticated using(
  exists(select 1 from public.module_video_progress p where p.media_id=module_instructional_media.id and p.student_id=auth.uid())
);
grant select on public.module_instructional_media to authenticated;
revoke insert,update,delete on public.module_instructional_media from authenticated;

create or replace function public.jpac_protect_instructional_media_identity()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.id<>old.id or new.module_id<>old.module_id or new.version_number<>old.version_number
    or new.provider<>old.provider or new.provider_media_id<>old.provider_media_id
    or new.source_url is distinct from old.source_url or new.normalized_url is distinct from old.normalized_url
    or new.created_by is distinct from old.created_by or new.created_at<>old.created_at
  then raise exception 'Instructional media identity and source are immutable; create a replacement version'; end if;
  if old.status='retired' and new is distinct from old then raise exception 'Retired instructional media is immutable'; end if;
  if old.status='active' and new.status not in('active','retired') then raise exception 'Active instructional media may only be retired'; end if;
  return new;
end $$;
revoke all on function public.jpac_protect_instructional_media_identity() from public,anon,authenticated;
drop trigger if exists protect_instructional_media_identity on public.module_instructional_media;
create trigger protect_instructional_media_identity before update on public.module_instructional_media for each row execute function public.jpac_protect_instructional_media_identity();

create or replace function public.curriculum_create_instructional_media(target_module uuid,media_url text,media_title text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare module_row public.course_modules%rowtype; normalized jsonb; new_id uuid; next_version integer; previous_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  select * into module_row from public.course_modules where id=target_module for update;
  if module_row.id is null then raise exception 'Module not found'; end if;
  if module_row.status<>'published' then raise exception 'Published module required'; end if;
  normalized:=public.jpac_normalize_instructional_media_url(media_url);
  if exists(select 1 from public.module_instructional_media where module_id=target_module and provider=normalized->>'provider' and provider_media_id=normalized->>'provider_media_id') then raise exception 'This media already exists in the module history'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.module_instructional_media where module_id=target_module;
  select id into previous_id from public.module_instructional_media where module_id=target_module and status='active';
  insert into public.module_instructional_media(module_id,version_number,provider,provider_media_id,source_url,normalized_url,title,status,created_by,replaces_media_id)
  values(target_module,next_version,normalized->>'provider',normalized->>'provider_media_id',trim(media_url),normalized->>'normalized_url',coalesce(nullif(trim(media_title),''),''),'draft',auth.uid(),previous_id)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.curriculum_update_instructional_media_metadata(target_media uuid,media_title text,media_duration_seconds integer)
returns void language plpgsql security definer set search_path=public as $$
declare media_row public.module_instructional_media%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  select * into media_row from public.module_instructional_media where id=target_media for update;
  if media_row.id is null then raise exception 'Media not found'; end if;
  if media_row.status='retired' then raise exception 'Retired media metadata is immutable'; end if;
  if nullif(trim(coalesce(media_title,'')),'') is null then raise exception 'Video title is required'; end if;
  if media_duration_seconds is null or media_duration_seconds not between 1 and 7200 then raise exception 'Video duration must be between 1 and 7200 seconds'; end if;
  if media_row.status='active' and media_duration_seconds<>media_row.duration_seconds and exists(select 1 from public.module_video_progress where media_id=target_media) then raise exception 'Active media duration cannot change after progress exists'; end if;
  update public.module_instructional_media set title=trim(media_title),duration_seconds=media_duration_seconds where id=target_media;
  if media_row.status='active' then update public.course_modules set video_title=trim(media_title),video_duration_seconds=media_duration_seconds,updated_at=now() where id=media_row.module_id and active_instructional_media_id=target_media; end if;
end $$;

create or replace function public.curriculum_activate_instructional_media(target_media uuid,media_title text,media_duration_seconds integer)
returns void language plpgsql security definer set search_path=public as $$
declare media_identity record; media_row public.module_instructional_media%rowtype; module_row public.course_modules%rowtype; old_active uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  select module_id into media_identity from public.module_instructional_media where id=target_media;
  if media_identity.module_id is null then raise exception 'Media not found'; end if;
  select * into module_row from public.course_modules where id=media_identity.module_id for update;
  select * into media_row from public.module_instructional_media where id=target_media for update;
  if media_row.status<>'draft' then raise exception 'Only draft media can be activated'; end if;
  if nullif(trim(coalesce(media_title,'')),'') is null then raise exception 'Video title is required'; end if;
  if media_duration_seconds is null or media_duration_seconds not between 1 and 7200 then raise exception 'Video duration must be between 1 and 7200 seconds'; end if;
  select id into old_active from public.module_instructional_media where module_id=module_row.id and status='active' for update;
  if old_active is not null then update public.module_instructional_media set status='retired',retired_at=now() where id=old_active; end if;
  update public.module_instructional_media set title=trim(media_title),duration_seconds=media_duration_seconds,status='active',activated_at=now(),retired_at=null where id=target_media;
  update public.course_modules set active_instructional_media_id=target_media,primary_video_url=media_row.normalized_url,video_title=trim(media_title),video_provider=media_row.provider,video_duration_seconds=media_duration_seconds,updated_at=now() where id=module_row.id;
end $$;

create or replace function public.curriculum_set_instructional_media(target_module uuid,media_url text,media_title text,media_duration_seconds integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_media uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  new_media:=public.curriculum_create_instructional_media(target_module,media_url,media_title);
  perform public.curriculum_activate_instructional_media(new_media,media_title,media_duration_seconds);
  return new_media;
end $$;

revoke all on function public.curriculum_create_instructional_media(uuid,text,text) from public,anon;
revoke all on function public.curriculum_update_instructional_media_metadata(uuid,text,integer) from public,anon;
revoke all on function public.curriculum_activate_instructional_media(uuid,text,integer) from public,anon;
revoke all on function public.curriculum_set_instructional_media(uuid,text,text,integer) from public,anon;
revoke all on function public.curriculum_create_instructional_media(uuid,text,text) from authenticated;
grant execute on function public.curriculum_update_instructional_media_metadata(uuid,text,integer) to authenticated;
grant execute on function public.curriculum_activate_instructional_media(uuid,text,integer) to authenticated;
grant execute on function public.curriculum_set_instructional_media(uuid,text,text,integer) to authenticated;

-- Supersede the module-only attachment and progress entry points from 100005.
revoke all on function public.curriculum_attach_initial_module_media(uuid,text,text,text,integer) from authenticated;
revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from authenticated;

create or replace function public.jpac_record_instructional_media_progress(target_module uuid,target_media uuid,watched integer,duration integer)
returns numeric language plpgsql security definer set search_path=public as $$
declare pct numeric; canonical_duration integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if watched<0 or duration<=0 or watched>duration+5 then raise exception 'Invalid video progress'; end if;
  select media.duration_seconds into canonical_duration
  from public.course_modules m join public.module_instructional_media media on media.id=m.active_instructional_media_id
  where m.id=target_module and media.id=target_media and media.module_id=m.id and media.status='active'
    and m.status='published' and public.jpac_student_has_course_access(m.course_id)
    and public.jpac_module_is_unlocked(m.id,auth.uid())
  for share of m,media;
  if canonical_duration is null then raise exception 'Active module media access required'; end if;
  if abs(duration-canonical_duration)>2 then raise exception 'Reported duration does not match active instructional media'; end if;
  if exists(select 1 from public.module_video_progress p where p.student_id=auth.uid() and p.module_id=target_module and p.media_id=target_media and p.duration_seconds<>canonical_duration) then raise exception 'Historical video duration conflicts with active instructional media'; end if;

  insert into public.module_video_progress(student_id,module_id,media_id,watched_seconds,duration_seconds,last_reported_position_seconds)
  values(auth.uid(),target_module,target_media,least(watched,canonical_duration,10),canonical_duration,least(watched,canonical_duration))
  on conflict(student_id,module_id,media_id) do update set
    watched_seconds=least(canonical_duration,module_video_progress.watched_seconds+least(
      greatest(excluded.last_reported_position_seconds-module_video_progress.last_reported_position_seconds,0),
      greatest(floor(extract(epoch from now()-module_video_progress.last_watched_at))::integer,0),10)),
    duration_seconds=canonical_duration,
    last_reported_position_seconds=least(canonical_duration,module_video_progress.last_reported_position_seconds+least(
      greatest(excluded.last_reported_position_seconds-module_video_progress.last_reported_position_seconds,0),
      greatest(floor(extract(epoch from now()-module_video_progress.last_watched_at))::integer,0),10)),
    last_watched_at=now();
  select p.percent_watched into pct from public.module_video_progress p where p.student_id=auth.uid() and p.module_id=target_module and p.media_id=target_media;
  return pct;
end $$;
revoke all on function public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer) to authenticated;

create or replace function public.jpac_complete_instructional_media(target_module uuid,target_media uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare canonical_duration integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select media.duration_seconds into canonical_duration
  from public.course_modules m join public.module_instructional_media media on media.id=m.active_instructional_media_id
  where m.id=target_module and media.id=target_media and media.module_id=m.id and media.status='active'
    and m.status='published' and public.jpac_student_has_course_access(m.course_id)
    and public.jpac_module_is_unlocked(m.id,auth.uid())
  for share of m,media;
  if canonical_duration is null then raise exception 'Active module media access required'; end if;
  insert into public.module_video_progress(student_id,module_id,media_id,watched_seconds,duration_seconds,last_reported_position_seconds,completed_at)
  values(auth.uid(),target_module,target_media,0,canonical_duration,0,now())
  on conflict(student_id,module_id,media_id) do update
    set completed_at=coalesce(module_video_progress.completed_at,excluded.completed_at);
  perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');
  perform public.jpac_finalize_module_mastery(auth.uid(),target_module);
  return true;
end $$;
revoke all on function public.jpac_complete_instructional_media(uuid,uuid) from public,anon;
grant execute on function public.jpac_complete_instructional_media(uuid,uuid) to authenticated;

create or replace function public.jpac_finalize_module_mastery(target_student uuid,target_module uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare requirements_met boolean;threshold integer;
begin
  select m.core_unlock_threshold,
    exists(select 1 from public.xp_ledger intro where intro.student_id=target_student and intro.module_id=m.id and intro.xp_type='core' and intro.metadata->>'component'='intro')
    and (exists(select 1 from public.xp_ledger video where video.student_id=target_student and video.module_id=m.id and video.xp_type='core' and video.metadata->>'component'='video')
      or exists(select 1 from public.module_video_progress v where v.student_id=target_student and v.module_id=m.id and v.media_id=m.active_instructional_media_id and v.completed_at is not null))
    and exists(select 1 from public.activities required where required.module_id=m.id and required.required and required.activity_type in('assignment','performance','quiz'))
    and not exists(select 1 from public.activities required where required.module_id=m.id and required.required and required.activity_type in('assignment','performance','quiz') and not exists(select 1 from public.submissions s where s.activity_id=required.id and s.student_id=target_student and s.status='approved' and s.score>=required.passing_score))
    and coalesce((select sum(x.amount) from public.xp_ledger x where x.student_id=target_student and x.module_id=m.id and x.xp_type='core' and coalesce(x.metadata->>'component','')<>'mastery'),0)>=m.core_unlock_threshold
  into threshold,requirements_met from public.course_modules m where m.id=target_module;
  if coalesce(requirements_met,false) then perform public.jpac_award_module_core_component(target_student,target_module,'mastery');end if;
  return coalesce(requirements_met,false);
end $$;
revoke all on function public.jpac_finalize_module_mastery(uuid,uuid) from public,anon,authenticated;

create or replace function public.jpac_module_completion(target_student uuid,target_module uuid)
returns table(video_percent numeric,assignment_score numeric,core_xp_earned integer,core_xp_available integer,core_xp_threshold integer,intro_complete boolean,assignment_submitted boolean,assessment_passed boolean,mastery_awarded boolean,is_complete boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if target_student<>auth.uid() and not public.is_staff() then raise exception 'Not authorized'; end if;
  return query with facts as(
    select case when exists(select 1 from public.xp_ledger vx where vx.student_id=target_student and vx.module_id=m.id and vx.xp_type='core' and vx.metadata->>'component'='video') or v.completed_at is not null then 100::numeric else coalesce(v.percent_watched,0) end video_pct,
      coalesce((select max(s.score) from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')),0) assignment_value,
      coalesce((select sum(x.amount) from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core'),0)::integer core_earned,
      m.core_xp core_available,m.core_unlock_threshold core_threshold,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='intro') intro_done,
      exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) submitted,
      exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) and not exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz') and not exists(select 1 from public.submissions s where s.activity_id=a.id and s.student_id=target_student and s.status='approved' and s.score>=a.passing_score)) assessment_ok,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='mastery') mastery_done
    from public.course_modules m left join public.module_video_progress v on v.module_id=m.id and v.student_id=target_student and v.media_id=m.active_instructional_media_id where m.id=target_module
  ) select facts.video_pct,facts.assignment_value,facts.core_earned,facts.core_available,facts.core_threshold,facts.intro_done,facts.submitted,facts.assessment_ok,facts.mastery_done,
    facts.video_pct=100 and facts.intro_done and facts.submitted and facts.assessment_ok and facts.core_earned>=facts.core_threshold and facts.mastery_done from facts;
end $$;
revoke all on function public.jpac_module_completion(uuid,uuid) from public,anon;
grant execute on function public.jpac_module_completion(uuid,uuid) to authenticated;

comment on table public.module_instructional_media is 'Authoritative immutable instructional-media versions. course_modules video columns are temporary active-version compatibility projections.';
comment on column public.module_video_progress.media_id is 'Immutable media version watched; historical progress never transfers to a replacement version.';

commit;
