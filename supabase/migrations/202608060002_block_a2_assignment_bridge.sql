-- Block A2: Wix assignment bridge and submission linkage

create table if not exists public.wix_assignments (
  id uuid primary key default gen_random_uuid(),
  wix_assignment_id text not null unique,
  wix_program_id text not null,
  wix_step_id text,
  title text not null,
  description text,
  due_at timestamptz,
  submission_type text not null default 'performance',
  status text not null default 'active' check (status in ('active','inactive','archived')),
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wix_assignments_program_idx on public.wix_assignments(wix_program_id,status);

alter table public.wix_assignments enable row level security;
drop policy if exists "authenticated read active wix assignments" on public.wix_assignments;
create policy "authenticated read active wix assignments" on public.wix_assignments
  for select to authenticated using (status='active');

do $$ begin
  alter table public.submissions add column wix_assignment_id uuid references public.wix_assignments(id) on delete set null;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column wix_external_submission_id text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column media_url text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column media_name text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column media_type text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column source text not null default 'jpac';
exception when duplicate_column then null; end $$;

create unique index if not exists submissions_wix_external_unique
  on public.submissions(wix_external_submission_id)
  where wix_external_submission_id is not null;

create index if not exists submissions_wix_assignment_idx
  on public.submissions(wix_assignment_id,status,submitted_at desc);

create or replace function public.jpac_create_wix_submission(
  assignment_external_id text,
  target_student uuid,
  file_name text,
  file_type text,
  file_url text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  assignment_record public.wix_assignments%rowtype;
  submission_id uuid;
begin
  select * into assignment_record
  from public.wix_assignments
  where wix_assignment_id=assignment_external_id and status='active';

  if assignment_record.id is null then
    raise exception 'Wix assignment not found or inactive';
  end if;

  insert into public.submissions(student_id,status,submitted_at,wix_assignment_id,media_name,media_type,media_url,source)
  values(target_student,'submitted',now(),assignment_record.id,file_name,file_type,file_url,'wix_bridge')
  returning id into submission_id;

  return submission_id;
end;
$$;

grant execute on function public.jpac_create_wix_submission(text,uuid,text,text,text) to authenticated;
