-- JPAC Academy LC1.3: Enrollment Manager
-- Visual enrollment, teacher assignment, guardian linking and ARIA initialization.

alter table public.enrollments
  add column if not exists start_date date,
  add column if not exists target_completion_date date,
  add column if not exists wix_program_url text,
  add column if not exists notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.enrollment_manager_create(
  target_student uuid,
  target_course uuid,
  target_teacher uuid default null,
  enrollment_status text default 'active',
  enrollment_start date default current_date,
  completion_target date default null,
  wix_url text default null,
  enrollment_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  enrollment_uuid uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if enrollment_status not in ('pending','active','paused','completed','withdrawn','expired') then
    raise exception 'Invalid enrollment status';
  end if;

  insert into public.enrollments(
    student_id,course_id,teacher_id,status,start_date,target_completion_date,wix_program_url,notes,updated_at
  ) values(
    target_student,target_course,target_teacher,enrollment_status,enrollment_start,completion_target,wix_url,enrollment_notes,now()
  )
  on conflict(student_id,course_id) do update set
    teacher_id=excluded.teacher_id,
    status=excluded.status,
    start_date=excluded.start_date,
    target_completion_date=excluded.target_completion_date,
    wix_program_url=excluded.wix_program_url,
    notes=excluded.notes,
    updated_at=now()
  returning id into enrollment_uuid;

  perform public.initialize_student_intelligence(target_student);
  perform public.initialize_enrollment_intelligence(enrollment_uuid);

  if target_teacher is not null then
    insert into public.teacher_assignments(student_id,teacher_id,course_id,assignment_role,active,created_by)
    values(target_student,target_teacher,target_course,'primary',true,auth.uid())
    on conflict(student_id,teacher_id,course_id,assignment_role)
    do update set active=true,ends_at=null;
  end if;

  insert into public.student_timeline(student_id,event_type,title,description,source_type,source_id,visibility,metadata)
  values(target_student,'enrollment','Enrolled in JPAC course','Course enrollment and ARIA learning profile initialized.','enrollment',enrollment_uuid,'student',jsonb_build_object('course_id',target_course,'teacher_id',target_teacher));

  return enrollment_uuid;
end;
$$;

create or replace function public.enrollment_manager_update_status(
  target_enrollment uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if new_status not in ('pending','active','paused','completed','withdrawn','expired') then raise exception 'Invalid status'; end if;
  update public.enrollments
  set status=new_status,
      completed_at=case when new_status='completed' then coalesce(completed_at,now()) else completed_at end,
      updated_at=now()
  where id=target_enrollment;
end;
$$;

create or replace function public.enrollment_manager_add_guardian(
  target_student uuid,
  guardian_name text,
  guardian_email text default null,
  guardian_phone text default null,
  guardian_relationship text default 'guardian',
  primary_guardian boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare relationship_uuid uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if primary_guardian then update public.parent_relationships set is_primary=false where student_id=target_student; end if;
  insert into public.parent_relationships(student_id,full_name,email,phone,relationship_type,is_primary)
  values(target_student,guardian_name,guardian_email,guardian_phone,guardian_relationship,primary_guardian)
  returning id into relationship_uuid;
  return relationship_uuid;
end;
$$;

grant execute on function public.enrollment_manager_create(uuid,uuid,uuid,text,date,date,text,text) to authenticated;
grant execute on function public.enrollment_manager_update_status(uuid,text) to authenticated;
grant execute on function public.enrollment_manager_add_guardian(uuid,text,text,text,text,boolean) to authenticated;
