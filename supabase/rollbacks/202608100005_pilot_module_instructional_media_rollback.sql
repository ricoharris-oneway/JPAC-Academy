begin;

drop function if exists public.curriculum_attach_initial_module_media(uuid,text,text,text,integer);

-- Restore the pre-hardening progress implementation. The additive
-- last_reported_position_seconds column and its values are intentionally
-- preserved so rollback does not destroy playback history.
create or replace function public.jpac_record_module_video_progress(target_module uuid,watched integer,duration integer)
returns numeric language plpgsql security definer set search_path=public as $$
declare pct numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if watched<0 or duration<=0 or watched>duration+5 then raise exception 'Invalid video progress'; end if;
  if not exists(select 1 from public.course_modules m where m.id=target_module and m.status='published' and public.jpac_student_has_course_access(m.course_id)) or not public.jpac_module_is_unlocked(target_module,auth.uid()) then raise exception 'Module access required'; end if;
  insert into public.module_video_progress(student_id,module_id,watched_seconds,duration_seconds)
  values(auth.uid(),target_module,least(watched,duration,10),duration)
  on conflict(student_id,module_id) do update set
    watched_seconds=greatest(module_video_progress.watched_seconds,least(excluded.watched_seconds,excluded.duration_seconds,floor(extract(epoch from now()-module_video_progress.started_at))::integer+10)),
    duration_seconds=excluded.duration_seconds,last_watched_at=now();
  update public.module_video_progress set completed_at=coalesce(completed_at,now()) where student_id=auth.uid() and module_id=target_module and percent_watched>=90;
  select percent_watched into pct from public.module_video_progress where student_id=auth.uid() and module_id=target_module;
  if pct>=90 then perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');perform public.jpac_finalize_module_mastery(auth.uid(),target_module);end if;
  return pct;
end; $$;

revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_module_video_progress(uuid,integer,integer) to authenticated;

commit;
