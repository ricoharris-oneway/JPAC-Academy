begin;

create table if not exists public.curriculum_sources(
  id uuid primary key default gen_random_uuid(),
  source_type text not null check(source_type in('jpac_curriculum','aria_standard','administrator_instruction','other_approved')),
  title text not null,
  discipline text,
  version text not null,
  approval_status text not null default 'draft' check(approval_status in('draft','approved','retired')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,title,version)
);

create table if not exists public.curriculum_source_sections(
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.curriculum_sources(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  level_number integer check(level_number between 1 and 4),
  topic text,
  section_key text not null,
  heading text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id,section_key)
);

create table if not exists public.curriculum_change_requests(
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  scope_type text not null check(scope_type in('lesson','activity','module','course')),
  operation text not null check(operation in('improve','replace','expand','modernize','regenerate','analyze')),
  course_id uuid not null references public.courses(id) on delete restrict,
  module_id uuid references public.course_modules(id) on delete restrict,
  lesson_id uuid references public.lessons(id) on delete restrict,
  activity_id uuid references public.activities(id) on delete restrict,
  administrator_instruction text not null default '',
  source_context jsonb not null default '{}'::jsonb,
  status text not null default 'generated' check(status in('generated','review','approved','rejected','applied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((scope_type='course' and module_id is null and lesson_id is null and activity_id is null)
     or (scope_type='module' and module_id is not null and lesson_id is null and activity_id is null)
     or (scope_type='lesson' and module_id is not null and lesson_id is not null and activity_id is null)
     or (scope_type='activity' and module_id is not null and activity_id is not null and lesson_id is null))
);

create table if not exists public.curriculum_proposals(
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.curriculum_change_requests(id) on delete cascade,
  provider text not null,
  provider_model text not null,
  provider_request_id text,
  current_snapshot jsonb not null,
  proposed_snapshot jsonb not null,
  change_set jsonb not null default '[]'::jsonb check(jsonb_typeof(change_set)='array'),
  ai_rationale text not null,
  validation_result jsonb not null default '{}'::jsonb,
  source_conflicts jsonb not null default '[]'::jsonb check(jsonb_typeof(source_conflicts)='array'),
  review_state text not null default 'generated' check(review_state in('generated','review','approved','rejected','applied')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id)
);

create index if not exists curriculum_source_sections_lookup_idx on public.curriculum_source_sections(course_id,level_number,topic,sort_order);
create index if not exists curriculum_change_requests_target_idx on public.curriculum_change_requests(course_id,module_id,lesson_id,activity_id,created_at desc);
create index if not exists curriculum_change_requests_review_idx on public.curriculum_change_requests(status,created_at desc);
create index if not exists curriculum_proposals_review_idx on public.curriculum_proposals(review_state,created_at desc);

alter table public.curriculum_sources enable row level security;
alter table public.curriculum_source_sections enable row level security;
alter table public.curriculum_change_requests enable row level security;
alter table public.curriculum_proposals enable row level security;

drop policy if exists curriculum_sources_admin_only on public.curriculum_sources;
drop policy if exists curriculum_source_sections_admin_only on public.curriculum_source_sections;
drop policy if exists curriculum_change_requests_admin_only on public.curriculum_change_requests;
drop policy if exists curriculum_proposals_admin_only on public.curriculum_proposals;
create policy curriculum_sources_admin_only on public.curriculum_sources for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy curriculum_source_sections_admin_only on public.curriculum_source_sections for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy curriculum_change_requests_admin_only on public.curriculum_change_requests for all to authenticated using(public.is_admin()) with check(public.is_admin() and requested_by=auth.uid());
create policy curriculum_proposals_admin_only on public.curriculum_proposals for all to authenticated using(public.is_admin()) with check(public.is_admin());

revoke all on public.curriculum_sources,public.curriculum_source_sections,public.curriculum_change_requests,public.curriculum_proposals from public,anon;
grant select,insert,update on public.curriculum_sources,public.curriculum_source_sections,public.curriculum_change_requests,public.curriculum_proposals to authenticated;

comment on table public.curriculum_proposals is 'Administrative proposal records only. Approval never publishes or mutates canonical curriculum.';
comment on column public.curriculum_proposals.current_snapshot is 'Immutable proposal-time context; never a replacement for canonical curriculum or student evidence.';
comment on column public.curriculum_proposals.proposed_snapshot is 'AI-assisted draft content requiring administrator review and controlled application.';

commit;
