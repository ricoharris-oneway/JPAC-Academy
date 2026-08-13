begin;

-- This rollback removes capability only. It deliberately never deletes curriculum
-- created by a prior authorized RPC call; recovery of created draft rows requires
-- separate evidence-aware review and is outside this artifact.
revoke all on function public.curriculum_save_module_as_draft_v1(jsonb) from public,anon,authenticated;
drop function if exists public.curriculum_save_module_as_draft_v1(jsonb);

commit;
