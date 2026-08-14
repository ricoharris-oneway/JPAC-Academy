# Assignment Swap v1 Backend Validation Completion

## 1. Assignment Swap v1 foundation status

The initial Assignment Swap v1 backend artifacts were committed, and the backend foundation was installed in Supabase.

The installed foundation includes:

- Append-only audit table: `public.curriculum_assignment_swap_operations`
- Swap RPC: `public.curriculum_swap_module_assignment_v1(jsonb)`
- Rollback RPC: `public.curriculum_rollback_assignment_swap_v1(uuid)`

The RPCs preserve activity identity and are limited to controlled edits of an existing draft Practice or Core Challenge. Installation did not run a swap or rollback operation.

## 2. Initial post-validation blocker

Initial post-validation returned two blockers:

- `ASV1P-SECURITY`
- `ASV1P-DEFINITION`

The security blocker combined an ACL validation false positive with a legitimate defense-in-depth hardening need. The original validator searched rendered ACL text for `=X/`, which incorrectly matched the normal owner entry `postgres=X/postgres`. The installed ACL also included direct `service_role` execute permission, which was broader than the approved authenticated-admin/developer posture.

The definition blocker was a false positive. Protected progress-function names appeared inside quoted catalog-inspection strings used to verify Safe Draft Isolation. They were not executable academic-workflow calls.

## 3. Security-hardening patch

The security-hardening patch preflight passed. The patch was installed after correcting a rollback RPC function-name typo in the review artifact.

The installed hardening result is:

- PUBLIC execute: false
- `anon` execute: false
- `service_role` execute: false
- `authenticated` execute: true
- Internal `public.is_admin()` authorization remains required
- Protected workflow call-aware scan: passed

The corrected validation uses role-aware ACL inspection instead of ambiguous rendered-text matching. Its definition scanner distinguishes executable function-call form from protected names contained in quoted catalog inspection.

## 4. Final security post-validation result

Final security post-validation returned:

- `FOUNDATION`: PASS
- `AUDIT_ROWS`: PASS — `row_count: 0`
- `RPC_SECURITY`: PASS
- `INTERNAL_ADMIN_GUARD`: PASS
- `PROTECTED_WORKFLOW_CALLS`: PASS
- `SAFE_DRAFT_ISOLATION`: PASS
- `ACTIVITY_TRIGGER_BASELINE`: PASS
- `PIANO_TEST_MODULE`: PASS
- `STUDENT_STATE`: PASS
- `BLOCKERS`: PASS
- `OVERALL`: **PASS: ASSIGNMENT SWAP V1 SECURITY HARDENING VALID**

## 5. Verified live state after hardening

The verified live state after hardening is:

- Audit operation rows: `0`
- PUBLIC execute: `false`
- `anon` execute: `false`
- `service_role` execute: `false`
- `authenticated` execute: `true`
- Piano Level 1 Module 13: unchanged
- Lesson count: `3`
- Activity count: `2`

Verified student-state counts remained:

- `xp_ledger`: `5`
- `enrollments`: `1`
- `submissions`: `1`
- `certificates`: `0`
- `lesson_progress`: `5`

No audit operation exists because neither Assignment Swap RPC has been invoked.

## 6. Current restrictions

- Assignment Swap RPCs have not been tested.
- No assignment swap has been run.
- No Assignment Swap rollback has been run.
- Frontend wiring remains blocked until controlled backend live-test planning is approved.
- All initial Assignment Swap tests must use Piano Level 1 Module 13 — Save Draft Test Module.
- Singing and all shared XP, mastery, unlock, submission, review, certificate, and progress behavior remain protected.

## 7. Recommended next step

Plan one controlled backend RPC test that replaces a single draft activity on Piano Level 1 Module 13.

The controlled sequence should be:

1. Capture the target module, activity, audit, and student-state baseline.
2. Run one approved swap against the selected draft Practice or Core Challenge.
3. Verify exactly one audit row, the allowlisted content change, preserved activity identity, and unchanged student state.
4. Run the rollback RPC for that operation.
5. Verify a linked rollback audit row, exact restoration of the original activity payload, and unchanged student state.
6. Approve frontend wiring only after both swap and rollback behavior pass.

No frontend Assignment Swap wiring should begin before that controlled backend validation is complete.
