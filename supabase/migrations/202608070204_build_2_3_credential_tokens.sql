-- Build 2.3 credential verification canonicalization.
-- Canonical format: opaque TEXT. Existing UUID tokens are preserved verbatim
-- as hyphenated text; new tokens are 24 random bytes encoded as 48 hex chars.

create extension if not exists pgcrypto;

-- Remove both same-name overloads before changing the dependent column type.
-- The migration is transactional, so public verification is never exposed in
-- a partially migrated state.
do $$
begin
  if to_regprocedure('public.verify_credential(uuid)') is not null then
    execute 'revoke all on function public.verify_credential(uuid) from public,anon,authenticated,service_role';
    execute 'drop function public.verify_credential(uuid)';
  end if;
  if to_regprocedure('public.verify_credential(text)') is not null then
    execute 'revoke all on function public.verify_credential(text) from public,anon,authenticated,service_role';
    execute 'drop function public.verify_credential(text)';
  end if;
end;
$$;

do $$
declare token_type text;
begin
  select c.udt_name into token_type
  from information_schema.columns c
  where c.table_schema='public'
    and c.table_name='certificates'
    and c.column_name='verification_token';

  if token_type is null then
    raise exception 'public.certificates.verification_token does not exist';
  elsif token_type in ('uuid','varchar') then
    alter table public.certificates alter column verification_token drop default;
    alter table public.certificates
      alter column verification_token type text using verification_token::text;
  elsif token_type<>'text' then
    raise exception 'Unsupported verification_token type: %',token_type;
  end if;
end;
$$;

-- Preserve every existing non-null token. Only repair unexpected nulls before
-- enforcing the canonical invariant.
update public.certificates
set verification_token=encode(gen_random_bytes(24),'hex')
where verification_token is null;

-- Abort without partial changes if production contains an undocumented token
-- shape. UUID strings and the newer 48-character random hex format are the two
-- reviewed backward-compatible shapes.
do $$
begin
  if exists(
    select 1 from public.certificates
    where verification_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and verification_token !~ '^[0-9a-f]{48}$'
  ) then
    raise exception 'Unreviewed certificate verification-token shape detected';
  end if;
end;
$$;

alter table public.certificates
  alter column verification_token set default encode(gen_random_bytes(24),'hex'),
  alter column verification_token set not null;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conrelid='public.certificates'::regclass
      and conname='certificates_verification_token_format_check'
  ) then
    alter table public.certificates
      add constraint certificates_verification_token_format_check check(
        verification_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or verification_token ~ '^[0-9a-f]{48}$'
      );
  end if;
end;
$$;

-- Earlier migrations already create a unique token index. Add one only when a
-- production schema does not have any unique verification-token index.
do $$
begin
  if not exists(
    select 1
    from pg_index i
    join pg_class t on t.oid=i.indrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='certificates'
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ilike '%(verification_token)%'
  ) then
    create unique index certificates_verification_token_canonical_key
      on public.certificates(verification_token);
  end if;
end;
$$;

-- The only public verification RPC. It treats UUID-era and new tokens as
-- opaque text and returns the reviewed public credential projection only.
create function public.verify_credential(credential_token text)
returns table(
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
set search_path=public
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
  join public.profiles p on p.id=c.student_id
  left join public.courses co on co.id=c.course_id
  where c.verification_token=nullif(trim(credential_token),'')
    and c.status in ('issued','active')
    and c.revoked_at is null
  limit 1;
$$;

revoke all on function public.verify_credential(text) from public;
grant execute on function public.verify_credential(text) to anon,authenticated,service_role;

comment on column public.certificates.verification_token is
  'Canonical opaque TEXT verification secret. UUID-shaped legacy values remain valid; new values are 48 lowercase hex characters from 24 random bytes.';
comment on function public.verify_credential(text) is
  'Canonical public credential verifier. Exact opaque token lookup; returns only approved public credential fields and excludes revoked credentials.';
