# Published-Only Progress Denominator

Status: review-ready and unexecuted. This artifact set requires separate database-execution approval.

## Defect

The canonical enrollment projection currently calculates active-level progress as mastered modules divided by every non-archived module. Because `draft`, `review`, and `approved` modules are non-archived, administrative curriculum work can lower a student's displayed progress before that curriculum is published or accessible.

Only `published` modules are student-actionable. Draft, review, approved-but-unpublished, and archived modules must contribute neither to the denominator nor to its mastered-module numerator.

## Exact change

The migration replaces four predicates across two existing functions:

| Function | Query | Before | After |
|---|---|---|---|
| `jpac_sync_enrollment_progress(uuid,uuid)` | total modules | `m.status <> 'archived'` | `m.status = 'published'` |
| `jpac_sync_enrollment_progress(uuid,uuid)` | mastered modules | `m.status <> 'archived'` | `m.status = 'published'` |
| `jpac_enforce_canonical_enrollment_progress()` | total modules | `m.status <> 'archived'` | `m.status = 'published'` |
| `jpac_enforce_canonical_enrollment_progress()` | mastered modules | `m.status <> 'archived'` | `m.status = 'published'` |

The `enrollments.progress` column comment is updated from “all non-archived modules” to “all published modules.”

Both function signatures, `SECURITY DEFINER`, `SET search_path = public`, and revocations are retained. The existing `enrollments_enforce_canonical_progress` trigger is not dropped or recreated.

## Explicitly unchanged

This change does not modify:

- Singing or Piano curriculum records;
- courses, levels, modules, lessons, or activities;
- XP values, XP ledger records, mastery criteria, or module completion;
- unlock sequencing;
- enrollments or stored progress values during migration execution;
- submissions, teacher review, certificates, media, Lab tools, Career Pathing, or Curriculum Studio;
- trigger callers that request a canonical progress refresh.

Piano Beginner Module 1 remains draft and inactive. After the change, its existence cannot affect a published-only denominator.

## Stored-progress reconciliation

Stored-progress reconciliation is intentionally excluded. Applying the migration changes only two function definitions and one column comment. It does not call either function and does not update `enrollments` or `course_progress`.

A future mastery-ledger, approved-assessment, or direct enrollment-progress event may cause an enrollment to be recalculated using the corrected denominator. The preflight therefore reports every enrollment whose stored percentage differs from the proposed published-only calculation. Any bulk reconciliation requires a separate review and authorization.

## Execution order

1. Run `202608120002_published_only_progress_preflight.sql` read-only and retain all output.
2. Review every readiness finding, Singing status breakdown, affected-enrollment row, function hash, and preservation hash.
3. Apply `202608120002_published_only_progress_denominator.sql` only when every required preflight finding passes and every expected percentage difference is approved.
4. Run `202608120002_published_only_progress_post_validation.sql` read-only.
5. Compare all identically named function and data hashes with the retained preflight.
6. Use `202608120002_published_only_progress_denominator_rollback.sql` only if rollback is explicitly authorized.

## Stop conditions

Stop before migration if:

- either target function is missing, ambiguous, or differs from the expected prior structure;
- either function is not `SECURITY DEFINER` with `search_path=public`;
- the expected trigger is missing, ambiguous, disabled, attached to another table, or invokes another function;
- public, anon, or authenticated has unexpected direct execute access;
- the Singing course is missing or ambiguous;
- a currently student-actionable Singing module is not published;
- a proposed Singing progress change cannot be explained solely by removal of unpublished modules;
- Piano Beginner Module 1 is not the expected draft record;
- any protected curriculum, evidence, student-state, or unrelated function hash changes unexpectedly.

Stop after migration and consider rollback if:

- either new function contains fewer or more than two published-only predicates;
- either new function retains a non-archived denominator predicate;
- trigger identity or permissions change;
- any pre/post Singing or student-state hash differs;
- Piano Module 1 changes status or identity;
- any unrelated protected function definition changes.

## Manual application review

After a separately authorized migration, verify a controlled Singing account still sees the same published modules, completion evidence, unlock sequence, XP, submissions, reviews, and certificates. Verify Piano Module 1 remains visible only to authorized curriculum staff and remains absent from student-facing course progress.
