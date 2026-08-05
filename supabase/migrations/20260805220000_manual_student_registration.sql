-- JPAC Academy: Manual student registration for Admin/Developer
-- Wix-first enrollment remains the primary path. This creates a pending student
-- record that can later be linked to a Wix member and authenticated profile.

create extension if not exists "pgcrypto";

create table if not exists public.pending_students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  display_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  email text,
  phone text,
  date_of_birth date,
  school_name text,
  grade_level text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  wix_member_id text,
  wix_program_url text,
  course_id uuid references public.courses(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  enrollment_status text not null default 'pending' check(enrollment_status in ('pending','active','paused')),
  start_date date,
  target_completion_date date,
  notes text not null default '',
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  guardian_relationship text default 'guardian',
  invitation_status text not null default 'not_sent' check(invitation_status in ('not_sent','queued','sent','accepted','cancelled')),
  linked_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pending_students enable row level security;

create policy "admins manage pending students"
on public.pending_students for all
using(public.is_admin())
with check(public.is_admin());

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
  guardian_relationship_type text default 'guardian'
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if trim(coalesce(student_first_name,''))='' or trim(coalesce(student_last_name,''))='' then
    raise exception 'Student first and last name are required';
  end if;

  insert into public.pending_students(
    first_name,last_name,email,phone,date_of_birth,school_name,grade_level,
    course_id,teacher_id,wix_program_url,start_date,target_completion_date,notes,
    guardian_name,guardian_email,guardian_phone,guardian_relationship,created_by
  ) values(
    trim(student_first_name),trim(student_last_name),nullif(trim(student_email),''),nullif(trim(student_phone),''),student_dob,
    nullif(trim(student_school),''),nullif(trim(student_grade),''),target_course,target_teacher,nullif(trim(wix_url),''),
    enrollment_start,completion_target,coalesce(enrollment_notes,''),nullif(trim(guardian_full_name),''),
    nullif(trim(guardian_email_address),''),nullif(trim(guardian_phone_number),''),coalesce(guardian_relationship_type,'guardian'),auth.uid()
  ) returning id into new_id;

  return new_id;
end;$$;

grant execute on function public.manual_student_create(text,text,text,text,date,text,text,uuid,uuid,text,date,date,text,text,text,text,text) to authenticated;
