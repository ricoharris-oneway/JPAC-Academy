-- C2: authentication, automatic profiles, and role-aware security
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,display_name,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1)),'student')
  on conflict(id) do update set email=excluded.email;
  insert into public.student_profiles(profile_id) values(new.id) on conflict(profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles(id,email,display_name,role)
select id,email,coalesce(raw_user_meta_data->>'display_name',split_part(coalesce(email,''),'@',1)),'student'
from auth.users on conflict(id) do nothing;
insert into public.student_profiles(profile_id)
select id from public.profiles on conflict(profile_id) do nothing;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;

create or replace function public.is_academy_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_app_role() in ('teacher','admin','developer'),false) $$;

create or replace function public.is_academy_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_app_role() in ('admin','developer'),false) $$;

-- One-time owner bootstrap: only works while no admin/developer exists.
create or replace function public.claim_initial_owner()
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.profiles where role in ('admin','developer')) then
    raise exception 'An Academy owner already exists';
  end if;
  update public.profiles set role='developer',updated_at=now() where id=auth.uid();
  delete from public.student_profiles where profile_id=auth.uid();
  insert into public.teacher_profiles(profile_id,bio) values(auth.uid(),'JPAC Academy owner and instructor') on conflict(profile_id) do nothing;
end;
$$;

grant execute on function public.claim_initial_owner() to authenticated;

-- Expand profile visibility and management safely.
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles self or staff read" on public.profiles for select to authenticated using(auth.uid()=id or public.is_academy_staff());
create policy "profiles self update" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "admins manage profiles" on public.profiles for update to authenticated using(public.is_academy_admin()) with check(public.is_academy_admin());

create policy "staff read enrollments" on public.enrollments for select to authenticated using(public.is_academy_staff());
create policy "admins manage enrollments" on public.enrollments for all to authenticated using(public.is_academy_admin()) with check(public.is_academy_admin());
create policy "staff manage courses" on public.courses for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());
create policy "staff manage tools" on public.lab_tools for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());
