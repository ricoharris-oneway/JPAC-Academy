begin;

do $$
begin
  if to_regclass('public.curriculum_assignment_swap_operations') is null
     or to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)') is null
     or to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)') is null then
    raise exception 'Assignment Swap v1 foundation is not installed';
  end if;
  if exists(select 1 from public.curriculum_assignment_swap_operations) then
    raise exception 'Assignment Swap audit history exists; do not change privilege posture without review';
  end if;
  if exists(
    select 1
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid in (
        to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)'),
        to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)')
      )
      and (not p.prosecdef or not (p.proconfig @> array['search_path=public']) or pg_get_functiondef(p.oid) !~ E'public\\.is_admin\\s*\\(\\s*\\)')
  ) then
    raise exception 'Assignment Swap RPC security or internal admin guard differs from the approved baseline';
  end if;
end $$;

revoke execute on function public.curriculum_swap_module_assignment_v1(jsonb) from public, anon, service_role;
revoke execute on function public.curriculum_rollback_assignment_swap_v1(uuid) from public, anon, service_role;
grant execute on function public.curriculum_swap_module_assignment_v1(jsonb) to authenticated;
grant execute on function public.curriculum_rollback_assignment_swap_v1(uuid) to authenticated;

commit;
