begin;
do $$ begin
  if to_regclass('public.curriculum_assignment_swap_operations') is not null and exists(select 1 from public.curriculum_assignment_swap_operations) then raise exception 'Assignment Swap audit history exists; preserve it and do not uninstall'; end if;
end $$;
drop function if exists public.curriculum_rollback_assignment_swap_v1(uuid);
drop function if exists public.curriculum_swap_module_assignment_v1(jsonb);
drop trigger if exists curriculum_assignment_swap_audit_immutable on public.curriculum_assignment_swap_operations;
drop function if exists public.jpac_block_assignment_swap_audit_mutation();
drop table if exists public.curriculum_assignment_swap_operations;
commit;
