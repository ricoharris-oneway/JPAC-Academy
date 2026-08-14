# Assignment Swap v1 Security Correction

## Purpose

Assignment Swap v1 was installed before its preflight was run. Installation did not execute either RPC: the audit table remained empty, Piano Level 1 Module 13 remained unchanged, and the known student-state counts remained unchanged. Post-validation nevertheless blocked frontend work on security and definition-safety findings.

This timestamped patch represents the live corrective step. It does not rewrite the already-executed `202608130003_assignment_swap_v1.sql` migration.

## ACL finding

The original validator searched the rendered ACL text with `acl not like '%=X/%'`. That pattern incorrectly treated the normal owner entry `postgres=X/postgres` as a PUBLIC execute grant. PUBLIC and `anon` had already been revoked, and `authenticated` execute was intentional because each RPC enforces `public.is_admin()` internally.

The installed ACL also included direct `service_role` execute. Although `service_role` is trusted and the internal admin/developer guard remains in force, this patch revokes that direct grant as defense in depth. PostgreSQL owner privileges remain normal. The new validation inspects ACL grantee OIDs rather than ambiguous rendered text.

## Definition-safety finding

The original scanner treated any appearance of a protected function name as a call. The swap RPC names the progress functions inside quoted catalog-inspection strings to verify Safe Draft Isolation; it does not invoke them. The corrected scanner looks for executable call form—a protected name followed by `(`—and therefore permits quoted catalog names while continuing to block actual calls to XP, mastery, unlock, progress, submission, review, and certificate workflows.

`public.is_admin()` is an approved authorization call. Assignment Swap's own RPC names and audit trigger function are also outside the protected academic-workflow list.

## Patch behavior

The migration patch changes grants only:

- PUBLIC execute: revoked
- `anon` execute: revoked
- `service_role` execute: revoked
- `authenticated` execute: granted, with `public.is_admin()` still required inside each RPC

It does not replace RPC bodies, create or remove the audit table, insert audit rows, call either RPC, or modify curriculum, evidence, progress, or student records.

The rollback patch restores the immediately preceding direct grant posture for `service_role` while keeping PUBLIC and `anon` revoked. It does not uninstall Assignment Swap or touch audit/curriculum/student records.

## Required order and stop conditions

1. Run the read-only `202608130004` preflight.
2. Continue only if its overall result is `PASS: READY FOR ASSIGNMENT SWAP V1 SECURITY HARDENING`.
3. Apply the security-hardening migration.
4. Run the read-only post-validation.
5. Do not test the RPCs or build frontend wiring unless the overall result is `PASS: ASSIGNMENT SWAP V1 SECURITY HARDENING VALID`.

Stop if audit rows are nonzero, either RPC or its internal admin guard is missing, protected workflow calls are detected, Safe Draft Isolation fails, the activity trigger baseline differs, Piano Module 13 differs, or known student-state counts differ.

At the time this correction was prepared, no swap or rollback operation had occurred and the audit row count was zero.
