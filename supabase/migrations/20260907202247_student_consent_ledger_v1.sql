-- JPAC Policies, Consent, and Launch Compliance v1.
-- Consent records document acknowledgments only and never grant or remove access.

create table public.student_consent_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id),
  guardian_name text,
  guardian_email text,
  student_name text,
  student_birthdate date,
  student_age_confirmed boolean not null default false,
  under_13 boolean not null default false,
  terms_accepted boolean not null default false,
  privacy_acknowledged boolean not null default false,
  children_privacy_acknowledged boolean not null default false,
  acceptable_use_accepted boolean not null default false,
  refund_policy_acknowledged boolean not null default false,
  internal_learning_media_consent boolean not null default false,
  promotional_media_consent boolean not null default false,
  ai_usage_acknowledged boolean not null default false,
  parent_guardian_consent boolean not null default false,
  consent_status text not null default 'incomplete'
    check (consent_status in ('incomplete','complete','revoked','needs_review')),
  consent_version text not null default '2026-09-jpac-launch-v1',
  signed_by_name text,
  signed_by_relationship text,
  signed_at timestamptz,
  ip_acknowledgment text,
  student_visible_note text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_consent_ledger is
  'Policy acknowledgment ledger only. Does not grant, deny, create, or modify course access.';

create index student_consent_ledger_status_idx
  on public.student_consent_ledger(consent_status, updated_at desc);
create index student_consent_ledger_under_13_idx
  on public.student_consent_ledger(under_13, consent_status) where under_13;

create trigger student_consent_ledger_set_updated_at
before update on public.student_consent_ledger
for each row execute function public.set_updated_at();

alter table public.student_consent_ledger enable row level security;

create policy "students read own consent"
on public.student_consent_ledger for select to authenticated
using ((select auth.uid()) = student_id);

create policy "students create own consent"
on public.student_consent_ledger for insert to authenticated
with check ((select auth.uid()) = student_id);

create policy "students update own consent"
on public.student_consent_ledger for update to authenticated
using ((select auth.uid()) = student_id)
with check ((select auth.uid()) = student_id);

create policy "staff read consent ledger"
on public.student_consent_ledger for select to authenticated
using ((select public.is_academy_staff()));

create policy "staff review consent ledger"
on public.student_consent_ledger for update to authenticated
using ((select public.is_academy_staff()))
with check ((select public.is_academy_staff()));

revoke all on public.student_consent_ledger from public, anon, authenticated;

create or replace function public.jpac_get_my_consent_status_v1()
returns table (
  id uuid, student_id uuid, guardian_name text, guardian_email text,
  student_name text, student_birthdate date, student_age_confirmed boolean,
  under_13 boolean, terms_accepted boolean, privacy_acknowledged boolean,
  children_privacy_acknowledged boolean, acceptable_use_accepted boolean,
  refund_policy_acknowledged boolean, internal_learning_media_consent boolean,
  promotional_media_consent boolean, ai_usage_acknowledged boolean,
  parent_guardian_consent boolean, consent_status text, consent_version text,
  signed_by_name text, signed_by_relationship text, signed_at timestamptz,
  student_visible_note text, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.student_id, l.guardian_name, l.guardian_email,
    l.student_name, l.student_birthdate, l.student_age_confirmed, l.under_13,
    l.terms_accepted, l.privacy_acknowledged, l.children_privacy_acknowledged,
    l.acceptable_use_accepted, l.refund_policy_acknowledged,
    l.internal_learning_media_consent, l.promotional_media_consent,
    l.ai_usage_acknowledged, l.parent_guardian_consent, l.consent_status,
    l.consent_version, l.signed_by_name, l.signed_by_relationship,
    l.signed_at, l.student_visible_note, l.created_at, l.updated_at
  from public.student_consent_ledger l
  where l.student_id = (select auth.uid());
$$;

create or replace function public.jpac_submit_student_consent_v1(
  target_guardian_name text,
  target_guardian_email text,
  target_student_birthdate date,
  target_student_age_confirmed boolean,
  target_terms_accepted boolean,
  target_privacy_acknowledged boolean,
  target_children_privacy_acknowledged boolean,
  target_acceptable_use_accepted boolean,
  target_refund_policy_acknowledged boolean,
  target_internal_learning_media_consent boolean,
  target_promotional_media_consent boolean,
  target_ai_usage_acknowledged boolean,
  target_parent_guardian_consent boolean,
  target_signed_by_name text,
  target_signed_by_relationship text,
  target_student_visible_note text
)
returns table (consent_status text, under_13 boolean, signed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_name text;
  calculated_under_13 boolean;
  calculated_minor boolean;
  required_complete boolean;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  select nullif(trim(p.display_name), '') into caller_name
  from public.profiles p where p.id = caller_id and p.role = 'student';
  if not found then raise exception 'Student access required'; end if;
  if target_student_birthdate is null or target_student_birthdate > current_date then
    raise exception 'A valid student birthdate is required';
  end if;
  if not target_student_age_confirmed then raise exception 'Student age confirmation is required'; end if;

  calculated_under_13 := target_student_birthdate > (current_date - interval '13 years')::date;
  calculated_minor := target_student_birthdate > (current_date - interval '18 years')::date;

  if calculated_minor then
    if nullif(trim(coalesce(target_guardian_name, '')), '') is null then raise exception 'Guardian name is required for a minor'; end if;
    if lower(trim(coalesce(target_guardian_email, ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Guardian email is required for a minor'; end if;
    if lower(trim(coalesce(target_signed_by_relationship, ''))) not in ('parent','guardian') then raise exception 'A parent or guardian must sign for a minor'; end if;
  end if;
  if nullif(trim(coalesce(target_signed_by_name, '')), '') is null then raise exception 'Signed name is required'; end if;

  required_complete := target_terms_accepted
    and target_privacy_acknowledged
    and target_acceptable_use_accepted
    and target_refund_policy_acknowledged
    and target_ai_usage_acknowledged
    and target_internal_learning_media_consent
    and (not calculated_minor or target_parent_guardian_consent)
    and (not calculated_under_13 or target_children_privacy_acknowledged);

  insert into public.student_consent_ledger (
    student_id, guardian_name, guardian_email, student_name, student_birthdate,
    student_age_confirmed, under_13, terms_accepted, privacy_acknowledged,
    children_privacy_acknowledged, acceptable_use_accepted,
    refund_policy_acknowledged, internal_learning_media_consent,
    promotional_media_consent, ai_usage_acknowledged, parent_guardian_consent,
    consent_status, consent_version, signed_by_name, signed_by_relationship,
    signed_at, ip_acknowledgment, student_visible_note
  ) values (
    caller_id, nullif(trim(target_guardian_name), ''), nullif(lower(trim(target_guardian_email)), ''),
    coalesce(caller_name, ''), target_student_birthdate, target_student_age_confirmed,
    calculated_under_13, target_terms_accepted, target_privacy_acknowledged,
    target_children_privacy_acknowledged, target_acceptable_use_accepted,
    target_refund_policy_acknowledged, target_internal_learning_media_consent,
    target_promotional_media_consent, target_ai_usage_acknowledged,
    target_parent_guardian_consent, case when required_complete then 'complete' else 'incomplete' end,
    '2026-09-jpac-launch-v1', trim(target_signed_by_name), trim(target_signed_by_relationship),
    case when required_complete then now() else null end,
    'Submitted from authenticated JPAC Academy session', nullif(trim(target_student_visible_note), '')
  )
  on conflict (student_id) do update set
    guardian_name = excluded.guardian_name, guardian_email = excluded.guardian_email,
    student_name = excluded.student_name, student_birthdate = excluded.student_birthdate,
    student_age_confirmed = excluded.student_age_confirmed, under_13 = excluded.under_13,
    terms_accepted = excluded.terms_accepted, privacy_acknowledged = excluded.privacy_acknowledged,
    children_privacy_acknowledged = excluded.children_privacy_acknowledged,
    acceptable_use_accepted = excluded.acceptable_use_accepted,
    refund_policy_acknowledged = excluded.refund_policy_acknowledged,
    internal_learning_media_consent = excluded.internal_learning_media_consent,
    promotional_media_consent = excluded.promotional_media_consent,
    ai_usage_acknowledged = excluded.ai_usage_acknowledged,
    parent_guardian_consent = excluded.parent_guardian_consent,
    consent_status = excluded.consent_status, consent_version = excluded.consent_version,
    signed_by_name = excluded.signed_by_name, signed_by_relationship = excluded.signed_by_relationship,
    signed_at = excluded.signed_at, ip_acknowledgment = excluded.ip_acknowledgment,
    student_visible_note = excluded.student_visible_note;
  return query
    select l.consent_status, l.under_13, l.signed_at
    from public.student_consent_ledger l where l.student_id = caller_id;
end;
$$;

create or replace function public.jpac_staff_get_consent_ledger_v1(target_student_id uuid default null)
returns table (
  id uuid, student_id uuid, student_email text, student_name text,
  guardian_name text, guardian_email text, student_birthdate date,
  student_age_confirmed boolean, under_13 boolean, terms_accepted boolean,
  privacy_acknowledged boolean, children_privacy_acknowledged boolean,
  acceptable_use_accepted boolean, refund_policy_acknowledged boolean,
  internal_learning_media_consent boolean, promotional_media_consent boolean,
  ai_usage_acknowledged boolean, parent_guardian_consent boolean,
  consent_status text, consent_version text, signed_by_name text,
  signed_by_relationship text, signed_at timestamptz, student_visible_note text,
  internal_note text, created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  return query
    select l.id, l.student_id, p.email, l.student_name, l.guardian_name,
      l.guardian_email, l.student_birthdate, l.student_age_confirmed, l.under_13,
      l.terms_accepted, l.privacy_acknowledged, l.children_privacy_acknowledged,
      l.acceptable_use_accepted, l.refund_policy_acknowledged,
      l.internal_learning_media_consent, l.promotional_media_consent,
      l.ai_usage_acknowledged, l.parent_guardian_consent, l.consent_status,
      l.consent_version, l.signed_by_name, l.signed_by_relationship,
      l.signed_at, l.student_visible_note, l.internal_note, l.created_at, l.updated_at
    from public.student_consent_ledger l
    join public.profiles p on p.id = l.student_id
    where target_student_id is null or l.student_id = target_student_id
    order by l.updated_at desc;
end;
$$;

create or replace function public.jpac_staff_update_consent_review_v1(
  target_consent_id uuid,
  target_status text,
  target_internal_note text
)
returns public.student_consent_ledger
language plpgsql
security definer
set search_path = ''
as $$
declare saved public.student_consent_ledger;
begin
  if not public.is_academy_staff() then raise exception 'Staff access required'; end if;
  if target_status not in ('needs_review','revoked') then raise exception 'Staff review status must be needs_review or revoked'; end if;
  update public.student_consent_ledger l
  set consent_status = target_status, internal_note = nullif(trim(target_internal_note), '')
  where l.id = target_consent_id
  returning l.* into saved;
  if saved.id is null then raise exception 'Consent record not found'; end if;
  return saved;
end;
$$;

revoke execute on function public.jpac_get_my_consent_status_v1() from public, anon;
revoke execute on function public.jpac_submit_student_consent_v1(text,text,date,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,text,text) from public, anon;
revoke execute on function public.jpac_staff_get_consent_ledger_v1(uuid) from public, anon;
revoke execute on function public.jpac_staff_update_consent_review_v1(uuid,text,text) from public, anon;
grant execute on function public.jpac_get_my_consent_status_v1() to authenticated;
grant execute on function public.jpac_submit_student_consent_v1(text,text,date,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,text,text) to authenticated;
grant execute on function public.jpac_staff_get_consent_ledger_v1(uuid) to authenticated;
grant execute on function public.jpac_staff_update_consent_review_v1(uuid,text,text) to authenticated;
