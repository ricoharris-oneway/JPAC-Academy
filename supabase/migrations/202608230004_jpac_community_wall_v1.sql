-- JPAC Community Wall v1: internal, moderated community schema only.
-- This migration creates no posts, comments, reactions, reports, or curriculum data.
begin;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  post_type text not null check (post_type in ('practice_win','assignment_reflection','class_question','showcase_submission','peer_encouragement','event_excitement','challenge_response','admin_announcement')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','needs_revision','hidden','archived')),
  media_url text,
  submission_id uuid references public.submissions(id) on delete set null,
  is_announcement boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (media_url is null or (media_url ~ '^https://' and char_length(media_url) <= 2048)),
  check ((is_announcement and post_type = 'admin_announcement') or (not is_announcement and post_type <> 'admin_announcement')),
  check (
    (status = 'pending_review' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending_review' and reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','needs_revision','hidden','archived')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending_review' and reviewed_by is null and reviewed_at is null)
    or (status <> 'pending_review' and reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('applause','celebrate','encourage','inspired')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1)
);

create unique index community_reactions_actor_post_type_uidx
  on public.community_reactions(actor_id, post_id, reaction_type)
  where post_id is not null;
create unique index community_reactions_actor_comment_type_uidx
  on public.community_reactions(actor_id, comment_id, reaction_type)
  where comment_id is not null;

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason_category text not null check (reason_category in ('private_information','bullying_or_harassment','unsafe_content','copyright','impersonation_or_deceptive_ai','inappropriate_content','external_link','other')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id) = 1),
  check ((status in ('resolved','dismissed') and resolved_at is not null) or (status in ('open','reviewing') and resolved_at is null))
);

create table public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  report_id uuid references public.community_reports(id) on delete cascade,
  action text not null check (action in ('created_post','approved_post','rejected_post','requested_revision','hid_post','restored_post','reported_post','resolved_report','approved_comment','rejected_comment','hid_comment','restored_comment')),
  previous_status text check (previous_status is null or previous_status in ('pending_review','approved','rejected','needs_revision','hidden','archived','open','reviewing','resolved','dismissed')),
  new_status text not null check (new_status in ('pending_review','approved','rejected','needs_revision','hidden','archived','open','reviewing','resolved','dismissed')),
  reason text check (reason is null or char_length(reason) <= 2000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, report_id) = 1),
  check (
    (action in ('created_post','approved_post','rejected_post','hid_post','restored_post') and post_id is not null)
    or (action = 'requested_revision' and report_id is null and num_nonnulls(post_id, comment_id) = 1)
    or (action in ('approved_comment','rejected_comment','hid_comment','restored_comment') and comment_id is not null)
    or (action in ('reported_post','resolved_report') and report_id is not null)
  )
);

create index community_posts_moderation_queue_idx
  on public.community_posts(status, created_at)
  where status in ('pending_review','needs_revision');
create index community_posts_approved_feed_idx
  on public.community_posts(created_at desc)
  where status = 'approved';
create index community_posts_author_idx on public.community_posts(author_id, created_at desc);
create index community_comments_post_approved_idx on public.community_comments(post_id, created_at)
  where status = 'approved';
create index community_comments_moderation_queue_idx on public.community_comments(status, created_at)
  where status in ('pending_review','needs_revision');
create index community_comments_author_idx on public.community_comments(author_id, created_at desc);
create index community_reactions_post_idx on public.community_reactions(post_id) where post_id is not null;
create index community_reactions_comment_idx on public.community_reactions(comment_id) where comment_id is not null;
create index community_reports_open_queue_idx on public.community_reports(status, created_at)
  where status in ('open','reviewing');
create index community_reports_reporter_idx on public.community_reports(reporter_id, created_at desc);
create index community_moderation_actions_post_idx on public.community_moderation_actions(post_id, created_at desc) where post_id is not null;
create index community_moderation_actions_comment_idx on public.community_moderation_actions(comment_id, created_at desc) where comment_id is not null;
create index community_moderation_actions_report_idx on public.community_moderation_actions(report_id, created_at desc) where report_id is not null;

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_moderation_actions enable row level security;
alter table public.community_reports enable row level security;

revoke all on public.community_posts, public.community_comments, public.community_reactions, public.community_moderation_actions, public.community_reports from public, anon, authenticated;
grant select, insert, update on public.community_posts, public.community_comments to authenticated;
grant select, insert, delete on public.community_reactions to authenticated;
grant select, insert, update on public.community_reports to authenticated;
grant select, insert on public.community_moderation_actions to authenticated;

create policy community_posts_internal_read on public.community_posts
  for select to authenticated
  using (status = 'approved' or author_id = (select auth.uid()) or (select public.is_academy_staff()));
create policy community_posts_submit_pending on public.community_posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending_review' and not is_announcement and reviewed_by is null and reviewed_at is null);
create policy community_posts_author_resubmit on public.community_posts
  for update to authenticated
  using (author_id = (select auth.uid()) and status = 'needs_revision')
  with check (author_id = (select auth.uid()) and status = 'pending_review' and not is_announcement and reviewed_by is null and reviewed_at is null);
create policy community_posts_staff_moderate on public.community_posts
  for update to authenticated
  using ((select public.is_academy_staff()))
  with check ((select public.is_academy_staff()));
create policy community_posts_admin_announce on public.community_posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_academy_admin()) and is_announcement and post_type = 'admin_announcement' and status = 'approved' and reviewed_by = (select auth.uid()) and reviewed_at is not null);

create policy community_comments_internal_read on public.community_comments
  for select to authenticated
  using (
    (status = 'approved' and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'approved'))
    or author_id = (select auth.uid())
    or (select public.is_academy_staff())
  );
create policy community_comments_submit_pending on public.community_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending_review' and reviewed_by is null and reviewed_at is null and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'approved'));
create policy community_comments_author_resubmit on public.community_comments
  for update to authenticated
  using (author_id = (select auth.uid()) and status = 'needs_revision')
  with check (author_id = (select auth.uid()) and status = 'pending_review' and reviewed_by is null and reviewed_at is null);
create policy community_comments_staff_moderate on public.community_comments
  for update to authenticated
  using ((select public.is_academy_staff()))
  with check ((select public.is_academy_staff()));

create policy community_reactions_internal_read on public.community_reactions
  for select to authenticated
  using (
    (post_id is not null and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'approved'))
    or (comment_id is not null and exists (select 1 from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = comment_id and c.status = 'approved' and p.status = 'approved'))
    or (select public.is_academy_staff())
  );
create policy community_reactions_create_own on public.community_reactions
  for insert to authenticated
  with check (
    actor_id = (select auth.uid()) and (
      (post_id is not null and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'approved'))
      or (comment_id is not null and exists (select 1 from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = comment_id and c.status = 'approved' and p.status = 'approved'))
    )
  );
create policy community_reactions_delete_own on public.community_reactions
  for delete to authenticated
  using (actor_id = (select auth.uid()));

create policy community_reports_read_own_or_staff on public.community_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_academy_staff()));
create policy community_reports_create_own on public.community_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid()) and status = 'open' and assigned_to is null and resolution is null and resolved_at is null and (
      (post_id is not null and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'approved'))
      or (comment_id is not null and exists (select 1 from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = comment_id and c.status = 'approved' and p.status = 'approved'))
    )
  );
create policy community_reports_staff_resolve on public.community_reports
  for update to authenticated
  using ((select public.is_academy_staff()))
  with check ((select public.is_academy_staff()));

create policy community_moderation_actions_staff_read on public.community_moderation_actions
  for select to authenticated
  using ((select public.is_academy_staff()));
create policy community_moderation_actions_staff_insert on public.community_moderation_actions
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_academy_staff()));

comment on table public.community_posts is 'Moderated internal JPAC Community Wall posts; not an external social publishing surface.';
comment on table public.community_comments is 'Moderated comments on approved internal Community Wall posts; no private messaging.';
comment on table public.community_reactions is 'Positive reactions to approved internal Community Wall content.';
comment on table public.community_moderation_actions is 'Append-only application audit trail for Community Wall moderation actions.';
comment on table public.community_reports is 'Internal safety reports for Community Wall posts and comments.';

commit;
