# JPAC Creator Tools Extra Credit v1 Rollout

## Purpose

This rollout replaces the Creator Tools preparation placeholder with a real teacher-reviewed, text-only submission pathway. It never awards XP, grades, mastery, progress, certificates, or unlocks automatically.

## Schema and workflow

- `creator_tool_extra_credit_submissions` stores the student, canonical tool, title, summary, JSON snapshot, optional note, review status, feedback, and review timestamps.
- `creator_tool_extra_credit_submission_events` records submission, withdrawal, approval, revision request, and rejection events.
- Student rows start as `pending_review`; other statuses are `needs_revision`, `approved`, `rejected`, and `withdrawn`.
- No media, uploads, external URLs, grades, XP values, or curriculum references are stored.

Students can submit/read their own records and withdraw eligible records through a narrow RPC. Student inserts must belong to `auth.uid()`, begin as `pending_review`, and cannot provide `teacher_feedback`, `reviewed_by`, or `reviewed_at`. Staff can read the queue and review through a separate RPC. RLS is enabled, anonymous access is revoked, review status changes require `public.is_staff()`, and feedback is required for revision or rejection.

## Rollout

1. Run the read-only preflight and require `OVERALL / PREFLIGHT = PASS`. It blocks if either target table or any target function already exists.
2. Review and apply the migration through the approved Supabase deployment workflow.
3. Run the read-only post-validation and require `OVERALL / POST_VALIDATION = PASS`.
4. Pilot with one internal student and one teacher.

The frontend adds explicit confirmation, **Submit for Teacher Review**, status/feedback history, withdrawal, and a Teacher Studio queue. Existing local project saving remains device-only.

All new functions use `CREATE FUNCTION`, not `CREATE OR REPLACE FUNCTION`, so an unexpected same-named function causes a safe migration failure instead of being replaced. No rows are seeded. Existing academic submissions, curriculum, enrollments, XP, mastery, progress, certificates, Community Wall data, and local Creator Tool projects are untouched. Approval only records the review result and never awards XP, grades, progress, mastery, or certificates.

## Rollback

The rollback drops only the two v1 tables and three rollout functions/triggers. It does not touch profiles or academic/evidence tables. Export required review history before an approved rollback because those extra-credit records would be removed.
