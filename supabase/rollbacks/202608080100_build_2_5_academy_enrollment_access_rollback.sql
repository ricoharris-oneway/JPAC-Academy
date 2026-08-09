begin;

-- Restore the Build 2.1 Wix-entitlement authorization behavior. Additive
-- enrollment columns are deliberately retained so rollback cannot discard data.
drop function if exists public.jpac_my_academy_courses();

create or replace function public.jpac_student_has_course_access(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.role in ('teacher','admin','developer')
    ) then true
    else exists(
      select 1
      from public.wix_access_entitlements e
      join public.wix_entitlement_status_rules status_rule
        on status_rule.status=lower(trim(e.status)) and status_rule.grants_access
      join public.wix_plan_course_map plan_map
        on plan_map.wix_plan_id=e.wix_plan_id and plan_map.active
      join public.courses c on c.id=plan_map.course_id
      where e.profile_id=auth.uid()
        and c.id=target_course
        and c.status='published'
        and (e.starts_at is null or e.starts_at<=now())
        and (e.ends_at is null or e.ends_at>now())
    )
  end;
$$;

revoke all on function public.jpac_student_has_course_access(uuid) from public;
grant execute on function public.jpac_student_has_course_access(uuid) to authenticated;

commit;
