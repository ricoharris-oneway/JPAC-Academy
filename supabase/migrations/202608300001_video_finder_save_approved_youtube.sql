create or replace function public.video_finder_save_approved_youtube(target_module uuid,media_url text,media_title text,media_duration_seconds integer)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare module_row public.course_modules%rowtype;normalized jsonb;existing_media public.module_instructional_media%rowtype;old_active uuid;new_media uuid;next_version integer;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(media_title,'')),'') is null then raise exception 'Reviewed video title is required'; end if;
  if media_duration_seconds is null or media_duration_seconds not between 1 and 7200 then raise exception 'Video duration must be between 1 and 7200 seconds'; end if;
  select * into module_row from public.course_modules where id=target_module for update;
  if module_row.id is null then raise exception 'Module not found'; end if;
  normalized:=public.jpac_normalize_instructional_media_url(media_url);
  if normalized->>'provider'<>'youtube' then raise exception 'Video Finder accepts YouTube URLs only'; end if;
  select * into existing_media from public.module_instructional_media where module_id=target_module and provider='youtube' and provider_media_id=normalized->>'provider_media_id';
  if existing_media.id is not null then
    if existing_media.status<>'active' then raise exception 'This video already exists in module history'; end if;
    update public.module_instructional_media set title=trim(media_title),duration_seconds=media_duration_seconds where id=existing_media.id;
    update public.course_modules set primary_video_url=normalized->>'normalized_url',video_provider='youtube',video_title=trim(media_title),video_duration_seconds=media_duration_seconds,updated_at=now() where id=target_module;
    return existing_media.id;
  end if;
  select id into old_active from public.module_instructional_media where module_id=target_module and status='active' for update;
  select coalesce(max(version_number),0)+1 into next_version from public.module_instructional_media where module_id=target_module;
  if old_active is not null then update public.module_instructional_media set status='retired',retired_at=now() where id=old_active; end if;
  insert into public.module_instructional_media(module_id,version_number,provider,provider_media_id,source_url,normalized_url,title,duration_seconds,status,created_by,activated_at,replaces_media_id)
  values(target_module,next_version,'youtube',normalized->>'provider_media_id',trim(media_url),normalized->>'normalized_url',trim(media_title),media_duration_seconds,'active',auth.uid(),now(),old_active) returning id into new_media;
  update public.course_modules set active_instructional_media_id=new_media,primary_video_url=normalized->>'normalized_url',video_provider='youtube',video_title=trim(media_title),video_duration_seconds=media_duration_seconds,updated_at=now() where id=target_module;
  return new_media;
end $function$;
revoke all on function public.video_finder_save_approved_youtube(uuid,text,text,integer) from public;
grant execute on function public.video_finder_save_approved_youtube(uuid,text,text,integer) to authenticated;
comment on function public.video_finder_save_approved_youtube(uuid,text,text,integer) is 'Staff-only Video Finder save path. Updates instructional-media history and course_modules video projection fields only; never changes curriculum status or academic records.';
