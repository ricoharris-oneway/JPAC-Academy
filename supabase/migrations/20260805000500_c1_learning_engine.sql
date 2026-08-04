-- JPAC Academy Sprint C1: Production learning engine
-- Run after 20260804223000_foundation.sql.

create extension if not exists "pgcrypto";

-- Shared role helpers used by Row Level Security policies.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('teacher','admin','developer'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin','developer'), false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Extended student and teacher records.
create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  birth_date date,
  school_name text,
  grade_level text,
  primary_goal text,
  onboarding_complete boolean not null default false,
  practice_streak integer not null default 0 check (practice_streak >= 0),
  last_practice_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  title text,
  biography text,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Course hierarchy. Wix remains the coursework source; these records power XP,
-- recommendations, dashboards and synchronization.
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  wix_module_id text,
  sort_order integer not null default 0,
  xp_value integer not null default 0 check (xp_value >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, sort_order)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  description text not null default '',
  wix_lesson_id text,
  wix_lesson_url text,
  lesson_type text not null default 'wix' check (lesson_type in ('wix','video','audio','document','interactive','live','external')),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  sort_order integer not null default 0,
  xp_value integer not null default 0 check (xp_value >= 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, sort_order)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  activity_type text not null default 'practice' check (activity_type in ('practice','assignment','quiz','performance','challenge','external','lab_tool')),
  instructions text not null default '',
  submission_type text not null default 'none' check (submission_type in ('none','text','audio','video','file','link','teacher_verification')),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  due_at timestamptz,
  required boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend enrollments for live Wix synchronization and completion state.
alter table public.enrollments
  add column if not exists status text not null default 'active',
  add column if not exists wix_enrollment_id text,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.enrollments drop constraint if exists enrollments_status_check;
alter table public.enrollments add constraint enrollments_status_check
  check (status in ('pending','active','paused','completed','withdrawn','expired'));

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','submitted','completed','needs_review')),
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  source text not null default 'jpac' check (source in ('jpac','wix','teacher','admin','import')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  tool_id uuid references public.lab_tools(id) on delete set null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  notes text not null default '',
  practiced_at timestamptz not null default now(),
  verification_status text not null default 'self_reported' check (verification_status in ('self_reported','pending','verified','rejected')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  text_response text,
  media_url text,
  external_url text,
  status text not null default 'submitted' check (status in ('draft','submitted','under_review','approved','revision_requested','rejected')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  teacher_feedback text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

-- Immutable XP accounting. profiles.total_xp is a cached total updated by a trigger.
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  source_type text not null default 'manual' check (source_type in ('lesson','module','course','activity','practice','badge','streak','manual','import','adjustment')),
  source_id uuid,
  awarded_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.refresh_student_total_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set total_xp = greatest(0, coalesce((select sum(amount) from public.xp_ledger where student_id = coalesce(new.student_id, old.student_id)), 0)),
      updated_at = now()
  where id = coalesce(new.student_id, old.student_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists xp_ledger_refresh_total on public.xp_ledger;
create trigger xp_ledger_refresh_total
after insert or update or delete on public.xp_ledger
for each row execute function public.refresh_student_total_xp();

-- Achievements and certificates.
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon_url text,
  category text not null default 'achievement',
  xp_bonus integer not null default 0 check (xp_bonus >= 0),
  criteria jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_by uuid references public.profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (student_id, badge_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  certificate_type text not null default 'course',
  title text not null,
  certificate_number text not null unique,
  file_url text,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- Communication and scheduling.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  notification_type text not null default 'general',
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null default '',
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  event_type text not null default 'lesson' check (event_type in ('lesson','rehearsal','performance','deadline','meeting','recital','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  virtual_url text,
  audience_roles public.app_role[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.calendar_event_attendees (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined','tentative')),
  primary key (event_id, user_id)
);

-- Career pathing.
create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_milestones (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  name text not null,
  description text not null default '',
  level_number integer not null check (level_number > 0),
  required_xp integer not null default 0 check (required_xp >= 0),
  criteria jsonb not null default '{}'::jsonb,
  unique (career_path_id, level_number)
);

create table if not exists public.student_career_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  current_level integer not null default 1 check (current_level > 0),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, career_path_id)
);

-- Tool, API and plugin administration.
create table if not exists public.lab_tool_courses (
  tool_id uuid not null references public.lab_tools(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  required boolean not null default false,
  primary key (tool_id, course_id)
);

create table if not exists public.api_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider text not null,
  base_url text,
  auth_type text not null default 'none' check (auth_type in ('none','api_key','bearer','oauth2','basic','custom')),
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  health_status text not null default 'untested' check (health_status in ('untested','healthy','degraded','offline')),
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plugin_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  version text not null default '1.0.0',
  description text not null default '',
  entry_url text,
  manifest jsonb not null default '{}'::jsonb,
  permissions text[] not null default '{}',
  status text not null default 'disabled' check (status in ('draft','testing','enabled','disabled','incompatible','archived')),
  installed_by uuid references public.profiles(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Useful indexes for dashboards and synchronization.
create index if not exists idx_enrollments_teacher on public.enrollments(teacher_id);
create index if not exists idx_enrollments_course_status on public.enrollments(course_id, status);
create index if not exists idx_modules_course_sort on public.course_modules(course_id, sort_order);
create index if not exists idx_lessons_module_sort on public.lessons(module_id, sort_order);
create index if not exists idx_activities_course_status on public.activities(course_id, status);
create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id, status);
create index if not exists idx_practice_logs_student_date on public.practice_logs(student_id, practiced_at desc);
create index if not exists idx_submissions_status on public.submissions(status, submitted_at desc);
create index if not exists idx_xp_ledger_student_date on public.xp_ledger(student_id, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, read_at);
create index if not exists idx_messages_recipient_date on public.messages(recipient_id, created_at desc);
create index if not exists idx_calendar_events_start on public.calendar_events(starts_at);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- updated_at triggers.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'student_profiles','teacher_profiles','course_modules','lessons','activities',
    'enrollments','lesson_progress','submissions','badges','calendar_events',
    'career_paths','student_career_progress','api_registry','plugin_registry'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end $$;

-- Row Level Security.
alter table public.student_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.practice_logs enable row level security;
alter table public.submissions enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.certificates enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_attendees enable row level security;
alter table public.career_paths enable row level security;
alter table public.career_milestones enable row level security;
alter table public.student_career_progress enable row level security;
alter table public.lab_tool_courses enable row level security;
alter table public.api_registry enable row level security;
alter table public.plugin_registry enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles and role records.
create policy "student profile own or staff read" on public.student_profiles
for select using (auth.uid() = user_id or public.is_staff());
create policy "student profile own update" on public.student_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "student profile admin manage" on public.student_profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "teacher profiles authenticated read" on public.teacher_profiles
for select using (auth.role() = 'authenticated');
create policy "teacher profile own update" on public.teacher_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "teacher profiles admin manage" on public.teacher_profiles
for all using (public.is_admin()) with check (public.is_admin());

-- Published curriculum is readable by signed-in users; staff manages it.
create policy "published modules readable" on public.course_modules
for select using (status = 'published' or public.is_staff());
create policy "modules staff manage" on public.course_modules
for all using (public.is_staff()) with check (public.is_staff());
create policy "published lessons readable" on public.lessons
for select using (status = 'published' or public.is_staff());
create policy "lessons staff manage" on public.lessons
for all using (public.is_staff()) with check (public.is_staff());
create policy "published activities readable" on public.activities
for select using (status = 'published' or public.is_staff());
create policy "activities staff manage" on public.activities
for all using (public.is_staff()) with check (public.is_staff());

-- Student-owned learning records; staff can review and manage.
create policy "lesson progress own or staff read" on public.lesson_progress
for select using (student_id = auth.uid() or public.is_staff());
create policy "lesson progress own insert" on public.lesson_progress
for insert with check (student_id = auth.uid() or public.is_staff());
create policy "lesson progress own or staff update" on public.lesson_progress
for update using (student_id = auth.uid() or public.is_staff()) with check (student_id = auth.uid() or public.is_staff());

create policy "practice logs own or staff read" on public.practice_logs
for select using (student_id = auth.uid() or public.is_staff());
create policy "practice logs own insert" on public.practice_logs
for insert with check (student_id = auth.uid() or public.is_staff());
create policy "practice logs staff update" on public.practice_logs
for update using (public.is_staff()) with check (public.is_staff());

create policy "submissions own or staff read" on public.submissions
for select using (student_id = auth.uid() or public.is_staff());
create policy "submissions own insert" on public.submissions
for insert with check (student_id = auth.uid());
create policy "submissions own draft update" on public.submissions
for update using (student_id = auth.uid() and status = 'draft') with check (student_id = auth.uid());
create policy "submissions staff review" on public.submissions
for update using (public.is_staff()) with check (public.is_staff());

create policy "xp own or staff read" on public.xp_ledger
for select using (student_id = auth.uid() or public.is_staff());
create policy "xp staff award" on public.xp_ledger
for insert with check (public.is_staff());
create policy "xp admin adjust" on public.xp_ledger
for update using (public.is_admin()) with check (public.is_admin());
create policy "xp admin delete" on public.xp_ledger
for delete using (public.is_admin());

-- Awards.
create policy "published badges readable" on public.badges
for select using (status = 'published' or public.is_staff());
create policy "badges staff manage" on public.badges
for all using (public.is_staff()) with check (public.is_staff());
create policy "student badges own or staff read" on public.student_badges
for select using (student_id = auth.uid() or public.is_staff());
create policy "student badges staff award" on public.student_badges
for all using (public.is_staff()) with check (public.is_staff());
create policy "certificates own or staff read" on public.certificates
for select using (student_id = auth.uid() or public.is_staff());
create policy "certificates staff manage" on public.certificates
for all using (public.is_staff()) with check (public.is_staff());

-- Communication.
create policy "notifications own read" on public.notifications
for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications staff create" on public.notifications
for insert with check (public.is_staff());

create policy "messages participants read" on public.messages
for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages authenticated send" on public.messages
for insert with check (sender_id = auth.uid());
create policy "messages recipient mark read" on public.messages
for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "calendar authenticated read" on public.calendar_events
for select using (auth.role() = 'authenticated');
create policy "calendar staff manage" on public.calendar_events
for all using (public.is_staff()) with check (public.is_staff());
create policy "calendar attendees own or staff read" on public.calendar_event_attendees
for select using (user_id = auth.uid() or public.is_staff());
create policy "calendar attendees own respond" on public.calendar_event_attendees
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "calendar attendees staff manage" on public.calendar_event_attendees
for all using (public.is_staff()) with check (public.is_staff());

-- Career paths.
create policy "published career paths readable" on public.career_paths
for select using (status = 'published' or public.is_staff());
create policy "career paths staff manage" on public.career_paths
for all using (public.is_staff()) with check (public.is_staff());
create policy "career milestones authenticated read" on public.career_milestones
for select using (auth.role() = 'authenticated');
create policy "career milestones staff manage" on public.career_milestones
for all using (public.is_staff()) with check (public.is_staff());
create policy "career progress own or staff read" on public.student_career_progress
for select using (student_id = auth.uid() or public.is_staff());
create policy "career progress own manage" on public.student_career_progress
for all using (student_id = auth.uid() or public.is_staff()) with check (student_id = auth.uid() or public.is_staff());

-- Advanced administration.
create policy "tool course mappings authenticated read" on public.lab_tool_courses
for select using (auth.role() = 'authenticated');
create policy "tool course mappings staff manage" on public.lab_tool_courses
for all using (public.is_staff()) with check (public.is_staff());
create policy "api registry admin only" on public.api_registry
for all using (public.is_admin()) with check (public.is_admin());
create policy "plugin registry staff read" on public.plugin_registry
for select using (public.is_staff());
create policy "plugin registry admin manage" on public.plugin_registry
for all using (public.is_admin()) with check (public.is_admin());
create policy "audit logs admin read" on public.audit_logs
for select using (public.is_admin());
create policy "audit logs staff insert" on public.audit_logs
for insert with check (public.is_staff());

-- Seed the nine JPAC launch courses without overwriting later admin edits.
insert into public.courses (slug, title, description, module_count, total_xp, status)
values
  ('piano','Piano','Piano technique, musicianship and performance development.',10,50000,'published'),
  ('guitar','Guitar','Guitar technique, rhythm, chords and performance development.',10,50000,'published'),
  ('singing','Singing','Vocal technique, confidence and performance development.',10,50000,'published'),
  ('acting','Acting','Acting technique, character development and stage performance.',10,50000,'published'),
  ('dance','Dance','Movement, choreography and performance development.',10,50000,'published'),
  ('video-production','Video Production','Cinematography, editing and visual storytelling.',10,50000,'published'),
  ('audio-engineering','Audio Engineering','Recording, mixing and sound production fundamentals.',10,50000,'published'),
  ('music-production-songwriting','Music Production / Songwriting','Beat production, songwriting and creative development.',10,50000,'published'),
  ('music-business','Music Business','Branding, monetization and professional music-industry skills.',10,50000,'published')
on conflict (slug) do nothing;
