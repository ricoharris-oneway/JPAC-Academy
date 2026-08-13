# Save as Draft v1 Live-Test Completion

## Milestone status

Save as Draft v1 has completed its controlled backend installation, frontend wiring, blocked-path review, and one-module live test. The feature remains intentionally narrow: it creates one new draft module only and does not replace, publish, or activate curriculum.

## 1. Backend status

The installed RPC is:

```text
public.curriculum_save_module_as_draft_v1(import_payload jsonb) returns jsonb
```

Backend post-validation passed with:

```text
PASS: SAVE AS DRAFT V1 RPC INSTALL VALID
```

## 2. Frontend status

Curriculum Import Preview is wired to Save as Draft v1 with the following controls:

- Module-scope imports only.
- Exactly one `WOULD_CREATE` module only.
- Administrator or developer role required.
- Every source warning must be acknowledged individually.
- A final one-module, draft-only confirmation is required.
- Exactly one approved RPC call is used.
- No direct table writes exist in the Save as Draft frontend flow.
- No fallback writes occur if the RPC fails.

## 3. Blocked-path tests

The following protections worked as intended:

- A full-course Piano export remained preview-only.
- An existing Piano module round trip remained blocked by `WOULD_REUSE`.
- Course mismatch protection worked when Piano JSON was previewed while Singing was selected.
- The disabled Save as Draft button was visually distinct, readable, and non-clickable.
- The false positive on canonical curriculum `xp.mastery` was corrected without allowing arbitrary mastery or progress fields.
- Lowercase database rubric bands are accepted and normalized only in the allowlisted RPC payload. Curriculum Export remains lossless, and stored rubrics are not changed.

## 4. Controlled live-test result

Test artifact:

```text
manual-test-artifacts/jpac-piano-l1-m13-sort49-save-draft-test-module-v1.2.0.json
```

Result:

- Created: Piano Level 1 Module 13 — Save Draft Test Module
- Operation ID: `47e795b8-2e5e-4d4d-a126-87d0738bcf52`
- Status: `draft`
- Records created: 1 module, 3 lessons, and 2 activities
- Unresolved review status: `MEDIA_NEEDS_REVIEW`
- Unresolved review status: `TOOLS_NEED_CATALOG_REVIEW`
- Unresolved review status: `CAREER_PATH_NOT_CONFIGURED`

These unresolved statuses are expected. The live test did not activate media, tools, Lab bindings, or Career Path attachments.

## 5. Database verification

The created module was verified with the following values:

| Field | Verified value |
| --- | ---: |
| `level_number` | 1 |
| `level_module_number` | 13 |
| `sort_order` | 49 |
| `title` | Save Draft Test Module |
| `status` | draft |
| `core_xp` | 625 |
| `intro_core_xp` | 50 |
| `video_core_xp` | 100 |
| `assignment_core_xp` | 350 |
| `mastery_core_xp` | 125 |
| `core_unlock_threshold` | 438 |
| `lesson_count` | 3 |
| `activity_count` | 2 |

## 6. Student and progress preservation

Protected student-state counts remained unchanged after the controlled live test:

| Protected data | Count |
| --- | ---: |
| `xp_ledger` | 5 |
| `enrollments` | 1 |
| `submissions` | 1 |
| `certificates` | 0 |
| `lesson_progress` | 5 |

The imported module remained draft and did not affect student progress.

## 7. Sort-order lesson learned

`level_module_number` identifies a module within its level. In contrast, `sort_order` is global within the course.

The first Level 1 Module 13 test used `sort_order = 13`. The RPC correctly blocked that operation because Piano Level 2 Module 1, “Chord Inversions,” already used global course sort order 13.

The corrected Level 1 Module 13 test used `sort_order = 49`, which preserved the intended within-level module identity while using a non-conflicting global Piano course order.

Future curriculum tooling must resolve and validate both identities independently before saving.

## 8. Current limitations

Save as Draft v1:

- Does not support level imports.
- Does not support course imports.
- Does not overwrite or update existing modules.
- Does not publish curriculum.
- Does not activate media, tools, Lab bindings, or Career Pathing.
- Does not touch student progress.

## 9. Recommended next work

The next recommended planning task is Assignment Swap v1 / Module Content Replacement.

Existing-module replacement must remain separate from Save as Draft v1. It should use a draft-only, teacher/admin-controlled workflow and must never overwrite published or student-evidence-bearing content without explicit preservation, versioning, conflict, and rollback safeguards.

No expansion of Save as Draft v1 should begin until the replacement workflow has a separately approved scope and safety model.
