# Build 2.3 Repository Remediation

Build 2.3 resolves only Critical and High findings from the Build 2.2 audit. It adds no new student product area. The notification worker and LAB/portfolio changes connect already-existing queues and canonical tables.

## Forward migrations

Apply after Build 2.1, in this exact order:

1. `202608070201_build_2_3_security_hardening.sql`
2. Run `202608070201_build_2_3_security_validation.sql`.
3. `202608070202_build_2_3_canonical_consolidation.sql`
4. Run `202608070202_build_2_3_canonical_validation.sql`. The unmapped approved-program query must return zero rows before teacher approvals resume.
5. `202608070203_build_2_3_notification_delivery.sql`
6. Run `202608070203_build_2_3_notification_validation.sql`.
7. `202608070204_build_2_3_credential_tokens.sql`
8. Run `202608070204_build_2_3_credential_tokens_validation.sql`. The verifier query must return exactly `verify_credential(text)`, both unexpected/duplicate queries must return zero rows, invalid-token verification must be false, and every eligible legacy/new token row must verify.
9. Run `202608070204_build_2_3_authorization_validation.sql`; both unexpected-grant queries must return zero rows and every named privilege assertion must be true.

All migrations preserve user/profile UUIDs, Wix links, entitlements, curriculum, progress, XP, certificates, audit history, and legacy-table rows. No table is dropped or truncated.

## Canonical credential verification

- `certificates.verification_token` is canonical opaque `text`.
- Existing UUID tokens are converted losslessly to the same hyphenated string, so existing `/verify/<uuid>` and certificate-document links do not change.
- New tokens default to 24 cryptographically random bytes encoded as 48 lowercase hexadecimal characters. The automatic certificate issuer already generates this shape explicitly; legacy controlled insertion paths receive the new database default.
- `verify_credential(text)` is the only public RPC. The UUID overload is removed to prevent PostgREST ambiguity.
- Both legacy and new token shapes require status `issued`/`active` and `revoked_at is null`.
- The public projection remains limited to certificate number/title, student display name, course, completion facts, instructor, issue date, and credential status.
- `qr_target_url` and the template `VerificationQRCode` placeholder exist, but the repository has no QR renderer. Current verification links and printable documents embed the opaque token directly.

## Required environment settings

- Existing server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JPAC_WIX_SYNC_SECRET` remain required.
- Set `JPAC_NOTIFICATION_WEBHOOK_URL` to the approved transactional notification provider adapter.
- Set `JPAC_NOTIFICATION_WEBHOOK_SECRET` to the provider adapter's server-only shared secret.
- Never prefix either server secret with `VITE_`.

The notification endpoint receives `eventType`, `queueId`, `to`, `templateKey`, and `payload`. It must return a 2xx response only after accepting responsibility for delivery. Do not schedule `/api/notification-outbox` until a manual authenticated request successfully delivers a test queue record.

## Deployment validation

- Confirm `PUBLIC`, `anon`, and `authenticated` cannot execute official progress, certificate issuance, outbox mutation, or notification worker RPCs.
- Confirm `authenticated` cannot execute `claim_initial_owner()` or the legacy manual certificate RPC; controlled operations retain `service_role` access.
- Confirm authenticated sessions can execute `is_staff()` and `is_academy_staff()` so existing RLS policies continue to evaluate.
- Sign in as student, teacher, admin, and developer and exercise their existing reads/writes.
- Confirm a student sees only assignments for their exact Wix Program and cannot submit to another program.
- Confirm a student cannot submit a media URL outside their own `<auth.uid()>/...` storage prefix.
- Force submission-RPC failure after upload and verify the student's own object is removed.
- Confirm every approved Wix Program has an explicit `wix_program_course_map`; approvals without a mapping must fail closed.
- Confirm existing LAB mappings survive the column rename and Lab Manager can read/save mappings.
- Confirm Student Studio shows only ready tools mapped to entitled courses; staff retains its existing tool visibility.
- Confirm portfolio create/read/feature actions write `portfolio_projects` and `media_assets`, not browser storage.
- Confirm Teacher Studio guardian summary is driven by `parent_relationships`.
- Confirm old demo URLs redirect to `/` and are absent from navigation.
- Confirm the Admin Command Center no longer exposes the hard-coded manual certificate action.
- Confirm an existing UUID verification link and a newly issued 48-character token both resolve through `verify_credential(text)`; revoke one of each and confirm both fail.
- Submit one controlled notification queue record, invoke `/api/notification-outbox` with the integration secret, and confirm `sent`; force a provider error and confirm retry/backoff.
- Re-run TypeScript, production build, `git diff --check`, localhost scan, secret scan, and all Build 2.1/2.3 validation SQL.

## Rollback order

1. Stop notification/outbox scheduling.
2. Restore the prior application artifact.
3. Run `202608070204_build_2_3_credential_tokens_rollback.sql`. It preserves the text column, every existing token, the single RPC, and revocation behavior; it changes only the new-token default to UUID-formatted opaque text because converting 48-character tokens back to UUID would cause data loss.
4. Run `202608070203_build_2_3_notification_delivery_rollback.sql` to disable worker execution while preserving queue rows.
5. Run `202608070202_build_2_3_canonical_consolidation_rollback.sql`. It deliberately retains explicit mapping enforcement and the LAB column repair because reversing either would reintroduce a known data/security defect.
6. Run `202608070201_build_2_3_security_hardening_rollback.sql` only if assignment availability requires it. It may restore broad assignment visibility but intentionally does not restore unsafe function execution grants.
7. Re-run credential, security, and identity-count validation.

Rollback never deletes legacy or canonical records. Any request to restore title-derived mapping, duplicate XP writes, or authenticated certificate/progress workers requires a separate documented security exception.
