begin;

create table public.homepage_media_overrides (
  slot_key text primary key check (length(trim(slot_key)) between 1 and 160),
  section text not null check (length(trim(section)) between 1 and 120),
  item_name text not null check (length(trim(item_name)) between 1 and 200),
  default_image_path text not null check (length(trim(default_image_path)) between 1 and 500),
  override_image_url text check (override_image_url is null or length(trim(override_image_url)) between 1 and 2000),
  alt_text text not null check (length(trim(alt_text)) between 1 and 300),
  active boolean not null default false,
  published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.homepage_media_overrides enable row level security;
revoke all on public.homepage_media_overrides from anon, authenticated;
grant select on public.homepage_media_overrides to anon, authenticated;
grant insert, update, delete on public.homepage_media_overrides to authenticated;
grant all on public.homepage_media_overrides to service_role;

create policy "Public reads active homepage overrides"
  on public.homepage_media_overrides for select
  to anon, authenticated
  using (active and published);

create policy "Admins read all homepage overrides"
  on public.homepage_media_overrides for select
  to authenticated
  using ((select public.is_academy_admin()));

create policy "Admins create homepage overrides"
  on public.homepage_media_overrides for insert
  to authenticated
  with check ((select public.is_academy_admin()) and updated_by = (select auth.uid()));

create policy "Admins update homepage overrides"
  on public.homepage_media_overrides for update
  to authenticated
  using ((select public.is_academy_admin()))
  with check ((select public.is_academy_admin()) and updated_by = (select auth.uid()));

create policy "Admins delete homepage overrides"
  on public.homepage_media_overrides for delete
  to authenticated
  using ((select public.is_academy_admin()));

comment on table public.homepage_media_overrides is
  'Admin-managed URL-only homepage artwork overrides. Does not alter course, curriculum, enrollment, progress, or learning media.';

commit;
