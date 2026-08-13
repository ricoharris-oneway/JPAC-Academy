# Assignment Swap v1

## Scope

Assignment Swap v1 is an administrative, draft-only workflow for changing the editable content of exactly one existing Practice or Core Challenge while preserving the activity UUID and every curriculum relationship. It is separate from Save as Draft v1, import, publishing, grading, and student remediation.

Allowed Core Challenge fields are title, description, instructions, submission type, passing score, resubmission setting, and rubric. Allowed Practice fields are the same except rubric. The RPC preserves course, level, module, lesson, and activity identities; activity type; required flag; XP; status; portfolio flag; and certificate flag.

## Blocked operations

The workflow blocks non-draft modules or activities, Singing, role/XP/status changes, module movement or renumbering, activity replacement by a new UUID, bulk/level/course operations, publication, media activation, Lab/tool binding, Career Path configuration, portfolio/certificate activation, and direct frontend table writes.

Any submission, activity progress, lesson progress, practice log, XP entry, mastery row, portfolio project, media progress/history, curriculum change request/proposal, or course certificate blocks a swap. The server repeats these checks under locks immediately before updating the activity.

## Contract

The swap RPC is `public.curriculum_swap_module_assignment_v1(swap_payload jsonb) returns jsonb`. It accepts contract `jpac-assignment-swap`, version `1.0.0`, one target activity, an expected-current snapshot/hash, an allowlisted replacement, warning acknowledgements, and confirmation fields. Raw import objects are not accepted.

The client must provide the current course slug, level number, module number, module title, global module sort order, draft status, and an allowlisted current activity snapshot. The server compares that JSONB snapshot with the locked row before computing internal audit hashes. A stale snapshot or identity mismatch aborts the transaction without requiring the browser to reproduce PostgreSQL's JSONB binary/text hashing format.

## Audit and rollback

`public.curriculum_assignment_swap_operations` is append-only and protected by RLS and a mutation-blocking trigger. Each successful swap stores before/after allowlisted payloads, hashes, changed fields, caller identity, and target identities.

`public.curriculum_rollback_assignment_swap_v1(operation_id uuid)` restores only the allowlisted before-payload. It requires the current activity hash to equal the recorded after-hash, repeats draft/evidence checks, preserves identities and XP, and appends a linked rollback audit row. Repeated rollback is refused.

The uninstall script refuses to remove the foundation when any audit history exists. Audit history must be preserved rather than silently deleted.

## Controlled test target

The approved test target is Piano Level 1 Module 13, **Save Draft Test Module**, global `sort_order = 49`. It should remain in place until swap and controlled rollback are validated. Preflight—not documentation—must prove its live UUIDs, exact activity payloads, and zero evidence dependencies.

## Execution sequence

1. Run the read-only consolidated preflight and review every row.
2. Compare target UUIDs, evidence counts, function hashes, Singing baseline, and student-state baseline.
3. Install the migration only after line-by-line approval.
4. Run consolidated post-validation and compare all `INFO` hashes/counts with preflight.
5. Do not begin frontend wiring until post-validation reports `PASS: ASSIGNMENT SWAP V1 BACKEND INSTALL VALID` and the controlled rollback RPC is installed.
6. Test one swap and one rollback on the test module before broader use.

## Preservation boundary

Neither installation nor swapping invokes or modifies XP, mastery, unlock, submission, teacher-review, certificate, enrollment, progress, media, Lab, Career Path, Save as Draft, or Curriculum Studio save functions. The migration contains no seed data and performs no update to existing curriculum during installation.
