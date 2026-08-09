begin;

alter table public.curriculum_sources drop constraint if exists curriculum_sources_source_type_check;
alter table public.curriculum_sources add constraint curriculum_sources_source_type_check check(source_type in(
  'curriculum','teaching_standard','aria_standard','rubric_standard','practice_method','performance_standard',
  'career_pathway','certificate_requirement','instructor_guidance','terminology','reference_material',
  'jpac_curriculum','administrator_instruction','other_approved'
));
alter table public.curriculum_sources
  add column if not exists file_format text check(file_format in('pdf','docx','txt','md')),
  add column if not exists mime_type text,
  add column if not exists file_size integer check(file_size is null or file_size between 1 and 10485760),
  add column if not exists source_hash text,
  add column if not exists storage_path text,
  add column if not exists processing_status text not null default 'pending' check(processing_status in('pending','processing','ready','failed')),
  add column if not exists processing_error text,
  add column if not exists ready_at timestamptz;
create unique index if not exists curriculum_sources_hash_idx on public.curriculum_sources(source_hash) where source_hash is not null;

alter table public.curriculum_source_sections
  add column if not exists content_hash text,
  add column if not exists classification text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists search_vector tsvector generated always as(
    to_tsvector('english',coalesce(heading,'')||' '||coalesce(topic,'')||' '||coalesce(content,''))
  ) stored;
create index if not exists curriculum_source_sections_search_idx on public.curriculum_source_sections using gin(search_vector);
create index if not exists curriculum_source_sections_authority_idx on public.curriculum_source_sections(source_id,course_id,level_number,classification,sort_order);

create table if not exists public.curriculum_proposal_sources(
  proposal_id uuid not null references public.curriculum_proposals(id) on delete cascade,
  source_section_id uuid not null references public.curriculum_source_sections(id) on delete restrict,
  reason_used text not null,
  created_at timestamptz not null default now(),
  primary key(proposal_id,source_section_id)
);

create table if not exists public.curriculum_versions(
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  version_number integer not null check(version_number>0),
  proposal_id uuid references public.curriculum_proposals(id) on delete restrict,
  source_summary jsonb not null default '[]'::jsonb check(jsonb_typeof(source_summary)='array'),
  title text not null,
  administrator_goal text not null default '',
  status text not null default 'draft' check(status in('draft','review','approved','staged','published','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  staged_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id,version_number)
);

create table if not exists public.curriculum_version_items(
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  object_type text not null check(object_type in('course','level','module','lesson','activity')),
  canonical_object_id uuid,
  parent_item_id uuid references public.curriculum_version_items(id) on delete cascade,
  change_type text not null check(change_type in('unchanged','improved','new','future_replacement','removed_from_future_version')),
  sort_order integer not null default 0,
  current_snapshot jsonb,
  proposed_snapshot jsonb not null,
  review_state text not null default 'pending' check(review_state in('pending','accepted','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists curriculum_versions_course_idx on public.curriculum_versions(course_id,status,version_number desc);
create index if not exists curriculum_version_items_tree_idx on public.curriculum_version_items(version_id,parent_item_id,sort_order);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('curriculum-sources','curriculum-sources',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.curriculum_proposal_sources enable row level security;
alter table public.curriculum_versions enable row level security;
alter table public.curriculum_version_items enable row level security;
drop policy if exists curriculum_proposal_sources_admin_only on public.curriculum_proposal_sources;
drop policy if exists curriculum_versions_admin_only on public.curriculum_versions;
drop policy if exists curriculum_version_items_admin_only on public.curriculum_version_items;
drop policy if exists curriculum_source_files_admin_only on storage.objects;
create policy curriculum_proposal_sources_admin_only on public.curriculum_proposal_sources for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy curriculum_versions_admin_only on public.curriculum_versions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy curriculum_version_items_admin_only on public.curriculum_version_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy curriculum_source_files_admin_only on storage.objects for all to authenticated using(bucket_id='curriculum-sources' and public.is_admin()) with check(bucket_id='curriculum-sources' and public.is_admin());
revoke all on public.curriculum_proposal_sources,public.curriculum_versions,public.curriculum_version_items from public,anon;
grant select,insert,update on public.curriculum_proposal_sources,public.curriculum_versions,public.curriculum_version_items to authenticated;

comment on table public.curriculum_versions is 'Reviewable future curriculum versions. No trigger or RPC publishes canonical curriculum.';
comment on table public.curriculum_version_items is 'Proposed version content only; canonical UUID references are provenance, not mutation targets.';

commit;
