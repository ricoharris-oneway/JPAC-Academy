-- Build 2.1 / Stage 1: prepare explicit entitlement mappings and status discovery.
-- This stage intentionally does not replace curriculum RLS policies. Populate and
-- validate mappings before applying the enforcement migration.

create table if not exists public.wix_plan_course_map (
  id uuid primary key default gen_random_uuid(),
  wix_plan_id text not null unique,
  course_id uuid not null references public.courses(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wix_plan_course_map_course_idx
  on public.wix_plan_course_map(course_id) where active;

alter table public.wix_plan_course_map enable row level security;
drop policy if exists "admins manage wix plan course map" on public.wix_plan_course_map;
create policy "admins manage wix plan course map" on public.wix_plan_course_map
  for all to authenticated
  using (public.is_academy_admin())
  with check (public.is_academy_admin());

create table if not exists public.wix_entitlement_status_rules (
  status text primary key check(status=lower(trim(status)) and status<>''),
  grants_access boolean not null default false,
  description text not null default '',
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.wix_entitlement_status_rules enable row level security;
drop policy if exists "admins manage wix entitlement status rules" on public.wix_entitlement_status_rules;
create policy "admins manage wix entitlement status rules" on public.wix_entitlement_status_rules
  for all to authenticated
  using (public.is_academy_admin())
  with check (public.is_academy_admin());

-- Preserve statuses already treated as access-granting by JPAC and cover Wix's
-- active/trial/purchased vocabulary. Unknown statuses are discovered fail-closed.
insert into public.wix_entitlement_status_rules(status,grants_access,description,reviewed_at)
values
  ('active',true,'Active Wix entitlement',now()),
  ('paid',true,'Paid Wix entitlement retained for backwards compatibility',now()),
  ('purchased',true,'Completed Wix purchase retained for current Wix event payloads',now()),
  ('trialing',true,'Active trial',now()),
  ('trial',true,'Active trial alias',now()),
  ('free_trial',true,'Free trial retained for backwards compatibility',now()),
  ('pending_cancellation',true,'Access remains valid until ends_at',now())
on conflict(status) do nothing;

-- Automatically inventory every status already present in production. Newly
-- discovered values deny access until an administrator reviews them.
insert into public.wix_entitlement_status_rules(status,grants_access,description)
select distinct lower(trim(e.status)),false,'Automatically discovered from existing entitlements'
from public.wix_access_entitlements e
where nullif(trim(e.status),'') is not null
on conflict(status) do nothing;

create or replace function public.jpac_register_wix_entitlement_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if nullif(trim(new.status),'') is null then
    return new;
  end if;
  insert into public.wix_entitlement_status_rules(status,grants_access,description)
  values(lower(trim(new.status)),false,'Automatically discovered from Wix synchronization')
  on conflict(status) do nothing;
  return new;
end;
$$;

drop trigger if exists register_wix_entitlement_status on public.wix_access_entitlements;
create trigger register_wix_entitlement_status
before insert or update of status on public.wix_access_entitlements
for each row execute function public.jpac_register_wix_entitlement_status();

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

create or replace function public.jpac_my_entitled_courses()
returns table(
  course_id uuid, slug text, title text, description text, difficulty text,
  total_xp integer, wix_program_url text, entitlement_id uuid, plan_name text,
  entitlement_status text, entitlement_ends_at timestamptz, progress numeric,
  last_accessed_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select distinct on (c.id)
    c.id,c.slug,c.title,c.description,c.difficulty,c.total_xp,c.wix_program_url,
    e.id,e.plan_name,e.status,e.ends_at,
    coalesce(sls.progress,wpe.progress,en.progress,0)::numeric,
    recent.last_accessed_at
  from public.wix_access_entitlements e
  join public.wix_entitlement_status_rules status_rule
    on status_rule.status=lower(trim(e.status)) and status_rule.grants_access
  join public.wix_plan_course_map plan_map
    on plan_map.wix_plan_id=e.wix_plan_id and plan_map.active
  join public.courses c on c.id=plan_map.course_id
  left join public.wix_program_course_map program_map on program_map.course_id=c.id
  left join public.wix_program_enrollments wpe
    on wpe.profile_id=e.profile_id and wpe.wix_program_id=program_map.wix_program_id
  left join public.student_learning_state sls
    on sls.student_id=e.profile_id
   and (sls.course_id=c.id or sls.wix_program_id=program_map.wix_program_id)
  left join public.enrollments en on en.student_id=e.profile_id and en.course_id=c.id
  left join lateral (
    select max(lp.updated_at) last_accessed_at
    from public.lesson_progress lp
    join public.lessons l on l.id=lp.lesson_id
    join public.course_modules m on m.id=l.module_id
    where lp.student_id=e.profile_id and m.course_id=c.id
  ) recent on true
  where e.profile_id=auth.uid()
    and c.status='published'
    and (e.starts_at is null or e.starts_at<=now())
    and (e.ends_at is null or e.ends_at>now())
  order by c.id,recent.last_accessed_at desc nulls last,e.updated_at desc;
$$;

revoke all on function public.jpac_my_entitled_courses() from public;
grant execute on function public.jpac_my_entitled_courses() to authenticated;
