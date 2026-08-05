-- C3: live student credentials and public verification
-- Safe to run after the credential engine migration.

create or replace function public.verify_credential(credential_token uuid)
returns table (
  certificate_number text,
  certificate_title text,
  student_name text,
  course_name text,
  completion_date date,
  grade text,
  final_score numeric,
  hours_completed numeric,
  level_label text,
  instructor_name text,
  issued_at timestamptz,
  credential_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.certificate_number,
    c.title,
    p.display_name,
    co.title,
    c.completion_date,
    c.grade,
    c.final_score,
    c.hours_completed,
    c.level_label,
    c.instructor_name,
    c.issued_at,
    c.status
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  left join public.courses co on co.id = c.course_id
  where c.verification_token = credential_token
    and c.status = 'issued'
    and c.revoked_at is null
  limit 1;
$$;

grant execute on function public.verify_credential(uuid) to anon, authenticated;

-- Students may read their own credentials; Academy staff may read all.
drop policy if exists "students read own certificates" on public.certificates;
drop policy if exists "staff read certificates" on public.certificates;
create policy "students read own certificates"
on public.certificates for select to authenticated
using (student_id = auth.uid());
create policy "staff read certificates"
on public.certificates for select to authenticated
using (public.is_academy_staff());
