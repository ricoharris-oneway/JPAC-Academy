-- Build 2.3 canonical credential-token validation.

-- EXPECT: data_type=text, is_nullable=NO, and a gen_random_bytes(24) default.
select data_type,udt_name,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='certificates'
  and column_name='verification_token';

-- EXPECT exactly one row: verify_credential(text).
select p.oid::regprocedure::text as signature,
       pg_get_function_result(p.oid) as result_shape,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,
       p.provolatile,p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='verify_credential';

-- EXPECT zero rows: no overload ambiguity and no legacy same-name UUID RPC.
select p.oid::regprocedure::text as unexpected_verifier
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='verify_credential'
  and p.oid<>'public.verify_credential(text)'::regprocedure;

-- EXPECT zero rows: all stored tokens have a reviewed legacy/new shape.
select id,verification_token
from public.certificates
where verification_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and verification_token !~ '^[0-9a-f]{48}$';

-- EXPECT zero rows: uniqueness remains intact.
select verification_token,count(*)
from public.certificates
group by verification_token having count(*)>1;

-- EXPECT every active/non-revoked legacy UUID row to report verifies=true.
select c.id,exists(
  select 1 from public.verify_credential(c.verification_token)
) as verifies
from public.certificates c
where c.verification_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and c.status in ('issued','active') and c.revoked_at is null;

-- EXPECT every active/non-revoked new token row to report verifies=true.
select c.id,exists(
  select 1 from public.verify_credential(c.verification_token)
) as verifies
from public.certificates c
where c.verification_token ~ '^[0-9a-f]{48}$'
  and c.status in ('issued','active') and c.revoked_at is null;

-- EXPECT zero rows: revoked credentials of either token shape never verify.
select c.id,c.verification_token
from public.certificates c
where (c.status='revoked' or c.revoked_at is not null)
  and exists(select 1 from public.verify_credential(c.verification_token));

-- EXPECT false: invalid tokens return no credential.
select exists(
  select 1 from public.verify_credential('not-a-valid-certificate-token')
) as invalid_token_verified;

-- EXPECT at least one UNIQUE token index. Existing indexes are intentionally
-- preserved; the migration creates a canonical index only if none exists.
select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='certificates'
  and indexdef ilike '%verification_token%'
order by indexname;

-- EXPECT output names to match only the approved public projection.
select p.proargnames,p.proargmodes
from pg_proc p
where p.oid='public.verify_credential(text)'::regprocedure;

-- Transactional compatibility test. EXPECT no exception and no lasting rows.
-- It proves a UUID-shaped legacy token and a default-generated new token both
-- verify when active, then both stop verifying after revocation.
begin;
do $$
declare
  test_student uuid;
  legacy_certificate uuid;
  new_certificate uuid;
  legacy_token text:=gen_random_uuid()::text;
  new_token text;
begin
  select id into test_student from public.profiles where role='student' limit 1;
  if test_student is null then
    raise exception 'A student profile is required for credential compatibility validation';
  end if;

  insert into public.certificates(student_id,title,status,verification_token)
  values(test_student,'Build 2.3 legacy-token validation','issued',legacy_token)
  returning id into legacy_certificate;

  if not exists(select 1 from public.verify_credential(legacy_token)) then
    raise exception 'Legacy UUID-shaped credential did not verify';
  end if;

  update public.certificates
  set status='revoked',revoked_at=now(),revocation_reason='Build 2.3 validation'
  where id=legacy_certificate;
  if exists(select 1 from public.verify_credential(legacy_token)) then
    raise exception 'Revoked legacy credential remained verifiable';
  end if;

  insert into public.certificates(student_id,title,status)
  values(test_student,'Build 2.3 text-token validation','issued')
  returning id,verification_token into new_certificate,new_token;

  if new_token !~ '^[0-9a-f]{48}$' then
    raise exception 'New credential token does not use 48-character random hex';
  end if;
  if not exists(select 1 from public.verify_credential(new_token)) then
    raise exception 'New text-token credential did not verify';
  end if;

  update public.certificates
  set status='revoked',revoked_at=now(),revocation_reason='Build 2.3 validation'
  where id=new_certificate;
  if exists(select 1 from public.verify_credential(new_token)) then
    raise exception 'Revoked new credential remained verifiable';
  end if;
end;
$$;
rollback;
