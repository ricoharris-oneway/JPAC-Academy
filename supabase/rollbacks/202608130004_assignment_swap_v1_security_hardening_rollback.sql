begin;

do $$
begin
  if to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)') is null
     or to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)') is null then
    raise exception 'Assignment Swap v1 RPC foundation is missing';
  end if;
end $$;

revoke execute on function public.curriculum_swap_module_assignment_v1(jsonb) from public, anon;
revoke execute on function public.curriculum_rollback_assignment_swap_v1(uuid) from public, anon;
grant execute on function public.curriculum_swap_module_assignment_v1(jsonb) to authenticated, service_role;
grant execute on function public.curriculum_rollback_assignment_v1(uuid) to authenticated, service_role;

commit;
