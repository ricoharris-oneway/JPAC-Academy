begin;

-- Behavior-only rollback. Version rows, active pointers, media_id mappings,
-- progress history, and earned evidence are intentionally preserved. Removing
-- them could invalidate student evidence created after this migration.
revoke all on function public.curriculum_create_instructional_media(uuid,text,text) from authenticated;
revoke all on function public.curriculum_update_instructional_media_metadata(uuid,text,integer) from authenticated;
revoke all on function public.curriculum_activate_instructional_media(uuid,text,integer) from authenticated;
revoke all on function public.curriculum_set_instructional_media(uuid,text,text,integer) from authenticated;
revoke all on function public.jpac_record_instructional_media_progress(uuid,uuid,integer,integer) from authenticated;
revoke all on function public.jpac_complete_instructional_media(uuid,uuid) from authenticated;

-- Restore the prior client signature as a compatibility wrapper while keeping
-- active-media identity enforcement inside the version-aware canonical RPC.
create or replace function public.jpac_record_module_video_progress(target_module uuid,watched integer,duration integer)
returns numeric language plpgsql security definer set search_path=public as $$
declare active_media uuid;pct numeric;
begin
  select active_instructional_media_id into active_media from public.course_modules where id=target_module;
  if active_media is null then raise exception 'Active module media required'; end if;
  pct:=public.jpac_record_instructional_media_progress(target_module,active_media,watched,duration);
  if pct>=90 then
    update public.module_video_progress set completed_at=coalesce(completed_at,now()) where student_id=auth.uid() and module_id=target_module and media_id=active_media;
    perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');
    perform public.jpac_finalize_module_mastery(auth.uid(),target_module);
  end if;
  return pct;
end $$;
revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_module_video_progress(uuid,integer,integer) to authenticated;

comment on table public.module_instructional_media is 'Version history preserved after behavior rollback. Media management is frozen until the version-aware application is restored.';

commit;
