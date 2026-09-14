# Enrollment Manager v2: onboarding workflow

The existing `/staff/course-enrollment` route remains guarded for teacher/admin/developer. Its navigation label is now Enrollment Manager; the separate administrator `/enrollment` link is labeled Enrollment Records. No route or role guard changed.

Staff look up a student by case-insensitive exact email. LIKE wildcards are escaped and the returned email is checked. A found profile is explicitly distinguished from confirmed login activation. Editing the email clears identity, status, notes, course selection, and payment verification. Changing course or purchase type also clears payment verification.

The workflow reads enrollment history and reuses `jpac_staff_get_consent_ledger_v1` and `jpac_staff_get_student_payment_ledger_v1`. Each status can fail independently; unavailable data is not presented as no records or consent pending. Refresh status rereads the same student. Payments are summarized across the student and for the selected course without treating another course's payment as verification. Consent never automatically blocks enrollment or revokes access.

The seven-step checklist covers profile, guardian information, consent, payment verification, selected course access, ledger documentation, and welcome copy. Guardian confirmations and copy status are session-only UI state; nothing is saved. Minor-aware welcome instructions are copyable, and copy is not presented as delivery.

The grant still calls the unchanged `grantSingleCourseEnrollment` helper and `jpac_staff_grant_single_course_enrollment_v1` with the confirmed profile email, selected course, verification, purchase type, and note. No ledger record is automatically created. The next action after success is **Add or confirm payment ledger record**.

## Account setup investigation

- `manual_student_create` inserts `pending_students` and an admissions activity; it does not create an Auth user or send an invitation.
- `api/wix-sync.js` contains Auth invitation/provisioning, but is protected by an integration secret and also performs Wix-related writes. It is not a standalone staff account-invitation endpoint and was not reused or modified.
- Auth callback and Set Password routes exist to finish activation; they do not initiate a staff invitation. Administrator password reset targets an existing student and is not account creation.
- No safe standalone staff invitation API was found. Missing profiles receive an admissions-record handoff, with admins/developers linked to `/manual-student`; teachers are directed to an administrator. The UI does not claim absence of an Auth user merely because a student profile was not found.
- Follow-up: a separately approved, staff-authorized invitation endpoint with duplicate-account handling and activation status. No backend or SQL changes were made in v2.

Admissions copy now identifies JPAC Academy as the learning platform for course access, lessons, assignments, progress, consent, payment documentation, and staff support. Wix is a website/payment-verification reference. The existing admissions mutations and stage values are unchanged.

## Validation

TypeScript, production build, `git diff --check`, and `node scripts/enrollment-onboarding-check.mjs` passed. Build retains existing missing-artwork and bundle-size warnings. Release check reports frontend-only scope with protected keyword review required; matches were reviewed as workflow reads, existing grant usage, and updated copy/navigation.

Local Edge checks used the real routes and pages with fixture authentication and Supabase responses; all external requests were blocked. Verified all three staff roles, student denial, existing/missing student states, seven checklist entries, exact-email escaping, original grant payload, guardian welcome copy, clearing verification on course/email changes, independent read failures, empty records, pending consent without automatic blocking, and grant error/already-active/reactivated responses. Both mobile widths (390px and 320px) and desktop (1440px) had no horizontal overflow or page errors. Screenshots were reviewed.

No production accounts, enrollments, payments, or consents were created or modified. No final student testing was run. Authenticated production verification remains pending. No enrollment/payment/consent RPC, course access rule, curriculum, media, progress, XP, mastery, submission, certificate, Aria, Live AI, Wix integration, package, or migration changed.

Branch: `codex/enrollment-manager-v2-onboarding`. PR/squash title: `feat: unify enrollment onboarding workflow`. Merge requires approval.
