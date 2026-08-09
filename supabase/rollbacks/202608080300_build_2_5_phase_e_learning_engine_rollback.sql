begin;
-- Non-destructive rollback: preserve new attempts, progress, XP classifications,
-- and draft curriculum. Disable progression gating and Phase E automation only.
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated using(status='published' and public.jpac_student_has_course_access(course_id) and (course_level_id is null or exists(select 1 from public.course_levels cl where cl.id=course_level_id and cl.status='published' and cl.approved_at is not null)));
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated using(status='published' and exists(select 1 from public.course_modules m left join public.course_levels cl on cl.id=m.course_level_id where m.id=module_id and m.status='published' and (m.course_level_id is null or (cl.status='published' and cl.approved_at is not null)) and public.jpac_student_has_course_access(m.course_id)));
drop policy if exists "published activities readable" on public.activities;
create policy "published activities readable" on public.activities for select to authenticated using(status='published' or public.is_staff());
revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.jpac_module_completion(uuid,uuid) from public,anon,authenticated;
revoke all on function public.jpac_module_is_unlocked(uuid,uuid) from public,anon,authenticated;
revoke all on function public.jpac_review_module_submission(uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.curriculum_transition_module(uuid,text,text) from public,anon,authenticated;
revoke all on function public.jpac_submit_module_activity(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.jpac_complete_bonus_activity(uuid) from public,anon,authenticated;
revoke all on function public.jpac_complete_module_intro(uuid) from public,anon,authenticated;
revoke all on function public.jpac_award_module_core_component(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.jpac_finalize_module_mastery(uuid,uuid) from public,anon,authenticated;
commit;
