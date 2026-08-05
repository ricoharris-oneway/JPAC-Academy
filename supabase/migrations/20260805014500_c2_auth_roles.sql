-- C2: authentication, automatic profiles, and role-aware security
-- Safe to rerun after a failed or partial attempt.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,display_name,role)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1)),
    'student'
  )
  on conflict(id) do update set
    email = excluded.email,
    display_name = case
      when public.profiles.display_name = '' then excluded.display_name
      else public.profiles.display_name
    end,
    updated_at = now();

  insert into public.student_profiles(user_id)
  values(new.id)
  on conflict(user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill users created before this migration.
insert into public.profiles(id,email,display_name,role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'display_name', split_part(coalesce(email,''),'@',1)),
  'student'
from auth.users
on conflict(id) do nothing;

insert into public.student_profiles(user_id)
select id from public.profiles where role = 'student'
on conflict(user_id) do nothing;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_academy_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('teacher','admin','developer'), false);
$$;

create or replace function public.is_academy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin','developer'), false);
$$;

-- One-time owner bootstrap. It succeeds only while no admin/developer exists.
create or replace function public.claim_initial_owner()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists(select 1 from public.profiles where role in ('admin','developer')) then
    raise exception 'An Academy owner already exists';
  end if;

  update public.profiles
  set role = 'developer', updated_at = now()
  where id = auth.uid();

  delete from public.student_profiles where user_id = auth.uid();

  insert into public.teacher_profiles(user_id, biography)
  values(auth.uid(), 'JPAC Academy owner and instructor')
  on conflict(user_id) do nothing;
end;
$$;

grant execute on function public.claim_initial_owner() to authenticated;

-- Replace policies so the migration remains rerunnable.
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles self or staff read" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;

create policy "profiles self or staff read"
on public.profiles for select to authenticated
using(auth.uid() = id or public.is_academy_staff());

create policy "profiles self update"
on public.profiles for update to authenticated
using(auth.uid() = id)
with check(auth.uid() = id);

create policy "admins manage profiles"
on public.profiles for update to authenticated
using(public.is_academy_admin())
with check(public.is_academy_admin());

drop policy if exists "staff read enrollments" on public.enrollments;
drop policy if exists "admins manage enrollments" on public.enrollments;
drop policy if exists "staff manage courses" on public.courses;
drop policy if exists "staff manage tools" on public.lab_tools;

create policy "staff read enrollments"
on public.enrollments for select to authenticated
using(public.is_academy_staff());

create policy "admins manage enrollments"
on public.enrollments for all to authenticated
using(public.is_academy_admin())
with check(public.is_academy_admin());

create policy "staff manage courses"
on public.courses for all to authenticated
using(public.is_academy_staff())
with check(public.is_academy_staff());

create policy "staff manage tools"
on public.lab_tools for all to authenticated
using(public.is_academy_staff())
with check(public.is_academy_staff());
