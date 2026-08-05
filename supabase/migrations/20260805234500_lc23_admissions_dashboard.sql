-- JPAC Academy LC2.3 Phase 1: Admissions & Enrollment Center
-- Extends pending students into a Wix-first admissions pipeline.

alter table public.pending_students
  add column if not exists admissions_stage text not null default 'inquiry',
  add column if not exists enrollment_source text not null default 'admin',
  add column if not exists student_type text not null default 'adult',
  add column if not exists academy_experience text not null default 'online',
  add column if not exists creative_interests text[] not null default '{}',
  add column if not exists experience_level text,
  add column if not exists dream_career text,
  add column if not exists preferred_genres text[] not null default '{}',
  add column if not exists practice_availability text,
  add column if not exists last_contact_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists activated_at timestamptz;

do $$ begin
  alter table public.pending_students
    add constraint pending_students_admissions_stage_check
    check(admissions_stage in ('inquiry','interested','application','audition','accepted','invited','wix_enrolled','active','graduated','inactive'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.pending_students
    add constraint pending_students_enrollment_source_check
    check(enrollment_source in ('wix','admin','campus','import'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.pending_students
    add constraint pending_students_student_type_check
    check(student_type in ('adult','minor'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.pending_students
    add constraint pending_students_academy_experience_check
    check(academy_experience in ('online','campus','hybrid'));
exception when duplicate_object then null; end $$;

create table if not exists public.admissions_activity (
  id uuid primary key default gen_random_uuid(),
  pending_student_id uuid not null references public.pending_students(id) on delete cascade,
  activity_type text not null,
  title text not null,
  details text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admissions_activity enable row level security;

create policy "admins manage admissions activity"
on public.admissions_activity for all
using(public.is_admin())
with check(public.is_admin());

create or replace function public.admissions_update_stage(target_student uuid,new_stage text)
returns void language plpgsql security definer set search_path=public as $$
declare old_stage text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if new_stage not in ('inquiry','interested','application','audition','accepted','invited','wix_enrolled','active','graduated','inactive') then
    raise exception 'Invalid admissions stage';
  end if;
  select admissions_stage into old_stage from public.pending_students where id=target_student;
  update public.pending_students
    set admissions_stage=new_stage,
        accepted_at=case when new_stage='accepted' and accepted_at is null then now() else accepted_at end,
        activated_at=case when new_stage='active' and activated_at is null then now() else activated_at end,
        updated_at=now()
  where id=target_student;
  insert into public.admissions_activity(pending_student_id,activity_type,title,details,created_by)
  values(target_student,'stage_change','Admissions stage updated',coalesce(old_stage,'unknown')||' → '||new_stage,auth.uid());
end;$$;

grant execute on function public.admissions_update_stage(uuid,text) to authenticated;

create or replace function public.manual_student_create(
  student_first_name text,
  student_last_name text,
  student_email text default null,
  student_phone text default null,
  student_dob date default null,
  student_school text default null,
  student_grade text default null,
  target_course uuid default null,
  target_teacher uuid default null,
  wix_url text default null,
  enrollment_start date default null,
  completion_target date default null,
  enrollment_notes text default '',
  guardian_full_name text default null,
  guardian_email_address text default null,
  guardian_phone_number text default null,
  guardian_relationship_type text default 'guardian',
  source_type text default 'admin',
  learner_type text default 'adult',
  experience_mode text default 'online'
) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if trim(coalesce(student_first_name,''))='' or trim(coalesce(student_last_name,''))='' then raise exception 'Student first and last name are required'; end if;
  insert into public.pending_students(
    first_name,last_name,email,phone,date_of_birth,school_name,grade_level,
    course_id,teacher_id,wix_program_url,start_date,target_completion_date,notes,
    guardian_name,guardian_email,guardian_phone,guardian_relationship,created_by,
    enrollment_source,student_type,academy_experience,admissions_stage
  ) values(
    trim(student_first_name),trim(student_last_name),nullif(trim(student_email),''),nullif(trim(student_phone),''),student_dob,
    nullif(trim(student_school),''),nullif(trim(student_grade),''),target_course,target_teacher,nullif(trim(wix_url),''),
    enrollment_start,completion_target,coalesce(enrollment_notes,''),nullif(trim(guardian_full_name),''),
    nullif(trim(guardian_email_address),''),nullif(trim(guardian_phone_number),''),coalesce(guardian_relationship_type,'guardian'),auth.uid(),
    coalesce(source_type,'admin'),coalesce(learner_type,'adult'),coalesce(experience_mode,'online'),'inquiry'
  ) returning id into new_id;
  insert into public.admissions_activity(pending_student_id,activity_type,title,details,created_by)
  values(new_id,'created','Prospective student created','Created through the JPAC Admissions & Enrollment Center.',auth.uid());
  return new_id;
end;$$;
