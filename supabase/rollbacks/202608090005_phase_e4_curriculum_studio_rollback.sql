begin;
revoke all on public.curriculum_module_revisions from authenticated;
revoke all on function public.curriculum_studio_evidence(uuid) from authenticated;
revoke all on function public.curriculum_studio_save_module(uuid,jsonb) from authenticated;
revoke all on function public.curriculum_studio_save_lesson(uuid,jsonb) from authenticated;
revoke all on function public.curriculum_studio_reorder_lesson(uuid,text) from authenticated;
revoke all on function public.curriculum_studio_save_activity(uuid,jsonb) from authenticated;
drop function if exists public.curriculum_studio_evidence(uuid);
drop function if exists public.curriculum_studio_save_module(uuid,jsonb);
drop function if exists public.curriculum_studio_save_lesson(uuid,jsonb);
drop function if exists public.curriculum_studio_reorder_lesson(uuid,text);
drop function if exists public.curriculum_studio_save_activity(uuid,jsonb);
-- Columns are intentionally retained so configured media/tool metadata is not lost.
commit;
