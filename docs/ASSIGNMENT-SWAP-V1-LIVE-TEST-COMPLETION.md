# Assignment Swap v1 Live-Test Completion

## Validated backend state

Assignment Swap v1, its security hardening, SHA-256 compatibility patch, and rollback canonical-hash patch are installed and validated.

### Controlled swap

- Swap operation ID: `149f6b67-a615-4d17-b2ac-75879e0467dc`
- Status: `applied`
- Course/module: Piano Level 1, Module 13 — Save Draft Test Module
- Module ID: `b94c8524-9715-4020-8075-5588b6fcce62`
- Activity ID: `8daf80a4-a451-4eeb-bffc-3b18504175a0`
- Changed fields: `description`, `instructions`, `rubric`, `title`

The swap preserved the activity UUID, module identity, canonical XP values, and student state. Target evidence and dependency counts remained zero.

### Controlled rollback

- Rollback operation ID: `8289008d-9531-4920-88bc-1a8eab0bffc7`
- `rollback_of`: `149f6b67-a615-4d17-b2ac-75879e0467dc`
- Restored activity title: `Steady Five-Finger Performance Challenge`
- Preserved module structure: `lessons=3`, `activities=2`
- Preserved module XP: `core_xp=625`

The rollback audit row is linked to the controlled swap through `rollback_of`. The activity and module identities remained unchanged, and the original assignment content was restored.

## Student-state preservation

The final verified counts remained:

- `xp_ledger=5`
- `enrollments=1`
- `submissions=1`
- `certificates=0`
- `lesson_progress=5`

Neither the controlled swap nor rollback changed student progress, evidence, certificates, XP, mastery, or enrollment state.

## Controlled test artifact

The reviewed one-use artifact is `manual-test-artifacts/jpac-assignment-swap-v1-controlled-rollback-149f6b67.sql`. It verifies the authenticated administrator/developer, fixed swap operation, activity/module identities, canonical XP, zero evidence, and student-state baseline before invoking the rollback RPC once. It then validates rollback audit linkage, exact restoration, and preserved state.

## Frontend scope

Curriculum Studio provides an admin/developer-only Assignment Swap workflow. It is limited to one eligible draft activity inside one draft module at a time and supports either a draft Core Challenge or optional draft Practice.

The frontend:

- Calls only `public.curriculum_swap_module_assignment_v1(jsonb)` through one guarded RPC wrapper.
- Requires explicit draft, identity/XP, and zero-evidence confirmations.
- Preserves activity identity and protected activity/module settings.
- Refreshes Curriculum Studio after success and displays the operation ID and changed fields.
- Does not retry automatically or perform fallback writes.
- Does not expose the rollback RPC.
- Does not support published, review, or approved curriculum; bulk, level, or course replacement; Singing; direct table writes; publication; or student-state workflows.

## Review readiness

Backend controlled swap and rollback proof is complete. The frontend package is ready for visual app review. Singing and shared XP, mastery, unlock, submission, review, certificate, media, Lab/tool, Career Pathing, and student-progress systems remain protected.
