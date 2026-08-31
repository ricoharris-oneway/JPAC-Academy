# JPAC Enrollment Path Audit v1

## Decision summary

JPAC Academy already has the correct core boundary for the revised strategy: Wix can be the marketing, payment, and sign-up front door, while the JPAC app is the source of truth for course access and learning. The current student access path is:

`Supabase Auth user → profiles role → active Academy enrollment → published course → published modules and lessons`

The simplest safe launch is therefore a manual approval workflow built around the existing JPAC account, Enrollment Manager, and `enrollments` records. Do not reactivate Wix Courses as a parallel learning system, and do not make the older Wix entitlement/program tables authoritative again.

The main launch gap is not course delivery. It is a small, reliable intake bridge between a Wix purchase and a JPAC account/enrollment decision. Bronze, Silver, and Gold do not currently exist as enrollment packages in application code.

## Audit basis and limits

This is a repository audit at main commit `35b171acfc048a7fc4879414f4bcfcc8cb4274fe`. It did not inspect or mutate production data. No SQL was run, no migration was created, and no external Wix, payment, Supabase, or Vercel operation was performed.

Primary implementation evidence:

- `src/context/AuthContext.tsx`, `src/lib/auth.ts`, and the auth pages
- `src/App.tsx` and `src/layouts/AppLayout.tsx`
- `src/pages/EnrollmentManagerPage.tsx` and `src/pages/ManualStudentPage.tsx`
- `src/lib/studentAccess.ts`, `src/pages/StudentDashboardPage.tsx`, and `src/pages/MyCoursesPage.tsx`
- `api/wix-sync.js` and the existing Wix reference bridge files
- enrollment, auth, admissions, and Academy-access migration history
- prior architecture documents, especially `docs/BUILD-2.5-ACADEMY-ENROLLMENT-ACCESS.md`

## 1. Current account, role, and access findings

### Student accounts

Authentication uses Supabase Auth. The app loads the authenticated session and a matching `profiles` record. The canonical role vocabulary is:

- `student`
- `teacher`
- `admin`
- `developer`

Public sign-up is currently exposed on `/login`. A self-created account starts as a student. Password sign-in, confirmation, invite callback, password setup, password recovery, and magic-link callback handling are implemented.

The sign-in copy assumes a Wix purchaser may receive a JPAC activation link, but that assumption is only fulfilled by the existing server-side Wix sync endpoint. The manual Admissions Center creates a pending admissions record; it does not create a Supabase Auth user or send an invitation.

### Staff and administrator accounts

Teacher, admin, and developer behavior is driven by `profiles.role`. Route guards provide UI-level role gating, while database policies and RPC checks remain the real authorization boundary.

The repository contains:

- admin/developer-only access to Enrollment Manager, Admissions Center, LAB Manager, and Admin Center;
- staff access to Teacher Studio and Curriculum Studio;
- an administrator password-reset endpoint for existing student accounts;
- role-management UI in Admin Center for existing profiles.

There is no general staff-facing “invite new JPAC user” workflow. The only implemented automatic invite path is inside `api/wix-sync.js`, which provisions a student through Supabase Admin when a trusted Wix event arrives.

### Routing after login

After authentication, the app routes `/` by role:

- student → Student Dashboard;
- teacher → Teacher Studio;
- admin/developer → Operations Center.

Students can open Career Pathing, My Courses, course/module/lesson pages, practice/submission areas, portfolio/certificates, and the guided Aria onboarding experience. Unauthorized staff routes redirect to `/`.

## 2. Existing enrollment and course-access mechanism

`public.enrollments` is the canonical course relationship. It is unique by `(student_id, course_id)` and includes status, teacher, progress, dates, level, source, Wix reference URL, notes, and synchronization metadata accumulated across migrations.

Build 2.5 deliberately changed authorization so Academy enrollments are authoritative. Normal student access requires all of the following:

- the enrollment belongs to the signed-in user;
- enrollment status is `active`;
- its start date is not in the future;
- its end date is absent or not expired;
- the course is `published`.

Teachers, admins, and developers have a staff bypass in the course-access function. Student curriculum policies reuse the same access function.

The client calls `jpac_my_academy_courses()` to build the dashboard and My Courses list. It then reads published modules and lessons and calculates displayed progress from the signed-in student’s own lesson-progress records. Direct course loading calls `jpac_student_has_course_access(course_id)` before loading content.

This means JPAC can be the only course system without changing the fundamental access model.

## 3. Existing manual enrollment and override tools

### Enrollment Manager

The admin/developer Enrollment Manager can:

- select an existing student profile;
- select a canonical course;
- choose an instructor or defer assignment;
- set pending, active, or paused status during creation;
- set start and target-completion dates;
- store a Wix Program URL and notes;
- optionally link a guardian;
- create or update the unique student/course enrollment;
- change existing enrollment status.

The creation RPC also initializes related intelligence/timeline records and optional teacher assignment. It does not create a user account. The current UI does not expose the enrollment `level` field added by Build 2.5, so created enrollments use the database default unless another controlled process sets it.

### Admissions Center

The admin/developer Admissions Center can create `pending_students` records and move them through an admissions-stage pipeline. It records contact, course, teacher, dates, source, online/campus/hybrid mode, and guardian information.

Important limitation: this is a prospect/pending-record workflow, not account activation. There is no complete UI action that converts a pending record into an Auth user, sends an app invite, links the profile, and activates canonical course enrollments.

### Existing Wix integration code

The repository contains a more ambitious Wix integration layer:

- a secret-protected `/api/wix-sync` endpoint;
- member matching and Supabase invitation;
- Wix member links;
- cached order/plan entitlements;
- Wix program enrollments and assignments;
- integration event logging and duplicate-event handling;
- reference Wix/Velo event bridge code.

This code is not needed for Phase 1. More importantly, its older documentation and some UI copy still describe Wix Programs as authoritative for coursework and participation. That conflicts with the newer Build 2.5 decision and the current strategy. Treat those statements and the Wix course/program synchronization path as legacy compatibility/history, not the launch design.

## 4. Plans, packages, subscriptions, and Bronze/Silver/Gold

Wix-oriented storage exists for external plan/order data, including Wix plan ID, plan name, entitlement status, dates, and raw event payloads. Historical plan-to-course mapping infrastructure also exists.

However, active Academy course access no longer consults those Wix entitlement records. There is no current application-level subscription engine, billing state machine, or payment processor that grants Academy access.

Bronze, Silver, and Gold do **not** exist as enrollment packages, membership tiers, or course-entitlement bundles in the active account/enrollment code. Those words appear only in unrelated credential/achievement rarity and visual concepts. They must not be mistaken for a purchasable access model.

The enrollment `level` value (1–4) is curriculum level, not Bronze/Silver/Gold package tier.

## 5. Gaps blocking a clean enrollment launch

1. **No canonical package definition.** Bronze/Silver/Gold have no stable IDs, names, included courses, duration, or entitlement rules in the app.
2. **No staff invite action.** Staff cannot create/invite a new Auth user from Enrollment Manager or Admissions Center.
3. **No complete pending-to-active workflow.** Admissions records, Auth profiles, and canonical enrollments are separate operational steps.
4. **No exact Wix purchase handoff contract for the revised architecture.** Existing Wix sync accepts broad member/order/program/assignment payloads; the new strategy needs only a small purchase/intake contract at first.
5. **No reviewed package-to-course mapping.** Staff need an explicit checklist until a canonical mapping is built.
6. **No single activation status view.** Staff cannot see “payment confirmed → account exists → invite accepted → courses active” in one place.
7. **Conflicting legacy language.** Some Admissions Center and integration documentation still says Wix is authoritative for coursework, assignments, and completion.
8. **Email ownership is split.** Wix can send purchase confirmation, and Supabase can send Auth invitations, but the repository does not provide a staff-controlled launch email sequence independent of the Wix webhook path.
9. **Email matching needs discipline.** A Wix payer, guardian, and student may use different addresses. Automatic matching by unreviewed email would create access and privacy risk.
10. **Minor/guardian handling is not connected end to end.** Guardian data can be recorded, but account ownership and student login email still require a staff decision.

None of these gaps requires a second course catalog or Wix Courses.

## 6. Source-of-truth boundary

| Concern | Launch owner | Notes |
| --- | --- | --- |
| Marketing pages and product explanation | Wix | Public front door |
| Checkout, payment receipt, refunds, and billing communication | Wix | No payment logic in JPAC Phase 1 |
| Purchase notification/intake facts | Wix → staff | Manual notification in Phase 1 |
| User authentication and app identity | JPAC / Supabase Auth | One Auth user and one profile per learner |
| Roles | JPAC `profiles.role` | Never infer staff role from Wix |
| Package catalog | Staff checklist in Phase 1; JPAC model later | Bronze/Silver/Gold not yet implemented |
| Course entitlement | JPAC `enrollments` | Active/date-valid enrollment is authoritative |
| Course catalog and curriculum | JPAC | Do not duplicate in Wix Courses |
| Progress, XP, mastery, submissions, reviews, portfolio, certificates | JPAC | Existing canonical learning workflows remain unchanged |
| Aria onboarding and guidance | JPAC | Begins after login and access approval |

## 7. Recommended Phase 1: manual/semi-automated launch

### Recommended workflow

1. Customer selects a clearly named package on Wix and completes payment/sign-up.
2. Wix sends its normal payment confirmation to the purchaser. The confirmation includes one JPAC Academy link and tells the learner to create/sign in with the learner email supplied during checkout.
3. Wix sends a staff notification containing a human-readable, non-secret intake summary: order reference, purchaser, learner name/email, minor/guardian indicator, selected package, and payment status.
4. Staff checks payment/refund state in Wix and resolves payer-versus-learner email before touching Academy access.
5. If the learner has no JPAC account, staff asks them to use the existing `/login` Create Account flow. This is the safest current account-creation path because no manual staff invite UI exists. Staff does not share temporary passwords.
6. Staff confirms the new JPAC profile is a student and matches the approved learner email.
7. Staff uses a controlled Bronze/Silver/Gold mapping checklist maintained outside the app for launch. The checklist lists exact JPAC course titles/IDs and intended curriculum level for each package.
8. Staff uses Enrollment Manager to create one active Academy enrollment per included course. The unique student/course key prevents duplicate relationships. Add notes containing the Wix order reference and package label; do not store sensitive payment data.
9. Staff confirms the student appears with the expected active course count. If a required curriculum level is not the default, stop and use a separately approved operational method; the current UI cannot safely choose it.
10. Staff sends the student the normal JPAC login link. On first login, the student lands on the Student Dashboard, sees only active Academy courses, and begins with the JPAC tour/Aria onboarding and Career Pathing.

### Why this is the simplest launch path

- It reuses the existing canonical access mechanism.
- It does not depend on Wix API, webhook, plan mapping, or synchronized Wix Course state.
- It keeps a human approval gate between payment and access.
- It avoids storing billing data in JPAC.
- It can be operated and reconciled from two explicit records: the Wix order and the JPAC enrollment.
- Failures deny access safely rather than granting the wrong course.

### Phase 1 operating checklist

Use a single staff checklist per order:

- Wix order paid and not refunded;
- learner identity/email confirmed;
- guardian relationship resolved if applicable;
- JPAC Auth account/profile exists;
- role is student;
- package mapping version recorded;
- exact course enrollments created once;
- active dates checked;
- student login link sent;
- student can see expected courses;
- order marked complete in the staff tracker.

Do not use Wix Courses or Wix program completion as a second source of learning truth.

## 8. Recommended Phase 2: low-risk automation

Automate intake, not access.

1. A successful Wix payment/sign-up sends a minimal, signed, idempotent event to JPAC.
2. JPAC stores a **pending enrollment request** containing the external order/event ID, normalized learner identity, package ID, payment state, and raw-reference metadata needed for audit.
3. Duplicate event IDs return the original request and create no second work item.
4. Staff reviews the request in one queue, resolves identity and guardian questions, previews exact course entitlements, and approves or rejects it.
5. Approval creates/links the JPAC account, sends the standard activation email if needed, and upserts the exact canonical enrollments in one controlled operation.
6. The request records who approved it, when, which mapping version was used, and the resulting enrollment IDs.

Wix must not send course content, progress, assignments, XP, or completion into JPAC in this phase.

## 9. Recommended Phase 3: full automation

Only after Phase 2 has reliable event replay, identity matching, refund/cancellation handling, and an audited package map:

1. Wix emits a verified successful-payment event with stable order, learner, and package IDs.
2. JPAC validates signature, event uniqueness, payment state, package status, and identity confidence.
3. High-confidence requests automatically provision/link the student and upsert package-mapped Academy enrollments.
4. Invitation/activation email is sent once.
5. Refund, cancellation, expiration, upgrade, and downgrade events update access according to explicit reviewed policy; they never delete learning history.
6. Ambiguous identity, unknown package, conflicting guardian data, or unsupported status goes to the staff exception queue without granting access.

Full automation should still make `enrollments` the final access decision. Wix is the payment signal, not the runtime course-access database.

## 10. Failure points to avoid

- Running Wix Courses and JPAC courses in parallel.
- Granting access from a plan name or course title instead of stable IDs.
- Treating Bronze/Silver/Gold labels as implemented merely because similar words appear in achievements.
- Automatically matching a payer to a student without resolving the learner identity.
- Creating duplicate Auth users for the same learner.
- Creating multiple enrollment rows for the same student/course instead of idempotent upsert.
- Granting access for pending, failed, refunded, cancelled, unknown, or expired payment states.
- Letting staff send or store shared temporary passwords.
- Putting service-role keys, Wix secrets, payment data, or invite tokens in the browser or documentation.
- Updating XP, progress, mastery, submissions, reviews, certificates, or curriculum status during enrollment.
- Deleting learning history when access ends.
- Using the Admissions Center’s legacy Wix-authoritative copy as an operating rule.
- Assuming a Wix confirmation email also activates a JPAC account.
- Automating before refund, retry, duplicate-event, and exception behavior are defined.

## 11. Staff workload analysis

### Phase 1

Expected work is one short checklist per purchase: verify order, resolve learner identity, wait for/create the account path, apply package mapping, create enrollments, and send login instructions. The primary workload driver is identity ambiguity, not the enrollment entry itself.

Reasonable launch target: one trained staff owner and one backup, one daily reconciliation queue, and a same-business-day access promise rather than instant access. Batch processing at fixed times is safer than reacting ad hoc to individual emails.

### Phase 2

The system pre-fills the request and entitlement preview. Staff work becomes review/approve or exception handling. This removes retyping, reduces missed orders, and supplies an audit trail without allowing payments to mutate access directly.

### Phase 3

Staff handles only exceptions, refunds/cancellations that require judgment, identity conflicts, and mapping errors. This is lowest ongoing workload but highest implementation and operational risk, so it should follow measured Phase 2 evidence.

## 12. Student experience from Wix to JPAC

The intended Phase 1 experience is:

1. Discover and purchase on Wix.
2. Receive a Wix payment confirmation with a clear “Create or open your JPAC Academy account” link and an expectation for access timing.
3. Create the learner’s JPAC account or sign in with the learner email.
4. Receive staff confirmation when access is approved.
5. Sign in to JPAC Academy.
6. Land on the student dashboard.
7. Start the JPAC welcome tour/Aria onboarding and Career Pathing.
8. Open only the courses granted by active Academy enrollments.
9. Complete learning, practice, submissions, teacher review, progress, portfolio, and certificates entirely in JPAC.

The student should never need to decide whether Wix Courses or JPAC contains the “real” lesson.

## 13. Recommended next build

Build **Enrollment Intake and Approval v1** before payment automation.

Minimum scope:

- define stable Bronze/Silver/Gold package IDs and an explicit package-to-course mapping;
- add a staff-only pending enrollment request queue;
- add exact-email/profile matching with ambiguity blocking;
- show a read-only entitlement preview before approval;
- add one idempotent approve action that creates or links the student and upserts canonical enrollments;
- add a staff-controlled invitation/resend action using the existing secure Auth callback;
- record external order reference, mapping version, approver, timestamps, and resulting enrollment IDs;
- display activation states: awaiting account, awaiting approval, invited, active, exception;
- keep all payment handling and Wix Course content out of scope.

Before that build, product/operations must define the package contract: included courses, curriculum level, duration, start/end behavior, upgrades/downgrades, refunds/cancellations, minors/guardians, and whether one purchase may cover multiple learners.

## 14. Documentation conflicts to clean up later

No copy was changed in this audit, but a later docs/navigation-copy task should reconcile:

- Admissions Center statements that Wix remains authoritative for coursework, assignments, and completion;
- older production integration documents that assign course ownership to Wix Programs;
- “Wix Program URL” emphasis in enrollment UI, which is now optional reference metadata rather than authorization;
- login copy that promises an invitation after Wix purchase even though Phase 1 may use self-sign-up plus staff approval.

These are clarity fixes, not a reason to delay the manual launch if staff follow this audit’s source-of-truth boundary.

## 15. Change confirmation

This audit is documentation only. It makes no application, database, SQL, migration, Supabase, package, lockfile, configuration, payment, Wix integration, webhook, environment, course-status, XP, progress, mastery, certificate, enrollment, submission, review, Aria, Live AI, Video Finder, or Creator Tool change.
