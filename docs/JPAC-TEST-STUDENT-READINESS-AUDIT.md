# JPAC Test-Student Readiness Audit

## Purpose

The audit in `supabase/validation/202608230001_jpac_test_student_readiness_audit.sql` determines whether JPAC Academy is safe for a small, controlled internal test-student pilot. It does not approve public launch or publish any curriculum.

## What the audit checks

The report verifies:

- all ten canonical course shells and their exact identities;
- protected module totals for every loaded program;
- draft isolation, including the approved Singing pilot publication boundary;
- Singing Beginner Module 1 student-facing content, Core Challenge, rubric, XP, passing score, and unlock threshold;
- required XP, mastery, submission, review, and unlock functions;
- Assignment Swap RPCs and its two approved audit rows;
- protected global student-state counts;
- absence of active media and tool bindings on draft curriculum;
- zero certificate rows; and
- the distinction between controlled internal testing and public-launch readiness.

Every SQL statement runs inside an explicit read-only transaction that ends with `rollback`. The audit selects metadata and counts only. It does not insert, update, delete, publish, enroll, award XP, or otherwise modify database state.

## Result meanings

- `PASS`: the specific safety or readiness contract is intact.
- `WARN`: controlled internal testing may proceed, but a known public-launch prerequisite remains incomplete.
- `BLOCK`: controlled testing must not proceed until the failed safety contract is corrected and the audit is rerun.
- `INFO`: contextual evidence that does not independently allow or prevent testing.

`TEST-STUDENT READINESS / CONTROLLED_INTERNAL_PILOT` passes only when there are zero blockers. `OVERALL` returns `BLOCK` for any unsafe condition, `WARN` when internal testing is safe but public launch remains incomplete, and `PASS` only when no blockers or warnings remain.

## Controlled test-student readiness

Controlled readiness means a small known group can validate the existing published Singing Beginner Module 1 experience while administrators monitor access, submissions, progress, XP, mastery, and support behavior. It does not mean the other nine draft programs are student-ready, published, or approved for enrollment.

Recommended pilot scope:

- 3 to 5 internal test students;
- Singing Beginner Module 1 first;
- no public launch yet; and
- no publishing draft courses yet.

## Public launch prerequisites

Public launch still requires academic and operational approval, approved and accessible media, approved tool-catalog bindings where needed, completed safety and rights review, publication decisions for each program, certificate decisions, broader end-to-end testing, support readiness, and an explicit launch authorization. Digital AI Creator remains instructor-guided and unbound to an approved tool catalog until that separate review is complete.
