-- JPAC Academy Sprint C3: credentials, achievements, verification and digital sharing
create extension if not exists "pgcrypto";

create sequence if not exists public.certificate_number_seq start 1;

create or replace function public.next_certificate_number()
returns text
language sql
volatile
security definer
set search_path=public
as $$
  select 'JPAC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text,6,'0');
$$;

alter table public.certificates
  add column if not exists template_slug text not null default 'certificate-of-completion',
  add column if not exists completion_date date,
  add column if not exists grade text,
  add column if not exists final_score numeric(5,2) check(final_score is null or final_score between 0 and 100),
  add column if not exists hours_completed numeric(8,2) check(hours_completed is null or hours_completed >= 0),
  add column if not exists level_label text,
  add column if not exists instructor_name text,
  add column if not exists verification_token uuid not null default gen_random_uuid(),
  add column if not exists qr_target_url text,
  add column if not exists thumbnail_url text,
  add column if not exists digital_card_url text,
  add column if not exists status text not null default 'issued',
  add column if not exists revoked_at timestamptz,
  add column if not exists revocation_reason text;

alter table public.certificates drop constraint if exists certificates_status_check;
alter table public.certificates add constraint certificates_status_check check(status in('draft','pending','issued','revoked','expired'));
create unique index if not exists certificates_verification_token_key on public.certificates(verification_token);

alter table public.certificates alter column certificate_number set default public.next_certificate_number();

create table if not exists public.credential_templates(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  credential_type text not null,
  orientation text not null default 'landscape' check(orientation in('landscape','portrait','square')),
  print_width integer not null default 1920,
  print_height integer not null default 1080,
  social_width integer not null default 1080,
  social_height integer not null default 1350,
  background_asset_url text,
  seal_variant text not null default 'gold' check(seal_variant in('gold','embossed_gold','silver')),
  body_template text not null default '',
  required_variables text[] not null default '{}',
  auto_issue boolean not null default false,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievement_definitions(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'achievement',
  rarity text not null default 'standard' check(rarity in('standard','bronze','silver','gold','platinum','legendary')),
  xp_reward integer not null default 0 check(xp_reward >= 0),
  icon text,
  badge_asset_url text,
  certificate_template_slug text references public.credential_templates(slug) on update cascade,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_achievements(
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  awarded_by uuid references public.profiles(id) on delete set null,
  certificate_id uuid references public.certificates(id) on delete set null,
  earned_at timestamptz not null default now(),
  shared_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(student_id,achievement_id)
);

create table if not exists public.credential_verification_events(
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  verified_at timestamptz not null default now(),
  verifier_ip_hash text,
  user_agent text,
  result text not null default 'verified' check(result in('verified','revoked','expired','not_found'))
);

create table if not exists public.credential_render_jobs(
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  output_type text not null check(output_type in('pdf','png','digital_card','portfolio_cover')),
  status text not null default 'queued' check(status in('queued','processing','complete','failed')),
  output_url text,
  error_message text,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_student_achievements_student on public.student_achievements(student_id,earned_at desc);
create index if not exists idx_credentials_student on public.certificates(student_id,issued_at desc);
create index if not exists idx_verification_events_certificate on public.credential_verification_events(certificate_id,verified_at desc);

alter table public.credential_templates enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.student_achievements enable row level security;
alter table public.credential_verification_events enable row level security;
alter table public.credential_render_jobs enable row level security;

drop policy if exists "templates readable" on public.credential_templates;
create policy "templates readable" on public.credential_templates for select to authenticated using(active=true or public.is_academy_staff());
drop policy if exists "staff manage templates" on public.credential_templates;
create policy "staff manage templates" on public.credential_templates for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

drop policy if exists "achievement definitions readable" on public.achievement_definitions;
create policy "achievement definitions readable" on public.achievement_definitions for select to authenticated using(active=true or public.is_academy_staff());
drop policy if exists "staff manage achievement definitions" on public.achievement_definitions;
create policy "staff manage achievement definitions" on public.achievement_definitions for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

drop policy if exists "students read own achievements" on public.student_achievements;
create policy "students read own achievements" on public.student_achievements for select to authenticated using(student_id=auth.uid() or public.is_academy_staff());
drop policy if exists "staff manage student achievements" on public.student_achievements;
create policy "staff manage student achievements" on public.student_achievements for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

drop policy if exists "students read own certificates" on public.certificates;
create policy "students read own certificates" on public.certificates for select to authenticated using(student_id=auth.uid() or public.is_academy_staff());
drop policy if exists "staff manage certificates" on public.certificates;
create policy "staff manage certificates" on public.certificates for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

drop policy if exists "staff read verification events" on public.credential_verification_events;
create policy "staff read verification events" on public.credential_verification_events for select to authenticated using(public.is_academy_staff());
drop policy if exists "staff manage render jobs" on public.credential_render_jobs;
create policy "staff manage render jobs" on public.credential_render_jobs for all to authenticated using(public.is_academy_staff()) with check(public.is_academy_staff());

insert into public.credential_templates(slug,name,credential_type,orientation,body_template,required_variables,auto_issue,config)
values
('certificate-of-completion','Certificate of Completion','course_completion','landscape','This certifies that {{StudentName}} has successfully completed {{CourseName}} with distinction through the JPAC Academy Learning System. During this course the student demonstrated dedication, creativity, artistic growth, and mastery of the required learning objectives.',array['StudentName','CourseName','CompletionDate','Grade','FinalScore','Hours','Level','Instructor','CertificateID','VerificationQRCode'],true,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('certificate-of-excellence','Certificate of Excellence','excellence','landscape','Presented to {{StudentName}} for outstanding performance, dedication, and excellence.',array['StudentName','CourseName','CompletionDate','FinalScore','Instructor','CertificateID'],false,'{"print":"dark","digitalCard":true,"seal":"gold"}'),
('level-up-certificate','Level Up Certificate','level_up','landscape','Congratulations {{StudentName}}. You have advanced to {{Level}}.',array['StudentName','Level','CompletionDate','CertificateID'],true,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('perfect-attendance-award','Perfect Attendance Award','attendance','landscape','Presented to {{StudentName}} for perfect attendance and commitment.',array['StudentName','CourseName','CompletionDate','Instructor','CertificateID'],true,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('artist-achievement-award','Artist Achievement Award','achievement','landscape','Presented to {{StudentName}} for outstanding creativity, dedication, and artistic growth.',array['StudentName','AchievementName','CompletionDate','Instructor','CertificateID'],false,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('performance-certificate','Performance Certificate','performance','landscape','This certifies that {{StudentName}} successfully participated in {{PerformanceName}}.',array['StudentName','PerformanceName','CompletionDate','Instructor','CertificateID'],false,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('career-path-certification','Career Path Certification','career_path','landscape','This certifies that {{StudentName}} completed the {{CareerPath}} career path.',array['StudentName','CareerPath','CompletionDate','CertificateID'],true,'{"print":"official","digitalCard":true,"seal":"gold"}'),
('skill-badge-certificate','Skill Badge Certificate','skill','portrait','{{StudentName}} has mastered {{SkillName}}.',array['StudentName','SkillName','CompletionDate','CertificateID'],true,'{"print":"dark","digitalCard":true,"seal":"gold"}')
on conflict(slug) do update set name=excluded.name,body_template=excluded.body_template,required_variables=excluded.required_variables,config=excluded.config;

insert into public.achievement_definitions(slug,name,description,category,rarity,xp_reward,icon,certificate_template_slug,criteria)
values
('first-lesson','First Lesson','Completed the first JPAC Academy lesson.','learning','bronze',250,'🎓','skill-badge-certificate','{"lessonsCompleted":1}'),
('seven-day-streak','Seven-Day Streak','Practiced for seven consecutive days.','practice','silver',750,'🔥','skill-badge-certificate','{"practiceStreak":7}'),
('perfect-attendance','Perfect Attendance','Maintained 100% attendance for a course or program.','attendance','gold',1500,'✅','perfect-attendance-award','{"attendancePercent":100}'),
('course-complete','Course Complete','Completed every required module in a JPAC course.','course','gold',2500,'🏆','certificate-of-completion','{"courseProgress":100}'),
('level-up','Level Up','Advanced to the next JPAC career level.','level','gold',1000,'⭐','level-up-certificate','{"levelAdvanced":true}'),
('artist-achievement','Artist Achievement','Recognized for exceptional creativity or artistic growth.','achievement','platinum',2000,'🎭','artist-achievement-award','{"manualAward":true}')
on conflict(slug) do update set name=excluded.name,description=excluded.description,xp_reward=excluded.xp_reward,criteria=excluded.criteria;
