-- Block A1: Wix identity, access, and Online Programs enrollment synchronization
-- Run this migration in Supabase before enabling the Wix sync endpoint.

create table if not exists public.wix_member_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wix_member_id text not null,
  email text,
  display_name text,
  sync_status text not null default 'active' check (sync_status in ('active','inactive','error')),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  unique (wix_member_id)
);

create unique index if not exists wix_member_links_email_unique
  on public.wix_member_links (lower(email)) where email is not null;

create table if not exists public.wix_access_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wix_order_id text not null,
  wix_plan_id text,
  plan_name text,
  status text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wix_order_id)
);

create index if not exists wix_access_entitlements_profile_idx
  on public.wix_access_entitlements(profile_id, status);

create table if not exists public.wix_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wix_participant_id text not null,
  wix_program_id text not null,
  wix_program_title text,
  status text not null default 'active',
  progress numeric(5,2) not null default 0,
  joined_at timestamptz,
  completed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wix_participant_id),
  unique (profile_id, wix_program_id)
);

create index if not exists wix_program_enrollments_profile_idx
  on public.wix_program_enrollments(profile_id, status);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','error')),
  retry_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create index if not exists integration_events_status_idx
  on public.integration_events(provider, processing_status, received_at desc);

alter table public.wix_member_links enable row level security;
alter table public.wix_access_entitlements enable row level security;
alter table public.wix_program_enrollments enable row level security;
alter table public.integration_events enable row level security;

-- Authenticated users can read only their own synchronized Wix records.
drop policy if exists "read own wix member link" on public.wix_member_links;
create policy "read own wix member link" on public.wix_member_links
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "read own wix access" on public.wix_access_entitlements;
create policy "read own wix access" on public.wix_access_entitlements
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "read own wix enrollments" on public.wix_program_enrollments;
create policy "read own wix enrollments" on public.wix_program_enrollments
  for select to authenticated using (profile_id = auth.uid());

-- Service-role requests from the serverless sync endpoint bypass RLS.

create or replace function public.jpac_has_active_wix_access(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wix_access_entitlements e
    where e.profile_id = target_profile
      and lower(e.status) in ('active','paid','free_trial','pending_cancellation')
      and (e.ends_at is null or e.ends_at > now())
  );
$$;

grant execute on function public.jpac_has_active_wix_access(uuid) to authenticated;
