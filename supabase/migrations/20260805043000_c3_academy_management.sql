-- C3 Academy Management System
-- Run after C1, C2, and the credentials migration.

-- Prevent users from changing their own protected role through a normal profile update.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
     and auth.uid() = old.id
     and not public.is_academy_admin() then
    raise exception 'Only Academy administrators may change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- Administrators can promote/demote accounts while keeping the matching profile table accurate.
create or replace function public.admin_set_user_role(target_user uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_academy_admin() then raise exception 'Administrator access required'; end if;
  if target_user = auth.uid() and new_role <> 'developer' then
    raise exception 'Developer owners cannot demote themselves';
  end if;

  update public.profiles set role = new_role, updated_at = now() where id = target_user;
  if not found then raise exception 'User profile not found'; end if;

  if new_role = 'student' then
    insert into public.student_profiles(user_id) values(target_user) on conflict(user_id) do nothing;
    delete from public.teacher_profiles where user_id = target_user;
  else
    delete from public.student_profiles where user_id = target_user;
    if new_role in ('teacher','admin','developer') then
      insert into public.teacher_profiles(user_id,title,biography)
      values(target_user,'JPAC Academy Instructor','JPAC Academy teacher and creative mentor.')
      on conflict(user_id) do nothing;
    end if;
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'role_changed','profile',target_user,jsonb_build_object('role',new_role));
end;
$$;

grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

create or replace function public.admin_award_xp(target_student uuid, xp_amount integer, xp_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare ledger_id uuid;
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  if xp_amount = 0 or abs(xp_amount) > 50000 then raise exception 'XP amount must be between -50000 and 50000, excluding zero'; end if;
  if not exists(select 1 from public.profiles where id=target_student and role='student') then raise exception 'Student not found'; end if;

  insert into public.xp_ledger(student_id,amount,reason,source_type,awarded_by)
  values(target_student,xp_amount,coalesce(nullif(trim(xp_reason),''),'Manual Academy award'),'manual',auth.uid())
  returning id into ledger_id;
  return ledger_id;
end;
$$;

grant execute on function public.admin_award_xp(uuid, integer, text) to authenticated;

create or replace function public.admin_enroll_student(target_student uuid, target_course uuid, assigned_teacher uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare enrollment_id uuid;
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  if not exists(select 1 from public.profiles where id=target_student and role='student') then raise exception 'Student not found'; end if;
  if not exists(select 1 from public.courses where id=target_course) then raise exception 'Course not found'; end if;

  insert into public.enrollments(student_id,course_id,teacher_id,status)
  values(target_student,target_course,assigned_teacher,'active')
  on conflict(student_id,course_id) do update set teacher_id=excluded.teacher_id,status='active',updated_at=now()
  returning id into enrollment_id;
  return enrollment_id;
end;
$$;

grant execute on function public.admin_enroll_student(uuid, uuid, uuid) to authenticated;

create or replace function public.admin_issue_completion_certificate(
  target_student uuid,
  target_course uuid,
  completion_on date,
  grade_value text default null,
  score_value numeric default null,
  hours_value numeric default null,
  level_value text default null,
  instructor_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cert_id uuid; cert_title text;
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  select title into cert_title from public.courses where id=target_course;
  if cert_title is null then raise exception 'Course not found'; end if;

  insert into public.certificates(
    student_id,course_id,certificate_type,title,certificate_number,issued_by,
    template_slug,completion_date,grade,final_score,hours_completed,level_label,
    instructor_name,status,metadata
  ) values(
    target_student,target_course,'course','Certificate of Completion — '||cert_title,
    public.next_certificate_number(),auth.uid(),'course-completion',completion_on,
    grade_value,score_value,hours_value,level_value,instructor_value,'issued',
    jsonb_build_object('website','https://www.jmonespac.org','tagline','Greatness Starts Now')
  ) returning id into cert_id;

  insert into public.credential_render_jobs(certificate_id,output_type,status)
  values(cert_id,'print_pdf','queued'),(cert_id,'digital_card','queued');

  return cert_id;
end;
$$;

grant execute on function public.admin_issue_completion_certificate(uuid,uuid,date,text,numeric,numeric,text,text) to authenticated;

-- Allow staff to read operational records used by the dashboards.
drop policy if exists "staff read xp ledger" on public.xp_ledger;
create policy "staff read xp ledger" on public.xp_ledger for select to authenticated using(public.is_academy_staff());
drop policy if exists "staff read certificates" on public.certificates;
create policy "staff read certificates" on public.certificates for select to authenticated using(public.is_academy_staff() or student_id=auth.uid());
drop policy if exists "staff read student profiles" on public.student_profiles;
create policy "staff read student profiles" on public.student_profiles for select to authenticated using(public.is_academy_staff() or user_id=auth.uid());
drop policy if exists "staff read teacher profiles" on public.teacher_profiles;
create policy "staff read teacher profiles" on public.teacher_profiles for select to authenticated using(public.is_academy_staff() or user_id=auth.uid());
