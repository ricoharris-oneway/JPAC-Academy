-- Data-preserving rollback for Build 2.3 credential canonicalization.
-- Do not convert verification_token back to UUID: doing so would destroy or
-- invalidate newly issued 48-character tokens. Keep the unambiguous TEXT RPC.

alter table public.certificates
  alter column verification_token set default gen_random_uuid()::text;

-- Keep identical revocation behavior and the single RPC signature during an
-- application rollback. Existing and newly issued links remain valid.
revoke all on function public.verify_credential(text) from public;
grant execute on function public.verify_credential(text) to anon,authenticated,service_role;

comment on column public.certificates.verification_token is
  'Rollback-compatible opaque TEXT verification secret. Existing 48-character and UUID-shaped values are preserved.';
