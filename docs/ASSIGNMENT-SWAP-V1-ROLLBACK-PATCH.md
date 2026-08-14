# Assignment Swap v1 Rollback Canonical-Hash Patch

## Defect

The controlled swap operation `149f6b67-a615-4d17-b2ac-75879e0467dc` succeeded, but its first rollback attempt stopped with `Activity changed after swap`. No rollback audit row or activity update was committed.

The audited `after_payload` was hashed before the database round trip and represented the fixed passing score as JSON numeric `70`. The rollback reconstructed the current snapshot from `activities.passing_score`, a `numeric(5,2)` column that can serialize as `70.00`. JSONB treats those numbers as logically equal, but SHA-256 was calculated over `jsonb::text`; therefore the textual hashes differed.

## Correction

Migration `202608130006_assignment_swap_v1_rollback_patch.sql` replaces only `public.curriculum_rollback_assignment_swap_v1(uuid)`. It retains every authorization, identity, draft-state, XP, evidence, trigger, and audit guard. It does not invoke either Assignment Swap RPC and performs no curriculum or student-data writes.

After the existing guard confirms `passing_score = 70`, the current activity snapshot casts that value to integer so its canonical representation matches the audited `after_payload`. The strengthened verification then requires all three conditions:

1. The stored `after_payload` still hashes to the stored `after_hash`.
2. The current canonical JSONB snapshot is exactly equal to `after_payload`.
3. The current canonical snapshot hashes to `after_hash`.

The patch does not skip or weaken current-state verification. It adds an audit-integrity check and retains the hash comparison.

## Preserved security and scope

- `SECURITY DEFINER` and `SET search_path = public`
- Internal `public.is_admin()` authorization
- PUBLIC, anon, and service-role execute denied
- Authenticated execute granted, with the internal admin/developer guard still authoritative
- Draft modules and draft activities only
- Singing prohibited
- Fixed module/activity identity and canonical XP checks
- Zero-evidence and dependency blockers
- Append-only operation audit and one rollback per swap
- No frontend rollback exposure

The swap RPC, Save as Draft, Singing, Piano curriculum records, student state, and XP/mastery/progress/unlock/certificate functions are not changed.

## Execution order

1. Commit and review the five `202608130006` patch artifacts.
2. Run `202608130006_assignment_swap_v1_rollback_preflight.sql`.
3. Continue only if the consolidated result ends with `PASS: READY FOR ASSIGNMENT SWAP V1 ROLLBACK PATCH`.
4. Run `202608130006_assignment_swap_v1_rollback_patch.sql`.
5. Run `202608130006_assignment_swap_v1_rollback_post_validation.sql`.
6. Continue only if it ends with `PASS: ASSIGNMENT SWAP V1 ROLLBACK PATCH VALID`.
7. Retry the controlled rollback exactly once using the reviewed one-use artifact.
8. Verify audit count `2`, rollback linkage to the known swap, exact original activity restoration, preserved UUIDs/XP/module structure, zero target evidence, and unchanged global student-state counts.

## Patch rollback warning

`202608130006_assignment_swap_v1_rollback_patch_rollback.sql` refuses to run after a rollback audit row exists for the controlled operation. It restores only the prior rollback RPC definition and hardened grants. That restoration deliberately reintroduces the known `70` versus `70.00` canonical-hash defect and is for emergency uninstall review only.

Frontend Assignment Swap work remains paused until the corrected backend rollback succeeds and its audit/state validation passes.
