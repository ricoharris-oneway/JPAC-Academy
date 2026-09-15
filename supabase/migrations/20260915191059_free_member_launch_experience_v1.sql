begin;

-- Member preferences are independent of academic progress and entitlements.
-- No account role, payment, consent, enrollment, or learning RPC is changed.
create table public.member_career_selections (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  career_path_slug text not null check (career_path_slug in (
    'independent-recording-artist', 'vocal-performer', 'session-live-instrumentalist',
    'songwriter-composer', 'music-producer', 'audio-engineer', 'music-director',
    'actor', 'voice-actor', 'professional-dancer', 'choreographer-movement-director',
    'film-video-content-creator', 'creative-business-entrepreneurship', 'creative-arts-educator'
  ))
);
alter table public.member_career_selections enable row level security;
revoke all on public.member_career_selections from anon, authenticated;
grant select, insert, update on public.member_career_selections to authenticated;
grant all on public.member_career_selections to service_role;
create policy "Members read their career selection"
  on public.member_career_selections for select to authenticated
  using (student_id = (select auth.uid()));
create policy "Members choose their career direction"
  on public.member_career_selections for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "Members change their career direction"
  on public.member_career_selections for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create table public.legal_policies (
  slug text primary key check (slug in (
    'terms', 'privacy', 'childrens-privacy', 'acceptable-use', 'refund', 'media-release', 'ai'
  )),
  title text not null check (length(trim(title)) between 1 and 200),
  effective_date date,
  body text not null check (length(trim(body)) between 1 and 100000),
  published boolean not null default false,
  constraint published_policy_requires_date check (not published or effective_date is not null)
);
alter table public.legal_policies enable row level security;
revoke all on public.legal_policies from anon, authenticated;
grant select on public.legal_policies to anon, authenticated;
grant insert, update on public.legal_policies to authenticated;
grant all on public.legal_policies to service_role;
-- Separate policies keep the authenticated admin helper out of anonymous reads.
create policy "Everyone reads published policies"
  on public.legal_policies for select to anon, authenticated using (published);
create policy "Admins read policy drafts"
  on public.legal_policies for select to authenticated
  using ((select public.is_academy_admin()));
create policy "Admins create policies"
  on public.legal_policies for insert to authenticated
  with check ((select public.is_academy_admin()));
create policy "Admins edit policies"
  on public.legal_policies for update to authenticated
  using ((select public.is_academy_admin()))
  with check ((select public.is_academy_admin()));

comment on table public.member_career_selections is
  'Free-member creative direction only. Does not grant enrollment or change curriculum, milestones, XP, or progress.';
comment on table public.legal_policies is
  'Admin/developer-managed policy content. Public pages use static templates when no published policy exists. Does not record consent.';

commit;
