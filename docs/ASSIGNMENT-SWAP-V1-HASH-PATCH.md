# Assignment Swap v1 Hash Patch

## Reason for the correction

The first controlled Assignment Swap RPC test stopped with `function digest(bytea, unknown) does not exist`. Both Assignment Swap RPCs are `SECURITY DEFINER` functions with `search_path=public`. Their unqualified `digest()` calls could not resolve the pgcrypto function installed outside `public`.

The failure occurred before the audit insert and activity update. Read-only verification confirmed zero audit rows, the original Core Challenge title, three lessons, two activities, and unchanged student-state counts.

## Approved implementation

This patch replaces only three hash calculations in the two Assignment Swap RPCs:

- swap before hash
- swap after hash
- rollback current-state hash

The replacement uses PostgreSQL core SHA-256:

```sql
pg_catalog.encode(
  pg_catalog.sha256(
    pg_catalog.convert_to(payload::text, 'UTF8')
  ),
  'hex'
)
```

Using fully qualified `pg_catalog` functions preserves SHA-256 while avoiding a pgcrypto dependency and avoiding expansion of the security-definer search path.

## Preserved behavior

The patch uses `CREATE OR REPLACE FUNCTION` for only:

- `public.curriculum_swap_module_assignment_v1(jsonb)`
- `public.curriculum_rollback_assignment_swap_v1(uuid)`

All authorization, locking, draft-only rules, identity and XP guards, zero-evidence blockers, allowlisted activity updates, audit behavior, rollback behavior, and response fields are preserved. Hardened grants remain PUBLIC/`anon`/`service_role` denied and `authenticated` allowed, with `public.is_admin()` still required internally.

The patch installs no data, calls neither RPC, and does not modify curriculum, evidence, progress, or student records.

## Execution order

1. Run the read-only hash preflight.
2. Continue only on `PASS: READY FOR ASSIGNMENT SWAP V1 HASH PATCH`.
3. Apply the hash patch migration.
4. Run the read-only hash post-validation.
5. Continue to controlled RPC test review only on `PASS: ASSIGNMENT SWAP V1 HASH PATCH VALID`.

Frontend wiring remains blocked until the controlled swap and rollback tests both pass.

## Emergency rollback

The rollback restores the prior unqualified pgcrypto `digest()` implementation. It refuses to run when any Assignment Swap audit row exists and preserves hardened grants, but it restores a known-broken runtime state and is not recommended for normal operation.
