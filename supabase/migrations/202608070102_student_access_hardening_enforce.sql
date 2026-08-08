-- Build 2.1 / Stage 2: enforce entitlement-aware curriculum RLS.
-- Apply only after Stage 1 validation reports zero unmapped access-granting plans.

do $$
begin
  if exists (
    select 1
    from public.wix_access_entitlements e
    left join public.wix_entitlement_status_rules r
      on r.status=lower(trim(e.status))
    where nullif(trim(e.status),'') is not null
      and (r.status is null or r.reviewed_at is null)
  ) then
    raise exception 'Build 2.1 blocked: every production Wix entitlement status must be reviewed before enforcement';
  end if;

  if exists (
    select 1
    from public.wix_access_entitlements e
    join public.wix_entitlement_status_rules r
      on r.status=lower(trim(e.status)) and r.grants_access
    left join public.wix_plan_course_map m
      on m.wix_plan_id=e.wix_plan_id and m.active
    where (e.starts_at is null or e.starts_at<=now())
      and (e.ends_at is null or e.ends_at>now())
      and (nullif(trim(e.wix_plan_id),'') is null or m.course_id is null)
  ) then
    raise exception 'Build 2.1 blocked: current access-granting entitlements contain an unmapped Wix plan ID';
  end if;
end;
$$;

drop policy if exists "published courses readable" on public.courses;
drop policy if exists "entitled courses readable" on public.courses;
create policy "entitled courses readable" on public.courses for select to authenticated
using(public.jpac_student_has_course_access(id));

drop policy if exists "published modules readable" on public.course_modules;
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated
using(status='published' and public.jpac_student_has_course_access(course_id));

drop policy if exists "published lessons readable" on public.lessons;
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated
using(status='published' and exists(
  select 1 from public.course_modules m
  where m.id=module_id and public.jpac_student_has_course_access(m.course_id)
));

-- Preserve the original staff insert capability while tightening student writes.
drop policy if exists "lesson progress own insert" on public.lesson_progress;
create policy "lesson progress own insert" on public.lesson_progress for insert to authenticated
with check(
  public.is_staff()
  or (
    student_id=auth.uid() and exists(
      select 1 from public.lessons l
      join public.course_modules m on m.id=l.module_id
      where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
    )
  )
);

drop policy if exists "lesson progress own or staff update" on public.lesson_progress;
create policy "lesson progress own or staff update" on public.lesson_progress for update to authenticated
using(
  public.is_staff()
  or (
    student_id=auth.uid() and exists(
      select 1 from public.lessons l
      join public.course_modules m on m.id=l.module_id
      where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
    )
  )
)
with check(
  public.is_staff()
  or (
    student_id=auth.uid() and exists(
      select 1 from public.lessons l
      join public.course_modules m on m.id=l.module_id
      where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
    )
  )
);
