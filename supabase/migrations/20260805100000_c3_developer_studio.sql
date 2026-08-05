-- JPAC Academy C3: Developer Studio controls
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null unique,
  name text not null,
  description text not null default '',
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extension_snippets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  extension_type text not null check (extension_type in ('html','css','javascript','iframe','react_manifest')),
  code text not null default '',
  placement text not null default 'disabled',
  enabled boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
alter table public.extension_snippets enable row level security;

drop policy if exists "developers manage feature flags" on public.feature_flags;
create policy "developers manage feature flags" on public.feature_flags for all to authenticated
using (public.current_app_role() = 'developer') with check (public.current_app_role() = 'developer');

drop policy if exists "developers manage extension snippets" on public.extension_snippets;
create policy "developers manage extension snippets" on public.extension_snippets for all to authenticated
using (public.current_app_role() = 'developer') with check (public.current_app_role() = 'developer');

insert into public.feature_flags(flag_key,name,description,enabled) values
('aria_coach','ARIA Creative Coach','Enable personalized AI coaching experiences.',true),
('wix_sync','Wix Program Sync','Enable Wix course and assignment synchronization.',false),
('leaderboards','Student Leaderboards','Show XP leaderboards to eligible users.',false),
('parent_portal','Parent Portal','Enable parent access and reporting.',false),
('certificate_auto_issue','Automatic Certificates','Automatically issue certificates when requirements are met.',true)
on conflict(flag_key) do nothing;

create or replace function public.developer_toggle_feature(target_key text, target_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_app_role() <> 'developer' then raise exception 'Developer access required'; end if;
  update public.feature_flags set enabled=target_enabled,updated_by=auth.uid(),updated_at=now() where flag_key=target_key;
end;$$;

grant execute on function public.developer_toggle_feature(text,boolean) to authenticated;
