create or replace function public.jpac_singing_pilot_enroll_existing_student(
  learner_email text,
  guardian_email text default null,
  student_first_name text default null,
  student_last_name text default null,
  payment_verified boolean default false,
  enrollment_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  normalized_email text := lower(trim(coalesce(learner_email, '')));
  learner public.profiles%rowtype;
  matching_profiles integer;
  singing_course_id uuid;
  current_enrollment public.enrollments%rowtype;
  inserted_enrollment_id uuid;
  staff_note text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;
  if not coalesce(payment_verified, false) then
    raise exception 'Wix payment/sign-up or authorized scholarship verification is required';
  end if;
  if normalized_email = '' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'A valid learner email is required';
  end if;
  if nullif(trim(coalesce(guardian_email, '')), '') is not null
     and lower(trim(guardian_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Guardian email is invalid';
  end if;

  select count(*)
  into matching_profiles
  from public.profiles p
  where lower(trim(coalesce(p.email, ''))) = normalized_email;

  if matching_profiles = 0 then
    return jsonb_build_object('status', 'student_missing');
  end if;
  if matching_profiles > 1 then
    raise exception 'Multiple JPAC profiles use this learner email; resolve the identity before approval';
  end if;

  select *
  into learner
  from public.profiles p
  where lower(trim(coalesce(p.email, ''))) = normalized_email
  limit 1;

  if learner.role <> 'student' then
    return jsonb_build_object('status', 'student_role_blocked');
  end if;

  select c.id into singing_course_id
  from public.courses c
  where c.slug = 'singing'
    and c.status = 'published'
    and exists (
      select 1 from public.course_modules m
      where m.course_id = c.id and m.status = 'published'
    );
  if singing_course_id is null then
    raise exception 'Published Singing pilot course is unavailable';
  end if;

  staff_note := concat_ws(' | ',
    'Singing Pilot access approved after staff verification',
    case when nullif(trim(coalesce(student_first_name, '')), '') is not null or nullif(trim(coalesce(student_last_name, '')), '') is not null
      then 'Learner reference: ' || left(trim(concat_ws(' ', student_first_name, student_last_name)), 160) end,
    case when nullif(trim(coalesce(guardian_email, '')), '') is not null
      then 'Guardian reference: ' || left(lower(trim(guardian_email)), 254) end,
    case when nullif(trim(coalesce(enrollment_notes, '')), '') is not null
      then left(trim(enrollment_notes), 500) end
  );

  select * into current_enrollment
  from public.enrollments e
  where e.student_id = learner.id and e.course_id = singing_course_id
  for update;

  if current_enrollment.id is null then
    insert into public.enrollments(student_id, course_id, status, start_date, end_date, level, enrollment_source, notes, updated_at)
    values(learner.id, singing_course_id, 'active', current_date, null, 1, 'academy', staff_note, now())
    on conflict(student_id, course_id) do nothing
    returning id into inserted_enrollment_id;
    if inserted_enrollment_id is not null then
      return jsonb_build_object('status', 'enrolled', 'enrollment_id', inserted_enrollment_id, 'course_id', singing_course_id);
    end if;
    select * into current_enrollment
    from public.enrollments e
    where e.student_id = learner.id and e.course_id = singing_course_id
    for update;
  end if;

  if current_enrollment.status = 'active'
     and (current_enrollment.start_date is null or current_enrollment.start_date <= current_date)
     and (current_enrollment.end_date is null or current_enrollment.end_date >= current_date) then
    return jsonb_build_object('status', 'already_enrolled', 'enrollment_id', current_enrollment.id, 'course_id', singing_course_id);
  end if;

  update public.enrollments
  set status = 'active', start_date = current_date, end_date = null,
      enrollment_source = 'academy', notes = staff_note, updated_at = now()
  where id = current_enrollment.id;
  return jsonb_build_object('status', 'activated', 'enrollment_id', current_enrollment.id, 'course_id', singing_course_id);
end
$function$;

revoke all on function public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text) from public, anon, authenticated, service_role;
grant execute on function public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text) to authenticated;
comment on function public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text) is
  'Staff-only, Singing-only pilot enrollment for an existing student profile. Creates or activates only the canonical enrollment and never initializes academic evidence or intelligence records.';
