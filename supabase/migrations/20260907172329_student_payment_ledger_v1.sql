-- JPAC Payment Ledger v1 documents payment verification separately from enrollment.

create table public.student_payment_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  course_id uuid references public.courses(id),
  enrollment_id uuid references public.enrollments(id),
  payment_status text not null default 'verified'
    check (payment_status in ('pending','verified','waived','refunded','voided')),
  payment_method text not null
    check (payment_method in ('wix_online','cash','in_person_card','check','scholarship','comped','manual_approval','other')),
  purchase_type text not null
    check (purchase_type in ('first_course_purchase','additional_course_purchase','scholarship_access','comped_access','correction')),
  amount numeric(10,2) check (amount is null or amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  payment_date date not null default current_date,
  access_start_date date,
  access_end_date date,
  reference_number text,
  external_source text,
  external_reference text,
  student_visible_note text,
  internal_note text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_end_date is null or access_start_date is null or access_end_date >= access_start_date)
);

create index student_payment_ledger_student_date_idx
  on public.student_payment_ledger(student_id, payment_date desc, created_at desc);
create index student_payment_ledger_course_idx
  on public.student_payment_ledger(course_id) where course_id is not null;
create index student_payment_ledger_enrollment_idx
  on public.student_payment_ledger(enrollment_id) where enrollment_id is not null;

create trigger student_payment_ledger_set_updated_at
before update on public.student_payment_ledger
for each row execute function public.set_updated_at();

alter table public.student_payment_ledger enable row level security;

create policy "students read own payment ledger"
on public.student_payment_ledger for select to authenticated
using ((select auth.uid()) = student_id);

create policy "staff read payment ledger"
on public.student_payment_ledger for select to authenticated
using ((select public.is_academy_staff()));

create policy "staff create payment ledger"
on public.student_payment_ledger for insert to authenticated
with check ((select public.is_academy_staff()) and verified_by = (select auth.uid()));

create policy "staff update payment ledger"
on public.student_payment_ledger for update to authenticated
using ((select public.is_academy_staff()))
with check ((select public.is_academy_staff()) and verified_by = (select auth.uid()));

revoke all on public.student_payment_ledger from public, anon, authenticated;

create or replace function public.jpac_get_my_payment_ledger_v1()
returns table (
  id uuid, course_id uuid, enrollment_id uuid, course_title text,
  enrollment_status text, payment_status text, payment_method text,
  purchase_type text, amount numeric, currency text, payment_date date,
  access_start_date date, access_end_date date, reference_number text,
  student_visible_note text, verified_at timestamptz, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.course_id, l.enrollment_id, c.title, e.status,
    l.payment_status, l.payment_method, l.purchase_type, l.amount, l.currency,
    l.payment_date, l.access_start_date, l.access_end_date, l.reference_number,
    l.student_visible_note, l.verified_at, l.created_at
  from public.student_payment_ledger l
  left join public.courses c on c.id = l.course_id
  left join public.enrollments e on e.id = l.enrollment_id
  where l.student_id = (select auth.uid())
  order by l.payment_date desc, l.created_at desc;
$$;

create or replace function public.jpac_staff_get_student_payment_ledger_v1(target_student_id uuid)
returns table (
  id uuid, student_id uuid, course_id uuid, enrollment_id uuid, course_title text,
  enrollment_status text, payment_status text, payment_method text,
  purchase_type text, amount numeric, currency text, payment_date date,
  access_start_date date, access_end_date date, reference_number text,
  external_source text, external_reference text, student_visible_note text,
  internal_note text, verified_by uuid, verified_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  return query
    select l.id, l.student_id, l.course_id, l.enrollment_id, c.title, e.status,
      l.payment_status, l.payment_method, l.purchase_type, l.amount, l.currency,
      l.payment_date, l.access_start_date, l.access_end_date, l.reference_number,
      l.external_source, l.external_reference, l.student_visible_note,
      l.internal_note, l.verified_by, l.verified_at, l.created_at, l.updated_at
    from public.student_payment_ledger l
    left join public.courses c on c.id = l.course_id
    left join public.enrollments e on e.id = l.enrollment_id
    where l.student_id = target_student_id
    order by l.payment_date desc, l.created_at desc;
end;
$$;

create or replace function public.jpac_staff_upsert_payment_ledger_entry_v1(
  target_student_id uuid,
  target_entry_id uuid,
  target_course_id uuid,
  target_enrollment_id uuid,
  target_payment_status text,
  target_payment_method text,
  target_purchase_type text,
  target_amount numeric,
  target_currency text,
  target_payment_date date,
  target_access_start_date date,
  target_access_end_date date,
  target_reference_number text,
  target_external_source text,
  target_external_reference text,
  target_student_visible_note text,
  target_internal_note text
)
returns public.student_payment_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.student_payment_ledger;
  enrollment_course_id uuid;
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  if not exists (select 1 from public.profiles p where p.id = target_student_id and p.role = 'student') then
    raise exception 'student_missing: An existing student profile is required';
  end if;
  if target_payment_status not in ('pending','verified','waived','refunded','voided') then raise exception 'Invalid payment status'; end if;
  if target_payment_method not in ('wix_online','cash','in_person_card','check','scholarship','comped','manual_approval','other') then raise exception 'Invalid payment method'; end if;
  if target_purchase_type not in ('first_course_purchase','additional_course_purchase','scholarship_access','comped_access','correction') then raise exception 'Invalid purchase type'; end if;
  if target_amount is not null and target_amount < 0 then raise exception 'Amount cannot be negative'; end if;
  if coalesce(target_currency, '') !~ '^[A-Z]{3}$' then raise exception 'Currency must be a three-letter uppercase code'; end if;
  if target_payment_date is null then raise exception 'Payment date is required'; end if;
  if target_access_end_date is not null and target_access_start_date is not null and target_access_end_date < target_access_start_date then raise exception 'Access end date cannot be before access start date'; end if;
  if target_course_id is not null and not exists (select 1 from public.courses c where c.id = target_course_id) then raise exception 'Course not found'; end if;
  if target_enrollment_id is not null then
    select e.course_id into enrollment_course_id
    from public.enrollments e
    where e.id = target_enrollment_id and e.student_id = target_student_id;
    if enrollment_course_id is null then raise exception 'Enrollment does not match the selected student'; end if;
    if target_course_id is null then target_course_id := enrollment_course_id;
    elsif target_course_id <> enrollment_course_id then raise exception 'Enrollment does not match the selected course'; end if;
  end if;

  if target_entry_id is null then
    insert into public.student_payment_ledger (
      student_id, course_id, enrollment_id, payment_status, payment_method,
      purchase_type, amount, currency, payment_date, access_start_date,
      access_end_date, reference_number, external_source, external_reference,
      student_visible_note, internal_note, verified_by, verified_at
    ) values (
      target_student_id, target_course_id, target_enrollment_id, target_payment_status,
      target_payment_method, target_purchase_type, target_amount, target_currency,
      target_payment_date, target_access_start_date, target_access_end_date,
      nullif(trim(target_reference_number), ''), nullif(trim(target_external_source), ''),
      nullif(trim(target_external_reference), ''), nullif(trim(target_student_visible_note), ''),
      nullif(trim(target_internal_note), ''), (select auth.uid()), now()
    ) returning * into saved;
  else
    update public.student_payment_ledger l set
      course_id = target_course_id, enrollment_id = target_enrollment_id,
      payment_status = target_payment_status, payment_method = target_payment_method,
      purchase_type = target_purchase_type, amount = target_amount,
      currency = target_currency, payment_date = target_payment_date,
      access_start_date = target_access_start_date, access_end_date = target_access_end_date,
      reference_number = nullif(trim(target_reference_number), ''),
      external_source = nullif(trim(target_external_source), ''),
      external_reference = nullif(trim(target_external_reference), ''),
      student_visible_note = nullif(trim(target_student_visible_note), ''),
      internal_note = nullif(trim(target_internal_note), ''),
      verified_by = (select auth.uid()), verified_at = now()
    where l.id = target_entry_id and l.student_id = target_student_id
    returning l.* into saved;
    if saved.id is null then raise exception 'Payment ledger entry not found'; end if;
  end if;
  return saved;
end;
$$;

revoke execute on function public.jpac_get_my_payment_ledger_v1() from public, anon;
revoke execute on function public.jpac_staff_get_student_payment_ledger_v1(uuid) from public, anon;
revoke execute on function public.jpac_staff_upsert_payment_ledger_entry_v1(uuid,uuid,uuid,uuid,text,text,text,numeric,text,date,date,date,text,text,text,text,text) from public, anon;
grant execute on function public.jpac_get_my_payment_ledger_v1() to authenticated;
grant execute on function public.jpac_staff_get_student_payment_ledger_v1(uuid) to authenticated;
grant execute on function public.jpac_staff_upsert_payment_ledger_entry_v1(uuid,uuid,uuid,uuid,text,text,text,numeric,text,date,date,date,text,text,text,text,text) to authenticated;
