-- JPAC Academy LC1: Central Student Intelligence Core
-- Final major core-schema expansion before schema freeze.
-- Unifies student goals, learning preferences, relationships, portfolio,
-- progress timeline and ARIA memory around public.profiles/student_profiles.

create extension if not exists "pgcrypto";

-- Student goals and interests -------------------------------------------------
create table if not exists public.student_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  goal_type text not null default 'creative' check (goal_type in ('creative','course','career','performance','practice','personal')),
  title text not null,
  description text not null default '',
  target_date date,
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_interests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  interest_type text not null default 'discipline' check (interest_type in ('discipline','career','tool','genre','performance','technology','business')),
  name text not null,
  strength numeric(4,3) not null default 1 check (strength between 0 and 1),
  source text not null default 'student' check (source in ('student','teacher','parent','aria','import')),
  created_at timestamptz not null default now(),
  unique(student_id, interest_type, name)
);

create table if not exists public.student_strengths (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  confidence numeric(4,3) not null default 0.5 check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  identified_by text not null default 'teacher' check (identified_by in ('teacher','aria','assessment','student','import')),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, skill_name)
);

create table if not exists public.student_learning_preferences (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  visual_score numeric(4,3) not null default 0.5 check (visual_score between 0 and 1),
  auditory_score numeric(4,3) not null default 0.5 check (auditory_score between 0 and 1),
  kinesthetic_score numeric(4,3) not null default 0.5 check (kinesthetic_score between 0 and 1),
  reading_score numeric(4,3) not null default 0.5 check (reading_score between 0 and 1),
  preferred_session_minutes integer not null default 20 check (preferred_session_minutes between 5 and 240),
  preferred_pace text not null default 'balanced' check (preferred_pace in ('gentle','balanced','accelerated')),
  preferred_feedback text not null default 'encouraging' check (preferred_feedback in ('encouraging','direct','detailed','brief')),
  accessibility_needs jsonb not null default '{}'::jsonb,
  motivation_triggers text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Teacher and parent relationships -----------------------------------------
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  assignment_role text not null default 'primary' check (assignment_role in ('primary','assistant','mentor','reviewer')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(student_id, teacher_id, course_id, assignment_role)
);

create table if not exists public.parent_relationships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  parent_user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  relationship_type text not null default 'guardian' check (relationship_type in ('mother','father','guardian','grandparent','emergency_contact','other')),
  is_primary boolean not null default false,
  permissions jsonb not null default '{"progress":true,"attendance":true,"certificates":true,"messages":true,"billing":false}'::jsonb,
  invite_status text not null default 'not_invited' check (invite_status in ('not_invited','invited','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unified student timeline and course intelligence -------------------------
create table if not exists public.student_timeline (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('enrollment','course_started','module_completed','lesson_completed','activity_completed','practice','feedback','achievement','certificate','level_up','performance','portfolio','career','system')),
  title text not null,
  description text not null default '',
  source_type text,
  source_id uuid,
  visibility text not null default 'student' check (visibility in ('private','staff','student','parent','public')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.course_progress (
  enrollment_id uuid primary key references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  earned_xp integer not null default 0 check (earned_xp >= 0),
  total_xp integer not null default 50000 check (total_xp > 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  activities_completed integer not null default 0 check (activities_completed >= 0),
  practice_minutes integer not null default 0 check (practice_minutes >= 0),
  current_module_id uuid references public.course_modules(id) on delete set null,
  current_lesson_id uuid references public.lessons(id) on delete set null,
  readiness_score numeric(5,2) not null default 0 check (readiness_score between 0 and 100),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  last_activity_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, course_id)
);

create table if not exists public.activity_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','submitted','completed','needs_review')),
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  best_score numeric(5,2) check (best_score is null or best_score between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, activity_id)
);

-- Portfolio and Creative Passport ------------------------------------------
create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  title text not null,
  description text not null default '',
  project_type text not null default 'project' check (project_type in ('audio','video','photo','performance','writing','design','project','resume','certificate')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  featured boolean not null default false,
  skills text[] not null default '{}',
  career_tags text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  portfolio_project_id uuid references public.portfolio_projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('image','audio','video','document','link')),
  title text not null default '',
  storage_path text,
  external_url text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.student_resumes (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  headline text not null default '',
  biography text not null default '',
  skills text[] not null default '{}',
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  performances jsonb not null default '[]'::jsonb,
  leadership jsonb not null default '[]'::jsonb,
  community_service jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ARIA persistent educational memory ---------------------------------------
create table if not exists public.aria_profiles (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  summary text not null default '',
  strengths text[] not null default '{}',
  growth_areas text[] not null default '{}',
  current_focus text[] not null default '{}',
  preferred_coaching_style text not null default 'encouraging',
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  motivation_score numeric(5,2) not null default 50 check (motivation_score between 0 and 100),
  engagement_score numeric(5,2) not null default 50 check (engagement_score between 0 and 100),
  next_best_actions jsonb not null default '[]'::jsonb,
  model_context jsonb not null default '{}'::jsonb,
  last_analyzed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('lesson','practice','tool','career','motivation','review','assessment','teacher_alert')),
  title text not null,
  rationale text not null default '',
  action_payload jsonb not null default '{}'::jsonb,
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'active' check (status in ('active','accepted','completed','dismissed','expired')),
  source_version text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aria_interactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  interaction_type text not null default 'chat' check (interaction_type in ('chat','recommendation','reflection','teacher_note','parent_note','system_memory')),
  role text not null default 'student' check (role in ('student','aria','teacher','parent','system')),
  content text not null,
  memory_tags text[] not null default '{}',
  importance numeric(4,3) not null default 0.5 check (importance between 0 and 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enrollment initialization -------------------------------------------------
create or replace function public.initialize_student_intelligence(target_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() and auth.uid() <> target_student then
    raise exception 'Not authorized';
  end if;

  insert into public.student_learning_preferences(student_id)
  values(target_student)
  on conflict (student_id) do nothing;

  insert into public.aria_profiles(student_id)
  values(target_student)
  on conflict (student_id) do nothing;
end;
$$;

create or replace function public.initialize_enrollment_intelligence(target_enrollment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select id, student_id, course_id into e from public.enrollments where id = target_enrollment;
  if e.id is null then raise exception 'Enrollment not found'; end if;

  perform public.initialize_student_intelligence(e.student_id);

  insert into public.course_progress(enrollment_id,student_id,course_id,total_xp)
  select e.id,e.student_id,e.course_id,coalesce(c.total_xp,50000)
  from public.courses c where c.id=e.course_id
  on conflict (enrollment_id) do nothing;

  insert into public.student_timeline(student_id,event_type,title,description,source_type,source_id,visibility)
  values(e.student_id,'enrollment','Enrollment activated','Learning path, XP plan and ARIA profile initialized.','enrollment',e.id,'student');
end;
$$;

-- Indexes ------------------------------------------------------------------
create index if not exists idx_student_goals_student_status on public.student_goals(student_id,status);
create index if not exists idx_student_timeline_student_date on public.student_timeline(student_id,occurred_at desc);
create index if not exists idx_teacher_assignments_teacher_active on public.teacher_assignments(teacher_id,active);
create index if not exists idx_parent_relationships_student on public.parent_relationships(student_id);
create index if not exists idx_course_progress_student on public.course_progress(student_id);
create index if not exists idx_activity_progress_student on public.activity_progress(student_id,status);
create index if not exists idx_portfolio_projects_student on public.portfolio_projects(student_id,status);
create index if not exists idx_aria_recommendations_student_status on public.aria_recommendations(student_id,status,priority desc);
create index if not exists idx_aria_interactions_student_date on public.aria_interactions(student_id,created_at desc);

-- Updated-at triggers -------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_goals','student_strengths','student_learning_preferences','parent_relationships','course_progress','activity_progress','portfolio_projects','student_resumes','aria_profiles','aria_recommendations']
  LOOP
    EXECUTE format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
    EXECUTE format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
  END LOOP;
END $$;

-- Row Level Security --------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_goals','student_interests','student_strengths','student_learning_preferences','teacher_assignments','parent_relationships','student_timeline','course_progress','activity_progress','portfolio_projects','media_assets','student_resumes','aria_profiles','aria_recommendations','aria_interactions']
  LOOP
    EXECUTE format('alter table public.%I enable row level security',t);
  END LOOP;
END $$;

-- Students can read/write their own personal records where appropriate.
drop policy if exists student_goals_self on public.student_goals;
create policy student_goals_self on public.student_goals for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists student_interests_self on public.student_interests;
create policy student_interests_self on public.student_interests for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists student_preferences_self on public.student_learning_preferences;
create policy student_preferences_self on public.student_learning_preferences for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists student_strengths_read on public.student_strengths;
create policy student_strengths_read on public.student_strengths for select using (student_id=auth.uid() or public.is_staff());
drop policy if exists student_strengths_staff_write on public.student_strengths;
create policy student_strengths_staff_write on public.student_strengths for all using (public.is_staff()) with check (public.is_staff());

-- Staff-managed relationship records.
drop policy if exists teacher_assignments_access on public.teacher_assignments;
create policy teacher_assignments_access on public.teacher_assignments for select using (student_id=auth.uid() or teacher_id=auth.uid() or public.is_staff());
drop policy if exists teacher_assignments_staff_write on public.teacher_assignments;
create policy teacher_assignments_staff_write on public.teacher_assignments for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists parent_relationships_access on public.parent_relationships;
create policy parent_relationships_access on public.parent_relationships for select using (student_id=auth.uid() or parent_user_id=auth.uid() or public.is_staff());
drop policy if exists parent_relationships_staff_write on public.parent_relationships;
create policy parent_relationships_staff_write on public.parent_relationships for all using (public.is_staff()) with check (public.is_staff());

-- Student-facing read policies and staff-managed writes.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_timeline','course_progress','activity_progress','portfolio_projects','media_assets','student_resumes','aria_profiles','aria_recommendations','aria_interactions']
  LOOP
    EXECUTE format('drop policy if exists %I_student_read on public.%I',t,t);
    EXECUTE format('create policy %I_student_read on public.%I for select using (student_id=auth.uid() or public.is_staff())',t,t);
  END LOOP;
END $$;

drop policy if exists portfolio_projects_self_write on public.portfolio_projects;
create policy portfolio_projects_self_write on public.portfolio_projects for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists media_assets_self_write on public.media_assets;
create policy media_assets_self_write on public.media_assets for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists student_resumes_self_write on public.student_resumes;
create policy student_resumes_self_write on public.student_resumes for all using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());

drop policy if exists aria_interactions_self_insert on public.aria_interactions;
create policy aria_interactions_self_insert on public.aria_interactions for insert with check (student_id=auth.uid() or public.is_staff());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_timeline','course_progress','activity_progress','aria_profiles','aria_recommendations']
  LOOP
    EXECUTE format('drop policy if exists %I_staff_write on public.%I',t,t);
    EXECUTE format('create policy %I_staff_write on public.%I for all using (public.is_staff()) with check (public.is_staff())',t,t);
  END LOOP;
END $$;

-- Seed intelligence shells for existing students.
insert into public.student_learning_preferences(student_id)
select id from public.profiles where role='student'
on conflict (student_id) do nothing;

insert into public.aria_profiles(student_id)
select id from public.profiles where role='student'
on conflict (student_id) do nothing;
